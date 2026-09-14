import { useContext } from 'react'
import { IoMoon, IoSunny } from 'react-icons/io5'
import ThemeContext from '../context/ThemeContext.jsx'
import HeaderIconButton from './HeaderIconButton.jsx'

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useContext(ThemeContext) ?? {}

  return (
    <HeaderIconButton
      label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
    >
      {isDark ? <IoSunny className="h-5 w-5" aria-hidden="true" /> : <IoMoon className="h-5 w-5" aria-hidden="true" />}
    </HeaderIconButton>
  )
}

export default ThemeToggle
