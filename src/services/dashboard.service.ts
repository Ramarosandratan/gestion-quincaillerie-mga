import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';

function dayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function money(value: Prisma.Decimal): number {
  return Number(value.toDecimalPlaces(2).toString());
}

export async function getDashboardStats() {
  const now = new Date();
  const today = dayStart(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const [sales, expenses, clients] = await Promise.all([
    prisma.vente.findMany({
      where: { createdAt: { gte: sevenDaysAgo, lt: tomorrow } },
      select: { totalHT: true, montantPaye: true, createdAt: true },
    }),
    prisma.depense.findMany({
      where: { createdAt: { gte: today, lt: tomorrow } },
      select: { montantTTC: true },
    }),
    prisma.client.findMany({
      where: { detteActuelle: { gt: 0 } },
      select: { detteActuelle: true },
    }),
  ]);

  const todaySales = sales.filter((sale) => sale.createdAt >= today && sale.createdAt < tomorrow);
  const dailySales = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sevenDaysAgo);
    date.setDate(sevenDaysAgo.getDate() + index);
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);
    const totalHT = sales
      .filter((sale) => sale.createdAt >= date && sale.createdAt < nextDate)
      .reduce((sum, sale) => sum.plus(sale.totalHT), new Prisma.Decimal(0));

    return {
      label: new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date).replace('.', ''),
      date: date.toISOString().slice(0, 10),
      totalHT: money(totalHT),
    };
  });

  const totalCredit = clients.reduce((sum, client) => sum.plus(client.detteActuelle), new Prisma.Decimal(0));
  const totalExpenses = expenses.reduce((sum, expense) => sum.plus(expense.montantTTC), new Prisma.Decimal(0));

  return {
    date: today.toISOString().slice(0, 10),
    chiffreAffairesHT: money(todaySales.reduce((sum, sale) => sum.plus(sale.totalHT), new Prisma.Decimal(0))),
    encaissements: money(todaySales.reduce((sum, sale) => sum.plus(sale.montantPaye), new Prisma.Decimal(0))),
    depenses: money(totalExpenses),
    credits: money(totalCredit),
    clientsAvecCredit: clients.length,
    ventesParJour: dailySales,
  };
}
