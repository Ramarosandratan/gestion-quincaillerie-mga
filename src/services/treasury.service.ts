import { Prisma, StatutVente } from '@prisma/client';

import { prisma } from '../config/prisma';
import { AppError } from '../types/api';
import type { ClosureInput, ExpenseInput, PaymentMode, SettlementInput } from '../types/treasury';
import { ensureCashRegisterOpen } from './cash-register.service';

const TVA_RATE = new Prisma.Decimal('0.20');
const PAYMENT_MODES = new Set<PaymentMode>(['ESPECES', 'CARTE', 'VIREMENT', 'MOBILE_MONEY']);

function decimal(value: unknown, code: string, message: string): Prisma.Decimal {
  if (typeof value !== 'number' && typeof value !== 'string') throw new AppError(400, code, message);
  try {
    const parsed = new Prisma.Decimal(value as string | number);
    if (!parsed.isFinite()) throw new Error('Decimal must be finite');
    return parsed;
  } catch {
    throw new AppError(400, code, message);
  }
}

function positive(value: unknown, code: string, message: string): Prisma.Decimal {
  const parsed = decimal(value, code, message);
  if (parsed.lte(0)) throw new AppError(400, code, message);
  return parsed;
}

function nonNegative(value: unknown, code: string, message: string): Prisma.Decimal {
  const parsed = decimal(value, code, message);
  if (parsed.lt(0)) throw new AppError(400, code, message);
  return parsed;
}

function mode(value: unknown): PaymentMode {
  if (PAYMENT_MODES.has(value as PaymentMode)) return value as PaymentMode;
  throw new AppError(400, 'INVALID_PAYMENT_MODE', 'Le mode de paiement est invalide.');
}

function integerId(value: unknown, code: string, message: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, code, message);
  return id;
}

function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function dayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return { start, end };
}

export function listExpenseCategories() {
  return prisma.depenseCategorie.findMany({ orderBy: { libelle: 'asc' } });
}

export function listExpenses() {
  return prisma.depense.findMany({
    orderBy: { createdAt: 'desc' },
    include: { categorie: true },
  });
}

export async function createExpense(input: ExpenseInput, userId: number) {
  const montantHT = positive(input.montantHT, 'INVALID_AMOUNT', 'Le montant HT doit être strictement supérieur à zéro.');
  const montantTVA = montantHT.times(TVA_RATE).toDecimalPlaces(2);
  const montantTTC = montantHT.plus(montantTVA).toDecimalPlaces(2);
  const categorieId = integerId(input.categorieId, 'INVALID_CATEGORY_ID', 'La catégorie est invalide.');
  const categorie = await prisma.depenseCategorie.findUnique({ where: { id: categorieId } });
  if (!categorie) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Catégorie de dépense introuvable.');

  return prisma.$transaction(async (transaction) => {
    await ensureCashRegisterOpen(transaction, userId);
    return transaction.depense.create({
      data: {
        montantHT,
        montantTVA,
        montantTTC,
        modePaiement: mode(input.modePaiement),
        description: typeof input.description === 'string' ? input.description.trim() || undefined : undefined,
        categorieId,
        utilisateurId: userId,
      },
      include: { categorie: true },
    });
  });
}

