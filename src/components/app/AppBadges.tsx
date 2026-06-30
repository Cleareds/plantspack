import { APPSTORE_URL, PLAY_URL } from '@/lib/app-links'

// Self-contained App Store / Google Play badges (no external image / CSP risk).
// Faithful black-badge style; to use Apple/Google's exact official artwork,
// drop the PNGs in /public/badges and swap the inner markup for <img>.
export default function AppBadges({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <a
        href={APPSTORE_URL}
        target="_blank"
        rel="noopener"
        aria-label="Download PlantsPack on the App Store"
        className="inline-flex items-center gap-2 h-11 px-3.5 rounded-xl bg-black text-white hover:opacity-90 transition-opacity"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="currentColor" aria-hidden>
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
        <span className="leading-tight text-left">
          <span className="block text-[9px] uppercase tracking-wide opacity-80">Download on the</span>
          <span className="block text-sm font-semibold -mt-0.5">App Store</span>
        </span>
      </a>
      <a
        href={PLAY_URL}
        target="_blank"
        rel="noopener"
        aria-label="Get PlantsPack on Google Play"
        className="inline-flex items-center gap-2 h-11 px-3.5 rounded-xl bg-black text-white hover:opacity-90 transition-opacity"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden>
          <path d="M3.6 2.3 13.4 12 3.6 21.7c-.37-.2-.6-.58-.6-1.06V3.36c0-.48.23-.86.6-1.06z" fill="#34d399" />
          <path d="M13.4 12 16.9 8.5l3.9 2.2c.8.46.8 1.62 0 2.08l-3.9 2.2L13.4 12z" fill="#fbbf24" />
          <path d="M3.6 2.3c.27-.15.6-.17.95.03L17.1 9.6l-3.7 2.4L3.6 2.3z" fill="#60a5fa" />
          <path d="M13.4 12l3.7 2.4-12.55 7.27c-.35.2-.68.18-.95.03L13.4 12z" fill="#f87171" />
        </svg>
        <span className="leading-tight text-left">
          <span className="block text-[9px] uppercase tracking-wide opacity-80">Get it on</span>
          <span className="block text-sm font-semibold -mt-0.5">Google Play</span>
        </span>
      </a>
    </div>
  )
}
