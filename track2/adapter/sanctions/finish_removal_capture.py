"""After collection: recheck sources, label, balance genuine errors and score fixed controls."""
import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path
import subprocess

from collect_miners import save


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", type=Path, required=True)
    ap.add_argument("--capture", type=Path, required=True)
    ap.add_argument("--balanced", type=Path, required=True)
    a = ap.parse_args()
    repo = Path(__file__).resolve().parents[3]
    a.capture, a.balanced = a.capture.resolve(), a.balanced.resolve()
    assert (a.capture / "collection-summary.json").exists(), "Collection incomplete; raw responses remain unlabelled"
    assert not (a.capture / "source-stability.json").exists(), "Refusing to replace source-window evidence"
    initial = json.loads((a.capture / "source-manifest.json").read_text(encoding="utf-8"))
    checked = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    post = a.home / "data" / ("removal-postcheck-"+checked)
    post.mkdir(parents=True, exist_ok=False)
    sources = {}
    for name in ("sdn", "alt"):
        file = post / f"{name}.csv"
        url = "https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/"+name.upper()+".CSV"
        command = ["curl.exe", "-f", "-sS", "-L", "--max-time", "60", "--output", str(file), "-w", "%{http_code}", url]
        result = subprocess.run(command, capture_output=True, check=True)
        assert result.stdout == b"200"
        sources[file.name] = {"url": url, "http_status": 200, "before_sha256": initial[file.name]["sha256"],
                              "after_sha256": digest(file), "bytes": file.stat().st_size}
    stability = {"stable": all(r["before_sha256"] == r["after_sha256"] for r in sources.values()),
                 "checked_at": dt.datetime.now(dt.timezone.utc).isoformat(), "sources": sources,
                 "response_files": {p.name: digest(p) for p in sorted(a.capture.glob("responses-*.json"))}}
    save(a.capture / "source-stability.json", stability)
    assert stability["stable"], "Snapshot changed across capture; no current-source labels declared"
    py = str(a.home / ".venv/Scripts/python.exe")
    base = "track2/adapter/sanctions"
    def run(args, name):
        command = [py, *args]
        save(a.capture / f"{name}.command.json", {"argv": command, "cwd": str(repo)})
        with (a.capture / f"{name}.txt").open("w", encoding="utf-8") as log:
            subprocess.run(command, cwd=repo, stdout=log, stderr=subprocess.STDOUT, check=True)
    run([f"{base}/label_miners.py", str(a.capture), "--exact-removals"], "label-removals")
    run([f"{base}/verify_evidence.py", str(a.capture)], "verify-unfiltered")
    run([f"{base}/audit_factual_benchmark.py", str(a.capture), "--tokenizer", str(a.home / "foundation/tokenizer.json")], "audit-unfiltered")
    run([f"{base}/balance_genuine_removals.py", str(a.capture), "--tokenizer",
         str(a.home / "foundation/tokenizer.json"), "--out", str(a.balanced)], "balance-genuine")
    balanced = json.loads((a.balanced / "balanced-block-audit.json").read_text(encoding="utf-8"))
    if balanced["score_allowed"]:
        run([f"{base}/measure_miners.py", str(a.balanced), "--home", str(a.home), "--versions", "3,8", "--max-tokens", "256"], "fixed-models-node")
        run([f"{base}/verify_evidence.py", str(a.balanced)], "verify-balanced-models")
        run([f"{base}/audit_claim_visibility.py", str(a.balanced), "--tokenizer", str(a.home / "foundation/tokenizer.json")], "balanced-visibility")
    result = {"source_stable": True, "unfiltered": json.loads((a.capture / "label-summary.json").read_text(encoding="utf-8")),
              "balanced": balanced, "scope": "Diagnostic only; old factual failures and registration gap remain"}
    save(a.capture / "removal-search-result.json", result)
    print(json.dumps({"source_stable": True, "pairs_by_kind": result["unfiltered"]["pairs_by_kind"], "balanced": balanced}), flush=True)


if __name__ == "__main__":
    main()
