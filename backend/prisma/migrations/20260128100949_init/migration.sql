/*
  Warnings:

  - You are about to alter the column `name` on the `modules` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(100)`.
  - You are about to alter the column `name` on the `scenarios` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(100)`.
  - You are about to alter the column `name` on the `systems` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(100)`.
  - You are about to alter the column `priority` on the `test_cases` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(10)`.
  - You are about to alter the column `source` on the `test_cases` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(10)`.

*/
-- AlterTable
ALTER TABLE `modules` MODIFY `name` VARCHAR(100) NOT NULL,
    MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `scenarios` MODIFY `name` VARCHAR(100) NOT NULL,
    MODIFY `description` TEXT NULL,
    MODIFY `content` TEXT NULL;

-- AlterTable
ALTER TABLE `systems` MODIFY `name` VARCHAR(100) NOT NULL,
    MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `test_cases` MODIFY `title` VARCHAR(255) NOT NULL,
    MODIFY `precondition` TEXT NULL,
    MODIFY `steps` TEXT NOT NULL,
    MODIFY `expectedResults` TEXT NOT NULL,
    MODIFY `priority` VARCHAR(10) NOT NULL,
    MODIFY `source` VARCHAR(10) NOT NULL;
