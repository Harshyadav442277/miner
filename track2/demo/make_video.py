"""Build the Track 2 demo video (2-5 min) from real outputs: slides + offline narration, assembled with ffmpeg.

    python -I make_video.py --work C:/Users/hyada/tg-eval/demo --out C:/Users/hyada/tg-eval/demo/track2-demo.mp4

Every slide body is either a command output saved in --work (slideN.txt, captured 2026-11-17) or a number copied
from a committed record (GAPS G42-G50, adapter READMEs). Narration uses Windows' offline System.Speech voice, so no
text leaves the machine. Needs Pillow and ffmpeg on PATH.
"""
import argparse
import subprocess
import sys
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent  # slide2.txt and slide5.txt: command outputs captured 2026-11-17
W, H, BG, FG, ACCENT, DIM = 1920, 1080, (16, 20, 28), (232, 236, 242), (110, 190, 255), (150, 160, 175)
FONTS = "C:/Windows/Fonts/"

SLIDES = [
    ("Telegraph Season II - Evaluator track",
     "Measuring miners on answers we did not write.\n\nIntent: EMAIL_SECURITY_GENERAL (and 8 more families)\n"
     "Network: Telegraph devnode (testnet). Nothing here is a production ranking claim.\n\n"
     "Repo: github.com/Harshyadav442277/miner  (branch PR/cranky-euler-d201bb, folder track2/)",
     "This is our Telegraph Season Two evaluator entry. An evaluator decides which miner answered an intent best, "
     "so Telegraph can route each request to the best miner. We measured miners only on answers we did not write."),
    ("1. The real input: a live intent", "@slide2.txt",
     "Here is the live intent from the Telegraph node. EMAIL SECURITY takes a domain and a record type. The one "
     "scored field is lookup ok: did the DNS lookup return no error. Nineteen miners serve it."),
    ("2. Freeze the questions, then ask every miner",
     "$ python freeze.py --verify holdout/queries.freeze.json\nOK  queries.json  sha256 21acfac5...ef25  rows 300\n\n"
     "300 real names from the Tranco list: half resolve, half do not (NXDOMAIN).\nFrozen and committed BEFORE any answer was seen.\n\n"
     "$ python capture.py EMAIL_SECURITY_GENERAL queries.json --out es-20261116\n"
     "9 distinct services x 300 queries = 2,716 real answers\n"
     "(each miner called exactly as its own YAML declares; no paid route, 1 req/s per host)",
     "First we freeze three hundred real domain questions, half of which do not exist, before seeing any answer. "
     "Then we call every miner exactly as its own configuration declares, and keep every raw response."),
    ("3. The truth comes from DNS itself",
     "$ python dnstruth.py queries.json --out truth-before.jsonl\n{\"rows\": 300, \"by_status\": {\"NOERROR\": 150, \"NXDOMAIN\": 147, \"SERVFAIL\": 3}}\n\n"
     "$ python dnstruth.py queries.json --out truth-after.jsonl\n{\"rows\": 300, \"by_status\": {\"NOERROR\": 150, \"NXDOMAIN\": 147, \"SERVFAIL\": 3}}\n\n"
     "Two public resolvers that are NOT miners here (NextDNS, DNS.SB).\nA query counts only if both agree, before and after the capture: 300/300 did.",
     "The labels come from DNS itself, through two public resolvers that are not miners in this family. Both agreed on "
     "all three hundred names, before and after the capture."),
    ("4. The result: who is right, per service", "@slide5.txt",
     "Most services are right almost every time. One service reported sixty one names that do not exist as successful "
     "lookups. Two services answered a different question altogether."),
    ("5. Why we did not train on this",
     "65 usable pairs (one per query); identity probe = 0.954\n\n"
     "61 of the 69 wrong answers come from ONE service.\n"
     "A scorer could 'win' here by recognising that service's format,\nnot by checking the answer.\n\n"
     "Our gate refuses any holdout where service identity predicts the label\n(bar 0.65, fixed before capture). Same stop, same reason:\n"
     "  WEATHER_FORECAST_VERIFY 0.696   VULNERABILITY_TRIAGE ~1.0   OPTIMAL_EXECUTION_ROUTE: 0 wrong answers",
     "So we stopped. Sixty one of the sixty nine wrong answers came from one service. A scorer could win by recognising "
     "that service instead of checking the answer. Our gate, fixed before any capture, refuses that, and three more "
     "families stopped for the same reason."),
    ("6. Where we did train: the gate said no",
     "QUESTION_ANSWERING v2 vs champion #301, frozen 362-pair holdout, node runtime\n\n"
     "V2 0.4337 [0.3836, 0.4852] vs QA301 0.4530 [0.4025, 0.5045] n=362\n"
     "FAIL: candidate 0.4337 < QA301 0.4530 + 0.02\n"
     "FAIL: candidate Wilson lower bound 0.3836 < 0.7\n"
     "FAIL: candidate 0.4337 < shorter-answer-wins 0.5166 + 0.05\n"
     "FAIL: P(pass a 30-pair round vs QA301) = 0.0026 < 0.6\nFAIL\n\n"
     "Our own test split had passed. It predicted nothing. So nothing was registered.",
     "Where answers do turn on content, we trained twice, and the gate said no: forty three percent against the "
     "champion's forty five. Our own test split had passed, and it predicted nothing. So we registered nothing."),
    ("7. What we contribute instead",
     "DNS_RECORD_LOOKUP_GENERAL            last scored epoch 2019 (now 2107+)\n"
     "VALIDATOR_PERFORMANCE_VERIFY_GENERAL  last scored epoch 2032\n\n"
     "Prepared truth sources (keyless public APIs we do not run):\n"
     "  DNS.SB + NextDNS DoH            sha256 ccc8e992...0123\n"
     "  PublicNode beacon REST         sha256 bfcdb813...3e10\n"
     "  + 40 real EMAIL_SECURITY pairs  sha256 897164b3...20bd\n\n"
     "Disclosed: our miner (livecert) serves DNS_RECORD_LOOKUP.\nSuccess is claimed only when /api/miners shows new scores.",
     "Two deterministic intents have not been ranked for days. We prepared neutral truth sources from public APIs we do "
     "not run, and disclose that our own miner serves one of the intents. We will claim success only when the network "
     "shows new scores."),
    ("8. Try it yourself in 15 minutes",
     "$ git clone https://github.com/Harshyadav442277/miner && cd miner\n"
     "$ git checkout PR/cranky-euler-d201bb && cd track2/harness\n"
     "$ python freeze.py --verify ../adapter/email_security/holdout/pilot.freeze.json\n"
     "$ python capture.py EMAIL_SECURITY_GENERAL ../adapter/email_security/holdout/pilot.json --out ../../cap\n"
     "$ python -I ../adapter/email_security/dnstruth.py ... --out ../../truth-before.jsonl\n"
     "$ python -I ../adapter/email_security/build_holdout.py ...\n\n"
     "Our run 2026-11-17: 54 answers - 40 right, 8 call failures, 6 ignoring the query.\n"
     "Free: no wallet, no key. Guide: track2/TUTORIAL.md\nLimits: GAPS G43-G50 (prompt rendering of the hidden pool is unknown).",
     "You can reproduce this in about fifteen minutes with no wallet and no key. The tutorial is in the repository. "
     "If our labels are wrong, open an issue with the query and the command. Thanks for watching."),
]


