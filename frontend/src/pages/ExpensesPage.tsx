import { BadgeDollarSign, Plus, ReceiptText, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { Page } from '../components/Layout'
import { api } from '../services/api'

type ExpenseCategory = { id: number; libelle: string }
type ExpenseRecord = { id: number; libelle: string; montantHT: number; montantTTC: number; modePaiement: string; description: string; date: string }

const money = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'MGA',
    maximumFractionDigits: 0,
  }).format(value)

export function ExpensesPage() {
  const queryClient = useQueryClient()
  const formPanelRef = useRef<HTMLDivElement>(null)
  const historyPanelRef = useRef<HTMLDivElement>(null)
  const amountInputRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ montantHT: '', description: '', categorieId: '', modePaiement: 'ESPECES' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const { data: categories = [], isError: categoriesError } = useQuery<ExpenseCategory[]>({
    queryKey: ['expense-categories'],
    queryFn: async () => (await api.get('/depenses/categories')).data.data,
    retry: false,
  })
  const { data: expenses = [], isError: expensesError } = useQuery<ExpenseRecord[]>({
    queryKey: ['expenses'],
    queryFn: async () => (await api.get('/depenses')).data.data.map((expense: any) => ({
      id: expense.id,
      libelle: expense.categorie?.libelle ?? 'Sans catégorie',
      montantHT: Number(expense.montantHT),
      montantTTC: Number(expense.montantTTC),
      modePaiement: expense.modePaiement,
      description: expense.description ?? 'Sans description',
      date: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(expense.createdAt)),
    })),
    retry: false,
  })

  useEffect(() => {
    if (!form.categorieId && categories[0]) setForm((current) => ({ ...current, categorieId: String(categories[0].id) }))
  }, [categories, form.categorieId])

  const filteredExpenses = useMemo(
    () => expenses.filter((expense) => expense.libelle.toLowerCase().includes(search.toLowerCase()) || expense.description.toLowerCase().includes(search.toLowerCase())),
    [expenses, search],
  )

  const totalMonthly = useMemo(() => expenses.reduce((sum, item) => sum + item.montantTTC, 0), [expenses])
  const fixedExpenses = useMemo(() => expenses.filter((expense) => ['Loyer', 'Salaires'].includes(expense.libelle)).reduce((sum, item) => sum + item.montantTTC, 0), [expenses])
  const cashExpenses = useMemo(() => expenses.filter((expense) => expense.modePaiement === 'ESPECES').reduce((sum, item) => sum + item.montantTTC, 0), [expenses])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const montantHT = Number(form.montantHT)
    if (!Number.isFinite(montantHT) || montantHT <= 0) {
      setFeedback({ type: 'error', message: 'Le montant HT est requis et doit être positif.' })
      return
    }

    setIsSubmitting(true)
    setFeedback(null)

    try {
      const payload = {
        montantHT,
        categorieId: Number(form.categorieId),
        modePaiement: form.modePaiement,
        description: form.description || 'Dépense de caisse',
      }

      await api.post('/depenses', payload)
      await queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setForm({ montantHT: '', description: '', categorieId: categories[0] ? String(categories[0].id) : '', modePaiement: 'ESPECES' })
      setFeedback({ type: 'success', message: 'Dépense enregistrée.' })
    } catch (error: any) {
      const message = error?.response?.data?.message || 'La dépense n’a pas pu être enregistrée.'
      setFeedback({ type: 'error', message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Page
      eyebrow="TRÉSORERIE / CHARGES"
      title="Dépenses"
      action="Saisir une dépense"
      onAction={() => {
        formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        amountInputRef.current?.focus({ preventScroll: true })
      }}
    >
      {(expensesError || categoriesError) && <div className="offline">Données de trésorerie indisponibles</div>}
      <div className="summary-grid">
        <div className="metric">
          <span className="eyebrow">TOTAL MOIS</span>
          <strong>{money(totalMonthly)}</strong>
          <small className="positive">↗ dépenses validées</small>
        </div>
        <div className="metric">
          <span className="eyebrow">FRAIS FIXES</span>
          <strong>{money(fixedExpenses)}</strong>
          <small className="danger">▲ coût récurrent</small>
        </div>
        <div className="metric">
          <span className="eyebrow">DÉPENSES ESPÈCES</span>
          <strong>{money(cashExpenses)}</strong>
          <small className="positive">↗ sorties de caisse</small>
        </div>
        <div className="metric">
          <span className="eyebrow">CATÉGORIES</span>
          <strong>{categories.length}</strong>
          <small className="positive">↗ conforme</small>
        </div>
      </div>

      <div className="split">
        <div className="panel table-panel" ref={historyPanelRef}>
          <div className="table-tools">
            <div className="search compact">
              <Search size={16} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une dépense" />
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Catégorie</th>
                <th>Montant TTC</th>
                <th>Mode</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 && <tr><td colSpan={4}><div className="empty"><p>Aucune dépense enregistrée.</p></div></td></tr>}
              {filteredExpenses.map((expense) => (
                <tr key={expense.id}>
                  <td>
                    <div className="cell-stack">
                      <strong>{expense.libelle}</strong>
                      <small>{expense.description}</small>
                    </div>
                  </td>
                  <td>{money(expense.montantTTC)}</td>
                  <td><span className="pill green-pill">{expense.modePaiement}</span></td>
                  <td>{expense.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel" ref={formPanelRef}>
          <form className="compact-form" onSubmit={handleSubmit}>
            <div className="panel-title">
              <div>
                <span className="eyebrow">NOUVELLE DÉPENSE</span>
                <h3>Enregistrer une charge</h3>
              </div>
              <BadgeDollarSign size={20} />
            </div>

            <label>
              Catégorie
              <select value={form.categorieId} onChange={(event) => setForm({ ...form, categorieId: event.target.value })}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.libelle}</option>
                ))}
              </select>
            </label>

            <label>
              Montant HT
              <input ref={amountInputRef} type="number" min="0" step="100" value={form.montantHT} onChange={(event) => setForm({ ...form, montantHT: event.target.value })} placeholder="Ex. 250000" />
            </label>

            <label>
              Mode de paiement
              <select value={form.modePaiement} onChange={(event) => setForm({ ...form, modePaiement: event.target.value })}>
                <option value="ESPECES">Espèces</option>
                <option value="CARTE">Carte</option>
                <option value="VIREMENT">Virement</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
              </select>
            </label>

            <label>
              Description
              <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Ex. Réparation, transport, loyers..." />
            </label>

            {feedback && <div className={feedback.type === 'success' ? 'success-box' : 'error-box'}>{feedback.message}</div>}

            <div className="form-actions">
              <button
                className="secondary"
                type="button"
                onClick={() => historyPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              >
                <ReceiptText size={16} /> Historique
              </button>
              <button className="primary" type="submit" disabled={isSubmitting}> {isSubmitting ? 'Validation...' : 'Valider'} <Plus size={16} /></button>
            </div>
          </form>
        </div>
      </div>
    </Page>
  )
}
