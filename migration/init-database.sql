-- =====================================================
-- AITestCraft 数据库初始化脚本
-- 功能：删除原有表 -> 重新创建表结构
-- 注意：此脚本只创建表结构，不包含数据
-- 数据请使用 mysqldump 单独导出导入
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
SET AUTOCOMMIT = 0;

-- =====================================================
-- 1. 删除现有表（按依赖顺序倒序删除）
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
