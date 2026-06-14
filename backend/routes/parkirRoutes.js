const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ==========================================================
// 1. SEEDER: GENERATE SEMUA LANTAI & SLOT KE DATABASE
// ==========================================================
router.get('/seed', async (req, res) => {
    try {
        await db.query("SET FOREIGN_KEY_CHECKS = 0");
        await db.query("DELETE FROM reservasi");
        await db.query("DELETE FROM slot_parkir");
        await db.query("SET FOREIGN_KEY_CHECKS = 1");

        await db.query("INSERT IGNORE INTO area_parkir (id, nama, kapasitas_total, lokasi) VALUES (1, 'RITA Supermall', 200, 'Purwokerto (Beroperasi)'), (2, 'Grand Indonesia', 500, 'Jakarta (Belum Beroperasi)')");
        
        const lantaiList = ['Lantai B1', 'Lantai P1', 'Lantai P2', 'Lantai P3'];
        const blokMotor = ['Blok A', 'Blok B', 'Blok C', 'Blok D'];

        for (let l of lantaiList) {
            let prefix = l.split(' ')[1] + '-'; 
            
            for(let i=1; i<=10; i++) {
                await db.query("INSERT INTO slot_parkir (lantai, blok, no_slot, status, area_parkir_id) VALUES (?, 'Mobil', ?, 'Tersedia', 1)", [l, prefix+i]);
            }
            
            for (let b of blokMotor) {
                for(let i=1; i<=10; i++) {
                    await db.query("INSERT INTO slot_parkir (lantai, blok, no_slot, status, area_parkir_id) VALUES (?, ?, ?, 'Tersedia', 1)", [l, b, b+'-'+i]);
                }
            }
        }
        res.json({status: "success", message: "BERHASIL! Semua Slot & Lantai (B1, P1, P2, P3) telah masuk ke Database."});
    } catch(e) { res.status(500).json({error: e.message}); }
});

// ==========================================================
// 2. GET SLOT MOBIL
// ==========================================================
router.get('/slots/mobil/:areaId/:lantai', async (req, res) => {
    try {
        const [slots] = await db.query("SELECT * FROM slot_parkir WHERE area_parkir_id=? AND lantai=? AND blok='Mobil'", [req.params.areaId, req.params.lantai]);
        res.json({status: "success", data: slots});
    } catch(e) { res.status(500).json({error: e.message}); }
});

// ==========================================================
// 3. GET SLOT MOTOR
// ==========================================================
router.get('/slots/motor/:areaId/:lantai', async (req, res) => {
    try {
        const query = "SELECT blok, COUNT(*) as total, SUM(CASE WHEN status='Tersedia' THEN 1 ELSE 0 END) as tersedia FROM slot_parkir WHERE area_parkir_id=? AND lantai=? AND blok != 'Mobil' GROUP BY blok";
        const [blocks] = await db.query(query, [req.params.areaId, req.params.lantai]);
        res.json({status: "success", data: blocks});
    } catch(e) { res.status(500).json({error: e.message}); }
});

