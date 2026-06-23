<?php
/**
 * PPDB SMK Bina Nusa - API Backend (Updated)
 * Menangani permintaan AJAX dari Frontend untuk Multi-Actor & Pembayaran
 */

// Aktifkan CORS agar mempermudah pengujian lokal jika origin berbeda
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

// Tangani Preflight Request untuk CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Sertakan konfigurasi database & session
require_once 'config.php';

// Buat folder uploads jika belum ada
$uploadDir = __DIR__ . '/uploads/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Cek parameter aksi
$action = isset($_GET['action']) ? $_GET['action'] : '';

if (empty($action)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Aksi tidak ditentukan!']);
    exit();
}

// Baca data JSON jika dikirim oleh client
$inputData = json_decode(file_get_contents('php://input'), true);
if (!$inputData) {
    $inputData = $_POST; // Fallback ke form POST biasa
}

// ================= HELPER FUNCTIONS =================

function is_admin_logged_in() {
    return isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;
}

function get_admin_role() {
    return isset($_SESSION['admin_role']) ? $_SESSION['admin_role'] : '';
}

function restrict_to_role($allowedRoles) {
    if (!is_admin_logged_in() || !in_array(get_admin_role(), $allowedRoles)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Akses ditolak. Peran Anda tidak memiliki izin untuk aksi ini!']);
        exit();
    }
}

function is_user_logged_in() {
    return isset($_SESSION['user_logged_in']) && $_SESSION['user_logged_in'] === true;
}

function restrict_to_user() {
    if (!is_user_logged_in()) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Silakan login sebagai Orang Tua terlebih dahulu!']);
        exit();
    }
}

