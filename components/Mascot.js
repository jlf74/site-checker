// Маскот-глазастик. Настроения: idle (моргает, оглядывается), ready (то же, но
// улыбается шире — когда посетитель встал в поле адреса), reading (сканирует с лупой),
// alert (нашёл проблему), happy (всё в порядке). Анимации — в globals.css, уважают reduced-motion.

export default function Mascot({ mood = 'idle', size = 80, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`mascot mascot-${mood}`}
      aria-hidden="true"
      style={{ flexShrink: 0, ...style }}
    >
      <circle cx="50" cy="52" r="34" fill="#2563EB" />

      {mood === 'happy' && (
        <>
          <path d="M32 50 Q50 34 68 50" stroke="#FFFFFF" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M40 72 Q50 79 60 72" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="30" cy="60" r="4" fill="#F0997B" opacity="0.8" />
          <circle cx="70" cy="60" r="4" fill="#F0997B" opacity="0.8" />
          <g className="m-badge">
            <circle cx="79" cy="30" r="12" fill="#1D9E75" />
            <path d="M73 30 L77 34 L85 26" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </>
      )}

      {mood === 'alert' && (
        <>
          <ellipse cx="50" cy="48" rx="20" ry="17" fill="#FFFFFF" />
          <g className="m-pupil">
            <circle cx="50" cy="49" r="5.5" fill="#16233B" />
            <circle cx="52" cy="47" r="1.8" fill="#FFFFFF" />
          </g>
          <line x1="38" y1="30" x2="46" y2="34" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
          <line x1="62" y1="30" x2="54" y2="34" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="50" cy="73" rx="4.5" ry="5.5" fill="#FFFFFF" />
          <g className="m-badge">
            <circle cx="79" cy="30" r="12" fill="#E24B4A" />
            <text x="79" y="36" textAnchor="middle" fontSize="17" fontWeight="700" fill="#FFFFFF" fontFamily="sans-serif">!</text>
          </g>
        </>
      )}

      {mood === 'reading' && (
        <>
          <ellipse cx="50" cy="48" rx="19" ry="16" fill="#FFFFFF" />
          <path d="M31 44 A19 16 0 0 1 69 44 L69 40 A19 16 0 0 0 31 40 Z" fill="#1D4FC4" />
          <g className="m-pupil-scan">
            <circle cx="50" cy="54" r="8" fill="#16233B" />
            <circle cx="53" cy="51" r="2.5" fill="#FFFFFF" />
          </g>
          <path d="M44 73 L56 73" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
          <g className="m-lupa">
            <circle cx="76" cy="70" r="11" fill="none" stroke="#16233B" strokeWidth="3.5" />
            <line x1="84" y1="79" x2="92" y2="88" stroke="#16233B" strokeWidth="4" strokeLinecap="round" />
          </g>
        </>
      )}

      {(mood === 'idle' || mood === 'ready') && (
        <>
          <ellipse cx="50" cy="48" rx="19" ry="16" fill="#FFFFFF" />
          <g className="m-pupil">
            <circle cx="50" cy="50" r="8" fill="#16233B" />
            <circle cx="53" cy="47" r="2.5" fill="#FFFFFF" />
          </g>
          <ellipse className="m-lid" cx="50" cy="48" rx="20" ry="17" fill="#2563EB" />
          {/* Улыбка шире, когда посетитель встал в поле адреса: маскот
              как будто приготовился читать сайт. Плавность — в globals.css. */}
          <path
            className="m-smile"
            d={mood === 'ready' ? 'M38 70 Q50 81 62 70' : 'M42 72 Q50 77 58 72'}
            stroke="#FFFFFF"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="30" cy="60" r="4" fill="#7FA3F2" opacity={mood === 'ready' ? 0.95 : 0.7} />
          <circle cx="70" cy="60" r="4" fill="#7FA3F2" opacity={mood === 'ready' ? 0.95 : 0.7} />
        </>
      )}
    </svg>
  );
}
