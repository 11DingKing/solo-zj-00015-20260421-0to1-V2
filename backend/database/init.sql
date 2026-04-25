-- Database initialization script
-- This file ensures the database is ready for GORM to migrate tables
-- GORM will automatically create the tables based on the models

-- Ensure proper character set
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Leaves table (for reference, GORM will auto-migrate)
-- CREATE TABLE IF NOT EXISTS leaves (
--   id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
--   user_id BIGINT UNSIGNED NOT NULL,
--   leave_type VARCHAR(20) NOT NULL,
--   start_date DATE NOT NULL,
--   end_date DATE NOT NULL,
--   days INT NOT NULL,
--   reason TEXT NOT NULL,
--   status VARCHAR(20) NOT NULL DEFAULT 'pending',
--   approver_id BIGINT UNSIGNED NULL,
--   approval_note TEXT NULL,
--   created_at DATETIME NULL,
--   updated_at DATETIME NULL,
--   deleted_at DATETIME NULL,
--   INDEX idx_leaves_user_id (user_id),
--   INDEX idx_leaves_status (status),
--   INDEX idx_leaves_start_date (start_date),
--   INDEX idx_leaves_end_date (end_date),
--   INDEX idx_leaves_deleted_at (deleted_at),
--   FOREIGN KEY (user_id) REFERENCES users(id),
--   FOREIGN KEY (approver_id) REFERENCES users(id)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
