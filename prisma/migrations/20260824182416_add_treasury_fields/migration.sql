/*
  Warnings:

  - A unique constraint covering the columns `[utilisateurId,dateCloture]` on the table `ClotureCaisse` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dateCloture` to the `ClotureCaisse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fondDeCaisse` to the `ClotureCaisse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalCarte` to the `ClotureCaisse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalDepensesEspeces` to the `ClotureCaisse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalEspeces` to the `ClotureCaisse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalMobileMoney` to the `ClotureCaisse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalVirement` to the `ClotureCaisse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `modePaiement` to the `Vente` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ClotureCaisse" ADD COLUMN     "dateCloture" DATE NOT NULL,
ADD COLUMN     "fondDeCaisse" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "totalCarte" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "totalDepensesEspeces" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "totalEspeces" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "totalMobileMoney" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "totalVirement" DECIMAL(14,2) NOT NULL;

-- AlterTable
ALTER TABLE "Vente" ADD COLUMN     "modePaiement" "ModePaiement" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ClotureCaisse_utilisateurId_dateCloture_key" ON "ClotureCaisse"("utilisateurId", "dateCloture");
