"""Start run_local.ps1 so it outlives this session and ignores console Ctrl+C, then exit.

    python -I launch.py --out C:/Users/hyada/tg-eval/executor-ts2.out --port 18390 \
        --package TEXT_SUMMARIZATION=C:/Users/hyada/tg-eval/runs-v2/ts_v1b/TEXT_SUMMARIZATION.safetensors

Run this launcher itself through WMI (Win32_Process.Create with the full python.exe path), so it is outside the
session's process tree. It starts pwsh in its own hidden console and a new process group, where Ctrl+C is disabled.
On 2026-11-23 a session restart, and then a console Ctrl+C, killed executors started any other way, and #217 was
rejected for an unreachable runnable.
"""
import argparse
import os
import shutil
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
FLAGS = 0x08000000 | 0x00000200  # CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--port", required=True)
    ap.add_argument("--package", action="append", required=True, help="FAMILY=path")
    a = ap.parse_args()
    pwsh = shutil.which("pwsh") or os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WindowsApps\pwsh.exe")
    out = open(a.out, "w")
    p = subprocess.Popen([pwsh, "-NoProfile", "-File", os.path.join(HERE, "run_local.ps1"), "-Port", a.port,
                          "-Package", ",".join(a.package)],
                         stdout=out, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, creationflags=FLAGS)
    with open(a.out + ".pid", "w") as f:
        f.write(str(p.pid))


if __name__ == "__main__":
    main()
