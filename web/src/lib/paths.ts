/** Prefix for static assets when the site is served from a sub-path (e.g. GitHub Pages). */
export const BASE_PATH: string = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const asset = (p: string): string => `${BASE_PATH}${p.startsWith("/") ? p : `/${p}`}`;