// Routing Aksi
switch ($action) {
    
    // ================= SESS & AUTH ENDPOINTS =================

    case 'check_session':
        if (is_admin_logged_in()) {
            echo json_encode([
                'status' => 'success',
                'logged_in' => true,
                'type' => 'staff',
                'role' => get_admin_role(),
                'username' => $_SESSION['admin_user'],
                'name' => $_SESSION['admin_name']
            ]);
        } elseif (is_user_logged_in()) {
            echo json_encode([
                'status' => 'success',
                'logged_in' => true,
                'type' => 'user',
                'role' => 'orang_tua',
                'username' => $_SESSION['user_username'],
                'name' => $_SESSION['user_name'],
                'user_id' => $_SESSION['user_id']
            ]);
        } else {
            echo json_encode([
                'status' => 'success',
                'logged_in' => false
            ]);
        }
        break;

    case 'logout':
        session_destroy();
        echo json_encode(['status' => 'success', 'message' => 'Logout berhasil!']);
        break;

    // ================= ORANG TUA / USER ENDPOINTS =================

    case 'user_register':
        $required = ['username', 'password', 'name', 'email', 'no_hp'];
        foreach ($required as $field) {
            if (!isset($inputData[$field]) || trim($inputData[$field]) === '') {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => "Field '$field' wajib diisi!"]);
                exit();
            }
        }

        $username = trim($inputData['username']);
        $password = password_hash($inputData['password'], PASSWORD_BCRYPT);
        $name = trim($inputData['name']);
        $email = trim($inputData['email']);
        $no_hp = trim($inputData['no_hp']);

        try {
            // Cek keunikan username di tabel users
            $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
            $stmt->execute([$username]);
            if ($stmt->fetch()) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'Username sudah digunakan oleh akun lain!']);
                exit();
            }

            $stmt = $pdo->prepare("INSERT INTO users (username, password, name, email, no_hp) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$username, $password, $name, $email, $no_hp]);

            echo json_encode([
                'status' => 'success',
                'message' => 'Pendaftaran akun orang tua berhasil! Silakan login.'
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Gagal mendaftar akun: ' . $e->getMessage()]);
        }
        break;

    case 'user_login':
        if (!isset($inputData['username']) || !isset($inputData['password'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Username dan password wajib diisi!']);
            exit();
        }

        $username = trim($inputData['username']);
        $password = $inputData['password'];

        try {
            // Cari di tabel users (Orang Tua)
            $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? LIMIT 1");
            $stmt->execute([$username]);
            $user = $stmt->fetch();

            if ($user && password_verify($password, $user['password'])) {
                $_SESSION['user_logged_in'] = true;
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['user_username'] = $user['username'];
                $_SESSION['user_name'] = $user['name'];

                echo json_encode([
                    'status' => 'success',
                    'message' => 'Login Orang Tua berhasil!',
                    'data' => [
                        'type' => 'user',
                        'role' => 'orang_tua',
                        'username' => $user['username'],
                        'name' => $user['name']
                    ]
                ]);
                exit();
            }

            // Jika tidak ditemukan di users, cari di tabel admins (Staff: Admin/Bendahara/Kepala)
            $stmt = $pdo->prepare("SELECT * FROM admins WHERE username = ? LIMIT 1");
            $stmt->execute([$username]);
            $admin = $stmt->fetch();

            if ($admin && password_verify($password, $admin['password'])) {
                $_SESSION['admin_logged_in'] = true;
                $_SESSION['admin_user'] = $admin['username'];
                $_SESSION['admin_name'] = $admin['name'];
                $_SESSION['admin_role'] = $admin['role'];

                echo json_encode([
                    'status' => 'success',
                    'message' => 'Login Staff berhasil!',
                    'data' => [
                        'type' => 'staff',
                        'role' => $admin['role'],
                        'username' => $admin['username'],
                        'name' => $admin['name']
                    ]
                ]);
                exit();
            }

            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Username atau password salah!']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Proses login gagal: ' . $e->getMessage()]);
        }
        break;

    case 'user_get_profile':
        restrict_to_user();
        $userId = $_SESSION['user_id'];

        try {
            // Ambil data pendaftaran yang dikaitkan dengan user_id ini
            $stmt = $pdo->prepare("SELECT * FROM pendaftar WHERE user_id = ? LIMIT 1");
            $stmt->execute([$userId]);
            $student = $stmt->fetch();

            echo json_encode([
                'status' => 'success',
                'data' => [
                    'account' => [
                        'name' => $_SESSION['user_name'],
                        'username' => $_SESSION['user_username']
                    ],
                    'student' => $student ? $student : null
                ]
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Gagal mengambil profil pendaftar: ' . $e->getMessage()]);
        }
        break;

    // ================= CLIENT ENDPOINTS (REGISTRATION & STATUS) =================

    case 'register':
        restrict_to_user();
        $userId = $_SESSION['user_id'];

        // Cek apakah user sudah mendaftarkan anak
        $stmt = $pdo->prepare("SELECT id FROM pendaftar WHERE user_id = ?");
        $stmt->execute([$userId]);
        if ($stmt->fetch()) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Anda sudah mengisi formulir pendaftaran untuk akun ini!']);
            exit();
        }

        // Validasi input wajib
        $requiredFields = [
            'nama_lengkap', 'nisn', 'nik', 'tempat_lahir', 'tanggal_lahir', 
            'jenis_kelamin', 'agama', 'alamat', 'no_hp', 'email', 
            'nama_ayah', 'pekerjaan_ayah', 'nama_ibu', 'pekerjaan_ibu', 
            'no_hp_ortu', 'penghasilan_ortu', 'asal_sekolah', 'tahun_lulus', 
            'pilihan_jurusan_1', 'pilihan_jurusan_2', 'nilai_mtk', 'nilai_ipa', 'nilai_indonesia',
            'metode_pembayaran'
        ];

        foreach ($requiredFields as $field) {
            if (!isset($inputData[$field]) || trim($inputData[$field]) === '') {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => "Field '$field' wajib diisi!"]);
                exit();
            }
        }

        try {
            // Cek apakah NISN sudah terdaftar
            $stmt = $pdo->prepare("SELECT id FROM pendaftar WHERE nisn = ?");
            $stmt->execute([$inputData['nisn']]);
            if ($stmt->fetch()) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => "Nomor NISN " . htmlspecialchars($inputData['nisn']) . " sudah terdaftar dalam sistem PPDB!"]);
                exit();
            }

            // Generate REG ID Unik berurutan
            $stmt = $pdo->query("SELECT MAX(id) AS max_id FROM pendaftar");
            $row = $stmt->fetch();
            $nextNum = ($row['max_id'] ? $row['max_id'] : 0) + 10001;
            $regId = "REG-" . $nextNum;

            // Hitung nilai rata-rata
            $mtk = floatval($inputData['nilai_mtk']);
            $ipa = floatval($inputData['nilai_ipa']);
            $indo = floatval($inputData['nilai_indonesia']);
            $rata = round(($mtk + $ipa + $indo) / 3, 1);

            // Simpan ke database
            $sql = "INSERT INTO pendaftar (
                reg_id, user_id, nama, nisn, nik, tempat_lahir, tanggal_lahir, jenis_kelamin, agama, alamat, no_hp, email,
                nama_ayah, pekerjaan_ayah, nama_ibu, pekerjaan_ibu, no_hp_ortu, penghasilan_ortu,
                asal_sekolah, tahun_lulus, jurusan1, jurusan2, nilai_mtk, nilai_ipa, nilai_indo, nilai_rata, status,
                metode_pembayaran, status_pembayaran
            ) VALUES (
                :reg_id, :user_id, :nama, :nisn, :nik, :tempat_lahir, :tanggal_lahir, :jenis_kelamin, :agama, :alamat, :no_hp, :email,
                :nama_ayah, :pekerjaan_ayah, :nama_ibu, :pekerjaan_ibu, :no_hp_ortu, :penghasilan_ortu,
                :asal_sekolah, :tahun_lulus, :jurusan1, :jurusan2, :nilai_mtk, :nilai_ipa, :nilai_indo, :nilai_rata, 'Sedang Diproses',
                :metode_pembayaran, 'Belum Bayar'
            )";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                'reg_id' => $regId,
                'user_id' => $userId,
                'nama' => htmlspecialchars($inputData['nama_lengkap']),
                'nisn' => htmlspecialchars($inputData['nisn']),
                'nik' => htmlspecialchars($inputData['nik']),
                'tempat_lahir' => htmlspecialchars($inputData['tempat_lahir']),
                'tanggal_lahir' => $inputData['tanggal_lahir'],
                'jenis_kelamin' => htmlspecialchars($inputData['jenis_kelamin']),
                'agama' => htmlspecialchars($inputData['agama']),
                'alamat' => htmlspecialchars($inputData['alamat']),
                'no_hp' => htmlspecialchars($inputData['no_hp']),
                'email' => htmlspecialchars($inputData['email']),
                'nama_ayah' => htmlspecialchars($inputData['nama_ayah']),
                'pekerjaan_ayah' => htmlspecialchars($inputData['pekerjaan_ayah']),
                'nama_ibu' => htmlspecialchars($inputData['nama_ibu']),
                'pekerjaan_ibu' => htmlspecialchars($inputData['pekerjaan_ibu']),
                'no_hp_ortu' => htmlspecialchars($inputData['no_hp_ortu']),
                'penghasilan_ortu' => htmlspecialchars($inputData['penghasilan_ortu']),
                'asal_sekolah' => htmlspecialchars($inputData['asal_sekolah']),
                'tahun_lulus' => htmlspecialchars($inputData['tahun_lulus']),
                'jurusan1' => htmlspecialchars($inputData['pilihan_jurusan_1']),
                'jurusan2' => htmlspecialchars($inputData['pilihan_jurusan_2']),
                'nilai_mtk' => $mtk,
                'nilai_ipa' => $ipa,
                'nilai_indo' => $indo,
                'nilai_rata' => $rata,
                'metode_pembayaran' => htmlspecialchars($inputData['metode_pembayaran'])
            ]);

            echo json_encode([
                'status' => 'success',
                'message' => 'Pendaftaran berhasil dibuat! Silakan lanjutkan ke pembayaran.',
                'data' => [
                    'regId' => $regId,
                    'nama' => $inputData['nama_lengkap'],
                    'jurusan1' => $inputData['pilihan_jurusan_1']
                ]
            ]);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Gagal menyimpan pendaftaran: ' . $e->getMessage()]);
        }
        break;

    case 'upload_receipt':
        restrict_to_user();
        $userId = $_SESSION['user_id'];

        // Cek berkas pendaftaran milik user ini
        try {
            $stmt = $pdo->prepare("SELECT id, reg_id FROM pendaftar WHERE user_id = ? LIMIT 1");
            $stmt->execute([$userId]);
            $student = $stmt->fetch();

            if (!$student) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'Data pendaftaran belum diisi!']);
                exit();
            }

            if (!isset($_FILES['bukti_bayar'])) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'File bukti pembayaran wajib diunggah!']);
                exit();
            }

            $file = $_FILES['bukti_bayar'];
            $allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
            if (!in_array($file['type'], $allowedTypes)) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'Tipe file tidak valid! Hanya diperbolehkan format JPG, JPEG, atau PNG.']);
                exit();
            }

            // Batasi ukuran file 2MB
            if ($file['size'] > 2 * 1024 * 1024) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'Ukuran file terlalu besar! Maksimal adalah 2MB.']);
                exit();
            }

            // Buat nama file unik
            $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = 'bukti_' . $student['reg_id'] . '_' . time() . '.' . $ext;
            $targetPath = $uploadDir . $filename;

            if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                // Update ke database
                $stmt = $pdo->prepare("UPDATE pendaftar SET status_pembayaran = 'Menunggu Verifikasi', bukti_bayar = ?, waktu_bayar = CURRENT_TIMESTAMP() WHERE id = ?");
                $stmt->execute([$filename, $student['id']]);

                echo json_encode([
                    'status' => 'success',
                    'message' => 'Bukti pembayaran berhasil diunggah! Menunggu verifikasi dari bendahara.',
                    'filename' => $filename
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['status' => 'error', 'message' => 'Gagal menyimpan file di server.']);
            }

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Gagal memproses unggah bukti bayar: ' . $e->getMessage()]);
        }
        break;

    case 'check_status':
        if (!isset($_GET['query']) || trim($_GET['query']) === '') {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Parameter query pencarian wajib diisi!']);
            exit();
        }

        $query = trim($_GET['query']);

        try {
            $stmt = $pdo->prepare("SELECT * FROM pendaftar WHERE UPPER(reg_id) = UPPER(:query) OR nisn = :query LIMIT 1");
            $stmt->execute(['query' => $query]);
            $student = $stmt->fetch();

            if ($student) {
                echo json_encode([
                    'status' => 'success',
                    'data' => $student
                ]);
            } else {
                http_response_code(404);
                echo json_encode(['status' => 'error', 'message' => 'Data pendaftar tidak ditemukan!']);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Gagal mencari status: ' . $e->getMessage()]);
        }
        break;


    // ================= BENDAHARA ENDPOINTS =================

    case 'bendahara_get_payments':
        restrict_to_role(['bendahara', 'admin']);

        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $status_pembayaran = isset($_GET['status_pembayaran']) ? trim($_GET['status_pembayaran']) : '';

        try {
            $sql = "SELECT id, reg_id, nama, nisn, metode_pembayaran, status_pembayaran, bukti_bayar, waktu_bayar FROM pendaftar WHERE metode_pembayaran IS NOT NULL";
            $params = [];

            if ($search !== '') {
                $sql .= " AND (nama LIKE :search OR reg_id LIKE :search)";
                $params['search'] = "%$search%";
            }

            if ($status_pembayaran !== '') {
                $sql .= " AND status_pembayaran = :status_pembayaran";
                $params['status_pembayaran'] = $status_pembayaran;
            } else {
                // Tampilkan yang menunggu verifikasi terlebih dahulu
                $sql .= " ORDER BY CASE WHEN status_pembayaran = 'Menunggu Verifikasi' THEN 1 ELSE 2 END, id DESC";
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $payments = $stmt->fetchAll();

            echo json_encode([
                'status' => 'success',
                'data' => $payments
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Gagal mengambil data pembayaran: ' . $e->getMessage()]);
        }
        break;

    case 'bendahara_verify_payment':
        restrict_to_role(['bendahara', 'admin']);

        if (!isset($inputData['regId']) || !isset($inputData['status_pembayaran'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Parameter regId dan status_pembayaran wajib disertakan!']);
            exit();
        }

        $regId = trim($inputData['regId']);
        $newPaymentStatus = trim($inputData['status_pembayaran']);

        $validStatuses = ['Lunas', 'Ditolak', 'Belum Bayar', 'Menunggu Verifikasi'];
        if (!in_array($newPaymentStatus, $validStatuses)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Status pembayaran tidak valid!']);
            exit();
        }

        try {
            $stmt = $pdo->prepare("UPDATE pendaftar SET status_pembayaran = :status_pembayaran WHERE reg_id = :regId");
            $stmt->execute([
                'status_pembayaran' => $newPaymentStatus,
                'regId' => $regId
            ]);

            echo json_encode([
                'status' => 'success',
                'message' => "Status pembayaran $regId berhasil diubah menjadi $newPaymentStatus."
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Gagal memverifikasi pembayaran: ' . $e->getMessage()]);
        }
        break;


    // ================= KEPALA PANITIA ENDPOINTS =================

    case 'kepala_get_reports':
        restrict_to_role(['kepala_panitia', 'admin']);

        try {
            // 1. Hitung total pendaftar
            $stmt = $pdo->query("SELECT COUNT(*) as total FROM pendaftar");
            $total = $stmt->fetch()['total'];

            // 2. Hitung statistik pembayaran
            $stmt = $pdo->query("SELECT 
                SUM(CASE WHEN status_pembayaran = 'Lunas' THEN 1 ELSE 0 END) as lunas,
                SUM(CASE WHEN status_pembayaran = 'Menunggu Verifikasi' THEN 1 ELSE 0 END) as verifikasi,
                SUM(CASE WHEN status_pembayaran = 'Belum Bayar' THEN 1 ELSE 0 END) as belum,
                SUM(CASE WHEN status_pembayaran = 'Ditolak' THEN 1 ELSE 0 END) as ditolak
                FROM pendaftar");
            $payStats = $stmt->fetch();

            // Total pendapatan (berdasarkan pembayaran Lunas, biaya Rp 150.000)
            $totalPaid = intval($payStats['lunas']);
            $totalRevenue = $totalPaid * 150000;

            // 3. Distribusi Pilihan Jurusan Utama
            $majors = ['RPL' => 0, 'TKJ' => 0, 'DKV' => 0, 'AKL' => 0, 'OTKP' => 0];
            $stmt = $pdo->query("SELECT jurusan1, COUNT(*) as count FROM pendaftar GROUP BY jurusan1");
            $rows = $stmt->fetchAll();
            foreach ($rows as $row) {
                $code = $row['jurusan1'];
                if (array_key_exists($code, $majors)) {
                    $majors[$code] = intval($row['count']);
                }
            }

            // 4. Statistik Penerimaan Siswa
            $stmt = $pdo->query("SELECT 
                SUM(CASE WHEN status = 'Diterima' THEN 1 ELSE 0 END) as diterima,
                SUM(CASE WHEN status = 'Sedang Diproses' THEN 1 ELSE 0 END) as diproses,
                SUM(CASE WHEN status = 'Cadangan' THEN 1 ELSE 0 END) as cadangan,
                SUM(CASE WHEN status = 'Ditolak' THEN 1 ELSE 0 END) as ditolak
                FROM pendaftar");
            $acceptStats = $stmt->fetch();

            echo json_encode([
                'status' => 'success',
                'data' => [
                    'total_pendaftar' => intval($total),
                    'pendapatan' => [
                        'total_lunas' => $totalPaid,
                        'nominal_lunas' => $totalRevenue,
                        'menunggu_verifikasi' => intval($payStats['verifikasi']),
                        'belum_bayar' => intval($payStats['belum']),
                        'ditolak' => intval($payStats['ditolak'])
                    ],
                    'penerimaan' => [
                        'diterima' => intval($acceptStats['diterima']),
                        'proses' => intval($acceptStats['diproses']),
                        'cadangan' => intval($acceptStats['cadangan']),
                        'ditolak' => intval($acceptStats['ditolak'])
                    ],
                    'jurusan' => $majors
                ]
            ]);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Gagal mengambil laporan kepala panitia: ' . $e->getMessage()]);
        }
        break;


    // ================= ADMIN DATA MANIPULATION (PROTECTED) =================

    case 'admin_get_registrants':
        restrict_to_role(['admin']);

        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $jurusan = isset($_GET['jurusan']) ? trim($_GET['jurusan']) : '';
        $status = isset($_GET['status']) ? trim($_GET['status']) : '';

        try {
            $sql = "SELECT * FROM pendaftar WHERE 1=1";
            $params = [];

            if ($search !== '') {
                $sql .= " AND (nama LIKE :search OR reg_id LIKE :search OR asal_sekolah LIKE :search OR nisn LIKE :search)";
                $params['search'] = "%$search%";
            }

            if ($jurusan !== '') {
                $sql .= " AND jurusan1 = :jurusan";
                $params['jurusan'] = $jurusan;
            }

            if ($status !== '') {
                $sql .= " AND status = :status";
                $params['status'] = $status;
            }

            $sql .= " ORDER BY id DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $registrants = $stmt->fetchAll();

            echo json_encode([
                'status' => 'success',
                'data' => $registrants
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Gagal mengambil data pendaftar: ' . $e->getMessage()]);
        }
        break;

    case 'admin_update_status':
        restrict_to_role(['admin']);

        if (!isset($inputData['regId']) || !isset($inputData['status'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Parameter regId dan status wajib disertakan!']);
            exit();
        }

        $regId = trim($inputData['regId']);
        $newStatus = trim($inputData['status']);

        // Validasi status enum
        $validStatuses = ['Sedang Diproses', 'Diterima', 'Cadangan', 'Ditolak'];
        if (!in_array($newStatus, $validStatuses)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Status tidak valid!']);
            exit();
        }

        try {
            $stmt = $pdo->prepare("UPDATE pendaftar SET status = :status WHERE reg_id = :regId");
            $stmt->execute([
                'status' => $newStatus,
                'regId' => $regId
            ]);

            echo json_encode([
                'status' => 'success',
                'message' => "Status pendaftar $regId berhasil diubah menjadi $newStatus."
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Gagal memperbarui status: ' . $e->getMessage()]);
        }
        break;

    case 'admin_delete':
        restrict_to_role(['admin']);

        if (!isset($inputData['regId'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Parameter regId wajib disertakan!']);
            exit();
        }

        $regId = trim($inputData['regId']);

        try {
            // Ambil nama file bukti transfer untuk dihapus
            $stmt = $pdo->prepare("SELECT bukti_bayar FROM pendaftar WHERE reg_id = ?");
            $stmt->execute([$regId]);
            $row = $stmt->fetch();
            if ($row && $row['bukti_bayar']) {
                $filePath = $uploadDir . $row['bukti_bayar'];
                if (file_exists($filePath)) {
                    unlink($filePath);
                }
            }

            $stmt = $pdo->prepare("DELETE FROM pendaftar WHERE reg_id = ?");
            $stmt->execute([$regId]);

            echo json_encode([
                'status' => 'success',
                'message' => "Data pendaftaran $regId berhasil dihapus."
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Gagal menghapus pendaftaran: ' . $e->getMessage()]);
        }
        break;

    case 'admin_reset':
        restrict_to_role(['admin']);

        try {
            // Hapus semua file bukti transfer di folder uploads
            $files = glob($uploadDir . '*');
            foreach ($files as $file) {
                if (is_file($file) && basename($file) !== 'index.html') { // Jaga index.html jika ada
                    unlink($file);
                }
            }

            // Kosongkan tabel pendaftar dan users
            // Matikan foreign key check sementara agar truncate berhasil
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
            $pdo->exec("TRUNCATE TABLE pendaftar");
            $pdo->exec("TRUNCATE TABLE users");
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

            // Masukkan kembali data sampel bawaan untuk users
            $userSample = "INSERT INTO users (id, username, password, name, email, no_hp) VALUES
            (1, 'rian_ortu', '$2y$10$KOjwFxkvNsiilO91j6OWLuoJ4yhep/neXfjMH4SaAndY2p64N536m', 'Ahmad Sudrajat', 'ahmad.sudrajat@gmail.com', '081299887765'),
            (2, 'amel_ortu', '$2y$10$KOjwFxkvNsiilO91j6OWLuoJ4yhep/neXfjMH4SaAndY2p64N536m', 'Heri Kurniawan', 'heri.k@gmail.com', '087812345679')";
            $pdo->exec($userSample);

            // Masukkan kembali data sampel bawaan untuk pendaftar
            $sampleSql = "INSERT INTO pendaftar (reg_id, user_id, nama, nisn, nik, tempat_lahir, tanggal_lahir, jenis_kelamin, agama, alamat, no_hp, email, nama_ayah, pekerjaan_ayah, nama_ibu, pekerjaan_ibu, no_hp_ortu, penghasilan_ortu, asal_sekolah, tahun_lulus, jurusan1, jurusan2, nilai_mtk, nilai_ipa, nilai_indo, nilai_rata, status, metode_pembayaran, status_pembayaran, bukti_bayar, waktu_bayar, tanggal_daftar) VALUES
            ('REG-10283', 1, 'Rian Hidayat', '0098765432', '3201234567890001', 'Jakarta', '2011-04-12', 'Laki-laki', 'Islam', 'Jl. Melati No. 12, RT 03/RW 04, Pancoran, Jakarta Selatan', '081299887766', 'rian.hidayat@gmail.com', 'Ahmad Sudrajat', 'Wiraswasta/Pedagang', 'Siti Aminah', 'Ibu Rumah Tangga', '081299887765', 'Rp 1.000.000 - Rp 3.000.000', 'SMP Negeri 1 Jakarta', '2026', 'RPL', 'TKJ', 90, 85, 88, 87.7, 'Diterima', 'Transfer Bank BCA', 'Lunas', 'bukti_rian.jpg', '2026-05-10 10:45:00', '2026-05-10 10:30:00'),
            ('REG-10594', 2, 'Amelia Putri', '0091234567', '3201234567890002', 'Bandung', '2010-09-25', 'Perempuan', 'Islam', 'Jl. Dago No. 104, Coblong, Bandung', '087812345678', 'amelia.putri@yahoo.com', 'Heri Kurniawan', 'Karyawan Swasta', 'Dewi Lestari', 'Karyawan Swasta', '087812345679', 'Rp 3.000.000 - Rp 5.000.000', 'SMP Negeri 2 Bandung', '2026', 'DKV', 'OTKP', 78, 82, 90, 83.3, 'Sedang Diproses', 'DANA', 'Menunggu Verifikasi', 'bukti_amel.jpg', '2026-05-12 14:30:00', '2026-05-12 14:15:00'),
            ('REG-10721', NULL, 'Samuel Christian', '0092345678', '3201234567890003', 'Bogor', '2010-12-05', 'Laki-laki', 'Kristen Protestan', 'Perumahan Pajajaran Indah Blok C/4, Bogor Timur', '085298765432', 'samuel.c@outlook.com', 'Willy Christian', 'PNS/TNI/Polri', 'Maria Sulastri', 'Ibu Rumah Tangga', '085298765433', '> Rp 5.000.000', 'SMP Kristen Bogor', '2026', 'TKJ', 'RPL', 84, 88, 82, 84.7, 'Diterima', 'OVO', 'Lunas', 'bukti_samuel.jpg', '2026-05-14 09:00:00', '2026-05-14 08:45:00'),
            ('REG-10902', NULL, 'Dina Mariana', '0093456789', '3201234567890004', 'Depok', '2011-02-18', 'Perempuan', 'Islam', 'Jl. Margonda Raya Gg. Haji Saleh No. 42, Depok', '089911223344', 'dina.mariana@gmail.com', 'Budi Hartono', 'Petani/Nelayan/Buruh', 'Ratna Sari', 'Ibu Rumah Tangga', '089911223345', '< Rp 1.000.000', 'SMP Negeri 1 Depok', '2026', 'AKL', 'OTKP', 65, 70, 75, 70, 'Cadangan', 'Cash Koperasi', 'Lunas', 'bukti_dina.jpg', '2026-05-15 11:15:00', '2026-05-15 11:00:00'),
            ('REG-10955', NULL, 'Fahri Ramadhan', '0094567890', '3201234567890005', 'Tangerang', '2010-08-30', 'Laki-laki', 'Islam', 'Perum Gading Serpong Sektor 4, Tangerang', '081388776655', 'fahri.ramadhan@gmail.com', 'Slamet Riyadi', 'Wiraswasta/Pedagang', 'Endang Suci', 'Ibu Rumah Tangga', '081388776654', 'Rp 1.000.000 - Rp 3.000.000', 'SMP PGRI 2 Tangerang', '2025', 'OTKP', 'AKL', 55, 60, 68, 61, 'Ditolak', NULL, 'Belum Bayar', NULL, NULL, '2026-05-16 16:20:00')";

            $pdo->exec($sampleSql);

            echo json_encode([
                'status' => 'success',
                'message' => 'Simulasi berhasil di-reset ke data default bawaan.'
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Gagal mereset data: ' . $e->getMessage()]);
        }
        break;

    case 'admin_get_stats':
        restrict_to_role(['admin']);

        try {
            // 1. Ambil summary counters
            $counts = [
                'total' => 0,
                'diterima' => 0,
                'diproses' => 0,
                'ditolak' => 0,
                'cadangan' => 0
            ];

            $stmt = $pdo->query("SELECT status, COUNT(*) as count FROM pendaftar GROUP BY status");
            $rows = $stmt->fetchAll();
            foreach ($rows as $row) {
                $status = $row['status'];
                $count = intval($row['count']);
                $counts['total'] += $count;
                
                if ($status === 'Diterima') $counts['diterima'] = $count;
                elseif ($status === 'Sedang Diproses') $counts['diproses'] = $count;
                elseif ($status === 'Ditolak') $counts['ditolak'] = $count;
                elseif ($status === 'Cadangan') $counts['cadangan'] = $count;
            }

            // 2. Ambil sebaran kompetensi keahlian (jurusan1)
            $majors = ['RPL' => 0, 'TKJ' => 0, 'DKV' => 0, 'AKL' => 0, 'OTKP' => 0];
            $stmt = $pdo->query("SELECT jurusan1, COUNT(*) as count FROM pendaftar GROUP BY jurusan1");
            $rows = $stmt->fetchAll();
            foreach ($rows as $row) {
                $code = $row['jurusan1'];
                if (array_key_exists($code, $majors)) {
                    $majors[$code] = intval($row['count']);
                }
            }

            // 3. Ambil top 5 asal sekolah
            $stmt = $pdo->query("SELECT asal_sekolah as name, COUNT(*) as count FROM pendaftar GROUP BY asal_sekolah ORDER BY count DESC LIMIT 5");
            $schools = $stmt->fetchAll();
            foreach ($schools as &$sch) {
                $sch['count'] = intval($sch['count']);
            }

            echo json_encode([
                'status' => 'success',
                'data' => [
                    'counters' => $counts,
                    'majors' => $majors,
                    'schools' => $schools
                ]
            ]);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Gagal memuat statistik: ' . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Endpoint API tidak ditemukan!']);
        break;
}
