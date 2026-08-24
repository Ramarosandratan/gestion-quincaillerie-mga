export type PaymentMode = 'ESPECES' | 'CARTE' | 'VIREMENT' | 'MOBILE_MONEY';

export interface ExpenseInput {
  montantHT?: unknown;
  modePaiement?: unknown;
  description?: unknown;
  categorieId?: unknown;
}

export interface SettlementInput {
  montant?: unknown;
  modePaiement?: unknown;
  venteId?: unknown;
}

export interface ClosureInput {
  fondDeCaisse?: unknown;
  soldeReel?: unknown;
}