import { Prisma, StatutVente } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { prisma } from '../config/prisma';
import { AppError } from '../types/api';

const TVA_RATE = new Prisma.Decimal('0.20');

export interface SaleLineInput {
  produitId?: unknown;
  quantite?: unknown;
}

export interface SaleInput {
  clientId?: unknown;
  lignes?: unknown;
  montantPaye?: unknown;
  modePaiement?: unknown;
}

interface CalculatedLine {
  produitId: number;
  quantite: Prisma.Decimal;
  prixUnitaireHT: Prisma.Decimal;
  totalHT: Prisma.Decimal;
  totalTVA: Prisma.Decimal;
  totalTTC: Prisma.Decimal;
}

interface SoldProduct {
  reference: string;
  cump: Prisma.Decimal;
}

function decimal(value: unknown, code: string, message: string): Prisma.Decimal {
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new AppError(400, code, message);
  }
  try {
    const parsed = new Prisma.Decimal(String(value));
    if (!parsed.isFinite()) throw new Error(message);
    return parsed;
  } catch {
    throw new AppError(400, code, message);
  }
}

function positiveDecimal(value: unknown, code: string, message: string): Prisma.Decimal {
  const parsed = decimal(value, code, message);
  if (parsed.lte(0)) throw new AppError(400, code, message);
  return parsed;
}

function rounded(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2);
}

function productId(value: unknown): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'INVALID_PRODUCT_ID', 'L’identifiant du produit est invalide.');
  }
  return id;
}

function paymentMode(value: unknown): 'ESPECES' | 'CARTE' | 'VIREMENT' | 'MOBILE_MONEY' {
  if (value === 'ESPECES' || value === 'CARTE' || value === 'VIREMENT' || value === 'MOBILE_MONEY') {
    return value;
  }
  throw new AppError(400, 'INVALID_PAYMENT_MODE', 'Le mode de paiement est invalide.');
}

async function calculateLines(
  transaction: Prisma.TransactionClient,
  lignes: SaleLineInput[],
): Promise<CalculatedLine[]> {
  const calculatedLines: CalculatedLine[] = [];
  for (const rawLine of lignes) {
    if (!rawLine || typeof rawLine !== 'object') {
      throw new AppError(400, 'INVALID_LINES', 'Chaque ligne de vente est invalide.');
    }
    const id = productId(rawLine.produitId);
    const quantity = positiveDecimal(rawLine.quantite, 'INVALID_QUANTITY', 'La quantité doit être strictement supérieure à zéro.');
    const product = await transaction.produit.findFirst({ where: { id, estActif: true } });
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produit introuvable.');
    const price = new Prisma.Decimal(product.prixVenteHT);
    const totalHT = rounded(price.times(quantity));
    const totalTVA = rounded(totalHT.times(TVA_RATE));
    calculatedLines.push({
      produitId: id,
      quantite: quantity,
      prixUnitaireHT: price,
      totalHT,
      totalTVA,
      totalTTC: rounded(totalHT.plus(totalTVA)),
    });
  }
  return calculatedLines;
}

function totalSales(calculatedLines: CalculatedLine[]): {
  totalHT: Prisma.Decimal;
  totalTVA: Prisma.Decimal;
  totalTTC: Prisma.Decimal;
} {
  const totalHT = calculatedLines.reduce((sum, line) => sum.plus(line.totalHT), new Prisma.Decimal(0));
  const totalTVA = calculatedLines.reduce((sum, line) => sum.plus(line.totalTVA), new Prisma.Decimal(0));
  const totalTTC = calculatedLines.reduce((sum, line) => sum.plus(line.totalTTC), new Prisma.Decimal(0));
  return { totalHT, totalTVA, totalTTC };
}

function computeStatus(outstanding: Prisma.Decimal, paid: Prisma.Decimal): StatutVente {
  if (outstanding.isZero()) return 'PAYEE';
  return paid.isZero() ? 'IMPAYEE' : 'PARTIELLE';
}
function aggregateQuantities(calculatedLines: CalculatedLine[]): Map<number, Prisma.Decimal> {
  const requestedByProduct = new Map<number, Prisma.Decimal>();
  for (const line of calculatedLines) {
    requestedByProduct.set(
      line.produitId,
      (requestedByProduct.get(line.produitId) ?? new Prisma.Decimal(0)).plus(line.quantite),
    );
  }
  return requestedByProduct;
}

async function ensureStock(
  transaction: Prisma.TransactionClient,
  requestedByProduct: Map<number, Prisma.Decimal>,
): Promise<Map<number, SoldProduct>> {
  const productsById = new Map<number, SoldProduct>();
  for (const [id, quantity] of requestedByProduct) {
    const product = await transaction.produit.findFirst({ where: { id, estActif: true } });
    if (!product || new Prisma.Decimal(product.quantiteStock).lt(quantity)) {
      throw new AppError(409, 'INSUFFICIENT_STOCK', 'Le stock disponible est insuffisant.');
    }
    productsById.set(id, { reference: product.reference, cump: product.cump });
  }
  return productsById;
}

