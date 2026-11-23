"""Run training lanes one after another, immune to console Ctrl+C, and keep the PC from idle sleep while it runs.

    python -I train_queue.py --job VULNERABILITY_TRIAGE:vt_v1:vt_v1 --job QUESTION_ANSWERING:qa_v4:qa_v4:16:32:4:0.0003 \
        --awake-hours 10

Each job is Intent:Run:Pairs[:rank:alpha:epochs:lr]. A job whose runs-v2/<Run>/chain.log says "chain end" is skipped.
Each lane runs train_package.ps1 in its own hidden console and a new process group (Ctrl+C disabled there), so a Ctrl+C sent to another console cannot reach it.
That signal killed the pwsh-based queue and its training on 2026-11-23. This runner also ignores Ctrl+C. While it
runs, and for --awake-hours in all, it asks Windows to stay awake (SetThreadExecutionState, released when it exits;
no power setting is changed). Start it detached: WMI Win32_Process.Create with the full python.exe path.
"""
import argparse
import ctypes
import os
import shutil
import signal
import subprocess
import threading
import time

HERE = os.path.dirname(os.path.abspath(__file__))
DETACHED = 0x08000000 | 0x00000200  # CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP (no-console pwsh exits silently)


def keep_awake(until):
    while time.time() < until:
        ctypes.windll.kernel32.SetThreadExecutionState(0x80000001)  # ES_CONTINUOUS | ES_SYSTEM_REQUIRED
        time.sleep(30)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--job", action="append", default=[])
    ap.add_argument("--awake-hours", type=float, default=8)
    ap.add_argument("--eval-root", default="C:/Users/hyada/tg-eval")
    a = ap.parse_args()
    signal.signal(signal.SIGINT, signal.SIG_IGN)
    ctypes.windll.kernel32.SetConsoleCtrlHandler(None, True)
    until = time.time() + a.awake_hours * 3600
    threading.Thread(target=keep_awake, args=(until,), daemon=True).start()
    # Under WMI the Store alias may not be on PATH; fall back to the installed package path.
    pwsh = shutil.which("pwsh") or os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WindowsApps\pwsh.exe")
    for job in a.job:
        intent, run, pairs, *hp = job.split(":")
        log = os.path.join(a.eval_root, "runs-v2", run, "chain.log")
        if os.path.exists(log) and "chain end" in open(log, encoding="utf-8", errors="replace").read():
            continue
        rank, alpha, epochs, lr = (hp + ["8", "32", "3", "0.0001"][len(hp):])[:4]
        os.makedirs(os.path.dirname(log), exist_ok=True)
        with open(os.path.join(a.eval_root, f"queue-{run}.out"), "w") as out:
            subprocess.run([pwsh, "-NoProfile", "-File", os.path.join(HERE, "train_package.ps1"), "-Intent", intent,
                            "-Run", run, "-Pairs", pairs, "-BatchSize", "1", "-GradAccum", "16", "-FreeMiB", "2200",
                            "-Rank", rank, "-Alpha", alpha, "-Epochs", epochs, "-Lr", lr],
                           stdout=out, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, creationflags=DETACHED)
    while time.time() < until:  # keep the executors' host awake for the rest of the window
        time.sleep(60)


if __name__ == "__main__":
    try:
        main()
    except Exception:  # a detached process has nowhere else to report
        import traceback
        with open("C:/Users/hyada/tg-eval/queue-runner.err", "a") as f:
            traceback.print_exc(file=f)
        raise