// ==========================================================
// 4. API BOOKING TIKET
// ==========================================================
router.post('/booking', async (req, res) => {
    const { user_id, area_id, jenis_kendaraan, lantai, slot_name, kendaraan_id } = req.body;
    try {
        if (!user_id || !area_id || !lantai || !slot_name) {
            return res.status(400).json({ status: "error", message: "Data pesanan tidak lengkap dari aplikasi!" });
        }

        const safeKendaraanId = (kendaraan_id && !isNaN(kendaraan_id)) ? parseInt(kendaraan_id) : null;

        // CEK DOUBLE BOOKING (Kendaraan yang sama tidak bisa dipesan jika masih aktif)
        if (safeKendaraanId) {
            const [cekKendaraan] = await db.query(
                "SELECT id FROM reservasi WHERE kendaraan_id = ? AND status IN ('Aktif', 'Menunggu')", 
                [safeKendaraanId]
            );
            if (cekKendaraan.length > 0) {
                return res.status(400).json({ status: "error", message: "Kendaraan ini sedang digunakan dalam tiket yang masih aktif. Silakan pilih kendaraan lain!" });
            }
        }

        const jenis = (jenis_kendaraan || 'mobil').toLowerCase();
        let slotId = null;
        let finalSlotName = slot_name;

        // SISTEM AUTO-ASSIGN JIKA SLOT PENUH / FORMAT SALAH
        if (jenis === 'mobil') {
            const [rows] = await db.query("SELECT id, no_slot FROM slot_parkir WHERE area_parkir_id=? AND lantai=? AND no_slot=? AND status='Tersedia'", [area_id, lantai, slot_name]);
            if(rows.length === 0) {
                const [fallback] = await db.query("SELECT id, no_slot FROM slot_parkir WHERE area_parkir_id=? AND lantai=? AND blok='Mobil' AND status='Tersedia' LIMIT 1", [area_id, lantai]);
                if(fallback.length === 0) return res.status(400).json({ status: "error", message: `Maaf, seluruh slot mobil di ${lantai} sudah penuh!`});
                slotId = fallback[0].id;
                finalSlotName = fallback[0].no_slot;
            } else {
                slotId = rows[0].id;
            }
        } else {
            const [rows] = await db.query("SELECT id, blok FROM slot_parkir WHERE area_parkir_id=? AND lantai=? AND blok=? AND status='Tersedia' LIMIT 1", [area_id, lantai, slot_name]);
            if(rows.length === 0) {
                const [fallback] = await db.query("SELECT id, blok FROM slot_parkir WHERE area_parkir_id=? AND lantai=? AND blok != 'Mobil' AND status='Tersedia' LIMIT 1", [area_id, lantai]);
                if(fallback.length === 0) return res.status(400).json({ status: "error", message: `Maaf, seluruh blok motor di ${lantai} sudah penuh!`});
                slotId = fallback[0].id;
                finalSlotName = fallback[0].blok;
            } else {
                slotId = rows[0].id;
            }
        }

        await db.query("UPDATE slot_parkir SET status='Terisi' WHERE id=?", [slotId]);
        
        const kode_unik = "TKT" + Math.floor(Math.random() * 100000000);
        const tarif_id = jenis === 'mobil' ? 2 : 1;
        
        const insertQuery = `INSERT INTO reservasi (kode_unik, estimasi_kedatangan, user_id, slot_parkir_id, tarif_id, kendaraan_id, status) VALUES (?, DATE_ADD(NOW(), INTERVAL 2 HOUR), ?, ?, ?, ?, 'Aktif')`;
        await db.query(insertQuery, [kode_unik, user_id, slotId, tarif_id, safeKendaraanId]);

        res.json({status: "success", kode_unik: kode_unik, assigned_slot: finalSlotName});
    } catch(e) { res.status(500).json({ status: "error", message: e.message}); }
});

// ==========================================================
// 5. GET AKTIVITAS & RIWAYAT USER
// ==========================================================
router.get('/reservasi/user/:userId', async (req, res) => {
    try {
        const query = `
            SELECT r.*, s.lantai, s.blok, s.no_slot, a.nama as nama_area,
                   k.* FROM reservasi r
            JOIN slot_parkir s ON r.slot_parkir_id = s.id
            JOIN area_parkir a ON s.area_parkir_id = a.id
            LEFT JOIN kendaraan k ON r.kendaraan_id = k.id
            WHERE r.user_id = ? ORDER BY r.waktu_pesan DESC
        `;
        const [rows] = await db.query(query, [req.params.userId]);
        res.json({ status: "success", data: rows });
    } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
});

