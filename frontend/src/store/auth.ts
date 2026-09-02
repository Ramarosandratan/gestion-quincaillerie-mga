import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Role = 'ADMIN' | 'CAISSIER'
interface AuthState { token: string | null; role: Role | null; login: (token: string, role: Role) => void; logout: () => void }
export const useAuthStore = create<AuthState>()(persist((set) => ({ token: null, role: null, login: (token, role) => { localStorage.setItem('mga-token', token); set({ token, role }) }, logout: () => { localStorage.removeItem('mga-token'); set({ token: null, role: null }) } }), { name: 'mga-auth' }))
