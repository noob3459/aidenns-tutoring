export default function PageHeader({ eyebrow, heading1, heading2, sub }) {
  return (
    <div className="relative pt-40 sm:pt-48 pb-16 sm:pb-24 px-6 sm:px-10 lg:px-16 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-[40rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="relative max-w-4xl mx-auto text-center">
        <span className="font-mono text-xs uppercase tracking-[0.25em] text-primary-dark">{eyebrow}</span>
        <h1 className="font-display font-extrabold text-4xl sm:text-6xl md:text-7xl text-ink mt-4 leading-[1.05] tracking-tight">
          {heading1}
          <span className="block font-serif italic font-medium text-primary-dark mt-1">{heading2}</span>
        </h1>
        {sub && <p className="text-muted text-base sm:text-lg mt-6 max-w-xl mx-auto leading-relaxed">{sub}</p>}
      </div>
    </div>
  )
}
