import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { Metric, Page } from '../components/Layout'
import { api } from '../services/api'

type StockAlert = {
  id: number
  designation: string
  reference: string
  quantiteStock: number | string
  seuilAlerte: number | string
}

type DashboardStats = {
  date: string
  chiffreAffairesHT: number
  encaissements: number
  credits: number
  clientsAvecCredit: number
  ventesParJour: { label: string; date: string; totalHT: number }[]
}

const money = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MGA', maximumFractionDigits: 0 }).format(value)

export function DashboardPage() {
  const { data: stockAlerts = [], isError: stockError } = useQuery<StockAlert[]>({
    queryKey: ['product-alerts'],
    queryFn: async () => (await api.get('/produits/alertes')).data.data,
    retry: false,
  })
  const { data: stats, isError: statsError } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => (await api.get('/dashboard/stats')).data.data,
    retry: false,
  })
  const currentStats = stats ?? {
    date: new Date().toISOString().slice(0, 10),
    chiffreAffairesHT: 0,
    encaissements: 0,
    credits: 0,
    clientsAvecCredit: 0,
    ventesParJour: [],
  }
  const chartMax = Math.max(...currentStats.ventesParJour.map((day) => day.totalHT), 1)
  const formattedDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${currentStats.date}T12:00:00`))

  return (
    <Page eyebrow="PILOTAGE / AUJOURD'HUI" title="Vue générale">
      <div className="hero-band">
        <div>
          <span className="eyebrow amber">{formattedDate.toUpperCase()}</span>
          <h2>Activité du magasin.</h2>
          <p>Votre activité magasin, en un coup d'œil.</p>
        </div>
        <div className="icon-dashboard" aria-hidden="true">
          <span>📊</span>
        </div>
      </div>

      <div className="metric-grid">
        <Metric label="Chiffre d'affaires HT" value={money(currentStats.chiffreAffairesHT)} trend="Aujourd’hui" />
        <Metric label="Encaissements du jour" value={money(currentStats.encaissements)} trend="Aujourd’hui" />
        <Metric label="Produits en alerte" value={String(stockAlerts.length).padStart(2, '0')} trend="À traiter" warn={stockAlerts.length > 0} />
        <Metric label="Crédits en cours" value={money(currentStats.credits)} trend={`${currentStats.clientsAvecCredit} client${currentStats.clientsAvecCredit > 1 ? 's' : ''}`} />
      </div>

      <div className="split">
        <div className="panel chart-panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">ACTIVITÉ COMMERCIALE</span>
              <h3>Chiffre d'affaires HT</h3>
            </div>
            <span className="select">7 derniers jours</span>
          </div>
          <div className="bars">
            {currentStats.ventesParJour.map((day) => (
              <div className="bar-col" key={day.date}>
                <div className="bar" style={{ height: `${Math.max((day.totalHT / chartMax) * 100, day.totalHT > 0 ? 8 : 2)}%` }} title={money(day.totalHT)} />
                <small>{day.label}</small>
              </div>
            ))}
            {currentStats.ventesParJour.length === 0 && <div className="empty"><p>Aucune vente sur les 7 derniers jours.</p></div>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">À SURVEILLER</span>
              <h3>Alertes stock</h3>
            </div>
            <Link to="/produits" className="text-link">
              Voir tout →
            </Link>
          </div>

          {stockError && <div className="offline">Alertes indisponibles</div>}
          {statsError && <div className="offline">Statistiques indisponibles</div>}
          {!stockError && stockAlerts.length === 0 && <div className="empty"><p>Aucune alerte stock.</p></div>}
          {stockAlerts.map((product) => {
            const quantity = Number(product.quantiteStock)
            return (
              <div className="alert-row" key={product.id}>
                <span className="alert-icon">!</span>
                <div>
                  <strong>{product.designation}</strong>
                  <small>{quantity} unité{quantity > 1 ? 's' : ''} restante{quantity > 1 ? 's' : ''} · seuil {product.seuilAlerte}</small>
                </div>
                <span className="danger">{quantity <= 0 ? 'Rupture' : 'Stock bas'}</span>
              </div>
            )
          })}
        </div>
      </div>
    </Page>
  )
}
