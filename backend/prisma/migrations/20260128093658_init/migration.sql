-- CreateTable
CREATE TABLE `modules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `system_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `modules_system_id_fkey`(`system_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scenarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `module_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `content` VARCHAR(191) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `scenarios_module_id_fkey`(`module_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `systems` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `test_cases` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `precondition` VARCHAR(191) NULL,
    `steps` VARCHAR(191) NOT NULL,
    `expectedResults` VARCHAR(191) NOT NULL,
    `priority` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `systemId` INTEGER NULL,
    `moduleId` INTEGER NULL,
    `scenarioId` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `tags` JSON NULL,
    `status` ENUM('PENDING', 'PASSED', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',

    INDEX `test_cases_created_at_idx`(`created_at`),
    INDEX `test_cases_moduleId_idx`(`moduleId`),
    INDEX `test_cases_priority_idx`(`priority`),
    INDEX `test_cases_scenarioId_idx`(`scenarioId`),
    INDEX `test_cases_source_idx`(`source`),
    INDEX `test_cases_status_idx`(`status`),
    INDEX `test_cases_systemId_idx`(`systemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `modules` ADD CONSTRAINT `modules_system_id_fkey` FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scenarios` ADD CONSTRAINT `scenarios_module_id_fkey` FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_cases` ADD CONSTRAINT `test_cases_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `modules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_cases` ADD CONSTRAINT `test_cases_scenarioId_fkey` FOREIGN KEY (`scenarioId`) REFERENCES `scenarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_cases` ADD CONSTRAINT `test_cases_systemId_fkey` FOREIGN KEY (`systemId`) REFERENCES `systems`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
