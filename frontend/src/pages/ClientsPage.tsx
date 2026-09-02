import { AlertTriangle, ArrowRightLeft, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { Page } from '../components/Layout'
import { api } from '../services/api'

type ClientStatus = 'normal' | 'attention' | 'bloque'

type ClientRecord = {
  id: number
  nom: string
  telephone?: string
  plafondCredit: number
  detteActuelle: number
  lastSale: string
  statut: ClientStatus
}

const money = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'MGA',
    maximumFractionDigits: 0,
  }).format(value)

export function ClientsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [payment, setPayment] = useState({ montant: '', modePaiement: 'ESPECES', venteId: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isClientFormOpen, setIsClientFormOpen] = useState(false)
  const [clientForm, setClientForm] = useState({ nom: '', telephone: '', plafondCredit: '0' })
  const [isClientSaving, setIsClientSaving] = useState(false)

  const { data: liveClients = [], isError } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => (await api.get('/clients')).data.data,
    retry: false,
  })

  const [clients, setClients] = useState<ClientRecord[]>([])
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)

  const normalizedClients: ClientRecord[] = liveClients.length ? liveClients.map((client: any): ClientRecord => ({
    id: client.id,
    nom: client.nom,
    telephone: client.telephone ?? '—',
    plafondCredit: Number(client.plafondCredit ?? 0),
    detteActuelle: Number(client.detteActuelle ?? 0),
    lastSale: 'Aucune vente renseignée',
    statut: Number(client.detteActuelle ?? 0) > 0 && Number(client.detteActuelle ?? 0) >= Number(client.plafondCredit ?? 0) * 0.7 ? 'attention' : 'normal',
  })) : clients

  const allClients: ClientRecord[] = clients.length ? clients : normalizedClients
  const clientList: ClientRecord[] = normalizedClients.length ? normalizedClients : allClients

  const filteredClients = useMemo<ClientRecord[]>(
    () => clientList.filter((client: ClientRecord) => client.nom.toLowerCase().includes(search.toLowerCase()) || (client.telephone ?? '').includes(search)),
    [clientList, search],
  )

  const selectedClient = clientList.find((client: ClientRecord) => client.id === selectedClientId) ?? filteredClients[0] ?? clientList[0]

  const totals = useMemo(() => {
    const totalDebt = clientList.reduce((sum: number, client: ClientRecord) => sum + client.detteActuelle, 0)
    const criticalCount = clientList.filter((client: ClientRecord) => client.statut !== 'normal').length
    const availableCredit = clientList.reduce((sum: number, client: ClientRecord) => sum + (client.plafondCredit - client.detteActuelle), 0)
    return { totalDebt, criticalCount, availableCredit }
  }, [clientList])

  async function handlePayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedClient) return

    const montant = Number(payment.montant)
    if (!Number.isFinite(montant) || montant <= 0) {
      setFeedback({ type: 'error', message: 'Le montant du règlement doit être supérieur à zéro.' })
      return
    }

    setIsSubmitting(true)
    setFeedback(null)

    try {
      const payload = {
        montant,
        modePaiement: payment.modePaiement,
        venteId: payment.venteId ? Number(payment.venteId) : null,
      }

      const response = await api.post(`/clients/${selectedClient.id}/reglements`, payload)
      const updatedClient = response?.data?.data?.client as { detteActuelle?: number } | undefined

      setClients((current) =>
        current.map((client) => {
          if (client.id !== selectedClient.id) return client
          const nextDebt = Math.max(0, Number(updatedClient?.detteActuelle ?? client.detteActuelle - montant))
          return {
            ...client,
            detteActuelle: nextDebt,
            statut: nextDebt >= client.plafondCredit * 0.7 ? 'attention' : 'normal',
          }
        }),
      )

      setPayment({ montant: '', modePaiement: payment.modePaiement, venteId: '' })
      setFeedback({ type: 'success', message: 'Règlement enregistré avec succès.' })
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Le règlement n’a pas pu être enregistré.'
      setFeedback({ type: 'error', message })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCreateClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsClientSaving(true)
    setFeedback(null)
    try {
      await api.post('/clients', {
        nom: clientForm.nom,
        telephone: clientForm.telephone,
        plafondCredit: Number(clientForm.plafondCredit),
      })
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
      setClientForm({ nom: '', telephone: '', plafondCredit: '0' })
      setIsClientFormOpen(false)
      setFeedback({ type: 'success', message: 'Client créé avec succès.' })
    } catch (error: any) {
      setFeedback({ type: 'error', message: error?.response?.data?.message || 'Le client n’a pas pu être créé.' })
    } finally {
      setIsClientSaving(false)
    }
  }

  function handleClientHistory() {
    setFeedback({
      type: 'success',
      message: selectedClient ? `Aucun historique de règlement disponible pour ${selectedClient.nom}.` : 'Sélectionnez un client pour consulter son historique.',
    })
  }

  return (
    <Page
      eyebrow="CLIENTS / CRÉDITS"
      title="Clients & crédits"
      action="Nouveau client"
      onAction={() => setIsClientFormOpen(true)}
    >
      {isError && <div className="offline">API hors-ligne · données de démonstration affichées</div>}

      <div className="summary-grid">
        <div className="metric">
          <span className="eyebrow">DETTE TOTALE</span>
          <strong>{money(totals.totalDebt)}</strong>
          <small className="positive">↗ {clientList.filter((client) => client.detteActuelle > 0).length} client(s) concerné(s)</small>
        </div>
        <div className="metric">
          <span className="eyebrow">CRÉDITS À RISQUE</span>
          <strong>{totals.criticalCount}</strong>
          <small className="danger">▲ À relancer</small>
        </div>
        <div className="metric">
          <span className="eyebrow">PLAFOND DISPONIBLE</span>
          <strong>{money(totals.availableCredit)}</strong>
          <small className="positive">↗ marge de crédit</small>
        </div>
        <div className="metric">
          <span className="eyebrow">PAIEMENTS</span>
          <strong>—</strong>
          <small className="muted">Historique non disponible</small>
        </div>
      </div>

      <div className="split">
        <div className="panel product-picker">
          <div className="table-tools">
            <div className="search compact">
              <Search size={16} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un client" />
            </div>
          </div>

          <div className="client-list">
            {filteredClients.map((client: ClientRecord) => (
              <button
                key={client.id}
                className={`client-card ${selectedClient?.id === client.id ? 'selected' : ''}`}
                onClick={() => setSelectedClientId(client.id)}
              >
                <div className="client-header">
                  <span className="client-avatar">{client.nom.charAt(0)}</span>
                  <div>
                    <strong>{client.nom}</strong>
                    <small>{client.telephone}</small>
                  </div>
                </div>

                <div className="client-meta">
                  <span className={`pill ${client.statut === 'normal' ? 'green-pill' : client.statut === 'attention' ? 'warning-pill' : 'danger-pill'}`}>
                    {client.statut === 'normal' ? 'Normal' : client.statut === 'attention' ? 'À surveiller' : 'Bloqué'}
                  </span>
                  <span className="muted">{client.lastSale}</span>
                </div>

                <div className="client-balance">
                  <span>Dette</span>
                  <strong>{money(client.detteActuelle)}</strong>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          {selectedClient ? (
            <form className="compact-form" onSubmit={handlePayment}>
              <div className="panel-title">
                <div>
                  <span className="eyebrow">CLIENT SÉLECTIONNÉ</span>
                  <h3>{selectedClient.nom}</h3>
                </div>
                {selectedClient.detteActuelle > 0 ? <span className="danger-pill pill">Reste dû {money(selectedClient.detteActuelle)}</span> : <span className="green-pill pill">Aucun solde</span>}
              </div>

              <div className="client-summary">
                <div>
                  <span className="eyebrow">PLAFOND</span>
                  <strong>{money(selectedClient.plafondCredit)}</strong>
                </div>
                <div>
                  <span className="eyebrow">DETTE ACTUELLE</span>
                  <strong>{money(selectedClient.detteActuelle)}</strong>
                </div>
                <div>
                  <span className="eyebrow">DISPONIBLE</span>
                  <strong>{money(Math.max(0, selectedClient.plafondCredit - selectedClient.detteActuelle))}</strong>
                </div>
              </div>

              <label>
                Montant du règlement
                <input type="number" min="0" step="100" value={payment.montant} onChange={(event) => setPayment({ ...payment, montant: event.target.value })} placeholder="Ex. 150000" />
              </label>

              <label>
                Mode de paiement
                <select value={payment.modePaiement} onChange={(event) => setPayment({ ...payment, modePaiement: event.target.value })}>
                  <option value="ESPECES">Espèces</option>
                  <option value="CARTE">Carte</option>
                  <option value="VIREMENT">Virement</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                </select>
              </label>

              <label>
                Référence facture (optionnelle)
                <input type="number" min="1" value={payment.venteId} onChange={(event) => setPayment({ ...payment, venteId: event.target.value })} placeholder="ID facture client" />
              </label>

              {feedback && <div className={feedback.type === 'success' ? 'success-box' : 'error-box'}>{feedback.message}</div>}

              <div className="form-actions">
                <button className="secondary" type="button" onClick={handleClientHistory}>Historique</button>
                <button className="primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer le règlement'}
                  <ArrowRightLeft size={16} />
                </button>
              </div>
            </form>
          ) : (
            <div className="empty">
              <AlertTriangle size={28} />
              <p>Aucun client trouvé.</p>
            </div>
          )}
        </div>
      </div>

      {isClientFormOpen && (
        <div className="modal-backdrop" onClick={() => setIsClientFormOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="panel-title">
              <div>
                <span className="eyebrow">CLIENT / CRÉDIT</span>
                <h3>Nouveau client</h3>
              </div>
            </div>
            <form className="compact-form" onSubmit={handleCreateClient}>
              <label>Nom<input required value={clientForm.nom} onChange={(event) => setClientForm({ ...clientForm, nom: event.target.value })} /></label>
              <label>Téléphone<input value={clientForm.telephone} onChange={(event) => setClientForm({ ...clientForm, telephone: event.target.value })} /></label>
              <label>Plafond de crédit<input type="number" min="0" step="1000" value={clientForm.plafondCredit} onChange={(event) => setClientForm({ ...clientForm, plafondCredit: event.target.value })} /></label>
              <div className="form-actions">
                <button type="button" className="secondary" onClick={() => setIsClientFormOpen(false)}>Annuler</button>
                <button type="submit" className="primary" disabled={isClientSaving}>{isClientSaving ? 'Création...' : 'Créer le client'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Page>
  )
}
