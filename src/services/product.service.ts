import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';
import { AppError } from '../types/api';
import { ensureCashRegisterOpen } from './cash-register.service';

export interface ProductInput {
  reference?: unknown;
  designation?: unknown;
  prixAchatHT?: unknown;
  prixVenteHT?: unknown;
  quantiteStock?: unknown;
  seuilAlerte?: unknown;
}

export interface StockEntryInput {
  produitId?: unknown;
  quantite?: unknown;
  prixAchatHT?: unknown;
  modePaiement?: unknown;
  categorieId?: unknown;
  motif?: unknown;
}

export interface InventoryAdjustmentInput {
  produitId?: unknown;
  quantite?: unknown;
  motif?: unknown;
}

function positiveDecimal(value: unknown, code: string, message: string): Prisma.Decimal {
  let parsed: Prisma.Decimal;
  try {
    parsed = new Prisma.Decimal(value as string | number);
  } catch {
    throw new AppError(400, code, message);
  }
  if (!parsed.isFinite() || parsed.lte(0)) {
    throw new AppError(400, code, message);
  }
  return parsed;
}

function nonNegativeDecimal(value: unknown, code: string, message: string): Prisma.Decimal {
  let parsed: Prisma.Decimal;
  try {
    parsed = new Prisma.Decimal(value as string | number);
  } catch {
    throw new AppError(400, code, message);
  }
  if (!parsed.isFinite() || parsed.lt(0)) {
    throw new AppError(400, code, message);
  }
  return parsed;
}

function rounded(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2);
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(400, 'INVALID_PRODUCT', `${field} est obligatoire.`);
  }
  return value.trim();
}

function paymentMode(value: unknown): 'ESPECES' | 'CARTE' | 'VIREMENT' | 'MOBILE_MONEY' {
  if (value === 'ESPECES' || value === 'CARTE' || value === 'VIREMENT' || value === 'MOBILE_MONEY') {
    return value;
  }
  throw new AppError(400, 'INVALID_PAYMENT_MODE', 'Le mode de paiement est invalide.');
}

function productValues(input: ProductInput) {
  const prixAchatHT = positiveDecimal(input.prixAchatHT, 'INVALID_PRICE', "Le prix d'achat doit être supérieur à zéro.");

  return {
    reference: requiredText(input.reference, 'La référence'),
    designation: requiredText(input.designation, 'La désignation'),
    prixAchatHT,
    prixVenteHT: positiveDecimal(input.prixVenteHT, 'INVALID_PRICE', 'Le prix de vente doit être supérieur à zéro.'),
    quantiteStock: nonNegativeDecimal(input.quantiteStock ?? 0, 'INVALID_QUANTITY', 'La quantité doit être positive ou nulle.'),
    seuilAlerte: nonNegativeDecimal(input.seuilAlerte ?? 5, 'INVALID_ALERT_THRESHOLD', "Le seuil d'alerte doit être positif ou nul."),
  };
}

export function listProducts() {
  return prisma.produit.findMany({ where: { estActif: true }, orderBy: { designation: 'asc' } });
}

export async function searchProducts(query: string) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const exact = await prisma.produit.findFirst({
    where: { estActif: true, reference: normalizedQuery },
  });
  const matches = await prisma.produit.findMany({
    where: {
      estActif: true,
      designation: { contains: normalizedQuery, mode: 'insensitive' },
      ...(exact ? { id: { not: exact.id } } : {}),
    },
    orderBy: { designation: 'asc' },
  });

  return exact ? [exact, ...matches] : matches;
}

export async function listCriticalProducts() {
  const products = await prisma.produit.findMany({
    where: { estActif: true },
    orderBy: { designation: 'asc' },
  });

  return products.filter((product) => {
    const stock = new Prisma.Decimal(product.quantiteStock);
    const threshold = new Prisma.Decimal(product.seuilAlerte);
    return stock.lte(0) || (stock.gt(0) && stock.lte(threshold));
  });
}

export async function getProduct(id: number) {
  const product = await prisma.produit.findFirst({ where: { id, estActif: true } });
  if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produit introuvable.');
  return product;
}

export async function createProduct(input: ProductInput) {
  const values = productValues(input);
  return prisma.produit.create({ data: { ...values, cump: values.prixAchatHT } });
}

export async function updateProduct(id: number, input: ProductInput) {
  await getProduct(id);
  const { reference, designation, prixAchatHT, prixVenteHT, seuilAlerte } = productValues(input);
  return prisma.produit.update({
    where: { id },
    data: { reference, designation, prixAchatHT, cump: prixAchatHT, prixVenteHT, seuilAlerte },
  });
}

export async function deactivateProduct(id: number) {
  await getProduct(id);
  return prisma.produit.update({ where: { id }, data: { estActif: false } });
}

