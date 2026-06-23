-- phpMyAdmin SQL Dump
-- PPDB SMK Bina Nusa Database Schema Updated for Multi-Actor & Payments

CREATE DATABASE IF NOT EXISTS `ppdb_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `ppdb_db`;

-- Hapus tabel lama agar skema terupdate secara bersih saat diimpor kembali
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `pendaftar`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `admins`;
SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE IF NOT EXISTS `admins` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `role` enum('admin', 'bendahara', 'kepala_panitia') NOT NULL DEFAULT 'admin',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`id`, `username`, `password`, `name`, `role`) VALUES
(1, 'admin', '$2y$10$KOjwFxkvNsiilO91j6OWLuoJ4yhep/neXfjMH4SaAndY2p64N536m', 'Panitia PPDB', 'admin'),
(2, 'bendahara', '$2y$10$X.XY1j2bwY.AcDzO.lsB..wqo5DnkMojXY30NhsMH9IEmMo.kxSPO', 'Bendahara PPDB', 'bendahara'),
(3, 'kepala', '$2y$10$FhYmY4DEslZkz7/KtV2AkOpHvemgVjE4NMhMzWVwnoziCH.Tvray.', 'Kepala Panitia PPDB', 'kepala_panitia')
ON DUPLICATE KEY UPDATE `username`=`username`;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `no_hp` varchar(15) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `name`, `email`, `no_hp`) VALUES
(1, 'rian_ortu', '$2y$10$KOjwFxkvNsiilO91j6OWLuoJ4yhep/neXfjMH4SaAndY2p64N536m', 'Ahmad Sudrajat', 'ahmad.sudrajat@gmail.com', '081299887765'),
(2, 'amel_ortu', '$2y$10$KOjwFxkvNsiilO91j6OWLuoJ4yhep/neXfjMH4SaAndY2p64N536m', 'Heri Kurniawan', 'heri.k@gmail.com', '087812345679')
ON DUPLICATE KEY UPDATE `username`=`username`;

-- --------------------------------------------------------

--
-- Table structure for table `pendaftar`
--

CREATE TABLE IF NOT EXISTS `pendaftar` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reg_id` varchar(20) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `nama` varchar(100) NOT NULL,
  `nisn` varchar(10) NOT NULL,
  `nik` varchar(16) NOT NULL,
  `tempat_lahir` varchar(50) NOT NULL,
  `tanggal_lahir` date NOT NULL,
  `jenis_kelamin` varchar(15) NOT NULL,
  `agama` varchar(20) NOT NULL,
  `alamat` text NOT NULL,
  `no_hp` varchar(15) NOT NULL,
  `email` varchar(100) NOT NULL,
  `nama_ayah` varchar(100) NOT NULL,
  `pekerjaan_ayah` varchar(50) NOT NULL,
  `nama_ibu` varchar(100) NOT NULL,
  `pekerjaan_ibu` varchar(50) NOT NULL,
  `no_hp_ortu` varchar(15) NOT NULL,
  `penghasilan_ortu` varchar(50) NOT NULL,
  `asal_sekolah` varchar(100) NOT NULL,
  `tahun_lulus` varchar(4) NOT NULL,
  `jurusan1` varchar(10) NOT NULL,
  `jurusan2` varchar(10) NOT NULL,
  `nilai_mtk` float NOT NULL,
  `nilai_ipa` float NOT NULL,
  `nilai_indo` float NOT NULL,
  `nilai_rata` float NOT NULL,
  `status` enum('Sedang Diproses','Diterima','Cadangan','Ditolak') NOT NULL DEFAULT 'Sedang Diproses',
  `metode_pembayaran` varchar(50) DEFAULT NULL,
  `status_pembayaran` enum('Belum Bayar','Menunggu Verifikasi','Lunas','Ditolak') NOT NULL DEFAULT 'Belum Bayar',
  `bukti_bayar` varchar(255) DEFAULT NULL,
  `waktu_bayar` timestamp NULL DEFAULT NULL,
  `tanggal_daftar` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `reg_id` (`reg_id`),
  UNIQUE KEY `nisn` (`nisn`),
  KEY `fk_pendaftar_users` (`user_id`),
  CONSTRAINT `fk_pendaftar_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `pendaftar`
--

INSERT INTO `pendaftar` (`reg_id`, `user_id`, `nama`, `nisn`, `nik`, `tempat_lahir`, `tanggal_lahir`, `jenis_kelamin`, `agama`, `alamat`, `no_hp`, `email`, `nama_ayah`, `pekerjaan_ayah`, `nama_ibu`, `pekerjaan_ibu`, `no_hp_ortu`, `penghasilan_ortu`, `asal_sekolah`, `tahun_lulus`, `jurusan1`, `jurusan2`, `nilai_mtk`, `nilai_ipa`, `nilai_indo`, `nilai_rata`, `status`, `metode_pembayaran`, `status_pembayaran`, `bukti_bayar`, `waktu_bayar`, `tanggal_daftar`) VALUES
('REG-10283', 1, 'Rian Hidayat', '0098765432', '3201234567890001', 'Jakarta', '2011-04-12', 'Laki-laki', 'Islam', 'Jl. Melati No. 12, RT 03/RW 04, Pancoran, Jakarta Selatan', '081299887766', 'rian.hidayat@gmail.com', 'Ahmad Sudrajat', 'Wiraswasta/Pedagang', 'Siti Aminah', 'Ibu Rumah Tangga', '081299887765', 'Rp 1.000.000 - Rp 3.000.000', 'SMP Negeri 1 Jakarta', '2026', 'RPL', 'TKJ', 90, 85, 88, 87.7, 'Diterima', 'Transfer Bank BCA', 'Lunas', 'bukti_rian.jpg', '2026-05-10 10:45:00', '2026-05-10 10:30:00'),
('REG-10594', 2, 'Amelia Putri', '0091234567', '3201234567890002', 'Bandung', '2010-09-25', 'Perempuan', 'Islam', 'Jl. Dago No. 104, Coblong, Bandung', '087812345678', 'amelia.putri@yahoo.com', 'Heri Kurniawan', 'Karyawan Swasta', 'Dewi Lestari', 'Karyawan Swasta', '087812345679', 'Rp 3.000.000 - Rp 5.000.000', 'SMP Negeri 2 Bandung', '2026', 'DKV', 'OTKP', 78, 82, 90, 83.3, 'Sedang Diproses', 'DANA', 'Menunggu Verifikasi', 'bukti_amel.jpg', '2026-05-12 14:30:00', '2026-05-12 14:15:00'),
('REG-10721', NULL, 'Samuel Christian', '0092345678', '3201234567890003', 'Bogor', '2010-12-05', 'Laki-laki', 'Kristen Protestan', 'Perumahan Pajajaran Indah Blok C/4, Bogor Timur', '085298765432', 'samuel.c@outlook.com', 'Willy Christian', 'PNS/TNI/Polri', 'Maria Sulastri', 'Ibu Rumah Tangga', '085298765433', '> Rp 5.000.000', 'SMP Kristen Bogor', '2026', 'TKJ', 'RPL', 84, 88, 82, 84.7, 'Diterima', 'OVO', 'Lunas', 'bukti_samuel.jpg', '2026-05-14 09:00:00', '2026-05-14 08:45:00'),
('REG-10902', NULL, 'Dina Mariana', '0093456789', '3201234567890004', 'Depok', '2011-02-18', 'Perempuan', 'Islam', 'Jl. Margonda Raya Gg. Haji Saleh No. 42, Depok', '089911223344', 'dina.mariana@gmail.com', 'Budi Hartono', 'Petani/Nelayan/Buruh', 'Ratna Sari', 'Ibu Rumah Tangga', '089911223345', '< Rp 1.000.000', 'SMP Negeri 1 Depok', '2026', 'AKL', 'OTKP', 65, 70, 75, 70, 'Cadangan', 'Cash Koperasi', 'Lunas', 'bukti_dina.jpg', '2026-05-15 11:15:00', '2026-05-15 11:00:00'),
('REG-10955', NULL, 'Fahri Ramadhan', '0094567890', '3201234567890005', 'Tangerang', '2010-08-30', 'Laki-laki', 'Islam', 'Perum Gading Serpong Sektor 4, Tangerang', '081388776655', 'fahri.ramadhan@gmail.com', 'Slamet Riyadi', 'Wiraswasta/Pedagang', 'Endang Suci', 'Ibu Rumah Tangga', '081388776654', 'Rp 1.000.000 - Rp 3.000.000', 'SMP PGRI 2 Tangerang', '2025', 'OTKP', 'AKL', 55, 60, 68, 61, 'Ditolak', NULL, 'Belum Bayar', NULL, NULL, '2026-05-16 16:20:00')
ON DUPLICATE KEY UPDATE `reg_id`=`reg_id`;
