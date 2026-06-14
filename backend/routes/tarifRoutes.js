const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Pastikan path ini benar mengarah ke db.js Anda

// Endpoint API: Ambil Data Tarif
router.get('/', async (req, res) => {
    try {
        const query = "SELECT jenis_kendaraan, tarif_jam_pertama, tarif_jam_berikutnya FROM tarif";
        
        // Eksekusi query
        const [results] = await db.query(query);
        
        res.status(200).json({ 
            status: "success",
            data: results 
        });

    } catch (error) {
        console.error('Error saat mengambil tarif:', error);
        res.status(500).json({ 
            status: "error",
            message: "Gagal mengambil tarif dari database." 
        });
    }
});

module.exports = router;