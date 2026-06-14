const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Sesuaikan path dengan lokasi db.js kamu

// 1. Ambil semua kendaraan milik user tertentu
// URL Asli: GET /api/kendaraan/:user_id
router.get('/:user_id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM kendaraan WHERE user_id = ?', [req.params.user_id]);
        res.json({ status: "success", data: rows });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// 2. Ambil detail satu kendaraan
// URL Asli: GET /api/kendaraan/detail/:id
router.get('/detail/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM kendaraan WHERE id = ?', [req.params.id]);
        res.json({ status: "success", data: rows[0] });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// 3. Tambah kendaraan baru
// URL Asli: POST /api/kendaraan
router.post('/', async (req, res) => {
    const { user_id, jenis, plat, merek, model, tahun, warna, mesin, rangka } = req.body;
    try {
        // Cek apakah ini kendaraan pertama (jika ya, otomatis jadikan utama)
        const [existing] = await db.query('SELECT COUNT(*) as count FROM kendaraan WHERE user_id = ?', [user_id]);
        const isUtama = existing[0].count === 0 ? true : false;

        const query = `INSERT INTO kendaraan (user_id, jenis, plat, merek, model, tahun, warna, mesin, rangka, is_utama) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await db.query(query, [user_id, jenis, plat, merek, model, tahun, warna, mesin, rangka, isUtama]);
        res.json({ status: "success", message: "Kendaraan ditambahkan!" });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// 4. Update kendaraan
// URL Asli: PUT /api/kendaraan/:id
router.put('/:id', async (req, res) => {
    const { jenis, plat, merek, model, tahun, warna, mesin, rangka } = req.body;
    try {
        const query = `UPDATE kendaraan SET jenis=?, plat=?, merek=?, model=?, tahun=?, warna=?, mesin=?, rangka=? WHERE id=?`;
        await db.query(query, [jenis, plat, merek, model, tahun, warna, mesin, rangka, req.params.id]);
        res.json({ status: "success", message: "Kendaraan diperbarui!" });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// 5. Jadikan Kendaraan Utama
// URL Asli: PUT /api/kendaraan/utama/:id
router.put('/utama/:id', async (req, res) => {
    const { user_id } = req.body;
    try {
        // Reset semua kendaraan user ini menjadi false
        await db.query('UPDATE kendaraan SET is_utama = false WHERE user_id = ?', [user_id]);
        // Set kendaraan yang dipilih menjadi true
        await db.query('UPDATE kendaraan SET is_utama = true WHERE id = ?', [req.params.id]);
        res.json({ status: "success", message: "Kendaraan utama diubah!" });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// 6. Hapus kendaraan
// URL Asli: DELETE /api/kendaraan/:id
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM kendaraan WHERE id = ?', [req.params.id]);
        res.json({ status: "success", message: "Kendaraan dihapus!" });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

module.exports = router;