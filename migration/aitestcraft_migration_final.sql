-- AITestCraft MySQL Migration Script
-- Generated: 2026-03-02
-- Source Database: testcase_generator
-- Source Host: localhost

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
SET AUTOCOMMIT = 0;

INSERT INTO `system_metrics` (`id`, `metric_name`, `metric_value`, `metric_type`, `timestamp`, `details`) VALUES (27914,'/my-todo',51.00,'api','2026-02-25 05:28:14.318','{\"method\": \"GET\", \"statusCode\": 304}');

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;
SET UNIQUE_CHECKS = 1;
