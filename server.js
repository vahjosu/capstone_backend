const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 8000;

// Use express's built-in JSON parser
app.use(express.json());
app.use(cors());

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',  // Fill in your MySQL password if applicable
    database: 'school_monitoring'
};

// Establish MySQL connection
const connection = mysql.createConnection(dbConfig);

connection.connect(error => {
    if (error) {
        console.error('Database connection failed: ', error.stack);
        return;
    }
    console.log('Connected to the database.');
});

// Home route
app.get('/', (req, res) => {
    res.send('Welcome to the API server!');
});

// Register route
app.post('/api/register', (req, res) => {
    const { firstName, middleName, lastName, address, purpose } = req.body;

    // Log received data for debugging
    console.log('Received data:', { firstName, middleName, lastName, address, purpose });

    // Validation checks
    if (!firstName || !lastName || !address || !purpose) {
        console.log('Validation error: Missing fields');
        return res.status(400).json({ success: false, error: 'Please fill out all required fields.' });
    }

    if (address.length < 5) {
        console.log('Validation error: Address too short');
        return res.status(400).json({ success: false, error: 'Address must be at least 5 characters.' });
    }

    if (purpose.length < 3) {
        console.log('Validation error: Purpose too short');
        return res.status(400).json({ success: false, error: 'Purpose must be at least 3 characters.' });
    }

    // Construct the Name field
    const name = `${firstName} ${middleName || ''} ${lastName}`.trim();

    // Prepare the SQL query
    const sql = 'INSERT INTO ustpcdodata (Name, Position, Purpose, Address) VALUES (?, ?, ?, ?)';
    const values = [name, 'Visitor', purpose, address];

    // Execute the SQL query
    connection.query(sql, values, (err, results) => {
        if (err) {
            console.error('Database query error: ', err);
            return res.status(500).json({ success: false, error: 'Database error', details: err.message });
        }

        // Successfully inserted data
        res.json({ success: true, message: 'Data successfully inserted.' });
    });
});

app.post('/api/log', (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ success: false, error: 'Name is required.' });
    }

    // Fetch visitor data based on the provided name
    const fetchSql = 'SELECT UID, Name, Position, ID, Program, College, Year_Level, Address, Purpose FROM ustpcdodata WHERE Name = ?';
    connection.query(fetchSql, [name], (fetchErr, fetchResults) => {
        if (fetchErr) {
            console.error('Fetch error: ', fetchErr);
            return res.status(500).json({ success: false, error: 'Fetch error', details: fetchErr.message });
        }
        
            console.log('Fetched results:', fetchResults);

        if (fetchResults.length === 0) {
            return res.status(404).json({ success: false, error: 'Visitor not found.' });
        }

        const schoolData = fetchResults[0];
        console.log('School Data:', schoolData);

        // Determine the Position value
        const position = schoolData.Position ? schoolData.Position : 'Student';

        // Prepare to log data
        const logSql = 'INSERT INTO logs (UID, Name, Position, ID, Program, College, Year_Level, Address, Purpose, LogTime, LogType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)';
        const logValues = [
            schoolData.UID,
            schoolData.Name,
            position, // Use the determined position
            schoolData.ID, // ID from ustpcdodata
            schoolData.Program,
            schoolData.College,
            schoolData.Year_Level,
            schoolData.Address,
            schoolData.Purpose,
            'Time In' // or 'Time Out' as needed
        ];

        // Insert the log data
        connection.query(logSql, logValues, (logErr) => {
            if (logErr) {
                console.error('Log error: ', logErr);
                return res.status(500).json({ success: false, error: 'Log error', details: logErr.message });
            }

            // Successfully logged the visitor data
            res.json({ success: true, message: 'Visitor data successfully logged.' });
        });
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
