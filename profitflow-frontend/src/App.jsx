import { useContext } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AuthContext from './context/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import LoginPage from './pages/LoginPage.jsx'
import WaiterPanel from './pages/WaiterPanel.jsx'
import ManagerDashboard from './pages/ManagerDashboard.jsx'
import AccessDenied from './pages/AccessDenied.jsx'

function App() {
  const { isAuthenticated, user } = useContext(AuthContext)

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute requiredRole="CHELNER" />}>
        <Route path="/waiter" element={<WaiterPanel />} />
      </Route>
      <Route element={<ProtectedRoute requiredRole="MANAGER" />}>
        <Route path="/manager" element={<ManagerDashboard />} />
      </Route>
      <Route path="/access-denied" element={<AccessDenied />} />
      <Route
        path="*"
        element={
          <Navigate
            to={
              isAuthenticated
                ? user?.role === 'MANAGER'
                  ? '/manager'
                  : '/waiter'
                : '/login'
            }
            replace
          />
        }
      />
    </Routes>
  )
}

export default App
