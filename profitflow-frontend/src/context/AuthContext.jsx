import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import api from '../api/axios.js'

const AuthContext = createContext(null)

const decodeJwt = (token) => {
  try {
    const payload = token.split('.')[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch (error) {
    return null
  }
}

const normalizeRole = (rawRoles) => {
  if (!rawRoles) return null
  const roles = Array.isArray(rawRoles) ? rawRoles : String(rawRoles).split(',')
  if (roles.some((role) => role.includes('MANAGER'))) return 'MANAGER'
  if (roles.some((role) => role.includes('CHELNER'))) return 'CHELNER'
  return null
}

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('profitflow_token'))
  const [user, setUser] = useState(() => {
    const storedToken = localStorage.getItem('profitflow_token')
    const payload = storedToken ? decodeJwt(storedToken) : null
    if (!payload) return null
    return {
      username: payload.sub,
      role: normalizeRole(payload.roles || payload.role || payload.authorities),
    }
  })
  const [status, setStatus] = useState({ loading: false, error: null })

  useEffect(() => {
    if (token) {
      localStorage.setItem('profitflow_token', token)
      const payload = decodeJwt(token)
      if (payload) {
        setUser({
          username: payload.sub,
          role: normalizeRole(payload.roles || payload.role || payload.authorities),
        })
      }
    } else {
      localStorage.removeItem('profitflow_token')
      setUser(null)
    }
  }, [token])

  const login = useCallback(async (username, password) => {
    setStatus({ loading: true, error: null })
    try {
      const response = await api.post('/auth/login', { username, password })
      setToken(response.data.token)
      setStatus({ loading: false, error: null })
      return response.data
    } catch (error) {
      const serverMessage = error?.response?.data
      const message =
        typeof serverMessage === 'string' && serverMessage.trim()
          ? serverMessage
          : error?.response?.status === 403
          ? 'Invalid username or password.'
          : error.message || 'Unable to authenticate.'
      setStatus({ loading: false, error: message })
      throw new Error(message)
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setStatus({ loading: false, error: null })
  }, [])

  const value = useMemo(
    () => ({
      token,
      user,
      status,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [login, logout, status, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
