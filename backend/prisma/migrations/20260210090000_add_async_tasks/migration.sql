-- CreateTable
CREATE TABLE `async_tasks` (
  `id` VARCHAR(191) NOT NULL,
  `task_type` VARCHAR(50) NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `progress` INTEGER NOT NULL DEFAULT 0,
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
  `user_id` INTEGER NULL,
  `session_id` VARCHAR(100) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `completed_at` DATETIME(3) NULL,

  PRIMARY KEY (`id`),
  INDEX `async_tasks_task_type_idx` (`task_type`),
  INDEX `async_tasks_status_idx` (`status`),
  INDEX `async_tasks_created_at_idx` (`created_at`),
  INDEX `async_tasks_session_id_idx` (`session_id`),
  INDEX `async_tasks_user_id_idx` (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

