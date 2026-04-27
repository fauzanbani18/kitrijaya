-- XAMPP MySQL setup script for Kitri Jaya project
-- Jalankan di phpMyAdmin atau MySQL client lokal.

CREATE DATABASE IF NOT EXISTS `kitrijaya_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `kitrijaya_db`;

CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(255) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `hero` (
  `id` INT PRIMARY KEY DEFAULT 1,
  `title` VARCHAR(255),
  `subtitle` TEXT,
  `ctaText` VARCHAR(255),
  `ctaLink` VARCHAR(255),
  `badge` VARCHAR(255),
  `image` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `about` (
  `id` INT PRIMARY KEY DEFAULT 1,
  `title` VARCHAR(255),
  `description` TEXT,
  `mission` TEXT,
  `image` TEXT,
  `stats` JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `contact` (
  `id` INT PRIMARY KEY DEFAULT 1,
  `address` TEXT,
  `phone` VARCHAR(100),
  `whatsapp` VARCHAR(100),
  `email` VARCHAR(100),
  `mapsEmbed` TEXT,
  `instagram` VARCHAR(255),
  `facebook` VARCHAR(255),
  `tiktok` VARCHAR(255),
  `openHours` VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `short_description` VARCHAR(255),
  `price` INT NOT NULL,
  `category` VARCHAR(50),
  `image` TEXT,
  `media` LONGTEXT,
  `badge` VARCHAR(100),
  `featured` BOOLEAN DEFAULT false
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `products`
  ADD COLUMN IF NOT EXISTS `short_description` VARCHAR(255),
  ADD COLUMN IF NOT EXISTS `media` LONGTEXT;

CREATE TABLE IF NOT EXISTS `testimonials` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `role` VARCHAR(255),
  `content` TEXT NOT NULL,
  `rating` INT DEFAULT 5,
  `avatar` TEXT,
  `source` VARCHAR(50) DEFAULT 'manual'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `articles` (
  `id` VARCHAR(50) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `excerpt` TEXT,
  `content` LONGTEXT,
  `image` TEXT,
  `views` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `books` (
  `id` VARCHAR(50) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `file_url` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `songs` (
  `id` VARCHAR(50) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `artist` VARCHAR(255),
  `file_url` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `admins` (`username`, `password`)
SELECT 'admin', '$2a$10$R5qLnz9Rr3TXR4u4g9a3FOqV0sI5dktQiJ/EXh8t7tAQ.dGWsSFci'
WHERE NOT EXISTS (SELECT 1 FROM `admins` WHERE `username` = 'admin');
