"""Own one local executor for the duration of a holdout replay, then stop it."""
import argparse
import os
from pathlib import Path
import subprocess
import sys
import time


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('capture', type=Path)
    ap.add_argument('--package', type=Path, required=True)
    ap.add_argument('--hash', required=True)
    ap.add_argument('--name', required=True)
    args = ap.parse_args()
    root = Path('C:/Users/hyada/tg-eval')
    env = dict(os.environ)
    for key, value in {
        'FOUNDATION_MODEL_PATH': str(root/'foundation/foundation_lora_fp32.onnx'),
        'FOUNDATION_MODEL_HASH': '0a49b325304bb4cf292e683929689d0457966be264f60bfc94d0072b614bf8e6',
        'FOUNDATION_ENGINE_WASM_PATH': str(root/'foundation/foundation_engine.wasm'),
        'FOUNDATION_ENGINE_WASM_HASH': '77643d6e1176ab8744801cef93ccb844d0136ed32b8daa865d541f37d13292de',
    }.items():
        env[key] = value
    log_path = args.capture / f'{args.name}-runtime.log'
    with log_path.open('w', encoding='utf-8') as log:
        proc = subprocess.Popen([str(root/'bin-v2/adapterexec.exe'), '-package', str(args.package),
                                 '-listen', '127.0.0.1:18194'], env=env, stdout=log, stderr=log,
                                creationflags=subprocess.CREATE_NO_WINDOW)
        try:
            deadline = time.monotonic() + 45
            while 'listening' not in log_path.read_text(encoding='utf-8'):
                if proc.poll() is not None or time.monotonic() > deadline:
                    raise RuntimeError(log_path.read_text(encoding='utf-8'))
                time.sleep(.25)
            if args.hash.removeprefix('0x') not in log_path.read_text(encoding='utf-8'):
                raise RuntimeError('runtime loaded a different package')
            subprocess.run([sys.executable, str(Path(__file__).with_name('score_holdout.py')),
                            str(args.capture/'pairs.jsonl'), '--url', 'http://127.0.0.1:18194/',
                            '--package', str(args.package), '--hash', args.hash,
                            '--foundation', str(root/'foundation'),
                            '--out', str(args.capture/f'{args.name}-scores.json')], check=True)
        finally:
            proc.terminate()
            proc.wait(timeout=15)
