-- AlterTable
ALTER TABLE `test_cases` ADD COLUMN `status` ENUM('PENDING', 'PASSED', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX `test_cases_status_idx` ON `test_cases`(`status`);
