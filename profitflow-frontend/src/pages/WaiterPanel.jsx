import { useEffect, useMemo, useState } from 'react'
import api from '../api/axios.js'
import HeaderActions from '../components/HeaderActions.jsx'

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

const WaiterPanel = () => {
  const [menuItems, setMenuItems] = useState([])
  const [cart, setCart] = useState({})
  const [status, setStatus] = useState({ loading: false, error: null, success: null })

//   useEffect(() => {
//     const loadMenu = async () => {
//       setStatus({ loading: true, error: null, success: null })
//       try {
//         const response = await api.get('/menu-items')
//          if (Array.isArray(response.data)) {
//          setMenuItems(response.data)
//         } else {
//         setMenuItems([])
//     setStatus({ loading: false, error: 'Server returned invalid menu data.', success: null })
//   }
// } catch (error) {
//         setStatus({ loading: false, error: 'Unable to load menu items.' })
//       } finally {
//         setStatus((prev) => ({ ...prev, loading: false }))
//       }
//     }
//     loadMenu()
//   }, [])
useEffect(() => {
  const loadMenu = async () => {
    setStatus({ loading: true, error: null, success: null })
    try {
      const response = await api.get('/menu-items')
      
      // Preluăm datele inițiale
      let rawData = response.data

      // Dacă serverul a trimis din greșeală un String, îl transformăm în Array/Obiect JSON
      if (typeof rawData === 'string') {
        try {
          rawData = JSON.parse(rawData)
        } catch (e) {
          console.error("Eroare la parsarea JSON-ului primit ca string:", e)
        }
      }

      // Acum verificăm datele procesate
      if (Array.isArray(rawData)) {
        setMenuItems(rawData)
      } else {
        setMenuItems([])
        setStatus({ 
          loading: false, 
          error: 'Formatul datelor de meniu este invalid (nu este o listă).', 
          success: null 
        })
      }
    } catch (error) {
      console.error("Eroare la apel:", error.response || error)
      setStatus({ loading: false, error: 'Unable to load menu items.' })
    } finally {
      setStatus((prev) => ({ ...prev, loading: false }))
    }
  }
  loadMenu()
}, [])

  const items = useMemo(
    () =>
      menuItems.map((item) => ({
        ...item,
        quantity: cart[item.id] || 0,
      })),
    [cart, menuItems],
  )

  const total = items.reduce((sum, item) => sum + item.quantity * Number(item.sellingPrice || 0), 0)
  const activeItems = items.filter((item) => item.quantity > 0)

  const updateQuantity = (itemId, delta) => {
    setCart((current) => {
      const next = (current[itemId] || 0) + delta
      if (next <= 0) {
        const copy = { ...current }
        delete copy[itemId]
        return copy
      }
      return { ...current, [itemId]: next }
    })
  }

  const submitOrder = async () => {
    if (!activeItems.length) {
      setStatus({ loading: false, error: 'Please add at least one menu item.', success: null })
      return
    }
    setStatus({ loading: true, error: null, success: null })
    try {
      const payload = {
        items: activeItems.map((item) => ({
          menuItem: { id: item.id },
          quantity: item.quantity,
        })),
      }
      await api.post('/orders', payload)
      setCart({})
      setStatus({ loading: false, error: null, success: 'Order submitted successfully.' })
    } catch (error) {
      setStatus({ loading: false, error: 'Unable to submit order at this time.' })
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fbff] px-6 py-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 rounded-[32px] bg-white dark:bg-slate-900 p-8 shadow-[0_30px_60px_rgba(15,76,129,0.08)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.35)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">Waiter Portal</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">Fast Order Entry</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Rapidly select dishes, adjust quantities, and submit customer orders with one touch.
            </p>
          </div>
          <HeaderActions />
        </header>

        {status.error && (
          <div className="rounded-3xl border border-rose-100 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/50 px-6 py-4 text-sm text-rose-700 dark:text-rose-300">
            {status.error}
          </div>
        )}
        {status.success && (
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/50 px-6 py-4 text-sm text-emerald-700 dark:text-emerald-300">
            {status.success}
          </div>
        )}

        <div className="grid gap-8 xl:grid-cols-[1.8fr_1fr]">
          <section className="rounded-[32px] bg-white dark:bg-slate-900 p-8 shadow-[0_30px_60px_rgba(15,76,129,0.08)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Menu catalog</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Available dishes</h2>
              </div>
              <span className="rounded-full bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-700">
                {menuItems.length} items
              </span>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
              {status.loading ? (
                <div className="col-span-full rounded-[28px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                  Loading menu items…
                </div>
              ) : items.length ? (
                items.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[28px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{item.name}</h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{formatCurrency(Number(item.sellingPrice || item.price || 0))}</p>
                      </div>
                      <div className="flex items-center gap-2 rounded-3xl bg-white dark:bg-slate-900 px-2 py-2 shadow-sm">
                        <button
                          type="button"
                          className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 dark:border-slate-700 text-lg text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800"
                          onClick={() => updateQuantity(item.id, -1)}
                          aria-label={`Decrease ${item.name}`}
                        >
                          −
                        </button>
                        <span className="min-w-[30px] text-center text-sm font-semibold text-slate-900 dark:text-slate-100">{item.quantity}</span>
                        <button
                          type="button"
                          className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 dark:border-slate-700 text-lg text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800"
                          onClick={() => updateQuantity(item.id, 1)}
                          aria-label={`Increase ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="col-span-full rounded-[28px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                  No menu items available.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[32px] bg-white dark:bg-slate-900 p-8 shadow-[0_30px_60px_rgba(15,76,129,0.08)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Active cart</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Receipt preview</h2>
              </div>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                {activeItems.length} active
              </span>
            </div>

            <div className="mt-8 space-y-4">
              {activeItems.length ? (
                activeItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.name}</h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{item.quantity} × {formatCurrency(Number(item.sellingPrice || item.price || 0))}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(item.quantity * Number(item.sellingPrice || 0))}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[28px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                  Your active cart is empty. Add dishes from the left to build an order.
                </div>
              )}
            </div>

            <div className="mt-8 rounded-[28px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-6">
              <div className="flex items-center justify-between gap-4 text-slate-700 dark:text-slate-300">
                <span className="text-sm font-medium">Order total</span>
                <strong className="text-2xl text-slate-900 dark:text-slate-100">{formatCurrency(total)}</strong>
              </div>
              <button
                type="button"
                className="mt-6 w-full rounded-3xl bg-slate-900 px-6 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={submitOrder}
                disabled={status.loading || !activeItems.length}
              >
                {status.loading ? 'Submitting…' : 'Submit order'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default WaiterPanel
