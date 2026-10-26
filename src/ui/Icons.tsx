// Line icons in the gold ornament style of the UI (stroke = currentColor).

type P = { size?: number };
const base = (size = 22) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const MountainLogo = ({ size = 120 }: P) => (
  <svg width={size} height={size * 0.38} viewBox="0 0 160 60" fill="currentColor" aria-hidden>
    <path d="M0 60 L48 18 L60 28 L84 4 L104 26 L114 18 L160 60 Z" opacity="0.95" />
    <path d="M84 4 L76 16 L84 13 L90 20 L95 16 Z M48 18 L42 26 L49 23 L54 28 Z" fill="#14213d" opacity="0.55" />
  </svg>
);

export const Compass = ({ size }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15.5 8.5 13 13l-4.5 2.5L11 11z" />
  </svg>
);

export const Journal = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
    <path d="M5 17a3 3 0 0 1 3-3h11M9 8h6" />
  </svg>
);

export const Gear = ({ size }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

export const Sound = ({ size, on = true }: P & { on?: boolean }) => (
  <svg {...base(size)}>
    <path d="M4 9h4l5-4v14l-5-4H4z" />
    {on ? <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /> : <path d="m17 9 5 6m0-6-5 6" />}
  </svg>
);

export const Sun = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M3 17h18M6 17a6 6 0 0 1 12 0M12 5v2M5.6 8.6l1.4 1.4M18.4 8.6 17 10M3 13h1.5M19.5 13H21" />
  </svg>
);

export const Home = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M4 11.5a8 5 0 0 1 16 0V19H4z" />
    <path d="M10 19v-5h4v5M12 6.5V4" />
  </svg>
);

export const Ornament = ({ size = 18 }: P) => (
  <svg {...base(size)} strokeWidth={1.3}>
    <path d="M12 2 22 12 12 22 2 12z" />
    <path d="M12 7l5 5-5 5-5-5z" />
  </svg>
);

export const Arrow = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M4 12h15M14 7l5 5-5 5" />
  </svg>
);
