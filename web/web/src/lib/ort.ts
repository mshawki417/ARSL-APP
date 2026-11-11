import type * as OrtNamespace from "onnxruntime-web";
import { asset } from "./paths";

export type Ort = typeof OrtNamespace;

let loading: Promise<Ort> | null = null;

/**
 * Loads onnxruntime-web (CPU/WASM build) from /public/ort as a classic script.
 * Doing it this way keeps the ~15 MB runtime out of the JS bundle and sidesteps
 * bundler quirks with WASM loaders. The script defines a global `ort`.
 */
export function loadOrt(): Promise<Ort> {
  if (typeof window === "undefined") return Promise.reject(new Error("ORT can only load in the browser"));
  const w = window as unknown as { ort?: Ort };
  if (w.ort) return Promise.resolve(w.ort);

  loading ??= new Promise<Ort>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = asset("/ort/ort.wasm.min.js");
    s.async = true;
    s.onload = () => {
      const ort = w.ort;
      if (!ort) return reject(new Error("onnxruntime-web loaded but did not expose `ort`"));
      ort.env.wasm.wasmPaths = asset("/ort/");
      // Multi-threading needs cross-origin isolation (COOP/COEP headers). Stay single-threaded
      // so the demo works on any static host without special headers.
      ort.env.wasm.numThreads = 1;
      ort.env.logLevel = "error";
      resolve(ort);
    };
    s.onerror = () => {
      loading = null;
      reject(new Error("Could not load the ONNX runtime (/ort/ort.wasm.min.js)"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/** Fetch a binary with progress callbacks (0..1). */
export async function fetchBytes(
  url: string,
  onProgress?: (fraction: number) => void,
  expectedBytes?: number,
): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url} (${res.status})`);
  const total = Number(res.headers.get("content-length")) || expectedBytes || 0;
  if (!res.body || !total) {
    const buf = await res.arrayBuffer();
    onProgress?.(1);
    return buf;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    onProgress?.(Math.min(1, got / total));
  }
  const out = new Uint8Array(got);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  onProgress?.(1);
  return out.buffer;
}
