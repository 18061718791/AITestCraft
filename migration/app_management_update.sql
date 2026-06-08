-- ========================================================
-- 应用管理模块数据库更新脚本
-- 用于生产环境数据库升级
-- 执行日期: 2026-03-12
-- ========================================================

-- 开启事务，确保所有操作要么全部成功，要么全部回滚
START TRANSACTION;

-- ========================================================
-- 1. 创建应用配置表 (app_configs)
-- 存储应用的基本配置信息
-- ========================================================
CREATE TABLE IF NOT EXISTS `app_configs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `app_name` VARCHAR(100) NOT NULL,
    `app_code` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `git_url` TEXT NOT NULL,
    `repository_name` VARCHAR(100) NOT NULL,
    `project_path` VARCHAR(200) NOT NULL,
    `branches` TEXT NOT NULL COMMENT 'JSON数组存储分支列表',
    `webhook_secret` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `project_id` VARCHAR(255) NULL COMMENT '关联项目ID',
    `directory_id` VARCHAR(255) NULL COMMENT '关联系统/目录ID',
    `jenkins_url` TEXT NULL COMMENT 'Jenkins构建地址',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `app_configs_app_name_key`(`app_name`),
    UNIQUE INDEX `app_configs_app_code_key`(`app_code`),
    INDEX `app_configs_repository_name_idx`(`repository_name`),
    INDEX `app_configs_is_active_idx`(`is_active`),
    INDEX `app_configs_project_id_idx`(`project_id`),
    INDEX `app_configs_directory_id_idx`(`directory_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
COMMENT='应用配置表，存储各应用的基本信息和部署配置';

-- ========================================================
-- 2. 创建部署任务表 (deployment_tasks)
-- 存储部署任务记录
-- ========================================================
CREATE TABLE IF NOT EXISTS `deployment_tasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `app_id` INTEGER NOT NULL COMMENT '关联应用配置ID',
    `app_name` VARCHAR(100) NOT NULL COMMENT '应用名称（冗余存储，便于查询）',
    `repository` VARCHAR(100) NOT NULL COMMENT '代码仓库名称',
    `branch` VARCHAR(100) NOT NULL COMMENT '分支名称',
    `commit_id` VARCHAR(40) NOT NULL COMMENT 'Git提交ID',
    `commit_message` TEXT NULL COMMENT '提交信息',
    `commit_author` VARCHAR(100) NULL COMMENT '提交作者',
    `status` ENUM('PENDING', 'DEPLOYING', 'COMPLETED', 'FAILED', 'IGNORED') NOT NULL DEFAULT 'PENDING' COMMENT '部署状态',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '任务创建时间',
    `deployed_at` DATETIME(3) NULL COMMENT '部署完成时间',
    `deployed_by` VARCHAR(100) NULL COMMENT '部署执行人',

    INDEX `deployment_tasks_status_created_at_idx`(`status`, `created_at`),
    INDEX `deployment_tasks_app_id_created_at_idx`(`app_id`, `created_at`),
    INDEX `deployment_tasks_repository_branch_idx`(`repository`, `branch`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
COMMENT='部署任务表，记录每次部署的详细信息和状态';

-- ========================================================
-- 3. 添加外键约束
-- ========================================================

-- 3.1 部署任务关联应用配置
-- 先检查约束是否已存在
SET @constraint_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'deployment_tasks'
    AND CONSTRAINT_NAME = 'deployment_tasks_app_id_fkey'
);

SET @sql = IF(@constraint_exists = 0,
    'ALTER TABLE `deployment_tasks` ADD CONSTRAINT `deployment_tasks_app_id_fkey` FOREIGN KEY (`app_id`) REFERENCES `app_configs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT "外键 deployment_tasks_app_id_fkey 已存在，跳过" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3.2 应用配置关联项目（如果 projects 表存在）
-- 先检查 projects 表是否存在
SET @project_table_exists = (
    SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'projects'
);

-- 如果 projects 表存在，再检查约束是否已存在
SET @project_constraint_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'app_configs'
    AND CONSTRAINT_NAME = 'app_configs_project_id_fkey'
);

SET @sql = IF(@project_table_exists > 0 AND @project_constraint_exists = 0,
    'ALTER TABLE `app_configs` ADD CONSTRAINT `app_configs_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT "跳过 projects 外键创建（表不存在或外键已存在）" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3.3 应用配置关联目录（如果 directories 表存在）
SET @directory_table_exists = (
    SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'directories'
);

-- 如果 directories 表存在，再检查约束是否已存在
SET @directory_constraint_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'app_configs'
    AND CONSTRAINT_NAME = 'app_configs_directory_id_fkey'
);

SET @sql = IF(@directory_table_exists > 0 AND @directory_constraint_exists = 0,
    'ALTER TABLE `app_configs` ADD CONSTRAINT `app_configs_directory_id_fkey` FOREIGN KEY (`directory_id`) REFERENCES `directories`(`uuid`) ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT "跳过 directories 外键创建（表不存在或外键已存在）" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ========================================================
-- 4. 插入默认数据（可选）
-- ========================================================

-- 插入示例应用配置（注释状态，根据需要启用）
-- INSERT INTO `app_configs` (
--     `app_name`, `app_code`, `description`, `git_url`,
--     `repository_name`, `project_path`, `branches`, `webhook_secret`
-- ) VALUES (
--     '示例应用', 'demo-app', '这是一个示例应用配置',
--     'https://github.com/example/demo-app.git',
--     'demo-app', '/projects/demo-app',
--     '["main", "develop"]', 'your-webhook-secret-here'
-- );

-- ========================================================
-- 5. 验证表创建成功
-- ========================================================
SELECT '应用管理表创建完成' as message;
SELECT COUNT(*) as app_configs_count FROM `app_configs`;
SELECT COUNT(*) as deployment_tasks_count FROM `deployment_tasks`;

-- 提交事务
COMMIT;

-- ========================================================
-- 使用说明：
-- 1. 在执行前请备份数据库
-- 2. 确保 MySQL 版本 >= 5.7
-- 3. 执行命令: mysql -u username -p database_name < app_management_update.sql
-- 4. 如果 projects 或 directories 表不存在，外键约束将自动跳过
-- ========================================================
