-- CreateTable
CREATE TABLE `notification_recipients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `send_key` VARCHAR(255) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `start_time` VARCHAR(5) NOT NULL,
    `end_time` VARCHAR(5) NOT NULL,
    `interval` INTEGER NOT NULL DEFAULT 60,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_settings_unique` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `setting_id` INTEGER NOT NULL,

    UNIQUE INDEX `notification_settings_unique_setting_id_key`(`setting_id`),
    UNIQUE INDEX `notification_settings_unique_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notification_settings_unique` ADD CONSTRAINT `notification_settings_unique_setting_id_fkey` FOREIGN KEY (`setting_id`) REFERENCES `notification_settings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
