// Copies the WebAssembly runtimes out of node_modules into /public so the
// browser loads them from the same origin (no CDN dependency, works offline).
// Runs automatically after `npm install` (see "postinstall" in package.json).
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nm = join(root, "node_modules");

function copyMatching(srcDir, destDir, test) {
  if (!existsSync(srcDir)) {
    console.warn(`[copy-wasm] missing ${srcDir} — skipped`);
    return 0;
  }
  mkdirSync(destDir, { recursive: true });
  let n = 0;
  for (const f of readdirSync(srcDir)) {
    if (test(f)) {
      cpSync(join(srcDir, f), join(destDir, f));
      n++;
    }
  }
  return n;
}

// onnxruntime-web: the CPU/WASM build only (we don't use WebGPU/asyncify variants,
// which would add ~75 MB of unused binaries to the deployment).
const ORT_FILES = new Set([
  "ort.wasm.min.js",
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm",
]);
const ort = copyMatching(
  join(nm, "onnxruntime-web", "dist"),
  join(root, "public", "ort"),
  (f) => ORT_FILES.has(f),
);

// MediaPipe tasks-vision wasm fileset (SIMD builds; every current browser supports SIMD).
const mp = copyMatching(
  join(nm, "@mediapipe", "tasks-vision", "wasm"),
  join(root, "public", "mediapipe", "wasm"),
  (f) => !f.includes("nosimd"),
);

console.log(`[copy-wasm] onnxruntime-web files: ${ort}, mediapipe wasm files: ${mp}`);
