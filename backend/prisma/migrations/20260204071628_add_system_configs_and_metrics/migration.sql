/*
  Warnings:

  - You are about to drop the `config_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `config_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `config_items` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `config_history` DROP FOREIGN KEY `config_history_config_id_fkey`;

-- DropForeignKey
ALTER TABLE `config_items` DROP FOREIGN KEY `config_items_category_id_fkey`;

-- DropTable
DROP TABLE `config_categories`;

-- DropTable
DROP TABLE `config_history`;

-- DropTable
DROP TABLE `config_items`;

-- CreateTable
CREATE TABLE `system_configs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `config_key` VARCHAR(100) NOT NULL,
    `config_value` TEXT NOT NULL,
    `config_type` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_configs_config_key_key`(`config_key`),
    INDEX `system_configs_config_type_idx`(`config_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_metrics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `metric_name` VARCHAR(100) NOT NULL,
    `metric_value` DECIMAL(10, 2) NOT NULL,
    `metric_type` VARCHAR(50) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `details` JSON NULL,

    INDEX `system_metrics_metric_type_idx`(`metric_type`),
    INDEX `system_metrics_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
