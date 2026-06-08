-- =====================================================
-- AITestCraft 数据库完整初始化脚本
-- 功能：删除原有表 -> 重新创建表结构 -> 导入本地数据
-- 生成时间: 2026-03-02
-- 数据库: testcase_generator
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
SET AUTOCOMMIT = 0;

-- =====================================================
-- 1. 删除现有表（按依赖顺序倒序删除，避免外键约束冲突）
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
DROP TABLE IF EXISTS `_prisma_migrations`;

-- =====================================================
-- 2. 创建数据库（如果不存在）
-- =====================================================

CREATE DATABASE IF NOT EXISTS `testcase_generator` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `testcase_generator`;

-- =====================================================
-- 3. 创建表结构
-- =====================================================

-- systems 表
CREATE TABLE `systems` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- modules 表
CREATE TABLE `modules` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `system_id` INT NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `sort_order` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `modules_system_id_fkey` (`system_id`),
    CONSTRAINT `modules_system_id_fkey` FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- scenarios 表
CREATE TABLE `scenarios` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `module_id` INT NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `content` TEXT NULL,
    `sort_order` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `scenarios_module_id_fkey` (`module_id`),
    CONSTRAINT `scenarios_module_id_fkey` FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- test_cases 表
CREATE TABLE `test_cases` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `precondition` TEXT NULL,
    `steps` TEXT NOT NULL,
    `expectedResults` TEXT NOT NULL,
    `priority` VARCHAR(10) NOT NULL,
    `source` VARCHAR(10) NOT NULL,
    `systemId` INT NULL,
    `moduleId` INT NULL,
    `scenarioId` INT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,
    `deleted_at` DATETIME NULL,
    `tags` JSON NULL,
    `status` ENUM('PENDING', 'PASSED', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    PRIMARY KEY (`id`),
    INDEX `test_cases_created_at_idx` (`created_at`),
    INDEX `test_cases_moduleId_idx` (`moduleId`),
    INDEX `test_cases_priority_idx` (`priority`),
    INDEX `test_cases_scenarioId_idx` (`scenarioId`),
    INDEX `test_cases_source_idx` (`source`),
    INDEX `test_cases_status_idx` (`status`),
    INDEX `test_cases_systemId_idx` (`systemId`),
    CONSTRAINT `test_cases_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `modules`(`id`) ON DELETE SET NULL,
    CONSTRAINT `test_cases_scenarioId_fkey` FOREIGN KEY (`scenarioId`) REFERENCES `scenarios`(`id`) ON DELETE SET NULL,
    CONSTRAINT `test_cases_systemId_fkey` FOREIGN KEY (`systemId`) REFERENCES `systems`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- notification_recipients 表
CREATE TABLE `notification_recipients` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `send_key` VARCHAR(255) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- notification_settings 表
CREATE TABLE `notification_settings` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `enabled` BOOLEAN NOT NULL DEFAULT TRUE,
    `start_time` VARCHAR(5) NOT NULL,
    `end_time` VARCHAR(5) NOT NULL,
    `interval` INT NOT NULL DEFAULT 60,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- notification_settings_unique 表
CREATE TABLE `notification_settings_unique` (
    `id` INT NOT NULL DEFAULT 1,
    `setting_id` INT NOT NULL UNIQUE,
    PRIMARY KEY (`id`),
    UNIQUE KEY `notification_settings_unique_id_key` (`id`),
    CONSTRAINT `notification_settings_unique_setting_id_fkey` FOREIGN KEY (`setting_id`) REFERENCES `notification_settings`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- projects 表
CREATE TABLE `projects` (
    `id` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- directories 表
CREATE TABLE `directories` (
    `uuid` VARCHAR(255) NOT NULL,
    `id` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `project_id` VARCHAR(255) NOT NULL,
    `parent_id` VARCHAR(255) NOT NULL,
    `level` INT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`uuid`),
    INDEX `directories_project_id_idx` (`project_id`),
    INDEX `directories_parent_id_idx` (`parent_id`),
    INDEX `directories_id_idx` (`id`),
    CONSTRAINT `directories_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- system_configs 表
CREATE TABLE `system_configs` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `config_key` VARCHAR(100) NOT NULL UNIQUE,
    `config_value` TEXT NOT NULL,
    `config_type` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `system_configs_config_type_idx` (`config_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- system_metrics 表
CREATE TABLE `system_metrics` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `metric_name` VARCHAR(100) NOT NULL,
    `metric_value` DECIMAL(10, 2) NOT NULL,
    `metric_type` VARCHAR(50) NOT NULL,
    `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `details` JSON NULL,
    PRIMARY KEY (`id`),
    INDEX `system_metrics_metric_type_idx` (`metric_type`),
    INDEX `system_metrics_timestamp_idx` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- plugins 表
CREATE TABLE `plugins` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `plugin_id` VARCHAR(100) NOT NULL UNIQUE,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `author` VARCHAR(100) NULL,
    `current_version` VARCHAR(50) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT TRUE,
    `config` JSON NULL,
    `installed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `plugins_plugin_id_idx` (`plugin_id`),
    INDEX `plugins_enabled_idx` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- plugin_versions 表
CREATE TABLE `plugin_versions` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `plugin_id` VARCHAR(100) NOT NULL,
    `version` VARCHAR(50) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT FALSE,
    `installed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `uninstalled_at` DATETIME NULL,
    `metadata` JSON NULL,
    PRIMARY KEY (`id`),
    INDEX `plugin_versions_plugin_id_idx` (`plugin_id`),
    INDEX `plugin_versions_version_idx` (`version`),
    INDEX `plugin_versions_is_active_idx` (`is_active`),
    CONSTRAINT `plugin_versions_plugin_id_fkey` FOREIGN KEY (`plugin_id`) REFERENCES `plugins`(`plugin_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- plugin_dependencies 表
CREATE TABLE `plugin_dependencies` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `plugin_id` VARCHAR(100) NOT NULL,
    `dependency_plugin_id` VARCHAR(100) NOT NULL,
    `min_version` VARCHAR(50) NULL,
    `max_version` VARCHAR(50) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `plugin_dependencies_plugin_id_idx` (`plugin_id`),
    INDEX `plugin_dependencies_dependency_plugin_id_idx` (`dependency_plugin_id`),
    CONSTRAINT `plugin_dependencies_plugin_id_fkey` FOREIGN KEY (`plugin_id`) REFERENCES `plugins`(`plugin_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- learning_records 表
CREATE TABLE `learning_records` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `user_id` INT NULL,
    `session_id` VARCHAR(100) NULL,
    `query` TEXT NULL,
    `intent` VARCHAR(100) NULL,
    `confidence` DECIMAL(5, 2) NULL,
    `is_correct` BOOLEAN NULL,
    `feedback` VARCHAR(20) NULL,
    `learning_type` VARCHAR(50) NULL,
    `learned_content` JSON NULL,
    `applied` BOOLEAN NOT NULL DEFAULT FALSE,
    `applied_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `learning_records_user_id_idx` (`user_id`),
    INDEX `learning_records_session_id_idx` (`session_id`),
    INDEX `learning_records_intent_idx` (`intent`),
    INDEX `learning_records_learning_type_idx` (`learning_type`),
    INDEX `learning_records_applied_idx` (`applied`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- synonyms 表
CREATE TABLE `synonyms` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `word` VARCHAR(100) NOT NULL,
    `synonym` VARCHAR(100) NOT NULL,
    `intent` VARCHAR(100) NULL,
    `confidence` DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
    `usage_count` INT NOT NULL DEFAULT 0,
    `last_used_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `synonyms_word_idx` (`word`),
    INDEX `synonyms_synonym_idx` (`synonym`),
    INDEX `synonyms_intent_idx` (`intent`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- intent_patterns 表
CREATE TABLE `intent_patterns` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `intent` VARCHAR(100) NOT NULL,
    `pattern` VARCHAR(500) NOT NULL,
    `pattern_type` VARCHAR(50) NULL,
    `confidence` DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
    `usage_count` INT NOT NULL DEFAULT 0,
    `success_count` INT NOT NULL DEFAULT 0,
    `last_used_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `intent_patterns_intent_idx` (`intent`),
    INDEX `intent_patterns_pattern_type_idx` (`pattern_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- learning_evaluations 表
CREATE TABLE `learning_evaluations` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `evaluation_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `total_queries` INT NOT NULL DEFAULT 0,
    `correct_predictions` INT NOT NULL DEFAULT 0,
    `incorrect_predictions` INT NOT NULL DEFAULT 0,
    `accuracy` DECIMAL(5, 2) NULL,
    `new_synonyms_count` INT NOT NULL DEFAULT 0,
    `new_patterns_count` INT NOT NULL DEFAULT 0,
    `applied_learning_count` INT NOT NULL DEFAULT 0,
    `details` JSON NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `learning_evaluations_evaluation_date_idx` (`evaluation_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- async_tasks 表
CREATE TABLE `async_tasks` (
    `id` VARCHAR(255) NOT NULL,
    `task_type` VARCHAR(50) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `progress` INT NOT NULL DEFAULT 0,
    `format` VARCHAR(20) NULL,
    `query` TEXT NULL,
    `intent` VARCHAR(100) NULL,
    `entities` JSON NULL,
    `params` JSON NULL,
    `result` JSON NULL,
    `file_name` VARCHAR(255) NULL,
    `file_path` TEXT NULL,
    `mime_type` VARCHAR(100) NULL,
    `error` TEXT NULL,
    `user_id` INT NULL,
    `session_id` VARCHAR(100) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `completed_at` DATETIME NULL,
    PRIMARY KEY (`id`),
    INDEX `async_tasks_task_type_idx` (`task_type`),
    INDEX `async_tasks_status_idx` (`status`),
    INDEX `async_tasks_created_at_idx` (`created_at`),
    INDEX `async_tasks_session_id_idx` (`session_id`),
    INDEX `async_tasks_user_id_idx` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- _prisma_migrations 表（Prisma迁移记录）
CREATE TABLE `_prisma_migrations` (
    `id` VARCHAR(36) NOT NULL,
    `checksum` VARCHAR(64) NOT NULL,
    `finished_at` DATETIME(3) NULL,
    `migration_name` VARCHAR(255) NOT NULL,
    `logs` TEXT NULL,
    `rolled_back_at` DATETIME(3) NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `applied_steps_count` INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. 数据导入部分
-- 注意：以下INSERT语句需要从本地MySQL数据库导出实际数据
-- 请使用以下命令导出数据：
-- 
-- mysqldump -hlocalhost -P3306 -uroot -proot testcase_generator \
--   --no-create-info --skip-comments --complete-insert \
--   --extended-insert=FALSE --set-gtid-purged=OFF \
--   >> migration\init_database_complete.sql
--
-- =====================================================

-- =====================================================
-- 提交事务并恢复约束检查
-- =====================================================

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;
SET UNIQUE_CHECKS = 1;

-- =====================================================
-- 初始化完成
-- =====================================================
