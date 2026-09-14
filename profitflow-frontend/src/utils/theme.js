export const THEME_STORAGE_KEY = 'profitflow-theme'

export const getStoredTheme = () => {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const applyTheme = (theme) => {
  const root = document.documentElement
  const isDark = theme === 'dark'

  root.setAttribute('data-theme', theme)
  root.classList.remove('dark')
  root.style.colorScheme = isDark ? 'dark' : 'light'
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}
