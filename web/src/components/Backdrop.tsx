/** Soft lavender scene shared by every page: blurred colour blobs + two drifting waves. */
export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="blob blob-violet" />
      <div className="blob blob-sun" />
      <svg className="wave-b" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wb" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#ffd45e" stopOpacity="0.55" />
            <stop offset="0.35" stopColor="#c9baff" stopOpacity="0.5" />
            <stop offset="1" stopColor="#8f74ff" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <path fill="url(#wb)" d="M0 200c180-70 360-70 540-10s360 80 540 20 270-70 360-40v150H0z" />
      </svg>
      <svg className="wave-a" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wa" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#4b32c3" stopOpacity="0.85" />
            <stop offset="0.5" stopColor="#8f74ff" stopOpacity="0.5" />
            <stop offset="1" stopColor="#6c4cf1" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <path fill="url(#wa)" d="M0 260c200-50 380-30 560 10s380 40 560-10 240-40 320-20v80H0z" />
      </svg>
    </div>
  );
}
