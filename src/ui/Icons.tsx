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

export const Bag = ({ size }: P) => (
  <svg {...base(size)}>
    {/* leather saddlebag (дөрвөлжин уут) with a flap and a strap */}
    <path d="M5 10.5c0-1.4 1.1-2.5 2.5-2.5h9c1.4 0 2.5 1.1 2.5 2.5V18a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
    <path d="M5 11.5c2.2 2 11.8 2 14 0M12 13.6v2" />
    <path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" />
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

// ---- starting activity glyphs
export const ActivityIcon = ({ id, size = 40 }: { id: string; size?: number }) => {
  const p = { ...base(size), strokeWidth: 1.3 };
  switch (id) {
    case 'herding':
      return (
        <svg {...p}>
          <path d="M6 13c0-2.5 2.2-4.5 5-4.5S16 10 16 13s-2.2 3.5-5 3.5S6 15.5 6 13z" />
          <path d="M16 11.5c1-.8 2.5-.6 3 .4s-.2 2.2-1.4 2.4M8 16.5V19M14 16.5V19M5 11l-1.5-1" />
        </svg>
      );
    case 'dairy':
      return (
        <svg {...p}>
          <path d="M7 6h10l-1 13H8z" />
          <path d="M7 9.5h10M10 6V4h4v2" />
        </svg>
      );
    case 'sewing':
      return (
        <svg {...p}>
          <path d="M4 20 18 6M18 6l1.5-1.5M15 5l4 4" />
          <path d="M6 18c4 1 9-1 12-6" strokeDasharray="1.5 2" />
        </svg>
      );
    case 'felt':
      return (
        <svg {...p}>
          <rect x="4" y="9" width="16" height="7" rx="3.5" />
          <path d="M8 9v7M16 9v7M3 12.5h-1M22 12.5h-1" />
        </svg>
      );
    case 'riding':
      return (
        <svg {...p}>
          <path d="M5 15c1-4 4-6 8-6l3-3 1 2 2 1-2 2v4" />
          <path d="M7 15v4M11 15v4M15 15v4M17 15v4M5 15h12" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <path d="M4 13a8 5 0 0 1 16 0v6H4z" />
          <path d="M10 19v-4h4v4M12 8V5" />
        </svg>
      );
  }
};
