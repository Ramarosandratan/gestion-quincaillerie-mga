import { Search } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { Page } from '../components/Layout'
import { api } from '../services/api'

const money = (value: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MGA', maximumFractionDigits: 0 }).format(value)

const emptyForm = {
  reference: '',
  designation: '',
  prixAchatHT: '0',
  prixVenteHT: '0',
  quantiteStock: '0',
  seuilAlerte: '5',
}

const emptyStockForm = {
  quantite: '0',
  prixAchatHT: '0',
  motif: 'Réapprovisionnement',
}

export function ProductsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isStockFormOpen, setIsStockFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [stockTargetId, setStockTargetId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [stockForm, setStockForm] = useState(emptyStockForm)

  const { data = [], isError } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/produits')).data.data,
    retry: false,
    placeholderData: [
      {
        id: 1,
        designation: 'Câble électrique 2.5mm',
        reference: 'CAB-25',
        quantiteStock: 42,
        seuilAlerte: 5,
        prixVenteHT: 4500,
      },
      {
        id: 2,
        designation: 'Perceuse Bosch GSB',
        reference: 'PER-BOSCH',
        quantiteStock: 1,
        seuilAlerte: 3,
        prixVenteHT: 185000,
      },
    ],
  })

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return data
    return data.filter((product: any) => {
      const text = `${product.reference ?? ''} ${product.designation ?? ''}`.toLowerCase()
      return text.includes(query)
    })
  }, [data, search])

  function closeProductForm() {
    setIsFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  function closeStockForm() {
    setIsStockFormOpen(false)
    setStockTargetId(null)
    setStockForm(emptyStockForm)
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setFeedback(null)

    try {
      const payload = {
        reference: form.reference,
        designation: form.designation,
        prixAchatHT: Number(form.prixAchatHT),
        prixVenteHT: Number(form.prixVenteHT),
        quantiteStock: Number(form.quantiteStock),
        seuilAlerte: Number(form.seuilAlerte),
      }

      if (editingId !== null) {
        await api.put(`/produits/${editingId}`, payload)
        setFeedback({ type: 'success', message: 'Produit mis à jour avec succès.' })
      } else {
        await api.post('/produits', payload)
        setFeedback({ type: 'success', message: 'Produit ajouté avec succès.' })
      }

      queryClient.invalidateQueries({ queryKey: ['products'] })
      closeProductForm()
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Le produit n’a pas pu être enregistré.'
      setFeedback({ type: 'error', message })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteProduct(productId: number) {
    const confirmed = window.confirm('Supprimer ce produit ? Cette action le désactive du stock.')
    if (!confirmed) return

    try {
      await api.delete(`/produits/${productId}`)
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setFeedback({ type: 'success', message: 'Produit supprimé.' })
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Le produit n’a pas pu être supprimé.'
      setFeedback({ type: 'error', message })
    }
  }

  async function submitStockEntry(event: React.FormEvent) {
    event.preventDefault()
    if (stockTargetId === null) return

    try {
      await api.post('/stocks/entree', {
        produitId: stockTargetId,
        quantite: Number(stockForm.quantite),
        prixAchatHT: Number(stockForm.prixAchatHT),
        categorieId: 1,
        modePaiement: 'ESPECES',
        motif: stockForm.motif,
      })

      queryClient.invalidateQueries({ queryKey: ['products'] })
      setFeedback({ type: 'success', message: 'Réapprovisionnement enregistré.' })
      closeStockForm()
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Le réapprovisionnement n’a pas pu être enregistré.'
      setFeedback({ type: 'error', message })
    }
  }

  return (
    <Page
      eyebrow="INVENTAIRE / CATALOGUE"
      title="Produits & stocks"
      action="Nouveau produit"
      onAction={() => {
        setEditingId(null)
        setForm(emptyForm)
        setIsFormOpen(true)
      }}
    >
      {isError && <div className="offline">API hors-ligne · données de démonstration affichées</div>}

      {feedback && (
        <div className={feedback.type === 'success' ? 'success-box' : 'error-box'}>{feedback.message}</div>
      )}

      <div className="panel table-panel">
        <div className="table-tools">
          <div className="search compact">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par référence ou désignation"
            />
          </div>
          <button className="secondary" onClick={() => {
            setEditingId(null)
            setForm(emptyForm)
            setIsFormOpen(true)
          }}>
            + Nouveau produit
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Article</th>
              <th>Référence</th>
              <th>Stock</th>
              <th>Prix de vente HT</th>
              <th>État</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product: any) => (
              <tr key={product.id ?? product.reference}>
                <td>
                  <strong>{product.designation}</strong>
                </td>
                <td>
                  <code>{product.reference}</code>
                </td>
                <td>{product.quantiteStock}</td>
                <td>{money(Number(product.prixVenteHT))}</td>
                <td>
                  <span
                    className={
                      Number(product.quantiteStock) <= Number(product.seuilAlerte)
                        ? 'pill danger-pill'
                        : 'pill green-pill'
                    }
                  >
                    {Number(product.quantiteStock) <= Number(product.seuilAlerte)
                      ? 'Stock bas'
                      : 'En stock'}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="table-action"
                      onClick={() => {
                        setEditingId(product.id)
                        setForm({
                          reference: product.reference,
                          designation: product.designation,
                          prixAchatHT: String(product.prixAchatHT ?? 0),
                          prixVenteHT: String(product.prixVenteHT ?? 0),
                          quantiteStock: String(product.quantiteStock ?? 0),
                          seuilAlerte: String(product.seuilAlerte ?? 5),
                        })
                        setIsFormOpen(true)
                      }}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="table-action positive"
                      onClick={() => {
                        setStockTargetId(product.id)
                        setStockForm({
                          quantite: '0',
                          prixAchatHT: String(product.prixAchatHT ?? 0),
                          motif: 'Réapprovisionnement',
                        })
                        setIsStockFormOpen(true)
                      }}
                    >
                      Réapprov.
                    </button>
                    <button type="button" className="table-action danger" onClick={() => handleDeleteProduct(product.id)}>
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <div className="modal-backdrop" onClick={closeProductForm}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="panel-title">
              <div>
                <span className="eyebrow">STOCK / ARTICLE</span>
                <h3>{editingId !== null ? 'Modifier le produit' : 'Nouveau produit'}</h3>
              </div>
            </div>

            <form onSubmit={submitForm} className="product-form">
              <div className="form-grid">
                <label>
                  Référence
                  <input
                    value={form.reference}
                    onChange={(event) => setForm({ ...form, reference: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Désignation
                  <input
                    value={form.designation}
                    onChange={(event) => setForm({ ...form, designation: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Prix d’achat HT
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.prixAchatHT}
                    onChange={(event) => setForm({ ...form, prixAchatHT: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Prix de vente HT
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.prixVenteHT}
                    onChange={(event) => setForm({ ...form, prixVenteHT: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Quantité initiale
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.quantiteStock}
                    onChange={(event) => setForm({ ...form, quantiteStock: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Seuil d’alerte
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.seuilAlerte}
                    onChange={(event) => setForm({ ...form, seuilAlerte: event.target.value })}
                    required
                  />
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="secondary" onClick={closeProductForm}>
                  Annuler
                </button>
                <button type="submit" className="primary" disabled={saving}>
                  {saving ? 'Enregistrement...' : editingId !== null ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isStockFormOpen && (
        <div className="modal-backdrop" onClick={closeStockForm}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="panel-title">
              <div>
                <span className="eyebrow">STOCK / RÉAPPROVISIONNEMENT</span>
                <h3>Ajouter au stock</h3>
              </div>
            </div>

            <form onSubmit={submitStockEntry} className="product-form">
              <div className="form-grid">
                <label>
                  Quantité
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={stockForm.quantite}
                    onChange={(event) => setStockForm({ ...stockForm, quantite: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Prix d’achat HT unitaire
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={stockForm.prixAchatHT}
                    onChange={(event) => setStockForm({ ...stockForm, prixAchatHT: event.target.value })}
                    required
                  />
                </label>
                <label style={{ gridColumn: '1 / -1' }}>
                  Motif
                  <input
                    value={stockForm.motif}
                    onChange={(event) => setStockForm({ ...stockForm, motif: event.target.value })}
                    required
                  />
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="secondary" onClick={closeStockForm}>
                  Annuler
                </button>
                <button type="submit" className="primary">
                  Valider l’entrée
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Page>
  )
}
