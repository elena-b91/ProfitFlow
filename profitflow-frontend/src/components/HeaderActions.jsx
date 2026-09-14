import { useContext } from 'react'
import AuthContext from '../context/AuthContext.jsx'
import LogoutIcon from './LogoutIcon.jsx'
import HeaderIconButton from './HeaderIconButton.jsx'
import ThemeToggle from './ThemeToggle.jsx'

const HeaderActions = () => {
  const { logout } = useContext(AuthContext)

  return (
    <div className="flex shrink-0 items-center gap-2">
      <ThemeToggle />
      <HeaderIconButton label="Log out" onClick={logout}>
        <LogoutIcon className="h-5 w-5" />
      </HeaderIconButton>
    </div>
  )
}

export default HeaderActions
