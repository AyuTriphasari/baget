/*
  Warnings:

  - A unique constraint covering the columns `[giveawayId,fid]` on the table `Winner` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Winner_giveawayId_fid_key" ON "Winner"("giveawayId", "fid");
