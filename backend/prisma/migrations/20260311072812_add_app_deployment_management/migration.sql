-- CreateTable
CREATE TABLE `plugins` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plugin_id` VARCHAR(100) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `author` VARCHAR(100) NULL,
    `current_version` VARCHAR(50) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `config` JSON NULL,
    `installed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `plugins_plugin_id_key`(`plugin_id`),
    INDEX `plugins_plugin_id_idx`(`plugin_id`),
    INDEX `plugins_enabled_idx`(`enabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plugin_versions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plugin_id` VARCHAR(100) NOT NULL,
    `version` VARCHAR(50) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `installed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `uninstalled_at` DATETIME(3) NULL,
    `metadata` JSON NULL,

    INDEX `plugin_versions_plugin_id_idx`(`plugin_id`),
    INDEX `plugin_versions_version_idx`(`version`),
    INDEX `plugin_versions_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plugin_dependencies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plugin_id` VARCHAR(100) NOT NULL,
    `dependency_plugin_id` VARCHAR(100) NOT NULL,
    `min_version` VARCHAR(50) NULL,
    `max_version` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `plugin_dependencies_plugin_id_idx`(`plugin_id`),
    INDEX `plugin_dependencies_dependency_plugin_id_idx`(`dependency_plugin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `learning_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `session_id` VARCHAR(100) NULL,
    `query` TEXT NULL,
    `intent` VARCHAR(100) NULL,
    `confidence` DECIMAL(5, 2) NULL,
    `is_correct` BOOLEAN NULL,
    `feedback` VARCHAR(20) NULL,
    `learning_type` VARCHAR(50) NULL,
    `learned_content` JSON NULL,
    `applied` BOOLEAN NOT NULL DEFAULT false,
    `applied_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `learning_records_user_id_idx`(`user_id`),
    INDEX `learning_records_session_id_idx`(`session_id`),
    INDEX `learning_records_intent_idx`(`intent`),
    INDEX `learning_records_learning_type_idx`(`learning_type`),
    INDEX `learning_records_applied_idx`(`applied`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `synonyms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `word` VARCHAR(100) NOT NULL,
    `synonym` VARCHAR(100) NOT NULL,
    `intent` VARCHAR(100) NULL,
    `confidence` DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
    `usage_count` INTEGER NOT NULL DEFAULT 0,
    `last_used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `synonyms_word_idx`(`word`),
    INDEX `synonyms_synonym_idx`(`synonym`),
    INDEX `synonyms_intent_idx`(`intent`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `intent_patterns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `intent` VARCHAR(100) NOT NULL,
    `pattern` VARCHAR(500) NOT NULL,
    `pattern_type` VARCHAR(50) NULL,
    `confidence` DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
    `usage_count` INTEGER NOT NULL DEFAULT 0,
    `success_count` INTEGER NOT NULL DEFAULT 0,
    `last_used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `intent_patterns_intent_idx`(`intent`),
    INDEX `intent_patterns_pattern_type_idx`(`pattern_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `learning_evaluations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `evaluation_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `total_queries` INTEGER NOT NULL DEFAULT 0,
    `correct_predictions` INTEGER NOT NULL DEFAULT 0,
    `incorrect_predictions` INTEGER NOT NULL DEFAULT 0,
    `accuracy` DECIMAL(5, 2) NULL,
    `new_synonyms_count` INTEGER NOT NULL DEFAULT 0,
    `new_patterns_count` INTEGER NOT NULL DEFAULT 0,
    `applied_learning_count` INTEGER NOT NULL DEFAULT 0,
    `details` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `learning_evaluations_evaluation_date_idx`(`evaluation_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `app_configs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `app_name` VARCHAR(100) NOT NULL,
    `app_code` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `git_url` TEXT NOT NULL,
    `repository_name` VARCHAR(100) NOT NULL,
    `project_path` VARCHAR(200) NOT NULL,
    `branches` TEXT NOT NULL,
    `webhook_secret` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `app_configs_app_name_key`(`app_name`),
    UNIQUE INDEX `app_configs_app_code_key`(`app_code`),
    INDEX `app_configs_repository_name_idx`(`repository_name`),
    INDEX `app_configs_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deployment_tasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `app_id` INTEGER NOT NULL,
    `app_name` VARCHAR(100) NOT NULL,
    `repository` VARCHAR(100) NOT NULL,
    `branch` VARCHAR(100) NOT NULL,
    `commit_id` VARCHAR(40) NOT NULL,
    `commit_message` TEXT NULL,
    `commit_author` VARCHAR(100) NULL,
    `status` ENUM('PENDING', 'DEPLOYING', 'COMPLETED', 'FAILED', 'IGNORED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deployed_at` DATETIME(3) NULL,
    `deployed_by` VARCHAR(100) NULL,

    INDEX `deployment_tasks_status_created_at_idx`(`status`, `created_at`),
    INDEX `deployment_tasks_app_id_created_at_idx`(`app_id`, `created_at`),
    INDEX `deployment_tasks_repository_branch_idx`(`repository`, `branch`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `plugin_versions` ADD CONSTRAINT `plugin_versions_plugin_id_fkey` FOREIGN KEY (`plugin_id`) REFERENCES `plugins`(`plugin_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plugin_dependencies` ADD CONSTRAINT `plugin_dependencies_plugin_id_fkey` FOREIGN KEY (`plugin_id`) REFERENCES `plugins`(`plugin_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deployment_tasks` ADD CONSTRAINT `deployment_tasks_app_id_fkey` FOREIGN KEY (`app_id`) REFERENCES `app_configs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
