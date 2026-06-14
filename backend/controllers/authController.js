const db = require('../config/db');

exports.register = async (req, res) => {
    const { nama, email, password, no_telepon } = req.body;

    try {
        // 1. Cek apakah email sudah ada di database
        const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Email sudah terdaftar!' });
        }

        // 2. Masukkan user baru ke database
        // Catatan: Untuk tugas besar yang lebih aman, password sebaiknya di-hash (misal pakai bcrypt)
        const sql = 'INSERT INTO users (nama, email, password, no_telepon, role) VALUES (?, ?, ?, ?, ?)';
        await db.query(sql, [nama, email, password, no_telepon, 'Pengguna']);

        res.status(201).json({ message: 'Registrasi berhasil!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

exports.login = async (req, res) => {
    // 1. Ambil ketiga data dari inputan frontend (req.body)
    const { no_telepon, email, password } = req.body;

    try {
        // 2. Cari user berdasarkan kombinasi Email DAN Nomor Telepon
        const [users] = await db.query(
            'SELECT * FROM users WHERE email = ? AND no_telepon = ?', 
            [email, no_telepon]
        );
        
        // 3. Jika kombinasi email dan nomor telepon tidak ditemukan di tabel
        if (users.length === 0) {
            return res.status(401).json({ message: 'Email atau Nomor Telepon salah/tidak terdaftar!' });
        }

        const user = users[0];

        // 4. Cek apakah password cocok
        if (password !== user.password) {
            return res.status(401).json({ message: 'Kata sandi salah!' });
        }

        // 5. Jika semua cocok, kirim respon berhasil dan kembalikan data user
        res.status(200).json({ 
            message: 'Login berhasil!',
            user: {
                id: user.id,
                nama: user.nama,
                email: user.email,
                no_telepon: user.no_telepon,
                role: user.role
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};
