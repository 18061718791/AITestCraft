-- CreateTable
CREATE TABLE `config_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `config_categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `config_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(255) NOT NULL,
    `value` TEXT NOT NULL,
    `category_id` INTEGER NOT NULL,
    `description` TEXT NULL,
    `is_sensitive` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `config_items_key_key`(`key`),
    INDEX `config_items_category_id_idx`(`category_id`),
    INDEX `config_items_key_idx`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `config_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `config_id` INTEGER NOT NULL,
    `old_value` TEXT NOT NULL,
    `new_value` TEXT NOT NULL,
    `changed_by` VARCHAR(100) NOT NULL DEFAULT 'system',
    `changed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `config_history_config_id_idx`(`config_id`),
    INDEX `config_history_changed_at_idx`(`changed_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `config_items` ADD CONSTRAINT `config_items_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `config_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `config_history` ADD CONSTRAINT `config_history_config_id_fkey` FOREIGN KEY (`config_id`) REFERENCES `config_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
