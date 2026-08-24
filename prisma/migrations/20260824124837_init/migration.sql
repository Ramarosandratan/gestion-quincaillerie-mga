-- CreateEnum
CREATE TYPE "RoleUser" AS ENUM ('ADMIN', 'CAISSIER');

-- CreateEnum
CREATE TYPE "TypeMouvement" AS ENUM ('ENTREE', 'SORTIE_VENTE', 'PERTE', 'AJUSTEMENT');

-- CreateEnum
CREATE TYPE "StatutVente" AS ENUM ('PAYEE', 'PARTIELLE', 'IMPAYEE');

-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('ESPECES', 'CARTE', 'VIREMENT', 'MOBILE_MONEY');

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasseHash" TEXT NOT NULL,
    "role" "RoleUser" NOT NULL DEFAULT 'CAISSIER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "plafondCredit" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "detteActuelle" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produit" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "prixAchatHT" DECIMAL(14,2) NOT NULL,
    "prixVenteHT" DECIMAL(14,2) NOT NULL,
    "quantiteStock" DECIMAL(14,3) NOT NULL DEFAULT 0.00,
    "cump" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "seuilAlerte" DECIMAL(14,3) NOT NULL DEFAULT 5.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Produit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vente" (
    "id" SERIAL NOT NULL,
    "referenceFacture" TEXT NOT NULL,
    "statutPaiement" "StatutVente" NOT NULL DEFAULT 'PAYEE',
    "totalHT" DECIMAL(14,2) NOT NULL,
    "totalTVA" DECIMAL(14,2) NOT NULL,
    "totalTTC" DECIMAL(14,2) NOT NULL,
    "montantPaye" DECIMAL(14,2) NOT NULL,
    "clientId" INTEGER,
    "utilisateurId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneVente" (
    "id" SERIAL NOT NULL,
    "quantite" DECIMAL(14,3) NOT NULL,
    "prixUnitaireHT" DECIMAL(14,2) NOT NULL,
    "totalTTC" DECIMAL(14,2) NOT NULL,
    "venteId" INTEGER NOT NULL,
    "produitId" INTEGER NOT NULL,

    CONSTRAINT "LigneVente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MouvementStock" (
    "id" SERIAL NOT NULL,
    "type" "TypeMouvement" NOT NULL,
    "quantite" DECIMAL(14,3) NOT NULL,
    "coutUnitaireHT" DECIMAL(14,2) NOT NULL,
    "motif" TEXT,
    "produitId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MouvementStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReglementClient" (
    "id" SERIAL NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,
    "modePaiement" "ModePaiement" NOT NULL,
    "venteId" INTEGER,
    "clientId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReglementClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepenseCategorie" (
    "id" SERIAL NOT NULL,
    "libelle" TEXT NOT NULL,

    CONSTRAINT "DepenseCategorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Depense" (
    "id" SERIAL NOT NULL,
    "montantHT" DECIMAL(14,2) NOT NULL,
    "montantTVA" DECIMAL(14,2) NOT NULL,
    "montantTTC" DECIMAL(14,2) NOT NULL,
    "modePaiement" "ModePaiement" NOT NULL,
    "description" TEXT,
    "categorieId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Depense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClotureCaisse" (
    "id" SERIAL NOT NULL,
    "soldeTheorique" DECIMAL(14,2) NOT NULL,
    "soldeReel" DECIMAL(14,2) NOT NULL,
    "ecart" DECIMAL(14,2) NOT NULL,
    "utilisateurId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClotureCaisse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Produit_reference_key" ON "Produit"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Vente_referenceFacture_key" ON "Vente"("referenceFacture");

-- CreateIndex
CREATE UNIQUE INDEX "DepenseCategorie_libelle_key" ON "DepenseCategorie"("libelle");

-- AddForeignKey
ALTER TABLE "Vente" ADD CONSTRAINT "Vente_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vente" ADD CONSTRAINT "Vente_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneVente" ADD CONSTRAINT "LigneVente_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "Vente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneVente" ADD CONSTRAINT "LigneVente_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MouvementStock" ADD CONSTRAINT "MouvementStock_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglementClient" ADD CONSTRAINT "ReglementClient_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "Vente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglementClient" ADD CONSTRAINT "ReglementClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Depense" ADD CONSTRAINT "Depense_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "DepenseCategorie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClotureCaisse" ADD CONSTRAINT "ClotureCaisse_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
