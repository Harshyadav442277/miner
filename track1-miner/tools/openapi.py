"""OpenAPI 3.1 description of the miner, generated from miner.yaml so it cannot drift from what is registered.

Every endpoint, its intents, its query parameters and the response fields (the manifest's output_schema, plus
the envelope's answer, checked_at and receipt) come from the manifest or from src/receipt.ts. Nothing is
written by hand here except those envelope fields.

The registered output_schema lists far fewer fields than the routes return (G211, 2026-10-26: 101 missing).
Given a samples file from tools/openapi-check.mjs, each route's own fields are added to its response schema,
typed from a real production answer and marked x-observed. They describe one answer, not every case.

usage: python tools/openapi.py [miner.yaml] [out.json] [samples.json]     (needs PyYAML)
"""
import json
import sys
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
src = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE.parent / "miner.yaml"
out = Path(sys.argv[2]) if len(sys.argv) > 2 else HERE.parent / "docs" / "openapi.json"
samples_file = Path(sys.argv[3]) if len(sys.argv) > 3 else None
m = yaml.safe_load(src.read_text(encoding="utf-8"))
samples = json.loads(samples_file.read_text(encoding="utf-8")).get("samples", {}) if samples_file else {}
samples_at = json.loads(samples_file.read_text(encoding="utf-8")).get("at") if samples_file else None


def observed(value):
    """The JSON Schema type of one observed value; arrays and objects one level deep."""
    if value is None:
        # One null does not say what the field holds when set: /convert's amount is null for a rate question.
        return {"description": "null in the sampled answer; its type when set was not observed"}
    if isinstance(value, bool):
        return {"type": "boolean"}
    if isinstance(value, int):
        return {"type": "integer"}
    if isinstance(value, float):
        return {"type": "number"}
    if isinstance(value, str):
        return {"type": "string"}
    if isinstance(value, list):
        return {"type": "array", **({"items": observed(value[0])} if value else {})}
    return {"type": "object", "properties": {k: observed(v) for k, v in value.items()}}

UPSTREAM_READ = {
    "type": "object",
    "required": ["url", "method", "status", "started_at", "ms"],
    "properties": {
        "url": {"type": "string", "description": "The URL read, credentials redacted; tls:// or dns:// for socket reads."},
        "method": {"type": "string", "description": "An HTTP method, or TLS / DNS."},
        "status": {"type": ["integer", "null"], "description": "HTTP status; null when the read failed or was not HTTP."},
        "result": {"type": "string", "description": "For a TLS or DNS read, what came back."},
        "started_at": {"type": "string", "format": "date-time"},
        "ms": {"type": "integer"},
    },
}
RECEIPT = {
    "type": "object",
    "description": "The upstream requests the miner actually made to produce this answer (src/receipt.ts).",
    "required": ["id", "deployment", "answered_at", "upstream", "from_cache"],
    "properties": {
        "id": {"type": "string", "format": "uuid"},
        "deployment": {"type": "string", "description": "The deployment that answered."},
        "answered_at": {"type": "string", "format": "date-time"},
        "upstream": {"type": "array", "items": {"$ref": "#/components/schemas/UpstreamRead"}},
        "from_cache": {"type": "boolean", "description": "True when the one-minute response cache answered."},
        "note": {"type": "string", "description": "Present only when upstream is empty, saying why."},
    },
}

answer = dict(m.get("output_schema") or {"type": "object", "properties": {}})
props = dict(answer.get("properties") or {})
props = {
    "answer": {"type": "string", "description": "One sentence an app can show as is: the lead sentence of reason."},
    **props,
    "error": {"type": "string", "description": "Present when no answer could be produced (confidence 0): "
              "upstream_unavailable, no_subject, not_licensed and similar. Never paired with a made-up value."},
    "checked_at": {"type": "string", "format": "date-time", "description": "When the answer was computed."},
    "receipt": {"$ref": "#/components/schemas/Receipt"},
}
answer["properties"] = props

paths = {}
for e in m["endpoints"]:
    params = []
    for kind in ("required", "optional"):
        for p in ((e.get("params") or {}).get("query") or {}).get(kind) or []:
            t = p.get("type", "string")
            params.append({
                "name": p["name"], "in": "query", "required": kind == "required",
                "description": p.get("description", ""),
                "schema": {"type": "number" if t == "number" else "integer" if t == "integer" else "boolean" if t == "boolean" else "string"},
            })
    description = " ".join(str(e.get("description", "")).split())
    schema = {"$ref": "#/components/schemas/Answer"}
    sample = samples.get(e["external_path"])
    if sample:
        own = {k: observed(v) for k, v in sample["body"].items() if k not in props}
        if own:
            schema = {"allOf": [schema, {
                "type": "object", "properties": own,
                "x-observed": f"Fields and types from one production answer on {samples_at} to: {sample['question'][:160]}",
            }]}
    paths[e["external_path"]] = {
        e.get("method", "GET").lower(): {
            "operationId": e["external_path"].strip("/").replace("-", "_") or "root",
            "summary": ", ".join(e.get("intents", [])),
            "description": description,
            "x-telegraph-intents": e.get("intents", []),
            "parameters": params,
            "responses": {"200": {
                "description": "Always 200: an answer, or confidence 0 with an error code. Never a made-up value.",
                "content": {"application/json": {"schema": schema}},
            }},
        }
    }

spec = {
    "openapi": "3.1.0",
    "info": {
        "title": m.get("name", "LiveCert"),
        "version": str(m.get("version", "1")),
        "description": " ".join(str(m.get("description", "")).split()),
    },
    "servers": [{"url": m["base_url"]}],
    "externalDocs": {"url": (m.get("docs") or {}).get("repository", "")},
    "paths": paths,
    "components": {"schemas": {"Answer": answer, "Receipt": RECEIPT, "UpstreamRead": UPSTREAM_READ}},
}
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(spec, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"{len(paths)} paths, {sum(len(v[next(iter(v))]['parameters']) for v in paths.values())} parameters, "
      f"{len(props)} answer fields -> {out}")