// ==========================================================
// 6. API BYPASS: SIMULASI SCAN QR MASUK
// ==========================================================
router.post('/bypass-masuk', async (req, res) => {
    const { kode_unik, menit_parkir } = req.body; 
    try {
        const menit = menit_parkir ? parseInt(menit_parkir) : 0;
        const query = "UPDATE reservasi SET waktu_check_in = DATE_SUB(NOW(), INTERVAL ? MINUTE) WHERE kode_unik = ?";
        await db.query(query, [menit, kode_unik]);
        res.json({ status: "success", message: `Berhasil Scan. Waktu dimundurkan ${menit} menit.` });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================================
// 7. API AMBIL INFO TAGIHAN & DURASI PARKIR
// ==========================================================
router.get('/checkout-info/:kode_unik', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT r.*, t.tarif_jam_pertama, t.tarif_jam_berikutnya,
                   k.*
            FROM reservasi r 
            JOIN tarif t ON r.tarif_id = t.id 
            LEFT JOIN kendaraan k ON r.kendaraan_id = k.id
            WHERE r.kode_unik = ?
        `, [req.params.kode_unik]);

        if (rows.length === 0) return res.status(404).json({ error: 'Tiket tidak ditemukan' });
        const data = rows[0];

        const checkIn = new Date(data.waktu_check_in || data.waktu_pesan);
        const diffMins = Math.round((new Date() - checkIn) / 60000); 
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;

        let totalJam = Math.ceil(diffMins / 60); 
        if (totalJam < 1) totalJam = 1;
        let totalHarga = data.tarif_jam_pertama;
        if (totalJam > 1) totalHarga += (totalJam - 1) * data.tarif_jam_berikutnya;

        res.json({ 
            status: 'success', 
            waktu_masuk: checkIn, durasi_jam: hours, durasi_menit: mins, total_harga: totalHarga,
            tarif_jam_pertama: data.tarif_jam_pertama, tarif_jam_berikutnya: data.tarif_jam_berikutnya,
            kendaraan: {
                plat_nomor: data.plat, 
                merek: data.merek,
                nama_kendaraan: (data.merek && data.model) ? `${data.merek} ${data.model}` : (data.merek || 'Kendaraan Anda')
            }
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================================
// 8. API BAYAR, KOSONGKAN SLOT, & TAMBAH POIN PENGGUNA
// ==========================================================
router.post('/bayar', async (req, res) => {
    const { kode_unik, total_durasi, total_tarif, order_id, payment_type } = req.body;
    try {
        await db.query(
            "UPDATE transaksi_pembayaran SET status_pembayaran='settlement', metode_pembayaran=? WHERE id=?", 
            [payment_type, order_id]
        );

        const [r] = await db.query("SELECT slot_parkir_id, user_id, tarif_id FROM reservasi WHERE kode_unik=?", [kode_unik]);
        
        if (r.length > 0) {
            await db.query("UPDATE slot_parkir SET status='Tersedia' WHERE id=?", [r[0].slot_parkir_id]);
            const pointsToAdd = (r[0].tarif_id === 2) ? 4 : 2;
            await db.query("UPDATE users SET points = points + ? WHERE id=?", [pointsToAdd, r[0].user_id]);
        }

        await db.query(
            "UPDATE reservasi SET status='Selesai', waktu_check_out=NOW(), total_durasi=?, total_tarif=? WHERE kode_unik=?", 
            [total_durasi, total_tarif, kode_unik]
        );
        res.json({ status: 'success' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================================
// 9. API CEK TOTAL KETERSEDIAAN SLOT (BERDASARKAN AREA)
// ==========================================================
router.get('/availability/:areaId', async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total_slots, 
                SUM(CASE WHEN status='Tersedia' THEN 1 ELSE 0 END) as available_slots 
            FROM slot_parkir 
            WHERE area_parkir_id = ?
        `;
        const [rows] = await db.query(query, [req.params.areaId]);
        res.json({ status: "success", data: rows[0] });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================================
// 10. API MIDTRANS: MINTA TOKEN PEMBAYARAN
// ==========================================================
const midtransClient = require('midtrans-client');

let snap = new midtransClient.Snap({
    isProduction : false, 
    serverKey : 'process.env.MIDTRANS_SERVER_KEY',
    clientKey : 'Mid-client-HEmTJ9HSLVhgaQzY'
});

router.post('/get-snap-token', async (req, res) => {
    const { kode_unik, total_tarif } = req.body;
    const orderId = kode_unik + "-" + Date.now(); 

    try {
        const queryUser = `
            SELECT u.nama, u.email, u.no_telepon 
            FROM reservasi r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.kode_unik = ?
        `;
        const [userRows] = await db.query(queryUser, [kode_unik]);

        if (userRows.length === 0) {
            return res.status(404).json({ error: "Data pengguna tidak ditemukan." });
        }

        const userData = userRows[0];
        const namaArray = userData.nama.trim().split(' ');
        const firstName = namaArray[0];
        const lastName = namaArray.length > 1 ? namaArray.slice(1).join(' ') : ''; 

        let parameter = {
            "transaction_details": { "order_id": orderId, "gross_amount": total_tarif },
            "credit_card":{ "secure" : true },
            "customer_details": {
                "first_name": firstName,
                "last_name": lastName,
                "email": userData.email || "user@parkirin.com", 
                "phone": userData.no_telepon || "080000000000" 
            }
        };

        const transaction = await snap.createTransaction(parameter);
        
        await db.query("DELETE FROM transaksi_pembayaran WHERE reservasi_kode_unik = ? AND status_pembayaran = 'pending'", [kode_unik]);

        await db.query(
            "INSERT INTO transaksi_pembayaran (id, reservasi_kode_unik, jumlah_bayar, status_pembayaran) VALUES (?, ?, ?, 'pending')", 
            [orderId, kode_unik, total_tarif]
        );

        res.json({ status: 'success', token: transaction.token, order_id: orderId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================================
// 11. OTOMATISASI SISTEM (BERJALAN SETIAP 30 DETIK)
// ==========================================================
let hasResetToday = false; 

setInterval(async () => {
    const now = new Date();
    const jam = now.getHours();
    const menit = now.getMinutes();

    if (jam === 8 && menit === 0 && !hasResetToday) {
        try {
            await db.query("UPDATE slot_parkir SET status='Tersedia'");
            await db.query("UPDATE reservasi SET status='Dibatalkan' WHERE status='Aktif' OR status='Menunggu'");
            console.log("[SISTEM] JAM 08:00 Pagi - Lokasi Parkir Dibuka, Semua Slot Kembali Tersedia.");
            hasResetToday = true; 
        } catch (err) { console.error("Gagal reset parkiran:", err); }
    }
    if (jam === 8 && menit > 0) {
        hasResetToday = false;
    }

    try {
        const querySelect = "SELECT slot_parkir_id, kode_unik FROM reservasi WHERE status='Aktif' AND waktu_check_in IS NULL AND estimasi_kedatangan < NOW()";
        const [expired] = await db.query(querySelect);

        if (expired.length > 0) {
            for (let i = 0; i < expired.length; i++) {
                await db.query("UPDATE slot_parkir SET status='Tersedia' WHERE id=?", [expired[i].slot_parkir_id]);
                await db.query("UPDATE reservasi SET status='Dibatalkan' WHERE kode_unik=?", [expired[i].kode_unik]);
            }
            console.log(`[SISTEM] ${expired.length} Tiket kedaluwarsa telah dihapus dan slot kembali tersedia.`);
        }
    } catch (err) {
        console.error("Gagal membersihkan tiket kedaluwarsa:", err);
    }
}, 30000); 

// ==========================================================
// 12. API SIMPAN ULASAN DAN PENILAIAN
// ==========================================================
router.post('/ulasan', async (req, res) => {
    const { kode_unik, user_id, rating, komentar } = req.body;

    if (!kode_unik || !user_id || !rating) {
        return res.status(400).json({ error: "Data ulasan tidak lengkap!" });
    }

    try {
        const query = `
            INSERT INTO ulasan_parkir (reservasi_kode_unik, user_id, rating, komentar) 
            VALUES (?, ?, ?, ?)
        `;
        await db.query(query, [kode_unik, user_id, rating, komentar]);
        res.json({ status: 'success', message: 'Ulasan berhasil disimpan!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================================
// 13. API AMBIL POIN PENGGUNA TERBARU
// ==========================================================
router.get('/poin/:userId', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT points FROM users WHERE id = ?", [req.params.userId]);
        if(rows.length > 0) {
            res.json({ status: 'success', points: rows[0].points });
        } else {
            res.json({ status: 'success', points: 0 });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;