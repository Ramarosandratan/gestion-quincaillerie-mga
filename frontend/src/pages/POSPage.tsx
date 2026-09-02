import { Search, ShoppingCart } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { Page } from '../components/Layout'
import { api } from '../services/api'
import { useCartStore } from '../store/cart'

const money = (value: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MGA', maximumFractionDigits: 0 }).format(value)

export function POSPage() {
  const { items, add, remove, clear } = useCartStore()
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalTtc = total * 1.2
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const { data = [] } = useQuery({
    queryKey: ['pos-products'],
    queryFn: async () => (await api.get('/produits')).data.data,
    retry: false,
    placeholderData: [
      { id: 1, designation: 'Câble électrique 2.5mm', reference: 'CAB-25', prixVenteHT: 4500, quantiteStock: 42 },
      { id: 2, designation: 'Vis inox 4×40', reference: 'VIS-440', prixVenteHT: 1200, quantiteStock: 8 },
    ],
  })

  async function handleCheckout() {
    if (!items.length) return

    setIsSubmitting(true)
    setFeedback(null)

    try {
      const payload = {
        lignes: items.map((item) => ({
          produitId: item.id,
          quantite: item.quantity,
        })),
        montantPaye: Number(totalTtc.toFixed(2)),
        modePaiement: 'ESPECES',
        clientId: null,
      }

      await api.post('/ventes', payload)
      clear()
      setFeedback({ type: 'success', message: 'Vente enregistrée avec succès.' })
    } catch (error: any) {
      const message = error?.response?.data?.message || 'La vente n’a pas pu être enregistrée.'
      setFeedback({ type: 'error', message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Page eyebrow="VENTE / ENCAISSEMENT" title="Caisse">
      <div className="pos-grid">
        <div className="panel product-picker">
          <div className="search">
            <Search size={17} />
            <input placeholder="Scanner ou rechercher un article..." />
            <kbd>⌘ K</kbd>
          </div>

          <div className="product-list">
            {data.map((product: any) => (
              <button
                className="product-tile"
                key={product.id}
                onClick={() => add({ id: product.id, name: product.designation, price: Number(product.prixVenteHT), quantity: 1 })}
              >
                <span className="tile-code">{product.reference}</span>
                <strong>{product.designation}</strong>
                <small>
                  {money(Number(product.prixVenteHT))} · {product.quantiteStock} en stock
                </small>
              </button>
            ))}
          </div>
        </div>

        <div className="panel cart">
          <div className="panel-title">
            <div>
              <span className="eyebrow">PANIER ACTUEL</span>
              <h3>
                {items.length} article{items.length > 1 ? 's' : ''}
              </h3>
            </div>
            <span className="eyebrow">TTC</span>
          </div>

          {items.length ? (
            items.map((item) => (
              <div className="cart-row" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <small>
                    {item.quantity} × {money(item.price)}
                  </small>
                </div>
                <b>{money(item.quantity * item.price * 1.2)}</b>
                <button onClick={() => remove(item.id)}>×</button>
              </div>
            ))
          ) : (
            <div className="empty">
              <ShoppingCart size={28} />
              <p>Votre panier est vide</p>
              <small>Sélectionnez un article pour commencer.</small>
            </div>
          )}

          <div className="cart-total">
            <span>Total à encaisser</span>
            <strong>{money(totalTtc)}</strong>
          </div>

          {feedback && (
            <div className={feedback.type === 'success' ? 'success-box' : 'error-box'}>{feedback.message}</div>
          )}

          <button className="primary wide" disabled={!items.length || isSubmitting} onClick={handleCheckout}>
            {isSubmitting ? 'Encaissement...' : 'Encaisser la vente'} <span>→</span>
          </button>
        </div>
      </div>
    </Page>
  )
}
