import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem { id: number; name: string; price: number; quantity: number }
interface CartState { items: CartItem[]; add: (item: CartItem) => void; remove: (id: number) => void; clear: () => void }
export const useCartStore = create<CartState>()(persist((set) => ({ items: [], add: (item) => set((state) => ({ items: state.items.some((current) => current.id === item.id) ? state.items.map((current) => current.id === item.id ? { ...current, quantity: current.quantity + item.quantity } : current) : [...state.items, item] })), remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })), clear: () => set({ items: [] }) }), { name: 'mga-cart' }))
