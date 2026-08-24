import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient, RoleUser } from '@prisma/client';

const prisma = new PrismaClient();

const defaultExpenseCategories = [
  'Loyer',
  'Salaires',
  'Electricite',
  'Transport',
  'Fournitures',
  'Autres',
];

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} must be configured before running the seed`);
  }

  return value;
}

async function main(): Promise<void> {
  const adminName = requiredEnvironmentVariable('SEED_ADMIN_NAME');
  const adminEmail = requiredEnvironmentVariable('SEED_ADMIN_EMAIL').toLowerCase();
  const adminPassword = requiredEnvironmentVariable('SEED_ADMIN_PASSWORD');
  const motDePasseHash = await bcrypt.hash(adminPassword, 12);

  await prisma.utilisateur.upsert({
    where: { email: adminEmail },
    update: {
      nom: adminName,
      motDePasseHash,
      role: RoleUser.ADMIN,
    },
    create: {
      nom: adminName,
      email: adminEmail,
      motDePasseHash,
      role: RoleUser.ADMIN,
    },
  });

  await Promise.all(
    defaultExpenseCategories.map((libelle) =>
      prisma.depenseCategorie.upsert({
        where: { libelle },
        update: {},
        create: { libelle },
      }),
    ),
  );

  console.log(`Seeded admin ${adminEmail} and ${defaultExpenseCategories.length} expense categories`);
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });