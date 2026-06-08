/*
  Warnings:

  - The primary key for the `directories` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The required column `uuid` was added to the `directories` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE `directories` DROP PRIMARY KEY,
    ADD COLUMN `uuid` VARCHAR(191) NOT NULL,
    MODIFY `id` VARCHAR(255) NOT NULL,
    ADD PRIMARY KEY (`uuid`);

-- CreateIndex
CREATE INDEX `directories_id_idx` ON `directories`(`id`);
