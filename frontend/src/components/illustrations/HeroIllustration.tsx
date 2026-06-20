export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 480 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto max-w-md"
      role="img"
      aria-label="Illustration of a family being supported, with a leaf and document representing benefits and care"
    >
      {/* Background warm circle */}
      <circle cx="240" cy="240" r="220" fill="#F3EFE7" />
      <circle cx="240" cy="240" r="170" fill="#DDEFE7" opacity="0.7" />

      {/* Sun-like rays for warmth */}
      <g stroke="#F1E4C9" strokeWidth="10" strokeLinecap="round">
        <line x1="240" y1="40" x2="240" y2="70" />
        <line x1="370" y1="80" x2="350" y2="105" />
        <line x1="110" y1="80" x2="130" y2="105" />
      </g>

      {/* Ground */}
      <ellipse cx="240" cy="410" rx="190" ry="20" fill="#E6E0D6" opacity="0.6" />

      {/* Parent figure */}
      <g>
        <ellipse cx="175" cy="330" rx="55" ry="70" fill="#1F6B4F" />
        <circle cx="175" cy="225" r="38" fill="#2B2B2B" opacity="0.85" />
        <circle cx="175" cy="222" r="34" fill="#F1E4C9" />
        {/* simple smile */}
        <path d="M160 232 Q175 244 190 232" stroke="#2B2B2B" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="163" cy="216" r="3" fill="#2B2B2B" />
        <circle cx="187" cy="216" r="3" fill="#2B2B2B" />
      </g>

      {/* Child figure */}
      <g>
        <ellipse cx="275" cy="355" rx="42" ry="55" fill="#C96F4A" />
        <circle cx="275" cy="278" r="30" fill="#2B2B2B" opacity="0.85" />
        <circle cx="275" cy="276" r="27" fill="#F1E4C9" />
        <path d="M263 285 Q275 295 287 285" stroke="#2B2B2B" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="265" cy="270" r="2.5" fill="#2B2B2B" />
        <circle cx="285" cy="270" r="2.5" fill="#2B2B2B" />
      </g>

      {/* Holding hands */}
      <path
        d="M215 310 Q235 300 250 312"
        stroke="#2B2B2B"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />

      {/* Floating leaf */}
      <g transform="translate(95 150) rotate(-15)">
        <path
          d="M0 20 C0 -5 25 -20 45 -10 C40 15 15 25 0 20 Z"
          fill="#1F6B4F"
        />
        <path d="M2 18 C15 5 30 -2 43 -9" stroke="#DDEFE7" strokeWidth="2" fill="none" />
      </g>

      {/* Floating document / benefit card */}
      <g transform="translate(330 150)">
        <rect x="0" y="0" width="58" height="72" rx="8" fill="#FFFFFF" stroke="#E6E0D6" strokeWidth="2" />
        <rect x="12" y="14" width="34" height="6" rx="3" fill="#DDEFE7" />
        <rect x="12" y="28" width="34" height="6" rx="3" fill="#F1E4C9" />
        <rect x="12" y="42" width="20" height="6" rx="3" fill="#DDEFE7" />
        <circle cx="44" cy="56" r="10" fill="#1F6B4F" />
        <path d="M40 56 l3 3 l6 -7" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Small coin / rupee accent */}
      <g transform="translate(140 90)">
        <circle cx="0" cy="0" r="18" fill="#F1E4C9" stroke="#1F6B4F" strokeWidth="2" />
        <text x="0" y="6" textAnchor="middle" fontSize="18" fill="#1F6B4F" fontFamily="sans-serif" fontWeight="700">
          ₹
        </text>
      </g>
    </svg>
  );
}
