CREATE DATABASE smartpark_db;
USE smartpark_db;

-- 1. Tabel USERS
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    no_telepon VARCHAR(20),
    points INT DEFAULT 0,
    role ENUM('Pengguna', 'Administrator') DEFAULT 'Pengguna'
);

-- 2. Tabel KENDARAAN
CREATE TABLE kendaraan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    jenis ENUM('motor', 'mobil') NOT NULL,
    plat VARCHAR(20) NOT NULL,
    merek VARCHAR(50),
    model VARCHAR(50),
    tahun INT,
    warna VARCHAR(30),
    mesin VARCHAR(50),
    rangka VARCHAR(50),
    is_utama BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Tabel AREA_PARKIR
CREATE TABLE area_parkir (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(50) NOT NULL,
    kapasitas_total INT NOT NULL,
    lokasi VARCHAR(255)
);

-- 4. Tabel SLOT_PARKIR
CREATE TABLE slot_parkir (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lantai VARCHAR(10) NOT NULL,
    blok VARCHAR(10) NOT NULL,
    no_slot VARCHAR(10) NOT NULL,
    status ENUM('Tersedia', 'Dipesan', 'Terisi') DEFAULT 'Tersedia',
    area_parkir_id INT NOT NULL,
    FOREIGN KEY (area_parkir_id) REFERENCES area_parkir(id) ON DELETE CASCADE
);

-- 5. Tabel TARIF
CREATE TABLE tarif (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jenis_kendaraan ENUM('Motor', 'Mobil') NOT NULL,
    tarif_jam_pertama FLOAT NOT NULL,
    tarif_jam_berikutnya FLOAT NOT NULL
);

-- 6. Tabel RESERVASI
CREATE TABLE reservasi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode_unik VARCHAR(20) UNIQUE NOT NULL,
    waktu_pesan DATETIME DEFAULT CURRENT_TIMESTAMP,
    estimasi_kedatangan DATETIME NOT NULL,
    waktu_check_in DATETIME NULL,
    waktu_check_out DATETIME NULL,
    status ENUM('Menunggu', 'Aktif', 'Selesai', 'Dibatalkan') DEFAULT 'Menunggu',
    total_durasi INT NULL, -- dalam menit/jam
    total_tarif FLOAT NULL,
    user_id INT NOT NULL,
    slot_parkir_id INT NOT NULL,
    tarif_id INT NOT NULL,
    kendaraan_id INT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (slot_parkir_id) REFERENCES slot_parkir(id),
    FOREIGN KEY (tarif_id) REFERENCES tarif(id),
    FOREIGN KEY (kendaraan_id) REFERENCES kendaraan(id) ON DELETE SET NULL
);

-- 7. Tabel user pin
CREATE TABLE user_pins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE, -- UNIQUE memastikan 1 user hanya punya 1 PIN
    pin VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Tabel transaksi pembayaran 
CREATE TABLE transaksi_pembayaran (
    id VARCHAR(50) PRIMARY KEY, -- Digunakan sebagai order_id untuk Midtrans
    reservasi_kode_unik VARCHAR(20) NOT NULL, -- Menggunakan kode unik dari tiket
    metode_pembayaran VARCHAR(50),
    jumlah_bayar INT NOT NULL,
    status_pembayaran VARCHAR(20) DEFAULT 'pending', -- pending, settlement, cancel, expire
    waktu_transaksi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reservasi_kode_unik) REFERENCES reservasi(kode_unik) ON DELETE CASCADE
);

-- 9. Tabel ulasan parkir
CREATE TABLE ulasan_parkir (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservasi_kode_unik VARCHAR(20) NOT NULL,
    user_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5), -- Hanya menerima bintang 1 sampai 5
    komentar TEXT NULL,
    waktu_ulasan TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reservasi_kode_unik) REFERENCES reservasi(kode_unik) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ========================================================
-- DATA AWAL (SEEDER)
-- ========================================================

-- Memasukkan (insert) data tarif ke database
INSERT INTO tarif (jenis_kendaraan, tarif_jam_pertama, tarif_jam_berikutnya) 
VALUES 
('Motor', 3000, 1000), 
('Mobil', 10000, 2000);