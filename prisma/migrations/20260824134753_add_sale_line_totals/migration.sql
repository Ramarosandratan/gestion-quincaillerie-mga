/*
  Warnings:

  - Added the required column `totalHT` to the `LigneVente` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalTVA` to the `LigneVente` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LigneVente" ADD COLUMN     "totalHT" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "totalTVA" DECIMAL(14,2) NOT NULL;
