import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, Boxes, LayoutDashboard, LogOut, Menu, Receipt, ShoppingCart, UserRound, WalletCards, X } from 'lucide-react'

import { useAuthStore } from '../store/auth'

export const nav = [
  { to: '/', label: 'Vue générale', icon: LayoutDashboard },
  { to: '/caisse', label: 'Caisse / POS', icon: ShoppingCart },
  { to: '/produits', label: 'Produits & stocks', icon: Boxes, admin: true },
  { to: '/clients', label: 'Clients & crédits', icon: UserRound },
  { to: '/depenses', label: 'Dépenses', icon: Receipt, admin: true },
  { to: '/cloture', label: 'Clôture Z', icon: WalletCards },
]

export function Page({
  eyebrow,
  title,
  children,
  action,
  onAction,
}: {
  eyebrow: string
  title: string
  children?: React.ReactNode
  action?: string
  onAction?: () => void
}) {
  return (
    <section className="content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
        </div>
        {action && <button className="primary" type="button" onClick={onAction}>+ {action}</button>}
      </div>
      {children}
    </section>
  )
}

export function Metric({
  label,
  value,
  trend,
  warn,
}: {
  label: string
  value: string
  trend: string
  warn?: boolean
}) {
  return (
    <div className="metric">
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
      <small className={warn ? 'danger' : 'positive'}>{warn ? '▲ ' : '↗ '}{trend}</small>
    </div>
  )
}

export function Shell() {
  const { role, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const links = nav.filter((item) => !item.admin || role === 'ADMIN')

  return (
    <div className="shell">
      <aside className={open ? 'rail rail-open' : 'rail'}>
        <div className="brand">
          <span className="brand-mark">M</span>
          <span>MGA / QUINCAILLERIE</span>
          <button className="icon-button mobile-only" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="workspace">
          <span className="eyebrow">ESPACE DE TRAVAIL</span>
          <strong>Magasin principal</strong>
          <span className="status-dot">● Connecté</span>
        </div>
        <nav>
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              onClick={() => setOpen(false)}
              className={location.pathname === to ? 'active' : ''}
              to={to}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="rail-footer">
          <span className="role-badge">{role || 'CAISSIER'}</span>
          <button
            className="logout"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            <LogOut size={16} />
            Se déconnecter
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setOpen(true)}>
            <Menu size={20} />
          </button>
          <div>
            <span className="eyebrow">MARDI 24 AOÛT 2026</span>
            <strong>Bonjour, équipe magasin</strong>
          </div>
          <div className="top-actions">
            <span className="live-dot">● API en ligne</span>
            <span className="avatar">{role?.[0] || 'C'}</span>
          </div>
        </header>
        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export { BarChart3 }
