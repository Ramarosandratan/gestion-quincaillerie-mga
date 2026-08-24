/*
  Warnings:

  - Added the required column `utilisateurId` to the `Depense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `utilisateurId` to the `ReglementClient` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Depense" ADD COLUMN     "utilisateurId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "ReglementClient" ADD COLUMN     "utilisateurId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "ReglementClient" ADD CONSTRAINT "ReglementClient_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Depense" ADD CONSTRAINT "Depense_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
