#!/usr/bin/env python3
"""Generate natural Arabic voice clips for every sign (31 letters + 32 words).

Run ONCE on your own computer (needs internet):
    pip install edge-tts
    python scripts/make_voice.py                    # default voice: Egyptian female
    python scripts/make_voice.py --voice ar-SA-HamedNeural   # Saudi male
    python scripts/make_voice.py --list             # show Arabic voices

Output: public/voice/<id>.mp3 and public/voice/manifest.json.
The web app plays these clips (one after another for a sentence) and falls back
to the browser voice for any sign that has no clip.
"""
import argparse, asyncio, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
LETTER_NAMES = {
    "ع": "عَيْن", "ال": "أَلْ", "أ": "أَلِف", "ب": "بَاء", "ض": "ضَاد", "د": "دَال", "ف": "فَاء",
    "غ": "غَيْن", "ح": "حَاء", "ه": "هَاء", "ج": "جِيم", "ك": "كَاف", "خ": "خَاء", "لا": "لَا",
    "ل": "لَام", "م": "مِيم", "ن": "نُون", "ق": "قَاف", "ر": "رَاء", "ص": "صَاد", "س": "سِين",
    "ش": "شِين", "ط": "طَاء", "ت": "تَاء", "ة": "تَاء مَرْبُوطَة", "ذ": "ذَال", "ث": "ثَاء",
    "و": "وَاو", "ي": "يَاء", "ظ": "ظَاء", "ز": "زَاي",
}

def read_labels():
    src = (ROOT / "src/lib/labels.ts").read_text(encoding="utf-8")
    out = {}
    for name, kind in (("LETTERS", "letter"), ("WORDS", "word")):
        block = re.search(name + r".*?=\s*\[(.*?)\n\];", src, re.S).group(1)
        out[kind] = re.findall(r'\["([^"]+)",\s*"[^"]+"\]', block)
    return out

async def main():
    import edge_tts
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="ar-EG-SalmaNeural")
    ap.add_argument("--rate", default="-5%")
    ap.add_argument("--list", action="store_true")
    a = ap.parse_args()
    if a.list:
        for v in await edge_tts.list_voices():
            if v["Locale"].startswith("ar"):
                print(v["ShortName"], v["Gender"])
        return
    out = ROOT / "public/voice"
    out.mkdir(parents=True, exist_ok=True)
    labels = read_labels()
    ids = []
    for kind, items in labels.items():
        for i, ar in enumerate(items):
            text = LETTER_NAMES.get(ar, ar) if kind == "letter" else ar
            cid = f"{kind}_{i}"
            await edge_tts.Communicate(text, a.voice, rate=a.rate).save(str(out / f"{cid}.mp3"))
            ids.append(cid)
            print("ok", cid, text)
    (out / "manifest.json").write_text(json.dumps({"voice": a.voice, "ids": ids}), encoding="utf-8")
    print(f"done: {len(ids)} clips in {out}")

if __name__ == "__main__":
    asyncio.run(main())
