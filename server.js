const express = require('express');
const cors = require('cors');
const { Readable } = require('stream'); // To convert string to stream
const csvParser = require('csv-parser');

const app = express();

// Middleware to parse incoming JSON requests
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], // Allow both localhost and 127.0.0.1 origins
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Hello world endpoint
app.get('/', (req, res) => {
  res.send('API em Node.js rodando');
});

// POST endpoint to convert CSV to SQL
app.post('/csv_to_sql', (req, res) => {
  const csvData = req.body.csv_data;

  if (!csvData) {
    return res.status(400).send('CSV data is missing');
  }

  try {
    const readableStream = Readable.from(csvData);
    let headers = [];
    const sqlStatements = [];

    readableStream
      .pipe(csvParser())
      .on('headers', (headerList) => {
        headers = headerList;
      })
      .on('data', (row) => {
        const values = headers.map((header) => `'${row[header]}'`);
        const sql = `INSERT INTO tabela (${headers.join(', ')}) VALUES (${values.join(', ')});`;
        sqlStatements.push(sql);
      })
      .on('end', () => {
        const sqlData = sqlStatements.join('\n');
        res.setHeader('Content-Disposition', 'attachment; filename=output.sql');
        res.setHeader('Content-Type', 'application/sql');
        res.send(sqlData);
      })
      .on('error', (error) => {
        console.error('Error parsing CSV:', error);  // Log the error to the server console
        res.status(500).send('Internal Server Error while processing CSV.');
      });
  } catch (error) {
    console.error('Error processing request:', error);  // Log unexpected errors
    res.status(500).send('An unexpected error occurred while processing your request.');
  }
});


// POST endpoint to convert CSV to JSON
app.post('/csv_to_json', (req, res) => {
  const csvData = req.body.csv_data;

  // Convert the CSV data string into a readable stream
  const readableStream = Readable.from(csvData);

  let headers = [];
  const rows = [];

  // Convert CSV to JSON
  readableStream
    .pipe(csvParser())
    .on('headers', (headerList) => {
      headers = headerList; // Capture headers
    })
    .on('data', (row) => {
      const jsonRow = {};
      headers.forEach((header) => {
        jsonRow[header] = row[header];
      });
      rows.push(jsonRow);
    })
    .on('end', () => {
      const jsonData = JSON.stringify(rows);
      res.setHeader('Content-Disposition', 'attachment; filename=output.json');
      res.setHeader('Content-Type', 'application/json');
      res.send(jsonData);
    })
    .on('error', () => {
      res.status(400).send('Erro ao processar CSV.');
    });
});

// Start the server
const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});
