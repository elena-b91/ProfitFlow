const HeaderIconButton = ({ label, onClick, children, className = '' }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl border border-slate-200 bg-slate-100 text-slate-900 transition hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 ${className}`}
  >
    {children}
  </button>
)

export default HeaderIconButton
