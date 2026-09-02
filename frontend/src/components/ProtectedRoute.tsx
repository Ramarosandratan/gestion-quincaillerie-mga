import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import type { Role } from '../types'

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: Role[] }) {
  const { token, role } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (allowedRoles && (!role || !allowedRoles.includes(role))) return <Navigate to="/" replace />
  return <Outlet />
}
