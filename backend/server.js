require('dotenv').config();
const express = require('express');
const cors = require('cors'); // <-- Ini yang memanggil CORS

// Import semua routes
const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const reservasiRoutes = require('./routes/reservasiRoutes');
const tarifRoutes = require('./routes/tarifRoutes');
const parkirRoutes = require('./routes/parkirRoutes');

const app = express();

// MIDDLEWARE (PELINDUNG)
app.use(cors()); // <--  CORS 
app.use(express.json());

// GUNAKAN ROUTES
app.use('/api', authRoutes); 
app.use('/api/kendaraan', vehicleRoutes);
app.use('/api/reservasi', reservasiRoutes);
app.use('/api/tarif', tarifRoutes);
app.use('/api/parkir', parkirRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server SmartPark berjalan di http://localhost:${PORT}`);
});