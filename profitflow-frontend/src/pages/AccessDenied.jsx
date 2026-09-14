import { Link } from 'react-router-dom'

const AccessDenied = () => (
  <div className="min-h-screen bg-[#f8fbff] px-6 py-8 dark:bg-slate-950">
    <div className="mx-auto max-w-3xl rounded-[32px] bg-white dark:bg-slate-900 p-12 text-center shadow-[0_30px_60px_rgba(15,76,129,0.08)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
      <p className="text-sm uppercase tracking-[0.3em] text-rose-600">Access denied</p>
      <h1 className="mt-4 text-4xl font-semibold text-slate-900 dark:text-slate-100">You do not have permission</h1>
      <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
        Your account does not have access to this section. Please return to your assigned workspace or contact an administrator.
      </p>
      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Link
          to="/login"
          className="inline-flex rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100 transition hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          Return to login
        </Link>
        <Link
          to="/waiter"
          className="inline-flex rounded-3xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Open waiter panel
        </Link>
      </div>
    </div>
  </div>
)

export default AccessDenied
