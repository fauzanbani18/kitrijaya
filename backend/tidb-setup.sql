-- TiDB Setup Script for Kitri Jaya Project
-- Compatible with TiDB Cloud and Self-Hosted TiDB
-- Run this in TiDB SQL client or import via TiDB Cloud dashboard

-- Create database (skip if using TiDB Cloud dashboard)
-- CREATE DATABASE IF NOT EXISTS `kitrijaya_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE `kitrijaya_db`;

-- Create tables with TiDB optimizations
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(255) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `hero` (
  `id` INT PRIMARY KEY DEFAULT 1,
  `title` VARCHAR(255),
  `subtitle` TEXT,
  `ctaText` VARCHAR(255),
  `ctaLink` VARCHAR(255),
  `badge` VARCHAR(255),
  `image` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `about` (
  `id` INT PRIMARY KEY DEFAULT 1,
  `title` VARCHAR(255),
  `description` TEXT,
  `mission` TEXT,
  `image` TEXT,
  `stats` JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `testimonials` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `role` VARCHAR(255),
  `content` TEXT NOT NULL,
  `rating` INT DEFAULT 5,
  `avatar` TEXT,
  `source` VARCHAR(50) DEFAULT 'manual'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `articles` (
  `id` VARCHAR(50) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `excerpt` TEXT,
  `content` LONGTEXT,
  `image` TEXT,
  `views` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `books` (
  `id` VARCHAR(50) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `file_url` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `songs` (
  `id` VARCHAR(50) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `artist` VARCHAR(255),
  `file_url` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user
INSERT INTO `admins` (`username`, `password`)
SELECT 'kitrijayaofc', '$2a$10$NCoPCNFsNHUScmtUMm4MYOhH/avoAJR6h6NBcjEef3NDwEYNEcFIm'
WHERE NOT EXISTS (SELECT 1 FROM `admins` WHERE `username` = 'kitrijayaofc');

-- Insert sample data for testing
INSERT IGNORE INTO `hero` (`id`, `title`, `subtitle`, `ctaText`, `ctaLink`, `badge`, `image`) VALUES
(1, 'Toko Pramuka Kitri Jaya', 'Perlengkapan Pramuka Terlengkap & Berkualitas untuk Semua Tingkatan', 'Lihat Produk Kami', '#products', 'Terpercaya Sejak 2005', '');

INSERT IGNORE INTO `about` (`id`, `title`, `description`, `mission`, `image`, `stats`) VALUES
(1, 'Tentang Kitri Jaya', 'Kitri Jaya adalah toko perlengkapan pramuka terpercaya yang telah melayani kebutuhan anggota pramuka di seluruh Indonesia selama lebih dari 18 tahun. Kami menyediakan berbagai perlengkapan pramuka berkualitas tinggi mulai dari seragam, tenda, perlengkapan berkemah, hingga aksesoris pramuka lengkap.', 'Misi kami adalah mendukung kegiatan kepramukaan dengan menyediakan perlengkapan terbaik dan terjangkau.', '', '[{"label": "Tahun Berpengalaman", "value": "18+"}, {"label": "Produk Tersedia", "value": "500+"}, {"label": "Pelanggan Puas", "value": "10K+"}, {"label": "Kota Terlayani", "value": "50+"}]');

INSERT IGNORE INTO `contact` (`id`, `address`, `phone`, `whatsapp`, `email`, `mapsEmbed`, `instagram`, `facebook`, `tiktok`, `openHours`) VALUES
(1, 'Jl. Pramuka Raya No. 88, Jakarta Timur', '+62 812-3456-7890', '+62 812-3456-7890', 'info@kitrijaya.com', 'https://maps.google.com/maps?q=-6.2141675,107.2819183&t=&z=16&ie=UTF8&iwloc=&output=embed', 'https://instagram.com/kitrijaya', 'https://facebook.com/kitrijaya', 'https://tiktok.com/@kitrijaya', 'Senin - Sabtu: 08.00 - 17.00 WIB');

INSERT IGNORE INTO `categories` (`id`, `name`) VALUES
('cat-1', 'Seragam'),
('cat-2', 'Tenda & Berkemah'),
('cat-3', 'Aksesoris');

-- Sample products
INSERT IGNORE INTO `products` (`id`, `name`, `description`, `short_description`, `price`, `category`, `image`, `media`, `badge`, `featured`) VALUES
('prod-1', 'Seragam Pramuka Siaga', 'Seragam pramuka siaga berkualitas tinggi dengan bahan katun yang nyaman dan tahan lama.', 'Seragam siaga berkualitas', 150000, 'cat-1', '', '[]', 'Best Seller', true),
('prod-2', 'Tenda Dome 4 Orang', 'Tenda dome berkapasitas 4 orang dengan konstruksi kokoh dan tahan air.', 'Tenda dome 4 orang', 450000, 'cat-2', '', '[]', 'Popular', true),
('prod-3', 'Kompas Pramuka', 'Kompas profesional untuk kegiatan orientasi dan navigasi di alam terbuka.', 'Kompas navigasi', 75000, 'cat-3', '', '[]', 'New', false);

-- Sample testimonials
INSERT IGNORE INTO `testimonials` (`id`, `name`, `role`, `content`, `rating`, `avatar`, `source`) VALUES
('test-1', 'Ahmad Rahman', 'Pembina Pramuka', 'Kitri Jaya selalu memberikan pelayanan terbaik dengan produk berkualitas. Sudah 5 tahun menggunakan jasa mereka untuk kebutuhan pramuka sekolah.', 5, '', 'manual'),
('test-2', 'Siti Nurhaliza', 'Anggota Pramuka', 'Barangnya bagus dan harga terjangkau. Pengiriman juga cepat. Recommended!', 5, '', 'manual'),
('test-3', 'Budi Santoso', 'Koordinator Kegiatan', 'Sudah beberapa kali order untuk kegiatan besar, selalu memuaskan. Tim support responsif.', 5, '', 'manual');

-- Sample articles
INSERT IGNORE INTO `articles` (`id`, `title`, `excerpt`, `content`, `image`, `views`, `created_at`) VALUES
('art-1', 'Tips Memilih Tenda yang Tepat untuk Kegiatan Pramuka', 'Panduan lengkap memilih tenda berkualitas untuk kegiatan outdoor pramuka.', '<p>Tenda adalah salah satu perlengkapan penting dalam kegiatan pramuka...</p>', '', 0, NOW()),
('art-2', 'Sejarah dan Filosofi Lambang Pramuka', 'Mengenal makna di balik lambang gerakan pramuka Indonesia.', '<p>Lambang pramuka memiliki filosofi mendalam yang mencerminkan nilai-nilai kepramukaan...</p>', '', 0, NOW());

-- Sample books (commented out since menu is disabled)
-- INSERT IGNORE INTO `books` (`id`, `title`, `description`, `file_url`, `created_at`) VALUES
-- ('book-1', 'Buku Saku Panduan Pramuka', 'Panduan lengkap kegiatan pramuka tingkat siaga.', 'https://example.com/book1.pdf', NOW());

-- Sample songs (commented out since menu is disabled)
-- INSERT IGNORE INTO `songs` (`id`, `title`, `artist`, `file_url`, `created_at`) VALUES
-- ('song-1', 'Mars Pramuka', 'Lagu Mars Pramuka Indonesia', 'https://example.com/mars-pramuka.mp3', NOW());

COMMIT;