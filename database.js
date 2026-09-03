const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Create sections table
    db.run(`CREATE TABLE IF NOT EXISTS sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
    )`);

    // Create students table
    db.run(`CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        section_id INTEGER,
        FOREIGN KEY (section_id) REFERENCES sections(id)
    )`);

    // Create attendance_logs table
    db.run(`CREATE TABLE IF NOT EXISTS attendance_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        section_id INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id),
        FOREIGN KEY (section_id) REFERENCES sections(id)
    )`);
});

// Helper functions for easy db access
const getSections = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM sections", [], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
};

const getStudentsBySection = (sectionId) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM students WHERE section_id = ?", [sectionId], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
};

const addSection = (name) => {
    return new Promise((resolve, reject) => {
        db.run("INSERT INTO sections (name) VALUES (?)", [name], function(err) {
            if (err) reject(err);
            resolve(this.lastID);
        });
    });
};

const addStudent = (name, sectionId) => {
    return new Promise((resolve, reject) => {
        db.run("INSERT INTO students (name, section_id) VALUES (?, ?)", [name, sectionId], function(err) {
            if (err) reject(err);
            resolve(this.lastID);
        });
    });
};

const markAttendance = (studentId, sectionId) => {
    return new Promise((resolve, reject) => {
        // Anti-fraud: Check if already present today
        db.get(
            `SELECT * FROM attendance_logs 
             WHERE student_id = ? AND section_id = ? AND date(timestamp, 'localtime') = date('now', 'localtime')`,
            [studentId, sectionId],
            (err, row) => {
                if (err) return reject(err);
                if (row) {
                    return resolve({ success: false, message: "Already present" });
                }
                
                // Not present, insert
                db.run(
                    "INSERT INTO attendance_logs (student_id, section_id) VALUES (?, ?)",
                    [studentId, sectionId],
                    function(err) {
                        if (err) return reject(err);
                        resolve({ success: true, message: "Attendance recorded" });
                    }
                );
            }
        );
    });
};

const getAttendanceForSection = (sectionId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT students.name, attendance_logs.timestamp 
            FROM attendance_logs
            JOIN students ON attendance_logs.student_id = students.id
            WHERE attendance_logs.section_id = ? AND date(attendance_logs.timestamp, 'localtime') = date('now', 'localtime')
            ORDER BY attendance_logs.timestamp DESC
        `;
        db.all(query, [sectionId], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
};

module.exports = {
    db,
    getSections,
    getStudentsBySection,
    addSection,
    addStudent,
    markAttendance,
    getAttendanceForSection
};
