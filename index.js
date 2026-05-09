const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        return;
    }
    console.log('Connected to MySQL database');
});
app.post('/addSchool', (req, res) => {
    const { name, address, latitude, longitude } = req.body;

    if (!name || !address || !latitude || !longitude) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (isNaN(latitude) || isNaN(longitude)) {
        return res
            .status(400)
            .json({ error: 'Latitude and longitude must be numbers' });
    }

    const query =
        'INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)';
    db.query(query, [name, address, latitude, longitude], (err, result) => {
        if (err) {
            return res
                .status(500)
                .json({ error: 'Database error', details: err.message });
        }
        res.status(201).json({
            message: 'School added successfully',
            id: result.insertId,
        });
    });
});
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

app.get('/listSchools', (req, res) => {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
        return res
            .status(400)
            .json({ error: 'Latitude and longitude are required' });
    }

    if (isNaN(latitude) || isNaN(longitude)) {
        return res
            .status(400)
            .json({ error: 'Latitude and longitude must be numbers' });
    }

    db.query('SELECT * FROM schools', (err, results) => {
        if (err) {
            return res
                .status(500)
                .json({ error: 'Database error', details: err.message });
        }

        const sorted = results
            .map((school) => ({
                ...school,
                distance: calculateDistance(
                    parseFloat(latitude),
                    parseFloat(longitude),
                    school.latitude,
                    school.longitude,
                ),
            }))
            .sort((a, b) => a.distance - b.distance);

        res.status(200).json(sorted);
    });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});