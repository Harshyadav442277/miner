"""Run a command and keep its evidence: <log>.command.json (argv, cwd, env keys set, start and
end UTC, exit code) and <log> (combined stdout/stderr), the finish_v6.ps1 pattern.

    python record.py <log path> [--cwd DIR] [--env K=V ...] -- <command ...>
"""
import argparse
import datetime
import json
import os
import subprocess
import sys


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def main():
    argv = sys.argv[1:]
    cut = argv.index("--")
    ap = argparse.ArgumentParser()
    ap.add_argument("log")
    ap.add_argument("--cwd", default=os.getcwd())
    ap.add_argument("--env", action="append", default=[])
    a = ap.parse_args(argv[:cut])
    cmd = argv[cut + 1:]
    env = dict(os.environ)
    extra = dict(kv.split("=", 1) for kv in a.env)
    env.update(extra)
    rec = {"argv": cmd, "cwd": a.cwd, "env_set": extra, "started_at": now()}
    with open(a.log, "w", encoding="utf-8") as log:
        p = subprocess.Popen(cmd, cwd=a.cwd, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                             text=True, encoding="utf-8", errors="replace")
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # cp1252 console crashed on '→'
        for line in p.stdout:
            sys.stdout.write(line)
            log.write(line)
            log.flush()
        rec["exit_code"] = p.wait()
    rec["finished_at"] = now()
    with open(a.log + ".command.json", "w", encoding="utf-8") as f:
        json.dump(rec, f, indent=1)
    sys.exit(rec["exit_code"])


if __name__ == "__main__":
    main()