export async function addStock(input: StockEntryInput, userId: number) {
  const produitId = Number(input.produitId);
  if (!Number.isInteger(produitId) || produitId <= 0) {
    throw new AppError(400, 'INVALID_PRODUCT_ID', 'L’identifiant du produit est invalide.');
  }

  const quantity = positiveDecimal(input.quantite, 'INVALID_QUANTITY', 'La quantité saisie doit être strictement supérieure à zéro.');
  const purchasePrice = positiveDecimal(input.prixAchatHT, 'INVALID_PRICE', "Le prix d'achat doit être strictement supérieur à zéro.");
  const categorieId = Number(input.categorieId);
  if (!Number.isInteger(categorieId) || categorieId <= 0) {
    throw new AppError(400, 'INVALID_CATEGORY_ID', 'La catégorie de dépense est invalide.');
  }
  const mode = paymentMode(input.modePaiement);

  return prisma.$transaction(async (transaction) => {
    await ensureCashRegisterOpen(transaction, userId);
    const product = await transaction.produit.findFirst({ where: { id: produitId, estActif: true } });
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produit introuvable.');
    const category = await transaction.depenseCategorie.findUnique({ where: { id: categorieId } });
    if (!category) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Catégorie de dépense introuvable.');

    const currentQuantity = new Prisma.Decimal(product.quantiteStock);
    const currentCump = new Prisma.Decimal(product.cump);
    const totalQuantity = currentQuantity.plus(quantity);
    const newCump = rounded(
      currentQuantity.isZero()
        ? purchasePrice
        : currentQuantity.times(currentCump).plus(quantity.times(purchasePrice)).div(totalQuantity),
    );

    const updatedProduct = await transaction.produit.update({
      where: { id: produitId },
      data: { quantiteStock: totalQuantity, prixAchatHT: newCump, cump: newCump },
    });
    await transaction.mouvementStock.create({
      data: { type: 'ENTREE', quantite: quantity, coutUnitaireHT: newCump, motif: typeof input.motif === 'string' ? input.motif.trim() : undefined, produitId },
    });

    const montantHT = rounded(quantity.times(purchasePrice));
    const montantTVA = rounded(montantHT.times(new Prisma.Decimal('0.20')));
    await transaction.depense.create({
      data: {
        montantHT,
        montantTVA,
        montantTTC: rounded(montantHT.plus(montantTVA)),
        modePaiement: mode,
        categorieId,
        description: typeof input.motif === 'string' ? input.motif.trim() || 'Achat de stock' : 'Achat de stock',
        utilisateurId: userId,
      },
    });

    return updatedProduct;
  });
}

export async function adjustStock(input: InventoryAdjustmentInput, userId: number) {
  const produitId = Number(input.produitId);
  if (!Number.isInteger(produitId) || produitId <= 0) {
    throw new AppError(400, 'INVALID_PRODUCT_ID', 'L’identifiant du produit est invalide.');
  }
  if (typeof input.quantite !== 'number' && typeof input.quantite !== 'string') {
    throw new AppError(400, 'INVALID_QUANTITY', 'La quantité d’ajustement est invalide.');
  }
  const rawDelta = Number(input.quantite);
  if (!Number.isFinite(rawDelta) || rawDelta === 0) {
    throw new AppError(400, 'INVALID_QUANTITY', 'La quantité d’ajustement doit être différente de zéro.');
  }
  if (typeof input.motif !== 'string' || !['CASSE', 'PERTE', 'PEREMPTION', 'VOL'].includes(input.motif)) {
    throw new AppError(400, 'INVALID_ADJUSTMENT_REASON', 'Le motif doit être CASSE, PERTE, PEREMPTION ou VOL.');
  }
  const motif = input.motif;
  const delta = new Prisma.Decimal(String(rawDelta));
  const quantity = delta.abs();

  return prisma.$transaction(async (transaction) => {
    await ensureCashRegisterOpen(transaction, userId);
    const product = await transaction.produit.findFirst({ where: { id: produitId, estActif: true } });
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produit introuvable.');
    const updated = await transaction.produit.updateMany({
      where: { id: produitId, estActif: true, ...(delta.isNegative() ? { quantiteStock: { gte: quantity } } : {}) },
      data: { quantiteStock: { increment: delta } },
    });
    if (updated.count !== 1) throw new AppError(409, 'INSUFFICIENT_STOCK', 'L’ajustement rendrait le stock négatif.');
    return transaction.mouvementStock.create({
      data: { type: delta.isNegative() ? 'PERTE' : 'AJUSTEMENT', quantite: quantity, coutUnitaireHT: product.cump, motif, produitId },
    });
  });
}