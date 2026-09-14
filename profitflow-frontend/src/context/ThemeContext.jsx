import { createContext, useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { applyTheme, getStoredTheme } from '../utils/theme.js'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => getStoredTheme())

  useLayoutEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((next) => {
    applyTheme(next)
    setThemeState(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isDark: theme === 'dark',
    }),
    [theme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export default ThemeContext
