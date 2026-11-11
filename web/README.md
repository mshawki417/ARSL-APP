# ArSL Web Demo — Arabic Sign Language Translator (browser edition)

An interactive, game-style web version of the desktop ArSL app, built as a **sales / presentation demo**.
Everything runs **in the browser** — no backend, no video upload.

| Screen | What it shows |
|---|---|
| Intro | Opening splash with the institutional logos, loads the AI models in the background |
| Live recognition (1) | Camera → letters + words, confidence bars, sentence builder, Arabic speech |
| Sign challenge (2) | 3 levels, timer, points, streak multiplier, stars, saved high scores |
| Stats (3) | Live FPS / latency per model, confidence chart, privacy note, sign "album" |
| How it works (4) | 5-step pipeline explainer + live numbers from the session |

Arabic-first (RTL) with an EN toggle. Shortcuts: `Enter` start · `1–4` jump · `Esc` home · `F` fullscreen.

## Run it

```bash
cd web
npm install        # also copies the WASM runtimes into public/ (postinstall)
npm run dev        # http://localhost:3000
npm test           # TypeScript ↔ original-Python feature parity tests
npm run build      # static site in web/out/
npm start          # serve web/out/ locally
```

Camera access needs **HTTPS or localhost**.

## Deploy (hosted link)

It is a fully static export (`output: "export"`), so any static host works.

* **Vercel**: import the repo, set *Root Directory* = `web`. Framework preset: Next.js. Done.
* **Netlify / Cloudflare Pages**: build command `npm run build`, publish directory `web/out`.
* **Sub-path hosting** (e.g. GitHub Pages `/repo`): set `NEXT_PUBLIC_BASE_PATH=/repo` at build time.

## How it works

```
camera ─► MediaPipe HandLandmarker (2 hands, IMAGE mode — same as the desktop app)
              ├─► 156 landmark features ─► StandardScaler ─► words.onnx   (32 words, 1.2 MB)
              └─► hand crop (mirrored frame) 224×224 ─► alphabet.onnx    (31 letters, 24 MB)
                                   highest confidence wins ─► smoothing ─► text / speech / game
```

* `src/lib/features.ts` is a line-by-line port of `_extract_features` from `inference_words.py`; `npm test`
  checks it against numbers produced by the original Python code (25 cases + scaler).
* `src/lib/smoothing.ts` ports the vote-smoothing of both classifiers (windows 8 / 6, 60 % agreement).
* Words use the **un-mirrored** frame, letters the **mirrored** one — exactly like the desktop app.
* `public/models/alphabet.onnx` was converted from `best_model.keras` (shipped in the GitHub release) with
  `tf2onnx`; output matches Keras to ~1e-6. `words.onnx` is the repo's `sign_model.onnx`;
  `scaler.json` is `scaler.pkl`'s mean/scale.

### One deliberate difference from the desktop app
The letters model's hand crop comes from **MediaPipe landmarks** (padded 30 %) instead of the YOLO detector
(YOLO is a PyTorch model and the landmarks are already computed for the words model). If letter accuracy on the
web looks lower than on desktop, tune `BOX_PADDING` in `src/lib/recognizer.ts` first.

## Things you may want to add

1. **Offline demos** — the hand model (`hand_landmarker.task`, ~7.8 MB) is downloaded from Google's CDN on first
   use. For a venue without internet, download it once and drop it at `public/models/hand_landmarker.task`;
   the app prefers the local copy automatically.
   `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`
2. **Reference photos for the challenge hint** — the repo has none. Until you add some, hints are *learned*:
   the first time a sign is recognised with ≥ 85 % confidence its skeleton is saved in the browser
   (localStorage), so rehearse the signs once before presenting. To use photos instead, put
   `public/signs/letter-<index>.webp` / `word-<index>.webp` (index = model output index, see `src/lib/labels.ts`).
3. **Arabic voice** — speech uses the browser's Web Speech API. Windows/macOS/Chrome/Edge normally have an Arabic
   voice; the app tells you when none is found.

## Known limits (be upfront with the audience)

* Accuracy is whatever the two trained models give: the letters model was trained on one public RGB dataset and
  the words model on KArSL-502 landmarks. Lighting, camera angle and a plain background matter.
* Letters are single-hand signs; a few words use two hands (the camera must see both).
* Alphabet inference runs on CPU WebAssembly (~90 ms on a typical laptop), so letters update ~8–10×/s.


## Landing page (v2)

- `/` is the landing page (hero motion-graphic video, numbers, features, how it works, try-without-camera, use cases, FAQ, CTA). The demo lives at `/demo/`.
- Contact buttons: edit `src/lib/site.ts` (WhatsApp number / email). Empty values hide the buttons.
- Hero video: `public/video/hero.mp4` + `poster.jpg` (illustrative poses, not real signs).
