import { CheckCircle2, Coins, TrendingDown, TrendingUp } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

import { Page } from '../components/Layout'
import { api } from '../services/api'

const money = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'MGA',
    maximumFractionDigits: 0,
  }).format(value)

export function ClosurePage() {
  const formPanelRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState({ fondDeCaisse: '1200000', soldeReel: '1182500' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const totals = useMemo(() => {
    const encaissements = 2_350_000
    const depenses = 470_000
    const fondDeCaisse = Number(form.fondDeCaisse)
    const soldeTheorique = fondDeCaisse + encaissements - depenses
    const soldeReel = Number(form.soldeReel)
    const ecart = soldeReel - soldeTheorique

    return { encaissements, depenses, fondDeCaisse, soldeTheorique, soldeReel, ecart }
  }, [form])

  async function handleClosure(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const fondDeCaisse = Number(form.fondDeCaisse)
    const soldeReel = Number(form.soldeReel)

    if (!Number.isFinite(fondDeCaisse) || !Number.isFinite(soldeReel)) {
      setFeedback({ type: 'error', message: 'Le fond de caisse et le solde réel sont obligatoires.' })
      return
    }

    setIsSubmitting(true)
    setFeedback(null)

    try {
      const payload = { fondDeCaisse, soldeReel }
      await api.post('/caisse/cloture', payload)
      setFeedback({ type: 'success', message: 'Clôture Z enregistrée avec succès.' })
    } catch (error: any) {
      const message = error?.response?.data?.message || 'La clôture n’a pas pu être enregistrée.'
      setFeedback({ type: 'error', message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Page
      eyebrow="CAISSE / FIN DE SERVICE"
      title="Clôture Z"
      action="Lancer la clôture"
      onAction={() => formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
    >
      <div className="summary-grid">
        <div className="metric">
          <span className="eyebrow">FOND DE CAISSE</span>
          <strong>{money(totals.fondDeCaisse)}</strong>
          <small className="positive">↗ montant initial</small>
        </div>
        <div className="metric">
          <span className="eyebrow">ENCAISSEMENTS</span>
          <strong>{money(totals.encaissements)}</strong>
          <small className="positive">↗ ce service</small>
        </div>
        <div className="metric">
          <span className="eyebrow">DÉPENSES</span>
          <strong>{money(totals.depenses)}</strong>
          <small className="danger">▲ décaissements</small>
        </div>
        <div className="metric">
          <span className="eyebrow">SOLDE THÉORIQUE</span>
          <strong>{money(totals.soldeTheorique)}</strong>
          <small className={totals.ecart >= 0 ? 'positive' : 'danger'}>{totals.ecart >= 0 ? '↗' : '▼'} {money(Math.abs(totals.ecart))}</small>
        </div>
      </div>

      <div className="split">
        <div className="panel" ref={formPanelRef}>
          <div className="panel-title">
            <div>
              <span className="eyebrow">RÉSUMÉ JOURNALIER</span>
              <h3>Contrôle de caisse</h3>
            </div>
            <Coins size={22} />
          </div>

          <div className="closure-summary">
            <div className="summary-row"><span>Solde réel</span><strong>{money(totals.soldeReel)}</strong></div>
            <div className="summary-row"><span>Écart Z</span><strong className={totals.ecart >= 0 ? 'positive' : 'danger'}>{money(totals.ecart)}</strong></div>
            <div className="summary-row"><span>Statut</span><strong>{totals.ecart === 0 ? 'Parfait' : totals.ecart > 0 ? 'Excédent' : 'Manquant'}</strong></div>
          </div>
        </div>

        <div className="panel">
          <form className="compact-form" onSubmit={handleClosure}>
            <div className="panel-title">
              <div>
                <span className="eyebrow">VALIDATION</span>
                <h3>Valider la clôture</h3>
              </div>
              {totals.ecart === 0 ? <CheckCircle2 size={20} /> : <TrendingUp size={20} />}
            </div>

            <label>
              Fond de caisse
              <input type="number" min="0" step="1000" value={form.fondDeCaisse} onChange={(event) => setForm({ ...form, fondDeCaisse: event.target.value })} />
            </label>

            <label>
              Solde réel compté
              <input type="number" min="0" step="1000" value={form.soldeReel} onChange={(event) => setForm({ ...form, soldeReel: event.target.value })} />
            </label>

            {feedback && <div className={feedback.type === 'success' ? 'success-box' : 'error-box'}>{feedback.message}</div>}

            <div className="form-actions">
              <button className="secondary" type="button"><TrendingDown size={16} /> Réinitialiser</button>
              <button className="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Clôture...' : 'Clôturer la caisse'}</button>
            </div>
          </form>
        </div>
      </div>
    </Page>
  )
}
