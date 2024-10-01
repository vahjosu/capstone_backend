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

app.post('/api/timein', (req, res) => {
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
            res.json({ success: true, message: 'The data successfully logged in.' });
        });
    });
});

app.post('/api/timeout', (req, res) => {
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
            'Time Out' // or 'Time In' as needed
        ];

        // Insert the log data
        connection.query(logSql, logValues, (logErr) => {
            if (logErr) {
                console.error('Log error: ', logErr);
                return res.status(500).json({ success: false, error: 'Log error', details: logErr.message });
            }

            // Successfully logged the visitor data
            res.json({ success: true, message: 'Data successfully logged out.' });
        });
    });
});

app.get('/api/logs/count', (req, res) => {
    console.log('Received request for /api/logs/count'); // Log when the request is received

    const timeInQuery = 'SELECT COUNT(*) AS timeInCount FROM logs WHERE LogType = "Time In"';
    const timeOutQuery = 'SELECT COUNT(*) AS timeOutCount FROM logs WHERE LogType = "Time Out"';

    connection.query(timeInQuery, (timeInErr, timeInResults) => {
        if (timeInErr) {
            console.error('Time In query error:', timeInErr);
            return res.status(500).json({ success: false, error: 'Error fetching Time In count' });
        }

        connection.query(timeOutQuery, (timeOutErr, timeOutResults) => {
            if (timeOutErr) {
                console.error('Time Out query error:', timeOutErr);
                return res.status(500).json({ success: false, error: 'Error fetching Time Out count' });
            }

            const totalRemaining = timeInResults[0].timeInCount - timeOutResults[0].timeOutCount;
            console.log('Total Remaining:', totalRemaining); // Log the total remaining
            res.json({ totalRemaining });
        });
    });
});

const logsData = [
    { college: 'CITC', logType: 'Time In' },
    { college: 'CITC', logType: 'Time Out' },
    { college: 'COT', logType: 'Time In' },
    { college: 'CSTE', logType: 'Time Out' },
    { college: 'COM', logType: 'Time In' },
    { college: 'CSM', logType: 'Time In' },
    { college: 'CEA', logType: 'Time Out' },
    { college: 'SHS', logType: 'Time In' },
    { college: 'CITC', logType: 'Time In' }, // Example entries
    { college: 'COT', logType: 'Time Out' },
    // Add more log entries as needed
];

// Function to count logs for a specific college
const countLogsForCollege = (college) => {
    return (req, res) => {
        // Filter logs for the specified college
        const collegeLogs = logsData.filter(log => log.college === college);
        const totalCount = collegeLogs.length; // Count the logs for that college
        res.json({ totalRemaining: totalCount });
    };
};

// Define your routes here for each college
app.get('/api/logs/count/CITC', countLogsForCollege('CITC'));
app.get('/api/logs/count/COT', countLogsForCollege('COT'));
app.get('/api/logs/count/CSTE', countLogsForCollege('CSTE'));
app.get('/api/logs/count/COM', countLogsForCollege('COM'));
app.get('/api/logs/count/CSM', countLogsForCollege('CSM'));
app.get('/api/logs/count/CEA', countLogsForCollege('CEA'));
app.get('/api/logs/count/SHS', countLogsForCollege('SHS'));

// Endpoint to get the total visitors (dummy implementation)
app.get('/api/logs/count', (req, res) => {
    const totalLogs = logsData.length; // Total logs
    res.json({ totalRemaining: totalLogs });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
