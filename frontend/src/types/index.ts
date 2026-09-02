export type Role = 'ADMIN' | 'CAISSIER'
export interface Product { id: number; reference: string; designation: string; prixVenteHT: number; quantiteStock: number; seuilAlerte: number }
