/*
  Warnings:

  - You are about to drop the column `transports` on the `Passkey` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Passkey" DROP CONSTRAINT "Passkey_userId_fkey";

-- AlterTable
ALTER TABLE "Passkey" DROP COLUMN "transports",
ALTER COLUMN "publicKey" SET DATA TYPE TEXT,
ALTER COLUMN "counter" SET DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Passkey" ADD CONSTRAINT "Passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
