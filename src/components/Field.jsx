export default function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-mono uppercase tracking-widest text-muted mb-2">{label}</span>
      {children}
    </label>
  )
}