def font(name, size):
    return ImageFont.truetype(FONTS + name, size)


def render(i, title, body, work):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((90, 70), title, font=font("arialbd.ttf", 58), fill=ACCENT)
    d.line((90, 160, W - 90, 160), fill=DIM, width=2)
    text = (HERE / body[1:]).read_text(encoding="utf-8") if body.startswith("@") else body
    mono = font("consola.ttf", 30)
    y = 200
    for line in text.splitlines():
        d.text((90, y), line[:110], font=mono, fill=FG)
        y += 44
    d.text((90, H - 70), f"Telegraph Season II - Evaluator track - {i + 1}/{len(SLIDES)}", font=font("arial.ttf", 26), fill=DIM)
    path = work / f"slide{i + 1:02d}.png"
    img.save(path)
    return path


def speak(text, path):
    ps = ("Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
          f"$s.Rate = 0; $s.SetOutputToWaveFile('{path}'); $s.Speak([Console]::In.ReadToEnd()); $s.Dispose()")
    subprocess.run(["powershell", "-NoProfile", "-Command", ps], input=text, text=True, check=True)
    with wave.open(str(path)) as w:
        return w.getnframes() / w.getframerate()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    segs, total = [], 0.0
    for i, (title, body, narration) in enumerate(SLIDES):
        png = render(i, title, body, a.work)
        wav = a.work / f"slide{i + 1:02d}.wav"
        secs = speak(narration, wav)
        seg = a.work / f"seg{i + 1:02d}.mp4"
        dur = secs + 1.2
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", str(png), "-i", str(wav),
                        "-af", "apad", "-t", f"{dur:.2f}", "-c:v", "libx264", "-tune", "stillimage", "-pix_fmt", "yuv420p",
                        "-r", "30", "-c:a", "aac", "-b:a", "128k", str(seg)], check=True)
        segs.append(seg)
        total += dur
    lst = a.work / "segments.txt"
    lst.write_text("".join(f"file '{s.as_posix()}'\n" for s in segs), encoding="utf-8")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy",
                    str(a.out)], check=True)
    print(f"{a.out}  {len(segs)} slides  {total:.1f} s")


if __name__ == "__main__":
    sys.exit(main())
