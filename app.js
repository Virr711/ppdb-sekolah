/**
 * PPDB SMK Bina Nusa - Frontend Application Controller (Updated)
 * Mengontrol logika Single Page Application (SPA), Multi-Actor,
 * Carousel Banner, dan Logika Pembayaran
 */

document.addEventListener('DOMContentLoaded', () => {

    // ================= HELPER FUNCTIONS =================
    
    function formatDateIndo(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return d.toLocaleDateString('id-ID', options);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getMajorFullName(code) {
        const majors = {
            'RPL': 'Rekayasa Perangkat Lunak (RPL)',
            'TKJ': 'Teknik Komputer & Jaringan (TKJ)',
            'DKV': 'Desain Komunikasi Visual (DKV)',
            'AKL': 'Akuntansi & Keuangan Lembaga (AKL)',
            'OTKP': 'Otomatisasi & Tata Kelola Perkantoran (OTKP)'
        };
        return majors[code] || code;
    }

    function formatRupiah(number) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(number);
    }

    // ================= CAROUSEL BANNER LOGIC (Gambar 4) =================
    const slides = document.querySelectorAll('.carousel-slide');
    const dotsContainer = document.getElementById('carousel-indicators');
    let currentSlide = 0;
    let slideTimer;

    function initCarousel() {
        if (slides.length === 0) return;
        
        // Buat indikator titik secara dinamis
        dotsContainer.innerHTML = '';
        slides.forEach((_, idx) => {
            const dot = document.createElement('span');
            dot.className = `carousel-dot ${idx === 0 ? 'active' : ''}`;
            dot.addEventListener('click', () => {
                showSlide(idx);
                resetSlideTimer();
            });
            dotsContainer.appendChild(dot);
        });

        // Kontrol panah
        document.getElementById('btn-carousel-prev').addEventListener('click', () => {
            showSlide(currentSlide - 1);
            resetSlideTimer();
        });
        document.getElementById('btn-carousel-next').addEventListener('click', () => {
            showSlide(currentSlide + 1);
            resetSlideTimer();
        });

        startSlideTimer();
    }

    function showSlide(idx) {
        if (idx < 0) idx = slides.length - 1;
        if (idx >= slides.length) idx = 0;
        
        currentSlide = idx;
        const wrapper = document.querySelector('.carousel-wrapper');
        if (wrapper) {
            wrapper.style.transform = `translateX(-${idx * 33.33333}%)`;
        }

        // Update dot aktif
        const dots = document.querySelectorAll('.carousel-dot');
        dots.forEach((dot, dIdx) => {
            dot.classList.toggle('active', dIdx === idx);
        });

        // Toggle kelas aktif pada slide untuk memicu animasi teks
        slides.forEach((slide, sIdx) => {
            slide.classList.toggle('active', sIdx === idx);
        });
    }

    function startSlideTimer() {
        slideTimer = setInterval(() => {
            showSlide(currentSlide + 1);
        }, 5000);
    }

    function resetSlideTimer() {
        clearInterval(slideTimer);
        startSlideTimer();
    }

    initCarousel();


    // ================= SPA ROUTER / NAVIGATION =================
    const navLinks = document.querySelectorAll('.nav-link, #btn-daftar-nav, .btn-nav-trigger');
    const sections = document.querySelectorAll('.app-section');
    const mobileToggle = document.getElementById('mobile-toggle');
    const navMenu = document.getElementById('nav-menu');
    const logoNav = document.getElementById('logo-nav');

    async function checkCurrentSession() {
        try {
            const response = await fetch('api.php?action=check_session');
            const result = await response.json();
            
            const navAuthText = document.getElementById('nav-auth-text');
            const navAuthBtn = document.getElementById('nav-auth-btn');
            const navStaffDashboard = document.getElementById('nav-staff-dashboard');
            
            if (result.status === 'success' && result.logged_in === true) {
                navAuthText.textContent = `Keluar (${result.name})`;
                navAuthBtn.setAttribute('data-target', 'logout-action');
                
                if (result.type === 'staff') {
                    navStaffDashboard.classList.remove('hidden');
                    navStaffDashboard.setAttribute('data-target', 'admin-section');
                } else {
                    navStaffDashboard.classList.add('hidden');
                }
                return result;
            } else {
                navAuthText.textContent = 'Masuk';
                navAuthBtn.setAttribute('data-target', 'auth-section');
                navStaffDashboard.classList.add('hidden');
                return null;
            }
        } catch (error) {
            console.error('Error checking session:', error);
            return null;
        }
    }

    async function navigateToSection(targetId) {
        const session = await checkCurrentSession();
        
        // Validasi hak akses sebelum masuk tab
        if (targetId === 'register-section') {
            if (!session) {
                alert('Silakan daftar atau login ke akun Orang Tua terlebih dahulu!');
                targetId = 'auth-section';
            } else if (session.type === 'staff') {
                alert('Akun Panitia tidak dapat melakukan pendaftaran siswa. Diarahkan ke Dashboard Staff.');
                targetId = 'admin-section';
            }
        } else if (targetId === 'admin-section') {
            if (!session || session.type !== 'staff') {
                alert('Akses khusus Panitia/Staff PPDB! Silakan login.');
                targetId = 'auth-section';
            }
        }

        sections.forEach(section => {
            section.classList.toggle('active', section.id === targetId);
        });

        document.querySelectorAll('.nav-link, #btn-daftar-nav').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-target') === targetId) {
                link.classList.add('active');
            }
        });

        navMenu.classList.remove('open');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Trigger inisialisasi modul halaman
        if (targetId === 'register-section') {
            loadParentDashboard();
        } else if (targetId === 'admin-section') {
            loadStaffDashboard(session);
        } else if (targetId === 'auth-section') {
            resetAuthForms();
        }
    }

    // Event listener navigasi
    navLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            if (targetId === 'logout-action') {
                await handleLogout();
                return;
            }
            navigateToSection(targetId);
        });
    });

    logoNav.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToSection('home-section');
    });

    mobileToggle.addEventListener('click', () => {
        navMenu.classList.toggle('open');
    });

    async function handleLogout() {
        if (confirm('Apakah Anda yakin ingin keluar dari akun?')) {
            try {
                const response = await fetch('api.php?action=logout');
                const result = await response.json();
                if (result.status === 'success') {
                    await checkCurrentSession();
                    navigateToSection('home-section');
                }
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
    }


    // ================= AUTHENTICATION PORTAL (Orang Tua & Panitia) =================
    const btnTabLogin = document.getElementById('btn-tab-login');
    const btnTabRegister = document.getElementById('btn-tab-register');
    const authLoginBox = document.getElementById('auth-login-box');
    const authRegisterBox = document.getElementById('auth-register-box');
    const userLoginForm = document.getElementById('user-login-form');
    const userRegisterForm = document.getElementById('user-register-form');
    const userLoginError = document.getElementById('user-login-error');
    const userRegisterError = document.getElementById('user-register-error');

    function resetAuthForms() {
        userLoginForm.reset();
        userRegisterForm.reset();
        userLoginError.style.display = 'none';
        userRegisterError.style.display = 'none';
        
        btnTabLogin.classList.add('active');
        btnTabRegister.classList.remove('active');
        authLoginBox.classList.add('active');
        authRegisterBox.classList.remove('active');
    }

    btnTabLogin.addEventListener('click', () => {
        btnTabLogin.classList.add('active');
        btnTabRegister.classList.remove('active');
        authLoginBox.classList.add('active');
        authRegisterBox.classList.remove('active');
    });

    btnTabRegister.addEventListener('click', () => {
        btnTabRegister.classList.add('active');
        btnTabLogin.classList.remove('active');
        authRegisterBox.classList.add('active');
        authLoginBox.classList.remove('active');
    });

    // Submit login
    userLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        userLoginError.style.display = 'none';
        
        const username = document.getElementById('login_username').value.trim();
        const password = document.getElementById('login_password').value;

        try {
            const response = await fetch('api.php?action=user_login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const result = await response.json();

            if (response.ok && result.status === 'success') {
                const session = await checkCurrentSession();
                if (session.type === 'staff') {
                    navigateToSection('admin-section');
                } else {
                    navigateToSection('register-section');
                }
            } else {
                userLoginError.style.display = 'block';
                userLoginError.textContent = result.message || 'Username atau password salah!';
            }
        } catch (error) {
            console.error('Login error:', error);
            userLoginError.style.display = 'block';
            userLoginError.textContent = 'Kesalahan koneksi ke server!';
        }
    });

    // Submit register akun Orang Tua
    userRegisterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        userRegisterError.style.display = 'none';

        const username = document.getElementById('reg_username').value.trim();
        const password = document.getElementById('reg_password').value;
        const name = document.getElementById('reg_name').value.trim();
        const email = document.getElementById('reg_email').value.trim();
        const no_hp = document.getElementById('reg_nohp').value.trim();

        if (password.length < 6) {
            userRegisterError.style.display = 'block';
            userRegisterError.textContent = 'Password harus minimal 6 karakter!';
            return;
        }

        try {
            const response = await fetch('api.php?action=user_register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, name, email, no_hp })
            });
            const result = await response.json();

            if (response.ok && result.status === 'success') {
                alert(result.message);
                resetAuthForms();
            } else {
                userRegisterError.style.display = 'block';
                userRegisterError.textContent = result.message || 'Gagal mendaftar akun!';
            }
        } catch (error) {
            console.error('Register error:', error);
            userRegisterError.style.display = 'block';
            userRegisterError.textContent = 'Kesalahan koneksi ke server!';
        }
    });


    // ================= ORANG TUA / REGISTRATION FLOW (Gambar 2) =================
    const parentFillFormContainer = document.getElementById('parent-fill-form-container');
    const parentStudentDashboard = document.getElementById('parent-student-dashboard');
    const ppdbForm = document.getElementById('ppdb-form');
    const btnSubmitRegistration = document.getElementById('btn-submit-registration');

    // Live Checkout Summary Elements
    const liveSummaryNama = document.getElementById('live-summary-nama');
    const liveSummaryNisn = document.getElementById('live-summary-nisn');
    const liveSummaryJurusan = document.getElementById('live-summary-jurusan');
    const liveSummaryNilai = document.getElementById('live-summary-nilai');
    const liveSummaryMetode = document.getElementById('live-summary-metode');
    const paymentInstructionBox = document.getElementById('payment-instruction-box');
    const paymentInstructionText = document.getElementById('payment-instruction-text');

    let selectedPaymentMethod = '';

    // Inisialisasi formulir input listeners untuk Live Summary Widget
    function initLiveSummaryListeners() {
        const inputNama = document.getElementById('nama_lengkap');
        const inputNisn = document.getElementById('nisn');
        const selectJurusan1 = document.getElementById('pilihan_jurusan_1');
        const selectJurusan2 = document.getElementById('pilihan_jurusan_2');
        const inputMtk = document.getElementById('nilai_mtk');
        const inputIpa = document.getElementById('nilai_ipa');
        const inputIndo = document.getElementById('nilai_indonesia');

        const updateSummary = () => {
            liveSummaryNama.textContent = inputNama.value.trim() || '-';
            liveSummaryNisn.textContent = inputNisn.value.trim() || '-';
            
            if (selectJurusan1.value) {
                let jurText = selectJurusan1.value;
                if (selectJurusan2.value) jurText += ` (Alt: ${selectJurusan2.value})`;
                liveSummaryJurusan.textContent = jurText;
            } else {
                liveSummaryJurusan.textContent = '-';
            }

            const m = parseFloat(inputMtk.value) || 0;
            const i = parseFloat(inputIpa.value) || 0;
            const ind = parseFloat(inputIndo.value) || 0;
            const rata = ((m + i + ind) / 3).toFixed(1);
            liveSummaryNilai.textContent = (m || i || ind) ? `${rata} (MTK: ${m}, IPA: ${i}, Indo: ${ind})` : '-';
            
            // Validasi apakah tombol submit aktif
            validateFormSubmission();
        };

        [inputNama, inputNisn, inputMtk, inputIpa, inputIndo].forEach(el => el.addEventListener('input', updateSummary));
        [selectJurusan1, selectJurusan2].forEach(el => el.addEventListener('change', updateSummary));

        // Pilihan Payment Card Option
        const paymentCards = document.querySelectorAll('.payment-card-option');
        paymentCards.forEach(card => {
            card.addEventListener('click', () => {
                paymentCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                
                selectedPaymentMethod = card.getAttribute('data-method');
                liveSummaryMetode.textContent = selectedPaymentMethod;
                liveSummaryMetode.className = 'val badge badge-accept';
                
                // Tampilkan instruksi bayar
                paymentInstructionBox.classList.remove('hidden');
                let instruct = '';
                if (selectedPaymentMethod === 'DANA') instruct = 'Transfer Rp 150.000 ke akun DANA PPDB: 0812-9988-7766 a.n SMK Bina Nusa.';
                else if (selectedPaymentMethod === 'OVO') instruct = 'Transfer Rp 150.000 ke OVO Merchant: 0812-9988-7766 (SMK Bina Nusa).';
                else if (selectedPaymentMethod === 'GoPay') instruct = 'Transfer Rp 150.000 ke GoPay: 0812-9988-7766 (SMK Bina Nusa).';
                else if (selectedPaymentMethod === 'Transfer Bank BCA') instruct = 'Transfer Rp 150.000 ke BCA Virtual Account: 124-0098765432.';
                else if (selectedPaymentMethod === 'Transfer Bank Mandiri') instruct = 'Transfer Rp 150.000 ke Bank Mandiri Virtual Account: 900-1122334455.';
                else if (selectedPaymentMethod === 'Cash Koperasi') instruct = 'Lakukan pembayaran Rp 150.000 secara langsung ke Koperasi Sekolah (Gedung A) pada hari kerja.';
                
                paymentInstructionText.textContent = instruct;
                validateFormSubmission();
            });
        });
    }

    function validateFormSubmission() {
        const inputNama = document.getElementById('nama_lengkap').value.trim();
        const inputNisn = document.getElementById('nisn').value.trim();
        const selectJurusan1 = document.getElementById('pilihan_jurusan_1').value;
        const selectJurusan2 = document.getElementById('pilihan_jurusan_2').value;
        const inputMtk = document.getElementById('nilai_mtk').value;
        const inputIpa = document.getElementById('nilai_ipa').value;
        const inputIndo = document.getElementById('nilai_indonesia').value;
        const agreeChecked = document.getElementById('pernyataan_setuju').checked;

        const allTextFilled = inputNama.length >= 3 && /^[0-9]{10}$/.test(inputNisn);
        const gradesFilled = inputMtk !== "" && inputIpa !== "" && inputIndo !== "";
        const majorsValid = selectJurusan1 !== "" && selectJurusan2 !== "" && selectJurusan1 !== selectJurusan2;
        
        if (allTextFilled && gradesFilled && majorsValid && selectedPaymentMethod !== '' && agreeChecked) {
            btnSubmitRegistration.disabled = false;
        } else {
            btnSubmitRegistration.disabled = true;
        }
    }

    // Set listener untuk checkbox persetujuan
    document.getElementById('pernyataan_setuju').addEventListener('change', validateFormSubmission);

    // Proses Submit Formulir Pendaftaran Siswa
    btnSubmitRegistration.addEventListener('click', async () => {
        const mtk = parseFloat(document.getElementById('nilai_mtk').value) || 0;
        const ipa = parseFloat(document.getElementById('nilai_ipa').value) || 0;
        const indo = parseFloat(document.getElementById('nilai_indonesia').value) || 0;

        const formData = {
            nama_lengkap: document.getElementById('nama_lengkap').value,
            nisn: document.getElementById('nisn').value,
            nik: document.getElementById('nik').value,
            tempat_lahir: document.getElementById('tempat_lahir').value,
            tanggal_lahir: document.getElementById('tanggal_lahir').value,
            jenis_kelamin: document.getElementById('jenis_kelamin').value,
            agama: document.getElementById('agama').value,
            alamat: document.getElementById('alamat').value,
            no_hp: document.getElementById('no_hp').value,
            email: document.getElementById('email').value,
            nama_ayah: document.getElementById('nama_ayah').value,
            pekerjaan_ayah: document.getElementById('pekerjaan_ayah').value,
            nama_ibu: document.getElementById('nama_ibu').value,
            pekerjaan_ibu: document.getElementById('pekerjaan_ibu').value,
            no_hp_ortu: document.getElementById('no_hp_ortu').value,
            penghasilan_ortu: document.getElementById('penghasilan_ortu').value,
            asal_sekolah: document.getElementById('asal_sekolah').value,
            tahun_lulus: document.getElementById('tahun_lulus').value,
            pilihan_jurusan_1: document.getElementById('pilihan_jurusan_1').value,
            pilihan_jurusan_2: document.getElementById('pilihan_jurusan_2').value,
            nilai_mtk: mtk,
            nilai_ipa: ipa,
            nilai_indonesia: indo,
            metode_pembayaran: selectedPaymentMethod
        };

        try {
            btnSubmitRegistration.disabled = true;
            btnSubmitRegistration.textContent = 'Membuat Formulir...';

            const response = await fetch('api.php?action=register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const result = await response.json();

            if (response.ok && result.status === 'success') {
                alert(result.message);
                loadParentDashboard(); // Muat langsung dashboard untuk upload bukti bayar
            } else {
                alert(result.message || 'Gagal menyimpan pendaftaran!');
                btnSubmitRegistration.disabled = false;
                btnSubmitRegistration.textContent = 'Daftar & Bayar Sekarang';
            }
        } catch (error) {
            console.error('Submit register error:', error);
            alert('Gagal menghubungkan ke server! Pastikan database MySQL aktif.');
            btnSubmitRegistration.disabled = false;
            btnSubmitRegistration.textContent = 'Daftar & Bayar Sekarang';
        }
    });

    // ================= ORANG TUA / DASHBOARD SISWA AKTIF =================
    const paymentUploadForm = document.getElementById('payment-upload-form');
    const inputBuktiBayar = document.getElementById('bukti_bayar_input');
    const filePreview = document.getElementById('file-name-preview');
    const btnUploadPayment = document.getElementById('btn-upload-payment');

    // Update nama file saat dipilih
    inputBuktiBayar.addEventListener('change', () => {
        if (inputBuktiBayar.files.length > 0) {
            filePreview.classList.remove('hidden');
            filePreview.textContent = `File terpilih: ${inputBuktiBayar.files[0].name}`;
        } else {
            filePreview.classList.add('hidden');
        }
    });

    // Upload Bukti Transfer Form
    paymentUploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (inputBuktiBayar.files.length === 0) {
            alert('Silakan pilih file gambar bukti bayar terlebih dahulu!');
            return;
        }

        const formData = new FormData();
        formData.append('bukti_bayar', inputBuktiBayar.files[0]);

        try {
            btnUploadPayment.disabled = true;
            btnUploadPayment.textContent = 'Mengunggah...';

            const response = await fetch('api.php?action=upload_receipt', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();

            if (response.ok && result.status === 'success') {
                alert(result.message);
                loadParentDashboard();
            } else {
                alert(result.message || 'Gagal mengunggah bukti pembayaran!');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Kesalahan koneksi ke server!');
        } finally {
            btnUploadPayment.disabled = false;
            btnUploadPayment.textContent = 'Kirim Bukti Pembayaran';
            paymentUploadForm.reset();
            filePreview.classList.add('hidden');
        }
    });

    // Load parent profile & student
    async function loadParentDashboard() {
        parentFillFormContainer.classList.add('hidden');
        parentStudentDashboard.classList.add('hidden');

        try {
            const response = await fetch('api.php?action=user_get_profile');
            const result = await response.json();

            if (!response.ok || result.status !== 'success') {
                alert('Gagal memuat profil akun Orang Tua.');
                return;
            }

            const data = result.data;
            document.getElementById('parent-account-name').textContent = data.account.name;

            if (data.student === null) {
                // Belum isi formulir pendaftaran
                parentFillFormContainer.classList.remove('hidden');
                ppdbForm.reset();
                selectedPaymentMethod = '';
                liveSummaryNama.textContent = '-';
                liveSummaryNisn.textContent = '-';
                liveSummaryJurusan.textContent = '-';
                liveSummaryNilai.textContent = '-';
                liveSummaryMetode.textContent = 'Belum Dipilih';
                liveSummaryMetode.className = 'val badge badge-process';
                paymentInstructionBox.classList.add('hidden');
                document.querySelectorAll('.payment-card-option').forEach(c => c.classList.remove('selected'));
                initLiveSummaryListeners();
            } else {
                // Sudah mengisi formulir pendaftaran
                parentStudentDashboard.classList.remove('hidden');
                
                const std = data.student;
                
                // Isi tabel detail
                document.getElementById('dash-reg-id').textContent = std.reg_id;
                document.getElementById('dash-nama').textContent = std.nama;
                document.getElementById('dash-nisn-nik').textContent = `${std.nisn} / ${std.nik}`;
                document.getElementById('dash-asal-sekolah').textContent = std.asal_sekolah;
                document.getElementById('dash-jurusan').textContent = `${getMajorFullName(std.jurusan1)} (Utama) / ${getMajorFullName(std.jurusan2)} (Cadangan)`;
                document.getElementById('dash-nilai').textContent = `${std.nilai_rata} (MTK: ${std.nilai_mtk}, IPA: ${std.nilai_ipa}, B.Indo: ${std.nilai_indo})`;
                
                // Status berkas pendaftaran
                const dashStatusPendaftar = document.getElementById('dash-status-pendaftar');
                dashStatusPendaftar.textContent = std.status;
                
                let badgeClass = 'badge-process';
                if (std.status === 'Diterima') badgeClass = 'badge-accept';
                else if (std.status === 'Ditolak') badgeClass = 'badge-reject';
                else if (std.status === 'Cadangan') badgeClass = 'badge-waiting';
                dashStatusPendaftar.className = `badge ${badgeClass}`;

                // Status Pembayaran
                const dashStatusPembayaran = document.getElementById('dash-status-pembayaran');
                dashStatusPembayaran.textContent = std.status_pembayaran;
                
                let payClass = 'badge-process';
                if (std.status_pembayaran === 'Lunas') payClass = 'badge-accept';
                else if (std.status_pembayaran === 'Ditolak') payClass = 'badge-reject';
                dashStatusPembayaran.className = `badge ${payClass}`;
                
                document.getElementById('dash-metode-pembayaran').textContent = std.metode_pembayaran || '-';
                
                const rowBuktiFile = document.getElementById('row-bukti-file');
                const dashBuktiFilename = document.getElementById('dash-bukti-filename');
                if (std.bukti_bayar) {
                    rowBuktiFile.style.display = 'flex';
                    dashBuktiFilename.innerHTML = `<a href="uploads/${std.bukti_bayar}" target="_blank" class="color-primary" style="text-decoration:underline;">Lihat Bukti Terunggah</a>`;
                } else {
                    rowBuktiFile.style.display = 'none';
                }

                // Tampilkan form upload bukti jika status belum bayar atau ditolak
                const uploadPanel = document.getElementById('payment-upload-panel');
                if (std.status_pembayaran === 'Belum Bayar' || std.status_pembayaran === 'Ditolak') {
                    uploadPanel.classList.remove('hidden');
                } else {
                    uploadPanel.classList.add('hidden');
                }

                // Tampilkan aksi cetak kondisional (Hanya jika lunas)
                const printActions = document.getElementById('parent-print-actions');
                if (std.status_pembayaran === 'Lunas') {
                    printActions.classList.remove('hidden');
                    
                    // Conditionally show print kelulusan only if status diterima
                    const btnPrintLulus = document.getElementById('btn-print-lulus-dashboard');
                    if (std.status === 'Diterima') {
                        btnPrintLulus.style.display = 'inline-flex';
                        btnPrintLulus.onclick = () => printAdmissionLetter(std);
                    } else {
                        btnPrintLulus.style.display = 'none';
                    }

                    document.getElementById('btn-print-kartu-dashboard').onclick = () => printRegistrationCard(std);
                } else {
                    printActions.classList.add('hidden');
                }

                // Update visual Progress Tracker Bar
                updateProgressTrackerBar(std);
            }
        } catch (error) {
            console.error('Error loading parent dashboard:', error);
        }
    }

    function updateProgressTrackerBar(student) {
        const step3 = document.getElementById('track-step-3');
        const step4 = document.getElementById('track-step-4');
        const step5 = document.getElementById('track-step-5');
        
        const dot3 = document.getElementById('track-dot-pembayaran');
        const dot4 = document.getElementById('track-dot-berkas');
        const dot5 = document.getElementById('track-dot-status');

        // Reset
        [step3, step4, step5].forEach(s => s.classList.remove('completed', 'active'));
        dot3.textContent = '3';
        dot4.textContent = '4';
        dot5.textContent = '5';

        // Step 3: Pembayaran
        if (student.status_pembayaran === 'Lunas') {
            step3.classList.add('completed');
            dot3.textContent = '✓';
            
            // Step 4: Berkas
            if (student.status !== 'Sedang Diproses') {
                step4.classList.add('completed');
                dot4.textContent = '✓';
                
                // Step 5: Pengumuman kelulusan
                step5.classList.add('active');
            } else {
                step4.classList.add('active');
            }
        } else {
            step3.classList.add('active');
        }
    }

    // Bind logout button inside Parent Dashboard
    document.querySelectorAll('.btn-logout-action').forEach(btn => {
        btn.addEventListener('click', handleLogout);
    });


    // ================= CEK STATUS PORTAL LOGIC =================
    const searchStatusForm = document.getElementById('search-status-form');
    const inputSearchReg = document.getElementById('input-search-reg');
    const statusResultBox = document.getElementById('status-result-box');

    searchStatusForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const searchId = inputSearchReg.value.trim();
        
        statusResultBox.classList.remove('hidden');
        statusResultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        statusResultBox.innerHTML = '<div class="text-center py-4">Mencari data pendaftar...</div>';

        try {
            const response = await fetch(`api.php?action=check_status&query=${encodeURIComponent(searchId)}`);
            const result = await response.json();

            if (!response.ok || result.status !== 'success') {
                statusResultBox.innerHTML = `
                    <div class="card-status-result text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" style="margin-bottom: 16px;"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                        <h3>Data Tidak Ditemukan</h3>
                        <p class="mt-1">Nomor Registrasi atau NISN <strong>"${escapeHtml(searchId)}"</strong> tidak terdaftar dalam sistem PPDB kami.</p>
                    </div>
                `;
                return;
            }

            const student = result.data;
            
            // Validasi apakah sudah bayar Lunas. Jika belum, tidak diizinkan cek kelulusan demi keamanan!
            if (student.status_pembayaran !== 'Lunas') {
                statusResultBox.innerHTML = `
                    <div class="card-status-result text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2" style="margin-bottom: 16px;"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                        <h3>Pembayaran Belum Lunas</h3>
                        <p class="mt-1">Pendaftaran untuk <strong>"${escapeHtml(student.nama)}"</strong> terdaftar, tetapi status kelulusan belum dapat dirilis karena pembayaran biaya formulir (Rp 150.000) belum lunas.</p>
                    </div>
                `;
                return;
            }

            let statusBadgeClass = 'badge-process';
            let statusVerdictClass = 'processing';
            let statusTitle = 'Sedang Ditinjau';
            let statusMessage = 'Berkas pendaftaran Anda sedang dalam proses verifikasi nilai rapor dan administrasi oleh panitia PPDB. Silakan periksa kembali berkala.';
            let showPrintBtn = false;

            if (student.status === 'Diterima') {
                statusBadgeClass = 'badge-accept';
                statusVerdictClass = 'accepted';
                statusTitle = 'Selamat! Anda Dinyatakan LULUS Seleksi';
                statusMessage = `Selamat, Anda dinyatakan diterima sebagai calon siswa baru SMK Bina Nusa pada Kompetensi Keahlian <strong>${getMajorFullName(student.jurusan1)}</strong>. Harap lakukan daftar ulang fisik.`;
                showPrintBtn = true;
            } else if (student.status === 'Ditolak') {
                statusBadgeClass = 'badge-reject';
                statusVerdictClass = 'rejected';
                statusTitle = 'Mohon Maaf, Anda Belum Lolos Seleksi';
                statusMessage = 'Berdasarkan hasil rapat pleno nilai rata-rata rapor Anda belum mencukupi daya tampung kuota kompetensi tahun ini. Tetap semangat!';
            } else if (student.status === 'Cadangan') {
                statusBadgeClass = 'badge-waiting';
                statusVerdictClass = 'waiting';
                statusTitle = 'Status Seleksi: CADANGAN';
                statusMessage = 'Anda berada dalam antrean cadangan siswa baru. Panitia akan menghubungi Anda jika ada kuota kelas yang kosong.';
            }

            statusResultBox.innerHTML = `
                <div class="card-status-result">
                    <div class="status-header-banner">
                        <h4>Informasi Kelulusan Siswa</h4>
                        <span class="badge ${statusBadgeClass}">${student.status}</span>
                    </div>
                    
                    <div class="status-details-grid">
                        <div class="status-detail-cell">
                            <span class="lbl">No. Registrasi</span>
                            <span class="val">${student.reg_id}</span>
                        </div>
                        <div class="status-detail-cell">
                            <span class="lbl">Nama Pendaftar</span>
                            <span class="val">${student.nama}</span>
                        </div>
                        <div class="status-detail-cell">
                            <span class="lbl">Kompetensi Keahlian</span>
                            <span class="val">${getMajorFullName(student.jurusan1)}</span>
                        </div>
                        <div class="status-detail-cell">
                            <span class="lbl">Asal Sekolah</span>
                            <span class="val">${student.asal_sekolah}</span>
                        </div>
                    </div>

                    <div class="status-verdict-box ${statusVerdictClass}">
                        <h5>${statusTitle}</h5>
                        <p>${statusMessage}</p>
                    </div>

                    <div class="text-center">
                        ${showPrintBtn ? `
                            <button class="btn btn-primary" id="btn-print-lulus">
                                Cetak Bukti Penerimaan Kelulusan
                            </button>
                        ` : ''}
                        <button class="btn btn-outline ml-2" id="btn-print-kartu-status">
                            Cetak Kartu Registrasi
                        </button>
                    </div>
                </div>
            `;

            if (showPrintBtn) {
                document.getElementById('btn-print-lulus').onclick = () => {
                    printAdmissionLetter(student);
                };
            }
            document.getElementById('btn-print-kartu-status').onclick = () => {
                printRegistrationCard(student);
            };
        } catch (error) {
            console.error('Error checking status:', error);
            statusResultBox.innerHTML = '<div class="text-center py-4 text-danger">Gagal menghubungi database server!</div>';
        }
    });


    // ================= STAFF / PANITIA MAIN ROUTINGS =================
    const staffAdminPanel = document.getElementById('staff-admin-panel');
    const staffBendaharaPanel = document.getElementById('staff-bendahara-panel');
    const staffKepalaPanel = document.getElementById('staff-kepala-panel');

    const adminSearchInput = document.getElementById('admin-search-input');
    const adminFilterJurusan = document.getElementById('admin-filter-jurusan');
    const adminFilterStatus = document.getElementById('admin-filter-status');
    const adminRegistrantsTable = document.getElementById('admin-registrants-table').getElementsByTagName('tbody')[0];
    const btnAdminResetData = document.getElementById('btn-admin-reset-data');

    const bendaharaSearchInput = document.getElementById('bendahara-search-input');
    const bendaharaFilterStatus = document.getElementById('bendahara-filter-status');
    const bendaharaPaymentsTable = document.getElementById('bendahara-payments-table').getElementsByTagName('tbody')[0];

    async function loadStaffDashboard(session) {
        staffAdminPanel.classList.add('hidden');
        staffBendaharaPanel.classList.add('hidden');
        staffKepalaPanel.classList.add('hidden');

        document.getElementById('admin-session-user').textContent = session.name;
        
        let roleName = 'Staff';
        if (session.role === 'admin') {
            roleName = 'Administrator';
            staffAdminPanel.classList.remove('hidden');
            refreshAdminStats();
        } else if (session.role === 'bendahara') {
            roleName = 'Bendahara Penerima';
            staffBendaharaPanel.classList.remove('hidden');
            refreshBendaharaPayments();
        } else if (session.role === 'kepala_panitia') {
            roleName = 'Kepala Panitia PPDB';
            staffKepalaPanel.classList.remove('hidden');
            refreshKepalaReports();
        }
        
        document.getElementById('staff-session-role').textContent = roleName;
    }


    // ================= ROLE 1: ADMIN CONTROLLER =================

    async function refreshAdminStats() {
        if (staffAdminPanel.classList.contains('hidden')) return;

        try {
            const response = await fetch('api.php?action=admin_get_stats');
            const result = await response.json();
            
            if (response.ok && result.status === 'success') {
                const data = result.data;
                
                document.getElementById('stat-total-pendaftar').textContent = data.counters.total;
                document.getElementById('stat-diterima').textContent = data.counters.diterima;
                document.getElementById('stat-diproses').textContent = data.counters.diproses;
                document.getElementById('stat-ditolak').textContent = data.counters.ditolak;

                renderAdminCharts(data);
                await renderRegistrantsTable();
            }
        } catch (error) {
            console.error('Error refreshing admin stats:', error);
        }
    }

    async function renderRegistrantsTable() {
        const searchVal = adminSearchInput.value.trim();
        const filterJurusan = adminFilterJurusan.value;
        const filterStatus = adminFilterStatus.value;

        adminRegistrantsTable.innerHTML = '<tr><td colspan="7" class="text-center">Memuat data pendaftar...</td></tr>';

        try {
            const url = `api.php?action=admin_get_registrants&search=${encodeURIComponent(searchVal)}&jurusan=${encodeURIComponent(filterJurusan)}&status=${encodeURIComponent(filterStatus)}`;
            const response = await fetch(url);
            const result = await response.json();

            adminRegistrantsTable.innerHTML = '';

            if (!response.ok || result.status !== 'success') {
                adminRegistrantsTable.innerHTML = '<tr><td colspan="7" class="text-center">Gagal memuat data dari database.</td></tr>';
                return;
            }

            const list = result.data;
            if (list.length === 0) {
                adminRegistrantsTable.innerHTML = '<tr><td colspan="7" class="text-center">Tidak ada data pendaftar.</td></tr>';
                return;
            }

            list.forEach(student => {
                const row = adminRegistrantsTable.insertRow();
                let badgeClass = 'badge-process';
                if (student.status === 'Diterima') badgeClass = 'badge-accept';
                else if (student.status === 'Ditolak') badgeClass = 'badge-reject';
                else if (student.status === 'Cadangan') badgeClass = 'badge-waiting';

                row.innerHTML = `
                    <td><strong>${student.reg_id}</strong></td>
                    <td>${escapeHtml(student.nama)}</td>
                    <td>${escapeHtml(student.asal_sekolah)}</td>
                    <td><span class="color-primary" style="font-weight:600;">${student.jurusan1}</span></td>
                    <td><strong>${student.nilai_rata}</strong></td>
                    <td><span class="badge ${badgeClass}">${student.status}</span></td>
                    <td>
                        <div class="action-btns-cell">
                            <button class="btn-icon btn-view" title="Detail Siswa" data-id="${student.reg_id}">👁</button>
                            <button class="btn-icon btn-accept" title="Terima Siswa" data-id="${student.reg_id}">✓</button>
                            <button class="btn-icon btn-wait" title="Cadangkan" data-id="${student.reg_id}">⏳</button>
                            <button class="btn-icon btn-reject" title="Tolak Siswa" data-id="${student.reg_id}">✗</button>
                            <button class="btn-icon btn-delete" title="Hapus Permanen" data-id="${student.reg_id}">🗑</button>
                        </div>
                    </td>
                `;
            });

            attachAdminTableListeners();
        } catch (error) {
            console.error('Error rendering registrants table:', error);
            adminRegistrantsTable.innerHTML = '<tr><td colspan="7" class="text-center">Kesalahan koneksi database.</td></tr>';
        }
    }

    function attachAdminTableListeners() {
        document.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', () => showStudentDetailModal(btn.getAttribute('data-id')));
        });
        document.querySelectorAll('.btn-accept').forEach(btn => {
            btn.addEventListener('click', () => updateStudentStatus(btn.getAttribute('data-id'), 'Diterima'));
        });
        document.querySelectorAll('.btn-wait').forEach(btn => {
            btn.addEventListener('click', () => updateStudentStatus(btn.getAttribute('data-id'), 'Cadangan'));
        });
        document.querySelectorAll('.btn-reject').forEach(btn => {
            btn.addEventListener('click', () => updateStudentStatus(btn.getAttribute('data-id'), 'Ditolak'));
        });
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => deleteStudentEntry(btn.getAttribute('data-id')));
        });
    }

    async function updateStudentStatus(regId, newStatus) {
        try {
            const response = await fetch('api.php?action=admin_update_status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ regId, status: newStatus })
            });
            const result = await response.json();
            if (response.ok && result.status === 'success') {
                refreshAdminStats();
            } else {
                alert(result.message || 'Gagal mengubah status.');
            }
        } catch (error) {
            console.error('Update status error:', error);
        }
    }

    async function deleteStudentEntry(regId) {
        if (confirm(`Apakah Anda yakin ingin menghapus data "${regId}" secara permanen?`)) {
            try {
                const response = await fetch('api.php?action=admin_delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ regId })
                });
                const result = await response.json();
                if (response.ok && result.status === 'success') {
                    refreshAdminStats();
                } else {
                    alert(result.message || 'Gagal menghapus.');
                }
            } catch (error) {
                console.error('Delete error:', error);
            }
        }
    }

    function renderAdminCharts(data) {
        const majorChart = document.getElementById('major-dist-chart');
        const majorCounts = data.majors;
        const maxVal = Math.max(...Object.values(majorCounts), 1);

        majorChart.innerHTML = '';
        Object.keys(majorCounts).forEach(code => {
            const count = majorCounts[code];
            const percentWidth = (count / maxVal) * 100;
            const row = document.createElement('div');
            row.className = 'chart-bar-item';
            row.innerHTML = `
                <div class="chart-bar-info">
                    <span>${getMajorFullName(code)}</span>
                    <span>${count} Siswa</span>
                </div>
                <div class="chart-bar-bg">
                    <div class="chart-bar-fill" style="width: ${percentWidth}%"></div>
                </div>
            `;
            majorChart.appendChild(row);
        });

        const schoolChart = document.getElementById('school-dist-chart');
        const sortedSchools = data.schools;
        const maxSchVal = sortedSchools.length > 0 ? Math.max(...sortedSchools.map(s => s.count), 1) : 1;

        schoolChart.innerHTML = '';
        if (sortedSchools.length === 0) {
            schoolChart.innerHTML = '<p class="text-center py-4">Belum ada asal sekolah pendaftar.</p>';
            return;
        }

        sortedSchools.forEach(sch => {
            const percentWidth = (sch.count / maxSchVal) * 100;
            const row = document.createElement('div');
            row.className = 'chart-bar-item';
            row.innerHTML = `
                <div class="chart-bar-info">
                    <span>${escapeHtml(sch.name)}</span>
                    <span>${sch.count} Siswa</span>
                </div>
                <div class="chart-bar-bg">
                    <div class="chart-bar-fill" style="width: ${percentWidth}%"></div>
                </div>
            `;
            schoolChart.appendChild(row);
        });
    }

    adminSearchInput.addEventListener('input', renderRegistrantsTable);
    adminFilterJurusan.addEventListener('change', renderRegistrantsTable);
    adminFilterStatus.addEventListener('change', renderRegistrantsTable);

    btnAdminResetData.addEventListener('click', async () => {
        if (confirm('Apakah Anda yakin ingin mereset seluruh data simulasi database ke data default? (Semua file upload struk pembayaran akan terhapus)')) {
            try {
                const response = await fetch('api.php?action=admin_reset', { method: 'POST' });
                const result = await response.json();
                if (response.ok && result.status === 'success') {
                    alert(result.message);
                    refreshAdminStats();
                } else {
                    alert('Gagal mereset data.');
                }
            } catch (error) {
                console.error('Reset error:', error);
            }
        }
    });


    // ================= ROLE 2: BENDAHARA CONTROLLER =================

    async function refreshBendaharaPayments() {
        if (staffBendaharaPanel.classList.contains('hidden')) return;

        const searchVal = bendaharaSearchInput.value.trim();
        const filterStatus = bendaharaFilterStatus.value;

        bendaharaPaymentsTable.innerHTML = '<tr><td colspan="7" class="text-center">Memuat antrean pembayaran...</td></tr>';

        try {
            const url = `api.php?action=bendahara_get_payments&search=${encodeURIComponent(searchVal)}&status_pembayaran=${encodeURIComponent(filterStatus)}`;
            const response = await fetch(url);
            const result = await response.json();

            bendaharaPaymentsTable.innerHTML = '';

            if (!response.ok || result.status !== 'success') {
                bendaharaPaymentsTable.innerHTML = '<tr><td colspan="7" class="text-center">Gagal memuat data pembayaran.</td></tr>';
                return;
            }

            const list = result.data;
            if (list.length === 0) {
                bendaharaPaymentsTable.innerHTML = '<tr><td colspan="7" class="text-center">Tidak ada transaksi pembayaran.</td></tr>';
                return;
            }

            list.forEach(item => {
                const row = bendaharaPaymentsTable.insertRow();
                let badgeClass = 'badge-process';
                if (item.status_pembayaran === 'Lunas') badgeClass = 'badge-accept';
                else if (item.status_pembayaran === 'Ditolak') badgeClass = 'badge-reject';

                const checkBtnHtml = item.bukti_bayar 
                    ? `<button class="btn btn-outline btn-check-receipt" data-id="${item.reg_id}" data-file="${item.bukti_bayar}">Periksa Struk</button>` 
                    : '<span class="text-muted">Belum Upload</span>';

                row.innerHTML = `
                    <td><strong>${item.reg_id}</strong></td>
                    <td>${escapeHtml(item.nama)}</td>
                    <td><span class="badge badge-accept">${item.metode_pembayaran}</span></td>
                    <td>${formatDateIndo(item.waktu_bayar)}</td>
                    <td><span class="badge ${badgeClass}">${item.status_pembayaran}</span></td>
                    <td>${checkBtnHtml}</td>
                    <td>
                        <div class="action-btns-cell">
                            <button class="btn-icon btn-accept-pay" title="Setujui Lunas" data-id="${item.reg_id}">✓</button>
                            <button class="btn-icon btn-reject-pay" title="Tolak Bukti" data-id="${item.reg_id}">✗</button>
                        </div>
                    </td>
                `;
            });

            attachBendaharaListeners();
        } catch (error) {
            console.error('Error loading payments:', error);
            bendaharaPaymentsTable.innerHTML = '<tr><td colspan="7" class="text-center">Kesalahan koneksi database.</td></tr>';
        }
    }

    function attachBendaharaListeners() {
        // Klik periksa bukti transfer
        document.querySelectorAll('.btn-check-receipt').forEach(btn => {
            btn.addEventListener('click', () => {
                const filename = btn.getAttribute('data-file');
                const regId = btn.getAttribute('data-id');
                showReceiptModal(regId, filename);
            });
        });

        // Tombol persetujuan lunas langsung di tabel
        document.querySelectorAll('.btn-accept-pay').forEach(btn => {
            btn.addEventListener('click', () => verifyPayment(btn.getAttribute('data-id'), 'Lunas'));
        });
        document.querySelectorAll('.btn-reject-pay').forEach(btn => {
            btn.addEventListener('click', () => verifyPayment(btn.getAttribute('data-id'), 'Ditolak'));
        });
    }

    const paymentReceiptModal = document.getElementById('payment-receipt-modal');
    const receiptModalBackdrop = document.getElementById('receipt-modal-backdrop-trigger');
    const btnCloseReceiptModal = document.getElementById('btn-close-receipt-modal');
    const receiptModalBody = document.getElementById('payment-receipt-modal-body');
    const btnVerifyApprove = document.getElementById('btn-verify-approve');
    const btnVerifyReject = document.getElementById('btn-verify-reject');

    let activeVerifyRegId = '';

    function showReceiptModal(regId, filename) {
        activeVerifyRegId = regId;
        receiptModalBody.innerHTML = `
            <p class="mb-2">Mengevaluasi bukti bayar untuk pendaftar <strong>${regId}</strong>:</p>
            <img src="uploads/${filename}" alt="Bukti Transfer ${regId}">
        `;
        paymentReceiptModal.classList.remove('hidden');
    }

    function closeReceiptModal() {
        paymentReceiptModal.classList.add('hidden');
        activeVerifyRegId = '';
    }

    [receiptModalBackdrop, btnCloseReceiptModal].forEach(el => {
        el.addEventListener('click', closeReceiptModal);
    });

    btnVerifyApprove.addEventListener('click', () => {
        if (activeVerifyRegId) {
            verifyPayment(activeVerifyRegId, 'Lunas');
            closeReceiptModal();
        }
    });

    btnVerifyReject.addEventListener('click', () => {
        if (activeVerifyRegId) {
            verifyPayment(activeVerifyRegId, 'Ditolak');
            closeReceiptModal();
        }
    });

    async function verifyPayment(regId, status) {
        try {
            const response = await fetch('api.php?action=bendahara_verify_payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ regId, status_pembayaran: status })
            });
            const result = await response.json();
            if (response.ok && result.status === 'success') {
                refreshBendaharaPayments();
            } else {
                alert('Gagal memperbarui status pembayaran.');
            }
        } catch (error) {
            console.error('Verify payment error:', error);
        }
    }

    bendaharaSearchInput.addEventListener('input', refreshBendaharaPayments);
    bendaharaFilterStatus.addEventListener('change', refreshBendaharaPayments);


    // ================= ROLE 3: KEPALA PANITIA CONTROLLER =================

    async function refreshKepalaReports() {
        if (staffKepalaPanel.classList.contains('hidden')) return;

        try {
            const response = await fetch('api.php?action=kepala_get_reports');
            const result = await response.json();

            if (response.ok && result.status === 'success') {
                const data = result.data;

                // Update counters
                document.getElementById('kepala-total-siswa').textContent = data.total_pendaftar;
                document.getElementById('kepala-total-lunas').textContent = data.pendapatan.total_lunas;
                document.getElementById('kepala-total-revenue').textContent = formatRupiah(data.pendapatan.nominal_lunas);
                document.getElementById('kepala-pending-verifikasi').textContent = data.pendapatan.menunggu_verifikasi;

                // Render dynamic progress bars & charts
                renderKepalaReportBars(data);
            }
        } catch (error) {
            console.error('Error loading kepala reports:', error);
        }
    }

    function renderKepalaReportBars(data) {
        const acceptContainer = document.getElementById('kepala-accept-bars');
        const acc = data.penerimaan;
        const total = data.total_pendaftar || 1;
        
        const acceptedPct = ((acc.diterima / total) * 100).toFixed(1);
        const processPct = ((acc.proses / total) * 100).toFixed(1);
        const waitingPct = ((acc.cadangan / total) * 100).toFixed(1);
        const rejectedPct = ((acc.ditolak / total) * 100).toFixed(1);

        acceptContainer.innerHTML = `
            <div class="percentage-bar-row">
                <div class="bar-row-info">
                    <span>Diterima (${acc.diterima} siswa)</span>
                    <span>${acceptedPct}%</span>
                </div>
                <div class="bar-row-bg">
                    <div class="bar-row-fill success" style="width: ${acceptedPct}%"></div>
                </div>
            </div>
            <div class="percentage-bar-row">
                <div class="bar-row-info">
                    <span>Sedang Diproses (${acc.proses} siswa)</span>
                    <span>${processPct}%</span>
                </div>
                <div class="bar-row-bg">
                    <div class="bar-row-fill warning" style="width: ${processPct}%"></div>
                </div>
            </div>
            <div class="percentage-bar-row">
                <div class="bar-row-info">
                    <span>Cadangan (${acc.cadangan} siswa)</span>
                    <span>${waitingPct}%</span>
                </div>
                <div class="bar-row-bg">
                    <div class="bar-row-fill info" style="width: ${waitingPct}%"></div>
                </div>
            </div>
            <div class="percentage-bar-row">
                <div class="bar-row-info">
                    <span>Ditolak (${acc.ditolak} siswa)</span>
                    <span>${rejectedPct}%</span>
                </div>
                <div class="bar-row-bg">
                    <div class="bar-row-fill danger" style="width: ${rejectedPct}%"></div>
                </div>
            </div>
        `;

        const payContainer = document.getElementById('kepala-payment-bars');
        const pay = data.pendapatan;
        
        const paidPct = ((pay.total_lunas / total) * 100).toFixed(1);
        const verifPct = ((pay.menunggu_verifikasi / total) * 100).toFixed(1);
        const unpaidPct = ((pay.belum_bayar / total) * 100).toFixed(1);
        const payRejectPct = ((pay.ditolak / total) * 100).toFixed(1);

        payContainer.innerHTML = `
            <div class="percentage-bar-row">
                <div class="bar-row-info">
                    <span>Lunas (${pay.total_lunas} siswa)</span>
                    <span>${paidPct}%</span>
                </div>
                <div class="bar-row-bg">
                    <div class="bar-row-fill success" style="width: ${paidPct}%"></div>
                </div>
            </div>
            <div class="percentage-bar-row">
                <div class="bar-row-info">
                    <span>Menunggu Verifikasi (${pay.menunggu_verifikasi} siswa)</span>
                    <span>${verifPct}%</span>
                </div>
                <div class="bar-row-bg">
                    <div class="bar-row-fill warning" style="width: ${verifPct}%"></div>
                </div>
            </div>
            <div class="percentage-bar-row">
                <div class="bar-row-info">
                    <span>Belum Bayar (${pay.belum_bayar} siswa)</span>
                    <span>${unpaidPct}%</span>
                </div>
                <div class="bar-row-bg">
                    <div class="bar-row-fill info" style="width: ${unpaidPct}%"></div>
                </div>
            </div>
            <div class="percentage-bar-row">
                <div class="bar-row-info">
                    <span>Pembayaran Ditolak (${pay.ditolak} siswa)</span>
                    <span>${payRejectPct}%</span>
                </div>
                <div class="bar-row-bg">
                    <div class="bar-row-fill danger" style="width: ${payRejectPct}%"></div>
                </div>
            </div>
        `;

        const majorsReportBody = document.getElementById('kepala-majors-report-table').getElementsByTagName('tbody')[0];
        majorsReportBody.innerHTML = '';
        
        let totalPeminat = 0;
        Object.keys(data.jurusan).forEach(k => totalPeminat += data.jurusan[k]);

        Object.keys(data.jurusan).forEach(key => {
            const count = data.jurusan[key];
            const pct = totalPeminat > 0 ? ((count / totalPeminat) * 100).toFixed(1) : '0.0';

            const row = majorsReportBody.insertRow();
            row.innerHTML = `
                <td><strong>${getMajorFullName(key)}</strong></td>
                <td>${count} Siswa</td>
                <td>${count} Siswa</td>
                <td><strong class="color-primary">${pct}%</strong></td>
            `;
        });
    }


    // ================= DETAIL STUDENT MODAL FOR ADMIN =================
    const studentDetailModal = document.getElementById('student-detail-modal');
    const modalBackdrop = document.getElementById('modal-backdrop-trigger');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnModalCloseAction = document.getElementById('btn-modal-close-action');
    const modalBody = document.getElementById('student-detail-modal-body');

    async function showStudentDetailModal(regId) {
        modalBody.innerHTML = '<div class="text-center py-4">Memuat detail siswa...</div>';
        studentDetailModal.classList.remove('hidden');

        try {
            const response = await fetch(`api.php?action=check_status&query=${regId}`);
            const result = await response.json();

            if (!response.ok || result.status !== 'success') {
                modalBody.innerHTML = '<div class="text-center py-4 text-danger">Gagal memuat detail pendaftar.</div>';
                return;
            }

            const student = result.data;

            modalBody.innerHTML = `
                <div class="modal-detail-group">
                    <h4>Informasi Berkas & Pembayaran</h4>
                    <div class="modal-detail-grid">
                        <div class="modal-detail-item"><strong>Nomor Registrasi:</strong> <span>${student.reg_id}</span></div>
                        <div class="modal-detail-item"><strong>Status Pendaftaran:</strong> <span>${student.status}</span></div>
                        <div class="modal-detail-item"><strong>Metode Pembayaran:</strong> <span>${student.metode_pembayaran || '-'}</span></div>
                        <div class="modal-detail-item"><strong>Status Pembayaran:</strong> <span>${student.status_pembayaran}</span></div>
                    </div>
                </div>
                
                <div class="modal-detail-group">
                    <h4>Data Pribadi Calon Siswa</h4>
                    <div class="modal-detail-grid">
                        <div class="modal-detail-item"><strong>Nama Lengkap:</strong> <span>${escapeHtml(student.nama)}</span></div>
                        <div class="modal-detail-item"><strong>NISN / NIK:</strong> <span>${escapeHtml(student.nisn)} / ${escapeHtml(student.nik)}</span></div>
                        <div class="modal-detail-item"><strong>Tempat/Tgl Lahir:</strong> <span>${escapeHtml(student.tempat_lahir)}, ${formatDateIndo(student.tanggal_lahir)}</span></div>
                        <div class="modal-detail-item"><strong>Jenis Kelamin / Agama:</strong> <span>${escapeHtml(student.jenis_kelamin)} / ${escapeHtml(student.agama)}</span></div>
                        <div class="modal-detail-item"><strong>No. HP / WA:</strong> <span>${escapeHtml(student.no_hp)}</span></div>
                        <div class="modal-detail-item"><strong>Email:</strong> <span>${escapeHtml(student.email)}</span></div>
                        <div class="modal-detail-item" style="grid-column: span 2;"><strong>Alamat Rumah:</strong> <span>${escapeHtml(student.alamat)}</span></div>
                    </div>
                </div>

                <div class="modal-detail-group">
                    <h4>Data Orang Tua / Wali</h4>
                    <div class="modal-detail-grid">
                        <div class="modal-detail-item"><strong>Nama Ayah / Pekerjaan:</strong> <span>${escapeHtml(student.nama_ayah)} / ${escapeHtml(student.pekerjaan_ayah)}</span></div>
                        <div class="modal-detail-item"><strong>Nama Ibu / Pekerjaan:</strong> <span>${escapeHtml(student.nama_ibu)} / ${escapeHtml(student.pekerjaan_ibu)}</span></div>
                        <div class="modal-detail-item"><strong>No. HP Orang Tua:</strong> <span>${escapeHtml(student.no_hp_ortu)}</span></div>
                        <div class="modal-detail-item"><strong>Total Penghasilan:</strong> <span>${escapeHtml(student.penghasilan_ortu)}</span></div>
                    </div>
                </div>

                <div class="modal-detail-group">
                    <h4>Riwayat Akademik & Nilai Rapor</h4>
                    <div class="modal-detail-grid">
                        <div class="modal-detail-item"><strong>Asal Sekolah / Thn Lulus:</strong> <span>${escapeHtml(student.asal_sekolah)} (${student.tahun_lulus})</span></div>
                        <div class="modal-detail-item"><strong>Rata-Rata Nilai Rapor:</strong> <span class="color-primary" style="font-size:1.05rem; font-weight:800;">${student.nilai_rata}</span></div>
                        <div class="modal-detail-item"><strong>Matematika:</strong> <span>${student.nilai_mtk}</span></div>
                        <div class="modal-detail-item"><strong>IPA:</strong> <span>${student.nilai_ipa}</span></div>
                        <div class="modal-detail-item"><strong>Bahasa Indonesia:</strong> <span>${student.nilai_indo}</span></div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error fetching detail modal:', error);
            modalBody.innerHTML = '<div class="text-center py-4 text-danger">Koneksi database gagal.</div>';
        }
    }

    function closeModal() {
        studentDetailModal.classList.add('hidden');
    }

    [modalBackdrop, btnCloseModal, btnModalCloseAction].forEach(el => {
        el.addEventListener('click', closeModal);
    });


    // ================= DYNAMIC REGISTRATION CARD PRINT GENERATOR =================
    const printableCardArea = document.getElementById('printable-card-area');

    function printRegistrationCard(student) {
        const dateFormatted = formatDateIndo(student.tanggal_daftar || new Date().toISOString());
        const birthDateFormatted = formatDateIndo(student.tanggal_lahir);

        printableCardArea.innerHTML = `
            <div class="print-card-box">
                <div class="print-card-header">
                    <div class="print-logo-box">SMK</div>
                    <div class="print-header-text">
                        <h2>SMK BINA NUSA</h2>
                        <p>Alamat: Jl. Raya Pendidikan No. 45, Jawa Barat • Telp: (021) 555-0199</p>
                    </div>
                </div>
                <div class="print-card-title">KARTU BUKTI PENDAFTARAN PPDB TA 2026/2027</div>
                
                <table class="print-data-table">
                    <tr>
                        <td class="lbl">Nomor Registrasi</td>
                        <td class="val">: <strong>${student.reg_id}</strong></td>
                    </tr>
                    <tr>
                        <td class="lbl">Nama Lengkap</td>
                        <td class="val">: ${escapeHtml(student.nama)}</td>
                    </tr>
                    <tr>
                        <td class="lbl">NISN</td>
                        <td class="val">: ${escapeHtml(student.nisn)}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Tempat/Tanggal Lahir</td>
                        <td class="val">: ${escapeHtml(student.tempat_lahir)}, ${birthDateFormatted}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Jenis Kelamin</td>
                        <td class="val">: ${escapeHtml(student.jenis_kelamin)}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Asal Sekolah</td>
                        <td class="val">: ${escapeHtml(student.asal_sekolah)}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Jurusan Pilihan 1</td>
                        <td class="val">: ${getMajorFullName(student.jurusan1)}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Jurusan Pilihan 2</td>
                        <td class="val">: ${getMajorFullName(student.jurusan2)}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Rata-rata Nilai Rapor</td>
                        <td class="val">: ${student.nilai_rata} (Matematika: ${student.nilai_mtk}, IPA: ${student.nilai_ipa}, B. Indo: ${student.nilai_indo})</td>
                    </tr>
                    <tr>
                        <td class="lbl">Tanggal Pendaftaran</td>
                        <td class="val">: ${dateFormatted}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Status Pembayaran</td>
                        <td class="val">: <strong>${student.status_pembayaran}</strong></td>
                    </tr>
                </table>

                <div class="print-footer-grid">
                    <div class="print-signature">
                        <p>Pendaftar,</p>
                        <div class="print-signature-space"></div>
                        <p class="print-signature-name">${escapeHtml(student.nama)}</p>
                    </div>
                    <div class="print-signature">
                        <p>Panitia PPDB SMK Bina Nusa,</p>
                        <div class="print-signature-space"></div>
                        <p class="print-signature-name">Drs. H. Mulyadi, M.Pd</p>
                        <p><small>NIP. 19741203 200003 1 002</small></p>
                    </div>
                </div>
            </div>
        `;

        window.print();
    }

    function printAdmissionLetter(student) {
        const dateFormatted = formatDateIndo(new Date().toISOString());

        printableCardArea.innerHTML = `
            <div class="print-card-box" style="border: 2px solid #000; padding: 40px; font-family: 'Times New Roman', serif;">
                <div class="print-card-header" style="border-bottom: 4px double #000; padding-bottom: 20px;">
                    <div class="print-logo-box" style="border: 3px solid #000; width: 60px; height: 60px; font-weight: bold; font-size: 1.8rem;">SMK</div>
                    <div class="print-header-text" style="text-align: center;">
                        <h1 style="font-size: 1.5rem; margin: 0; font-weight: bold;">YAYASAN PENDIDIKAN BINA NUSA</h1>
                        <h2 style="font-size: 1.3rem; margin: 5px 0 0 0; font-weight: bold; letter-spacing: 1px;">SMK BINA NUSA</h2>
                        <p style="font-size: 0.85rem; margin: 5px 0 0 0; font-style: italic;">Akreditasi A • Jl. Raya Pendidikan No. 45, Komplek Edukasi, Jawa Barat</p>
                    </div>
                </div>
                
                <div style="text-align: right; font-size: 0.95rem; margin-bottom: 20px;">Jawa Barat, ${dateFormatted}</div>
                
                <table style="width: 100%; font-size: 0.95rem; margin-bottom: 24px;">
                    <tr><td style="width: 15%;">Nomor</td><td>: 421.5/124/SMK-BN/VI/2026</td></tr>
                    <tr><td>Hal</td><td>: <strong>Pemberitahuan Hasil Seleksi PPDB TA 2026/2027</strong></td></tr>
                </table>

                <p style="font-size: 0.95rem; line-height: 1.5; margin-bottom: 16px;">Kepada Yth.<br><strong>Orang Tua / Wali Calon Siswa Baru</strong><br>di Tempat</p>
                <p style="font-size: 0.95rem; line-height: 1.5; text-align: justify; margin-bottom: 16px;">Dengan hormat, berdasarkan hasil verifikasi berkas nilai rapor, portofolio akademik, dan evaluasi administrasi yang dilaksanakan oleh panitia seleksi PPDB SMK Bina Nusa, dengan ini menetapkan bahwa:</p>

                <table style="width: 90%; margin: 0 auto 20px auto; font-size: 0.95rem; border-collapse: collapse;">
                    <tr><td style="width: 35%; padding: 6px 0; font-weight: bold;">Nama Lengkap</td><td style="padding: 6px 0;">: ${escapeHtml(student.nama)}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: bold;">Nomor Registrasi</td><td style="padding: 6px 0;">: <strong>${student.reg_id}</strong></td></tr>
                    <tr><td style="padding: 6px 0; font-weight: bold;">NISN</td><td style="padding: 6px 0;">: ${escapeHtml(student.nisn)}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: bold;">Kompetensi Keahlian</td><td style="padding: 6px 0; font-weight: bold;">: ${getMajorFullName(student.jurusan1)}</td></tr>
                </table>

                <p style="font-size: 0.95rem; line-height: 1.5; text-align: justify; margin-bottom: 24px;">Dinyatakan: <span style="font-size: 1.1rem; font-weight: bold; border: 2px solid #000; padding: 4px 12px; display: inline-block;">LULUS / DITERIMA</span></p>
                <p style="font-size: 0.95rem; line-height: 1.5; text-align: justify; margin-bottom: 24px;">Bagi calon siswa yang dinyatakan diterima wajib melakukan proses <strong>Daftar Ulang Fisik</strong> di Sekretariat PPDB SMK Bina Nusa pada tanggal 5 - 10 Juni 2026. Keterlambatan melakukan daftar ulang dianggap mengundurkan diri.</p>
                <p style="font-size: 0.95rem; line-height: 1.5; margin-bottom: 40px;">Demikian pemberitahuan ini kami sampaikan. Terima kasih.</p>

                <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; font-size: 0.95rem;">
                    <div></div>
                    <div style="text-align: center;">
                        <p>Kepala SMK Bina Nusa,</p>
                        <div style="height: 70px;"></div>
                        <p style="font-weight: bold; text-decoration: underline;">Drs. H. Mulyadi, M.Pd</p>
                        <p style="margin: 4px 0 0 0; font-size: 0.85rem;">NIP. 19741203 200003 1 002</p>
                    </div>
                </div>
            </div>
        `;

        window.print();
    }


    // ================= INITIAL PAGE TRIGGER =================
    // Cek status login saat pertama kali memuat halaman
    checkCurrentSession();

    // ================= DARK MODE TOGGLE CONTROLLER =================
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const moonIcon = themeToggleBtn.querySelector('.icon-moon');
    const sunIcon = themeToggleBtn.querySelector('.icon-sun');

    // Load saved theme or system default
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark-theme');
        moonIcon.classList.add('hidden');
        sunIcon.classList.remove('hidden');
    } else {
        document.body.classList.remove('dark-theme');
        moonIcon.classList.remove('hidden');
        sunIcon.classList.add('hidden');
    }

    // Toggle click event listener
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        moonIcon.classList.toggle('hidden', isDark);
        sunIcon.classList.toggle('hidden', !isDark);
    });
});
