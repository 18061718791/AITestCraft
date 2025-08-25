-- CreateTable
CREATE TABLE `scenarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `module_id` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `content` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `test_cases` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `precondition` TEXT NULL,
    `steps` TEXT NOT NULL,
    `expectedResults` TEXT NOT NULL,
    `priority` VARCHAR(10) NOT NULL,
    `source` VARCHAR(10) NOT NULL,
    `systemId` INTEGER NULL,
    `moduleId` INTEGER NULL,
    `scenarioId` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `test_cases_source_idx`(`source`),
    INDEX `test_cases_priority_idx`(`priority`),
    INDEX `test_cases_systemId_idx`(`systemId`),
    INDEX `test_cases_moduleId_idx`(`moduleId`),
    INDEX `test_cases_scenarioId_idx`(`scenarioId`),
    INDEX `test_cases_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `scenarios` ADD CONSTRAINT `scenarios_module_id_fkey` FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_cases` ADD CONSTRAINT `test_cases_systemId_fkey` FOREIGN KEY (`systemId`) REFERENCES `systems`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_cases` ADD CONSTRAINT `test_cases_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `modules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_cases` ADD CONSTRAINT `test_cases_scenarioId_fkey` FOREIGN KEY (`scenarioId`) REFERENCES `scenarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
