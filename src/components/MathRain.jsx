import { useEffect, useState } from 'react'

export default function MathRain() {
  const [statusIdx, setStatusIdx] = useState(0)
  const [count, setCount] = useState(7)

  const statuses = [
    { text: 'Reviewing homework...', label: 'Active', tone: 'primary' },
    { text: 'Concept: fractions', label: 'Teaching', tone: 'accent' },
    { text: 'Practice set assigned', label: 'Practicing', tone: 'primary' },
    { text: 'Concept mastered!', label: 'Mastered', tone: 'emerald' },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIdx((idx) => {
        const next = (idx + 1) % statuses.length
        if (statuses[next].label === 'Mastered') setCount((c) => c + 1)
        return next
      })
    }, 2300)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const glyphs = [
    { left: '15%', delay: '0.0s', dur: '2.6s', size: 16, char: '+' },
    { left: '25%', delay: '1.3s', dur: '3.0s', size: 14, char: '÷' },
    { left: '38%', delay: '0.6s', dur: '2.8s', size: 18, char: 'π' },
    { left: '50%', delay: '1.8s', dur: '2.4s', size: 15, char: '√' },
    { left: '62%', delay: '0.9s', dur: '3.1s', size: 17, char: '×' },
    { left: '74%', delay: '2.0s', dur: '2.7s', size: 14, char: '=' },
    { left: '85%', delay: '0.4s', dur: '2.9s', size: 16, char: 'Σ' },
  ]

  const ripples = [
    { left: '22%', delay: '0.2s' },
    { left: '48%', delay: '1.0s' },
    { left: '76%', delay: '1.8s' },
  ]

  const status = statuses[statusIdx]
  const toneText = status.tone === 'emerald' ? 'text-emerald-400' : status.tone === 'accent' ? 'text-accent' : 'text-white/80'
  const toneDot = status.tone === 'emerald' ? 'bg-emerald-400' : status.tone === 'accent' ? 'bg-accent' : 'bg-white/70'

  return (
    <div
      className="relative h-44 w-full rounded-3xl overflow-hidden border border-accent/20"
      style={{ background: 'linear-gradient(180deg, #16305C 0%, #102848 60%, #0B1626 100%)' }}
    >
      <div className="absolute -top-8 -left-6 h-20 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute top-2 right-10 h-14 w-24 rounded-full bg-accent/10 blur-xl" />

      <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">Live Session</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-display font-bold text-sm text-white tabular-nums">{String(count).padStart(2, '0')}</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-white/40">mastered today</span>
        </div>
      </div>

      <div className="absolute inset-x-0 top-12 bottom-11 overflow-hidden">
        {glyphs.map((g, i) => (
          <span
            key={i}
            className="absolute top-0 font-mono font-bold"
            style={{
              left: g.left,
              fontSize: `${g.size}px`,
              color: '#E8C860',
              textShadow: '0 0 8px rgba(201,162,39,0.5)',
              animation: `rain-fall ${g.dur} cubic-bezier(0.55,0.05,0.7,0.45) ${g.delay} infinite`,
              transform: 'translateX(-50%)',
            }}
          >
            {g.char}
          </span>
        ))}
      </div>

      <svg className="absolute bottom-9 left-3 right-3 h-3" viewBox="0 0 200 12" preserveAspectRatio="none">
        <path d="M 0,6 Q 12.5,2 25,6 T 50,6 T 75,6 T 100,6 T 125,6 T 150,6 T 175,6 T 200,6" fill="none" stroke="#C9A227" strokeOpacity="0.45" strokeWidth="1.2" />
        <path d="M 0,8 Q 12.5,5 25,8 T 50,8 T 75,8 T 100,8 T 125,8 T 150,8 T 175,8 T 200,8" fill="none" stroke="#C9A227" strokeOpacity="0.25" strokeWidth="0.8" />
      </svg>

      <div className="absolute bottom-[34px] left-3 right-3 h-2">
        {ripples.map((r, i) => (
          <span
            key={i}
            className="absolute top-0 -translate-x-1/2 rounded-full border border-accent/50"
            style={{ left: r.left, width: '4px', height: '4px', animation: `rain-ripple 2.4s ease-out ${r.delay} infinite` }}
          />
        ))}
      </div>

      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`relative h-2 w-2 rounded-full ${toneDot}`}>
            {status.tone === 'accent' && <span className={`absolute inset-0 rounded-full ${toneDot} animate-ping`} />}
          </span>
          <span key={status.text} className={`font-mono text-[10px] truncate ${toneText}`} style={{ animation: 'rain-fadein 0.35s ease-out' }}>
            {status.text}
          </span>
        </div>
        <span className={`font-mono text-[9px] uppercase tracking-[0.2em] whitespace-nowrap pl-2 ${toneText}`}>{status.label}</span>
      </div>

      <style>{`
        @keyframes rain-fall {
          0%   { transform: translate(-50%, -10px); opacity: 0; }
          12%  { opacity: 1; }
          82%  { opacity: 1; }
          100% { transform: translate(-50%, 95px); opacity: 0; }
        }
        @keyframes rain-ripple {
          0%   { transform: translateX(-50%) scale(0.4); opacity: 0.9; }
          80%  { transform: translateX(-50%) scale(3.5); opacity: 0; }
          100% { transform: translateX(-50%) scale(3.5); opacity: 0; }
        }
        @keyframes rain-fadein {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
