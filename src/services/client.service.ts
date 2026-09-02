import { prisma } from '../config/prisma';
import { AppError } from '../types/api';

export interface ClientInput {
  nom?: unknown;
  telephone?: unknown;
  plafondCredit?: unknown;
}

function positiveOrZero(value: unknown): number {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new AppError(400, 'INVALID_CREDIT_LIMIT', 'Le plafond de crédit doit être positif ou nul.');
  }
  return amount;
}

export function createClient(input: ClientInput) {
  if (typeof input.nom !== 'string' || !input.nom.trim()) {
    throw new AppError(400, 'INVALID_CLIENT', 'Le nom du client est obligatoire.');
  }

  const telephone = typeof input.telephone === 'string' ? input.telephone.trim() || null : null;
  return prisma.client.create({
    data: {
      nom: input.nom.trim(),
      telephone,
      plafondCredit: positiveOrZero(input.plafondCredit),
    },
  });
}

export function listClients() {
  return prisma.client.findMany({
    orderBy: { nom: 'asc' },
    select: {
      id: true,
      nom: true,
      telephone: true,
      plafondCredit: true,
      detteActuelle: true,
      createdAt: true,
    },
  });
}
