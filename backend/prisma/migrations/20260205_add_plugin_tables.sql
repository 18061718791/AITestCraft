-- 插件信息表
CREATE TABLE IF NOT EXISTS `plugins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `plugin_id` VARCHAR(100) NOT NULL UNIQUE COMMENT '插件唯一标识',
  `name` VARCHAR(255) NOT NULL COMMENT '插件名称',
  `description` TEXT COMMENT '插件描述',
  `author` VARCHAR(100) COMMENT '插件作者',
  `current_version` VARCHAR(50) NOT NULL COMMENT '当前版本',
  `enabled` BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  `config` JSON COMMENT '插件配置',
  `installed_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '安装时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_plugin_id` (`plugin_id`),
  INDEX `idx_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='插件信息表';

-- 插件版本表
CREATE TABLE IF NOT EXISTS `plugin_versions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `plugin_id` VARCHAR(100) NOT NULL COMMENT '插件唯一标识',
  `version` VARCHAR(50) NOT NULL COMMENT '版本号',
  `is_active` BOOLEAN DEFAULT FALSE COMMENT '是否为当前激活版本',
  `installed_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '安装时间',
  `uninstalled_at` DATETIME NULL COMMENT '卸载时间',
  `metadata` JSON COMMENT '版本元数据',
  INDEX `idx_plugin_id` (`plugin_id`),
  INDEX `idx_version` (`version`),
  INDEX `idx_is_active` (`is_active`),
  FOREIGN KEY (`plugin_id`) REFERENCES `plugins`(`plugin_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='插件版本表';

-- 插件依赖表
CREATE TABLE IF NOT EXISTS `plugin_dependencies` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `plugin_id` VARCHAR(100) NOT NULL COMMENT '插件唯一标识',
  `dependency_plugin_id` VARCHAR(100) NOT NULL COMMENT '依赖的插件ID',
  `min_version` VARCHAR(50) COMMENT '最小版本要求',
  `max_version` VARCHAR(50) COMMENT '最大版本要求',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_plugin_id` (`plugin_id`),
  INDEX `idx_dependency_plugin_id` (`dependency_plugin_id`),
  FOREIGN KEY (`plugin_id`) REFERENCES `plugins`(`plugin_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='插件依赖表';
