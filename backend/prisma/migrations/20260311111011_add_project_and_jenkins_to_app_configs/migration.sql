-- AlterTable
ALTER TABLE `app_configs` ADD COLUMN `directory_id` VARCHAR(255) NULL,
    ADD COLUMN `jenkins_url` TEXT NULL,
    ADD COLUMN `project_id` VARCHAR(255) NULL;

-- CreateIndex
CREATE INDEX `app_configs_project_id_idx` ON `app_configs`(`project_id`);

-- CreateIndex
CREATE INDEX `app_configs_directory_id_idx` ON `app_configs`(`directory_id`);

-- AddForeignKey
ALTER TABLE `app_configs` ADD CONSTRAINT `app_configs_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `app_configs` ADD CONSTRAINT `app_configs_directory_id_fkey` FOREIGN KEY (`directory_id`) REFERENCES `directories`(`uuid`) ON DELETE SET NULL ON UPDATE CASCADE;
