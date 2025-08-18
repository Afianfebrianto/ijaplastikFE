
import { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'
const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    axios.defaults.baseURL = API_BASE
    if (token) axios.defaults.headers.common['Authorization'] = 'Bearer ' + token
    else delete axios.defaults.headers.common['Authorization']
  }, [token])

  const login = async (email, password) => {
    setLoading(true)
    try {
      const { data } = await axios.post('/auth/login', { email, password })
      if (data?.token) {
        setToken(data.token)
        localStorage.setItem('token', data.token)
        setUser(data.user)
        localStorage.setItem('user', JSON.stringify(data.user))
      }
      return data
    } finally { setLoading(false) }
  }

  const logout = () => {
    setToken(null); setUser(null)
    localStorage.removeItem('token'); localStorage.removeItem('user')
  }

  return (
    <AuthCtx.Provider value={{ token, user, login, logout, loading }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