export async function createSettlement(clientIdValue: unknown, input: SettlementInput, userId: number) {
  const clientId = integerId(clientIdValue, 'INVALID_CLIENT_ID', 'L’identifiant du client est invalide.');
  const montant = positive(input.montant, 'INVALID_AMOUNT', 'Le montant doit être strictement supérieur à zéro.');
  const paymentMode = mode(input.modePaiement);
  const venteId = input.venteId === undefined || input.venteId === null ? null : integerId(input.venteId, 'INVALID_SALE_ID', 'L’identifiant de la vente est invalide.');

  return prisma.$transaction(async (transaction) => {
    await ensureCashRegisterOpen(transaction, userId);
    const lockedClients = await transaction.$queryRaw<{ id: number }[]>(
      Prisma.sql`SELECT "id" FROM "Client" WHERE "id" = ${clientId} FOR UPDATE`,
    );
    if (lockedClients.length === 0) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client introuvable.');

    const client = await transaction.client.findUnique({ where: { id: clientId } });
    if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client introuvable.');
    const debt = new Prisma.Decimal(client.detteActuelle);
    if (montant.gt(debt)) throw new AppError(409, 'PAYMENT_EXCEEDS_DEBT', 'Le règlement dépasse la dette actuelle du client.');

    let sale;
    if (venteId !== null) {
      sale = await transaction.vente.findUnique({ where: { id: venteId } });
      if (sale?.clientId !== clientId) throw new AppError(404, 'SALE_NOT_FOUND', 'Facture client introuvable.');
      const balance = new Prisma.Decimal(sale.totalTTC).minus(sale.montantPaye);
      if (montant.gt(balance)) throw new AppError(409, 'PAYMENT_EXCEEDS_INVOICE_BALANCE', 'Le règlement dépasse le solde de la facture.');
    }

    const settlement = await transaction.reglementClient.create({ data: { montant, modePaiement: paymentMode, venteId, clientId, utilisateurId: userId } });
    if (sale) {
      const paid = new Prisma.Decimal(sale.montantPaye).plus(montant);
      const status: StatutVente = paid.gte(sale.totalTTC) ? 'PAYEE' : 'PARTIELLE';
      await transaction.vente.update({ where: { id: sale.id }, data: { montantPaye: paid, statutPaiement: status } });
    }
    const updatedClient = await transaction.client.update({ where: { id: clientId }, data: { detteActuelle: { decrement: montant } } });
    return { settlement, client: updatedClient };
  });
}

export async function closeCashRegister(userId: number, input: ClosureInput) {
  const fondDeCaisse = nonNegative(input.fondDeCaisse, 'INVALID_AMOUNT', 'Le fond de caisse doit être positif ou nul.');
  const soldeReel = nonNegative(input.soldeReel, 'INVALID_AMOUNT', 'Le solde réel doit être positif ou nul.');
  const dateCloture = today();
  const { start, end } = dayBounds(dateCloture);

  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.clotureCaisse.findUnique({ where: { utilisateurId_dateCloture: { utilisateurId: userId, dateCloture } } });
    if (existing) throw new AppError(409, 'CLOSURE_ALREADY_EXISTS', 'Une clôture existe déjà pour cette journée.');

    const [sales, settlements, expenses] = await Promise.all([
      transaction.vente.findMany({ where: { utilisateurId: userId, createdAt: { gte: start, lt: end } }, select: { montantPaye: true, modePaiement: true } }),
      transaction.reglementClient.findMany({ where: { utilisateurId: userId, createdAt: { gte: start, lt: end } }, select: { montant: true, modePaiement: true } }),
      transaction.depense.findMany({ where: { utilisateurId: userId, createdAt: { gte: start, lt: end }, modePaiement: 'ESPECES' }, select: { montantTTC: true } }),
    ]);

    const totals: Record<PaymentMode, Prisma.Decimal> = {
      ESPECES: new Prisma.Decimal(0),
      MOBILE_MONEY: new Prisma.Decimal(0),
      CARTE: new Prisma.Decimal(0),
      VIREMENT: new Prisma.Decimal(0),
    };
    for (const sale of sales) totals[sale.modePaiement] = totals[sale.modePaiement].plus(sale.montantPaye);
    for (const settlement of settlements) totals[settlement.modePaiement] = totals[settlement.modePaiement].plus(settlement.montant);
    const totalDepensesEspeces = expenses.reduce((sum, expense) => sum.plus(expense.montantTTC), new Prisma.Decimal(0));
    const soldeTheorique = fondDeCaisse.plus(totals.ESPECES).minus(totalDepensesEspeces);
    const closure = await transaction.clotureCaisse.create({
      data: {
        dateCloture,
        fondDeCaisse,
        soldeTheorique,
        soldeReel,
        ecart: soldeReel.minus(soldeTheorique),
        totalEspeces: totals.ESPECES,
        totalMobileMoney: totals.MOBILE_MONEY,
        totalCarte: totals.CARTE,
        totalVirement: totals.VIREMENT,
        totalDepensesEspeces,
        utilisateurId: userId,
      },
    });
    return closure;
  });
}