-- 学习记录表
CREATE TABLE IF NOT EXISTS `learning_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT COMMENT '用户ID',
  `session_id` VARCHAR(100) COMMENT '会话ID',
  `query` TEXT COMMENT '用户查询',
  `intent` VARCHAR(100) COMMENT '识别的意图',
  `confidence` DECIMAL(5, 2) COMMENT '置信度',
  `is_correct` BOOLEAN COMMENT '是否正确',
  `feedback` VARCHAR(20) COMMENT '反馈类型: positive, negative, neutral',
  `learning_type` VARCHAR(50) COMMENT '学习类型: synonym, pattern, rule',
  `learned_content` JSON COMMENT '学习的内容',
  `applied` BOOLEAN DEFAULT FALSE COMMENT '是否已应用',
  `applied_at` DATETIME NULL COMMENT '应用时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_session_id` (`session_id`),
  INDEX `idx_intent` (`intent`),
  INDEX `idx_learning_type` (`learning_type`),
  INDEX `idx_applied` (`applied`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学习记录表';

-- 同义词表
CREATE TABLE IF NOT EXISTS `synonyms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `word` VARCHAR(100) NOT NULL COMMENT '原始词',
  `synonym` VARCHAR(100) NOT NULL COMMENT '同义词',
  `intent` VARCHAR(100) COMMENT '关联的意图',
  `confidence` DECIMAL(5, 2) DEFAULT 1.00 COMMENT '置信度',
  `usage_count` INT DEFAULT 0 COMMENT '使用次数',
  `last_used_at` DATETIME NULL COMMENT '最后使用时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_word` (`word`),
  INDEX `idx_synonym` (`synonym`),
  INDEX `idx_intent` (`intent`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同义词表';

-- 意图模式表
CREATE TABLE IF NOT EXISTS `intent_patterns` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `intent` VARCHAR(100) NOT NULL COMMENT '意图',
  `pattern` VARCHAR(500) NOT NULL COMMENT '模式',
  `pattern_type` VARCHAR(50) COMMENT '模式类型: regex, keyword, llm',
  `confidence` DECIMAL(5, 2) DEFAULT 1.00 COMMENT '置信度',
  `usage_count` INT DEFAULT 0 COMMENT '使用次数',
  `success_count` INT DEFAULT 0 COMMENT '成功次数',
  `last_used_at` DATETIME NULL COMMENT '最后使用时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_intent` (`intent`),
  INDEX `idx_pattern_type` (`pattern_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='意图模式表';

-- 学习效果评估表
CREATE TABLE IF NOT EXISTS `learning_evaluations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `evaluation_date` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '评估日期',
  `total_queries` INT DEFAULT 0 COMMENT '总查询数',
  `correct_predictions` INT DEFAULT 0 COMMENT '正确预测数',
  `incorrect_predictions` INT DEFAULT 0 COMMENT '错误预测数',
  `accuracy` DECIMAL(5, 2) COMMENT '准确率',
  `new_synonyms_count` INT DEFAULT 0 COMMENT '新同义词数量',
  `new_patterns_count` INT DEFAULT 0 COMMENT '新模式数量',
  `applied_learning_count` INT DEFAULT 0 COMMENT '应用的学习数量',
  `details` JSON COMMENT '详细信息',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_evaluation_date` (`evaluation_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学习效果评估表';
