"""Watch devnode /api/wasm for our registrations in one family, and print each change of stage until one ends.

    python -I watch_registration.py --family CONTRACT_OBLIGATION_AUDIT [--after 208] [--hours 6]

Read-only GETs. It ends when a registration of ours newer than --after reaches canonical, rejected or deregistered,
or when the time is up. Our wallet is the fixed LiveCert address (AGENTS.md).
"""
import argparse
import json
import time
import urllib.request

OURS = "0xdad201ef02f5c1fbb8f9e931ae9b7c1bf493a39e"
URL = "https://devnode.telegraphprotocol.com/api/wasm"
END = {"canonical", "rejected", "deactivated", "replaced"}


def entries(family):
    req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0 (registration watch)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.load(r)
    return [e for e in data["intents"].get(family, {}).get("entries", []) if e["author_address"].lower() == OURS]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--family", required=True)
    ap.add_argument("--after", type=int, default=0, help="ignore registrations with ids at or below this")
    ap.add_argument("--hours", type=float, default=6)
    ap.add_argument("--every", type=int, default=180, help="seconds between reads")
    a = ap.parse_args()
    seen, deadline = {}, time.time() + a.hours * 3600
    while time.time() < deadline:
        try:
            for e in entries(a.family):
                rid = e["registration_id"]
                if rid <= a.after:
                    continue
                state = (e["activation_status"], e["stage"], e["eval_score"], e.get("rejection_reason") or "")
                if seen.get(rid) != state:
                    seen[rid] = state
                    print(f"{time.strftime('%H:%M:%SZ', time.gmtime())} #{rid} {state[0]}/{state[1]} "
                          f"score={state[2]} {state[3][:300]}", flush=True)
                if e["stage"] in END:
                    return
        except Exception as ex:  # one failed read must not end the watch
            print(f"{time.strftime('%H:%M:%SZ', time.gmtime())} read failed: {ex}", flush=True)
        time.sleep(a.every)
    print("watch ended: time is up", flush=True)


if __name__ == "__main__":
    main()
