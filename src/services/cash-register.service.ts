import { Prisma } from '@prisma/client';

import { AppError } from '../types/api';

export function currentCashDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function ensureCashRegisterOpen(
  transaction: Prisma.TransactionClient,
  userId: number,
): Promise<void> {
  const closure = await transaction.clotureCaisse.findUnique({
    where: {
      utilisateurId_dateCloture: {
        utilisateurId: userId,
        dateCloture: currentCashDate(),
      },
    },
  });

  if (closure) {
    throw new AppError(
      409,
      'CASH_REGISTER_CLOSED',
      "La caisse est déjà clôturée pour aujourd'hui. Aucune opération autorisée.",
    );
  }
}
