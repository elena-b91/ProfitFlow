import { useContext } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import AuthContext from '../context/AuthContext.jsx'

const ProtectedRoute = ({ requiredRole }) => {
  const { isAuthenticated, user } = useContext(AuthContext)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/access-denied" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
