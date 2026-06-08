-- =====================================================
-- AITestCraft 数据库初始化脚本
-- 功能：删除原有表 -> 创建新表 -> 插入基础数据
-- 生成时间：2026-03-02
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;

-- =====================================================
-- 第一步：删除原有表（按依赖顺序倒序删除）
-- =====================================================

DROP TABLE IF EXISTS `async_tasks`;
DROP TABLE IF EXISTS `learning_evaluations`;
DROP TABLE IF EXISTS `intent_patterns`;
DROP TABLE IF EXISTS `synonyms`;
DROP TABLE IF EXISTS `learning_records