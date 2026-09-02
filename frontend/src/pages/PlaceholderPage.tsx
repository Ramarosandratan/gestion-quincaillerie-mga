import { Page } from '../components/Layout'

export function PlaceholderPage({
  type,
  title,
  eyebrow,
  action,
}: {
  type: string
  title: string
  eyebrow: string
  action?: string
}) {
  return (
    <Page eyebrow={eyebrow} title={title} action={action}>
      <div className="empty-page">
        <div className="empty-symbol">{type === 'clients' ? '◎' : type === 'depenses' ? '₿' : 'Z'}</div>
        <h2>Votre espace {title.toLowerCase()}</h2>
        <p>Les données apparaîtront ici dès que l’API sera connectée.</p>
        <button className="secondary">Voir les données de démonstration</button>
      </div>
    </Page>
  )
}
