"""Verify committed/staged source bytes against frozen probe manifests."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--revision", default="HEAD")
    ap.add_argument("--staged", action="store_true")
    args = ap.parse_args()
    root = Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"]).decode().strip())
    base = Path(__file__).resolve().parent.relative_to(root).as_posix()
    prefix = "" if args.staged else args.revision
    def blob(path):
        return subprocess.check_output(["git", "show", prefix+":"+path], cwd=root)
    checks = []
    for version in (21, 22, 25, 26, 27, 28, 30, 31, 32):
        inputs = json.loads(blob(f"{base}/evidence/v{version}-plan/frozen-inputs.json"))
        for name, expected in inputs["dependencies"].items():
            actual = hashlib.sha256(blob(f"{base}/{name}")).hexdigest()
            checks.append({"version": version, "source": name, "expected_sha256": expected,
                           "actual_sha256": actual, "pass": expected == actual})
    result = {"pass": all(c["pass"] for c in checks), "checks": checks,
              "scope": "Frozen dependency bytes in Git index" if args.staged else "Frozen dependency bytes at "+args.revision}
    print(json.dumps(result, indent=1))
    if not result["pass"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
