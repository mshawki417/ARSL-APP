"use client";

import { useEffect } from "react";

/**
 * Site-wide interaction layer, mounted once in the root layout:
 *  - click ripple on every `.btn` / `.seg-btn`
 *  - `.reveal` elements fade in when scrolled into view (only once JS is running)
 *  - `.spot` cards get a cursor-following spotlight + a light 3D tilt
 * Everything is skipped for visitors who prefer reduced motion.
 */
export function Fx() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.classList.add("js");

    /* ----------------------------- ripple ----------------------------- */
    const onClick = (e: MouseEvent) => {
      if (reduce) return;
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(".btn, .seg-btn");
      if (!el || (el as HTMLButtonElement).disabled) return;
      const r = el.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2;
      const span = document.createElement("span");
      span.className = "ripple";
      span.style.width = span.style.height = `${size}px`;
      span.style.left = `${e.clientX - r.left - size / 2}px`;
      span.style.top = `${e.clientY - r.top - size / 2}px`;
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.appendChild(span);
      span.addEventListener("animationend", () => span.remove(), { once: true });
    };
    document.addEventListener("click", onClick);

    /* ---------------------------- reveal ---------------------------- */
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    const watch = () => document.querySelectorAll<HTMLElement>(".reveal:not(.in)").forEach((n) => io.observe(n));
    watch();
    // pages mount new sections later (screen changes, lazy content)
    const mo = new MutationObserver(watch);
    mo.observe(document.body, { childList: true, subtree: true });

    /* --------------------------- spotlight --------------------------- */
    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(".spot");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
      if (!reduce && el.dataset.tilt !== "off") {
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg) translateY(-4px)`;
      }
    };
    const onLeave = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(".spot");
      if (el) el.style.transform = "";
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerout", onLeave);

    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
