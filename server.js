const express = require('express');
const path = require('path');
const cors = require('cors');
const qrcode = require('qrcode');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes

// Get all sections
app.get('/api/sections', async (req, res) => {
    try {
        const sections = await db.getSections();
        res.json(sections);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a new section
app.post('/api/sections', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Section name is required" });
    try {
        const id = await db.addSection(name);
        res.status(201).json({ id, name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get students by section
app.get('/api/students/:sectionId', async (req, res) => {
    try {
        const students = await db.getStudentsBySection(req.params.sectionId);
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a student to a section
app.post('/api/students', async (req, res) => {
    const { name, sectionId } = req.body;
    if (!name || !sectionId) return res.status(400).json({ error: "Name and sectionId are required" });
    try {
        const id = await db.addStudent(name, sectionId);
        res.status(201).json({ id, name, sectionId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get real-time attendance for a section today
app.get('/api/attendance/:sectionId', async (req, res) => {
    try {
        const records = await db.getAttendanceForSection(req.params.sectionId);
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark student present
app.post('/api/attendance', async (req, res) => {
    const { studentId, sectionId } = req.body;
    if (!studentId || !sectionId) return res.status(400).json({ error: "Student ID and Section ID are required" });
    
    try {
        const result = await db.markAttendance(studentId, sectionId);
        if (result.success) {
            res.status(201).json(result);
        } else {
            // Anti-fraud duplicate prevention hit
            res.status(409).json(result); 
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generate QR Code for a given URL (used by frontend dashboard)
app.get('/api/qrcode', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "URL query parameter is required" });
    
    try {
        const qrImage = await qrcode.toDataURL(url);
        res.json({ dataUrl: qrImage });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Setup some dummy data if sections table is empty (for testing)
db.db.get("SELECT COUNT(*) AS count FROM sections", async (err, row) => {
    if (row && row.count === 0) {
        console.log("Seeding initial data...");
        try {
            const cs101 = await db.addSection("CS101");
            await db.addStudent("Alice Smith", cs101);
            await db.addStudent("Bob Jones", cs101);
            await db.addStudent("Charlie Brown", cs101);
            
            const it201 = await db.addSection("IT201");
            await db.addStudent("David Lee", it201);
            await db.addStudent("Eva Green", it201);
        } catch (e) {
            console.error("Seed error:", e);
        }
    }
});

// Helper to get local IP address
const { networkInterfaces } = require('os');
const getLocalIP = () => {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
};

app.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIP();
    console.log(`===========================================`);
    console.log(`CCDI QRScan System Running`);
    console.log(`Instructor Dashboard: http://localhost:${PORT}`);
    console.log(`Student Scan URL:     http://${ip}:${PORT}/scan.html`);
    console.log(`===========================================`);
});
