const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Import koneksi database (Pastikan path-nya sesuai)
const db = require('../config/db'); 

// Route untuk registrasi
router.post('/register', authController.register);

// Route untuk login
router.post('/login', authController.login);

// ==========================================================
// ENDPOINT API: UPDATE PROFIL (Menggunakan Async/Await)
// ==========================================================
router.put('/update-profile', async (req, res) => {
    // Menangkap data JSON yang dikirim dari Frontend
    const { id, nama, no_telepon, email } = req.body;

    // Validasi: Pastikan ID tidak kosong
    if (!id) {
        return res.status(400).json({ 
            status: "error", 
            message: "ID User tidak valid atau tidak ditemukan!" 
        });
    }

    // Siapkan Query SQL
    const query = 'UPDATE users SET nama = ?, no_telepon = ?, email = ? WHERE id = ?';
    
    try {
        // Karena db.js menggunakan db.promise(), pakai 'await'
        const [result] = await db.query(query, [nama, no_telepon, email, id]);
        
        // Cek apakah ada baris data yang berhasil diubah
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                status: "error", 
                message: "User dengan ID tersebut tidak ditemukan di database." 
            });
        }

        // Jika berhasil
        res.status(200).json({ 
            status: "success", 
            message: "Profil pengguna berhasil diperbarui di database!" 
        });

    } catch (error) {
        // Tangkap error jika query database gagal
        console.error('Error saat update profil:', error);
        res.status(500).json({ 
            status: "error", 
            message: "Terjadi kesalahan pada server database." 
        });
    }
});

// ==========================================================
// ENDPOINT API: HAPUS AKUN PERMANEN
// ==========================================================
router.delete('/delete-account/:id', async (req, res) => {
    // Menangkap ID dari URL parameter
    const userId = req.params.id;

    if (!userId) {
        return res.status(400).json({ 
            status: "error", 
            message: "ID User tidak valid!" 
        });
    }

    try {
        // Hapus pengguna dari tabel 'users' berdasarkan ID
        const query = 'DELETE FROM users WHERE id = ?';
        const [result] = await db.query(query, [userId]);
        
        // Cek jika ID tidak ditemukan di tabel
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                status: "error", 
                message: "Akun sudah tidak ada di database." 
            });
        }

        // Sukses dihapus
        res.status(200).json({ 
            status: "success", 
            message: "Akun berhasil dihapus permanen!" 
        });

    } catch (error) {
        console.error('Error saat hapus akun:', error);
        res.status(500).json({ 
            status: "error", 
            message: "Terjadi kesalahan pada server saat menghapus akun." 
        });
    }
});

// ==========================================================
// ENDPOINT API: ATUR PIN KE TABEL USER_PINS
// ==========================================================
router.put('/set-pin', async (req, res) => {
    const { id, pin } = req.body; 

    if (!id || !pin) {
        return res.status(400).json({ status: "error", message: "ID atau PIN tidak valid!" });
    }

    try {
        const query = `
            INSERT INTO user_pins (user_id, pin) 
            VALUES (?, ?) 
            ON DUPLICATE KEY UPDATE pin = ?
        `;
        await db.query(query, [id, pin, pin]);
        res.status(200).json({ status: "success", message: "PIN berhasil disimpan secara permanen di tabel terpisah!" });
    } catch (error) {
        console.error('Error saat simpan PIN:', error);
        res.status(500).json({ status: "error", message: "Terjadi kesalahan pada server database." });
    }
});

// ==========================================================
// ENDPOINT API: VERIFIKASI PIN DARI TABEL USER_PINS
// ==========================================================
router.post('/verify-pin', async (req, res) => {
    const { user_id, pin } = req.body;

    try {
        const query = "SELECT pin FROM user_pins WHERE user_id = ?";
        const [rows] = await db.query(query, [user_id]);

        if (rows.length === 0) {
            return res.status(404).json({ status: "error", message: "PIN belum diatur untuk akun ini!" });
        }

        if (rows[0].pin === pin) {
            res.status(200).json({ status: "success", message: "PIN Benar!" });
        } else {
            res.status(401).json({ status: "wrong", message: "PIN yang Anda masukkan salah!" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================================
// ENDPOINT API: OAUTH (LOGIN / REGISTER GOOGLE & FACEBOOK)
// ==========================================================
router.post('/oauth', async (req, res) => {
    const { nama, email, provider, provider_id, picture } = req.body;

    try {
        // 1. Cek apakah pengguna dengan email ini sudah terdaftar di Database
        const checkQuery = "SELECT * FROM users WHERE email = ?";
        const [users] = await db.query(checkQuery, [email]);

        if (users.length > 0) {
            // 2A. JIKA SUDAH ADA (Otomatis lakukan Login)
            const user = users[0];
            return res.status(200).json({ 
                status: 'success', 
                user: { 
                    id: user.id, 
                    nama: user.nama, 
                    email: user.email, 
                    no_telepon: user.no_telepon, 
                    role: user.role
                } 
            });
        } else {
            // 2B. JIKA BELUM ADA (Otomatis buat akun baru / Register)
            const defaultTelepon = "-"; 
            const defaultRole = "Pengguna";
            const dummyPassword = "OAUTH_LOGIN_" + provider_id; 

            // Disesuaikan dengan kolom yang ada di tabel
            const insertQuery = "INSERT INTO users (nama, email, no_telepon, password, role) VALUES (?, ?, ?, ?, ?)";
            
            const [insertResult] = await db.query(insertQuery, [
                nama, email, defaultTelepon, dummyPassword, defaultRole
            ]);

            return res.status(200).json({
                status: 'success',
                user: { 
                    id: insertResult.insertId, 
                    nama: nama, 
                    email: email, 
                    no_telepon: defaultTelepon, 
                    role: defaultRole
                }
            });
        }
    } catch (error) {
        // CEK TERMINAL VS CODE UNTUK MELIHAT PESAN ERROR ASLI DARI MYSQL
        console.error('Error saat OAuth:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Terjadi kesalahan pada server database.' 
        });
    }
});

// Eksport router (WAJIB di paling bawah)
module.exports = router;