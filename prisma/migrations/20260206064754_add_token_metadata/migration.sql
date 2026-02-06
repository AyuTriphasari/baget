-- AlterTable
ALTER TABLE "Giveaway" ADD COLUMN     "tokenDecimals" INTEGER NOT NULL DEFAULT 18,
ADD COLUMN     "tokenSymbol" TEXT NOT NULL DEFAULT 'ETH';
