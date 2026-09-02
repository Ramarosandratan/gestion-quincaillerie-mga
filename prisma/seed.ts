import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, RoleUser } from '@prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const defaultExpenseCategories = [
  'Loyer',
  'Salaires',
  'Electricite',
  'Transport',
  'Fournitures',
  'Autres',
];

const defaultProducts = [
  {
    reference: 'CAB-25',
    designation: 'Câble électrique 2.5mm',
    prixAchatHT: 2800,
    prixVenteHT: 4500,
    quantiteStock: 42,
    cump: 2800,
    seuilAlerte: 5,
  },
  {
    reference: 'PER-BOSCH',
    designation: 'Perceuse Bosch GSB',
    prixAchatHT: 145000,
    prixVenteHT: 185000,
    quantiteStock: 1,
    cump: 145000,
    seuilAlerte: 3,
  },
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

  await Promise.all(
    defaultProducts.map((product) =>
      prisma.produit.upsert({
        where: { reference: product.reference },
        update: product,
        create: product,
      }),
    ),
  );

  console.log(`Seeded admin ${adminEmail}, ${defaultExpenseCategories.length} expense categories and ${defaultProducts.length} products`);
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });