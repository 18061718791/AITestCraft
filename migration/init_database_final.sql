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
DROP TABLE IF EXISTS `