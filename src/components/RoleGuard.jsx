
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'

export default function RoleGuard({ roles }){
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" />
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" />
  return <Outlet/>
}