async function findClient(
  transaction: Prisma.TransactionClient,
  clientId: number | null,
  outstanding: Prisma.Decimal,
): Promise<void> {
  if (clientId === null) {
    if (outstanding.isZero()) return;
    throw new AppError(400, 'CLIENT_REQUIRED_FOR_CREDIT', 'Un client est obligatoire pour une vente à crédit.');
  }
  const lockedClients = await transaction.$queryRaw<{ id: number }[]>(
    Prisma.sql`SELECT "id" FROM "Client" WHERE "id" = ${clientId} FOR UPDATE`,
  );
  if (lockedClients.length === 0) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client introuvable.');

  const client = await transaction.client.findUnique({ where: { id: clientId } });
  if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client introuvable.');
  if (!outstanding.isZero()) {
    const amountOwed = new Prisma.Decimal(client.detteActuelle).plus(outstanding);
    if (amountOwed.gt(client.plafondCredit)) {
      throw new AppError(409, 'CREDIT_LIMIT_EXCEEDED', 'Le plafond de crédit du client est dépassé.');
    }
  }
}
async function decrementStock(
  transaction: Prisma.TransactionClient,
  requestedByProduct: Map<number, Prisma.Decimal>,
): Promise<void> {
  for (const [id, quantity] of requestedByProduct) {
    const updated = await transaction.produit.updateMany({
      where: { id, estActif: true, quantiteStock: { gte: quantity } },
      data: { quantiteStock: { decrement: quantity } },
    });
    if (updated.count !== 1) {
      throw new AppError(409, 'INSUFFICIENT_STOCK', 'Le stock disponible est insuffisant.');
    }
  }
}

async function registerStockMovements(
  transaction: Prisma.TransactionClient,
  calculatedLines: CalculatedLine[],
  productsById: Map<number, SoldProduct>,
  referenceFacture: string,
): Promise<void> {
  for (const line of calculatedLines) {
    const product = productsById.get(line.produitId);
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produit introuvable.');
    await transaction.mouvementStock.create({
      data: { type: 'SORTIE_VENTE', quantite: line.quantite, coutUnitaireHT: product.cump, produitId: line.produitId, motif: `Vente ${referenceFacture}` },
    });
  }
}
export async function createSale(input: SaleInput, userId: number) {
  if (!Array.isArray(input.lignes) || input.lignes.length === 0) {
    throw new AppError(400, 'INVALID_LINES', 'La vente doit contenir au moins une ligne.');
  }

  const paid = decimal(input.montantPaye, 'INVALID_AMOUNT', 'Le montant payé est invalide.');
  if (paid.lt(0)) throw new AppError(400, 'INVALID_AMOUNT', 'Le montant payé ne peut pas être négatif.');
  const mode = paymentMode(input.modePaiement);
  const clientId = input.clientId === null || input.clientId === undefined ? null : Number(input.clientId);
  if (clientId !== null && (!Number.isInteger(clientId) || clientId <= 0)) {
    throw new AppError(400, 'INVALID_CLIENT_ID', 'L’identifiant du client est invalide.');
  }

  return prisma.$transaction(async (transaction) => {
    const calculatedLines = await calculateLines(transaction, input.lignes as SaleLineInput[]);
    const { totalHT, totalTVA, totalTTC } = totalSales(calculatedLines);
    if (paid.gt(totalTTC)) {
      throw new AppError(400, 'INVALID_AMOUNT', 'Le montant payé ne peut pas dépasser le total TTC.');
    }
    const outstanding = totalTTC.minus(paid);
    const status = computeStatus(outstanding, paid);

    const requestedByProduct = aggregateQuantities(calculatedLines);
    const productsById = await ensureStock(transaction, requestedByProduct);
    await findClient(transaction, clientId, outstanding);

    const sale = await transaction.vente.create({
      data: {
        referenceFacture: `FAC-${Date.now()}-${randomUUID().slice(0, 8)}`,
        statutPaiement: status,
        totalHT,
        totalTVA,
        totalTTC,
        montantPaye: paid,
        modePaiement: mode,
        clientId,
        utilisateurId: userId,
        lignes: { create: calculatedLines },
      },
      include: { lignes: { include: { produit: true } }, client: true, utilisateur: true },
    });

    await decrementStock(transaction, requestedByProduct);
    await registerStockMovements(transaction, calculatedLines, productsById, sale.referenceFacture);

    if (clientId !== null && paid.gt(0)) {
      await transaction.reglementClient.create({ data: { montant: paid, modePaiement: mode, venteId: sale.id, clientId, utilisateurId: userId } });
    }
    if (clientId !== null && !outstanding.isZero()) {
      await transaction.client.update({ where: { id: clientId }, data: { detteActuelle: { increment: outstanding } } });
    }

    return transaction.vente.findUniqueOrThrow({
      where: { id: sale.id },
      include: { lignes: { include: { produit: true } }, client: true, utilisateur: true },
    });
  });
}