-- Schema MySQL cho hệ thống đồng bộ PLLĐ-BC trên Hosting iNET
-- Import file này vào phpMyAdmin hoặc MySQL trong cPanel / DirectAdmin

CREATE TABLE IF NOT EXISTS `plld_records` (
  `id` VARCHAR(128) NOT NULL,
  `record_date` CHAR(10) NOT NULL,
  `record_time` VARCHAR(10) NOT NULL DEFAULT '',
  `company_name` VARCHAR(255) NOT NULL DEFAULT '',
  `worker_name` VARCHAR(255) NOT NULL DEFAULT '',
  `payload` LONGTEXT NOT NULL,
  `updated_at` VARCHAR(40) NOT NULL,
  `deleted_at` VARCHAR(40) NULL DEFAULT NULL,
  `device_id` VARCHAR(128) NOT NULL DEFAULT '',
  `server_updated_ms` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_server_updated_ms` (`server_updated_ms`),
  INDEX `idx_company_date` (`company_name`, `record_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `plld_settings` (
  `id` VARCHAR(64) NOT NULL,
  `payload` LONGTEXT NOT NULL,
  `updated_at` VARCHAR(40) NOT NULL,
  `server_updated_ms` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `plld_users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(64) NOT NULL,
  `full_name` VARCHAR(128) NOT NULL DEFAULT '',
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
