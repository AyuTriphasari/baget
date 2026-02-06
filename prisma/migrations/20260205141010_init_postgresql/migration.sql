-- CreateTable
CREATE TABLE "Giveaway" (
    "id" TEXT NOT NULL,
    "creator" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "rewardPerClaim" TEXT NOT NULL,
    "maxClaims" INTEGER NOT NULL,
    "expiresAt" INTEGER NOT NULL,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Giveaway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Winner" (
    "id" SERIAL NOT NULL,
    "giveawayId" TEXT NOT NULL,
    "fid" TEXT NOT NULL,
    "username" TEXT,
    "avatarUrl" TEXT,
    "txHash" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Winner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Giveaway_creator_idx" ON "Giveaway"("creator");

-- CreateIndex
CREATE INDEX "Giveaway_createdAt_idx" ON "Giveaway"("createdAt");

-- CreateIndex
CREATE INDEX "Winner_giveawayId_idx" ON "Winner"("giveawayId");

-- CreateIndex
CREATE INDEX "Winner_fid_idx" ON "Winner"("fid");

-- AddForeignKey
ALTER TABLE "Winner" ADD CONSTRAINT "Winner_giveawayId_fkey" FOREIGN KEY ("giveawayId") REFERENCES "Giveaway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
