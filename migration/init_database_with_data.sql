-- =====================================================
-- AITestCraft 数据库完整初始化脚本
-- 功能：删除原有表 -> 重新创建表结构 -> 插入数据
-- 生成时间: 2026-03-02
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
SET AUTOCOMMIT = 0;

-- =====================================================
-- 1. 删除现有表（按依赖顺序倒序删除，先删子表）
-- =====================================================

DROP TABLE IF EXISTS `async_tasks`;
DROP TABLE IF EXISTS `learning_evaluations`;
DROP TABLE IF EXISTS `intent_patterns`;
DROP TABLE IF EXISTS `synonyms`;
DROP TABLE IF EXISTS `learning_records`;
DROP TABLE IF EXISTS `plugin_dependencies`;
DROP TABLE IF EXISTS `plugin_versions`;
DROP TABLE IF EXISTS `plugins`;
DROP TABLE IF EXISTS `system_metrics`;
DROP TABLE IF EXISTS `system_configs`;
DROP TABLE IF EXISTS `directories`;
DROP TABLE IF EXISTS `projects`;
DROP TABLE IF EXISTS `notification_settings_unique`;
DROP TABLE IF EXISTS `notification_settings`;
DROP TABLE IF EXISTS `notification_recipients`;
DROP TABLE IF EXISTS `test_cases`;
DROP TABLE IF EXISTS `scenarios`;
DROP TABLE IF EXISTS `modules`;
DROP TABLE IF EXISTS `systems`;

-- =====================================================
-- 2. 创建表结构
-- =====================================================

-- systems 表
CREATE TABLE `systems` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- modules 表
CREATE TABLE `modules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `system_id` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `modules_system_id_fkey`(`system_id`),
    CONSTRAINT `modules_system_id_fkey` FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- scenarios 表
CREATE TABLE `scenarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `module_id` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `content` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `scenarios_module_id_fkey`(`module_id`),
    CONSTRAINT `scenarios_module_id_fkey` FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- test_cases 表
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
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,
    `deleted_at` DATETIME NULL,
    `tags` JSON NULL,
    `status` ENUM('PENDING', 'PASSED', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    PRIMARY KEY (`id`),
    INDEX `test_cases_created_at_idx`(`created_at`),
    INDEX `test_cases_moduleId_idx`(`moduleId`),
    INDEX `test_cases_priority_idx`(`priority`),
    INDEX `test_cases_scenarioId_idx`(`scenarioId`),
    INDEX `test_cases_source_idx`(`source`),
    INDEX `test_cases_status_idx`(`status`),
    INDEX `test_cases_systemId_idx`(`systemId`),
    CONSTRAINT `test_cases_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `modules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `test_cases_scenarioId_fkey` FOREIGN KEY (`scenarioId`) REFERENCES `scenarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `test_cases_systemId_fkey` FOREIGN KEY (`systemId`) REFERENCES `systems`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- notification_recipients 表
CREATE TABLE `notification_recipients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `send_key` VARCHAR(255) NOT NULL