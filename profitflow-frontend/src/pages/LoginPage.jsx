import { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthContext from '../context/AuthContext.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'

const LoginPage = () => {
  const { login, status, isAuthenticated, user } = useContext(AuthContext)
  const navigate = useNavigate()
  const [credentials, setCredentials] = useState({ username: '', password: '' })

  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.role === 'MANAGER' ? '/manager' : '/waiter', { replace: true })
    }
  }, [isAuthenticated, navigate, user])

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      await login(credentials.username.trim(), credentials.password)
    } catch (error) {
      // handled by AuthContext
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#f8fbff] px-6 py-12 dark:bg-slate-950">
      <div className="absolute right-6 top-6 z-10">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-5xl rounded-[32px] bg-white dark:bg-slate-900 shadow-[0_30px_60px_rgba(15,76,129,0.08)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.35)] overflow-hidden md:flex">
        <aside className="hidden md:block md:w-2/5 bg-gradient-to-br from-sky-700 to-emerald-600 text-white p-10">
          <div className="space-y-8">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-sky-200">ProfitFlow</p>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight">Restaurant POS & Analytics</h1>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <p className="font-medium">Corporate UI brief</p>
              <ul className="mt-4 space-y-3 text-sm text-sky-100/90">
                <li>Secure JWT login</li>
                <li>Manager & Waiter roles</li>
                <li>Touch-friendly waiter flow</li>
                <li>Analytics dashboard for managers</li>
              </ul>
            </div>
            <div className="rounded-3xl bg-white dark:bg-slate-900/10 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-sky-100/70">Demo access</p>
              <p className="mt-3 text-sm">Manager login: <span className="font-semibold">manager</span></p>
              <p className="text-sm">Password: <span className="font-semibold">manager123</span></p>
            </div>
          </div>
        </aside>

        <main className="w-full md:w-3/5 p-8 md:p-12">
          <div className="max-w-md">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">Login</p>
            <h2 className="mt-4 text-3xl font-semibold text-slate-900 dark:text-slate-100">Enter your team credentials</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Only existing staff can sign in. Waiters and managers must authenticate before they can access their specialized workspace.
            </p>

            <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
                <input
                  value={credentials.username}
                  onChange={(event) => setCredentials({ ...credentials, username: event.target.value })}
                  className="mt-3 w-full rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(event) => setCredentials({ ...credentials, password: event.target.value })}
                  className="mt-3 w-full rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                className="w-full rounded-3xl bg-slate-900 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={status.loading}
              >
                {status.loading ? 'Signing in…' : 'Sign in'}
              </button>

              {status.error && (
                <div className="rounded-3xl border border-rose-100 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/50 px-4 py-4 text-sm text-rose-700 dark:text-rose-300">
                  {status.error}
                </div>
              )}
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}

export default LoginPage
