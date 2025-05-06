const express = require('express');
const { BlobServiceClient } = require('@azure/storage-blob');
const sql = require('mssql');
const axios = require('axios');
const multer = require('multer');
const cors = require('cors');
const dotenv = require('dotenv'); // Adaugă pachetul dotenv

// Încarcă fișierul .env din directorul curent
dotenv.config({ path: './.env' }); // Calea este relativă la directorul în care rulează index.js

const app = express();
const port = 5001;

// Log pentru a verifica dacă variabilele sunt încărcate
console.log('AZURE_BLOB_CONNECTION_STRING:', process.env.AZURE_BLOB_CONNECTION_STRING);
console.log('AZURE_SQL_CONNECTION_STRING:', process.env.AZURE_SQL_CONNECTION_STRING);
console.log('AZURE_VISION_ENDPOINT:', process.env.AZURE_VISION_ENDPOINT);
console.log('AZURE_VISION_KEY:', process.env.AZURE_VISION_KEY);

// Verifică dacă variabilele sunt definite
if (!process.env.AZURE_BLOB_CONNECTION_STRING) {
    console.error('AZURE_BLOB_CONNECTION_STRING is not defined!');
    process.exit(1);
}
if (!process.env.AZURE_SQL_CONNECTION_STRING) {
    console.error('AZURE_SQL_CONNECTION_STRING is not defined!');
    process.exit(1);
}
if (!process.env.AZURE_VISION_ENDPOINT) {
    console.error('AZURE_VISION_ENDPOINT is not defined!');
    process.exit(1);
}
if (!process.env.AZURE_VISION_KEY) {
    console.error('AZURE_VISION_KEY is not defined!');
    process.exit(1);
}

// Add CORS middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Configurare Azure Blob Storage
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_BLOB_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient('images');

// Middleware
app.use(express.json());

// Asigură-te că containerul există
(async () => {
    try {
        console.log('Creating container if not exists...');
        await containerClient.createIfNotExists();
        console.log('Container created or already exists.');
    } catch (error) {
        console.error('Error creating container:', error.message);
        process.exit(1);
    }
})();

// Basic route for testing
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Backend API is running' });
});

// Endpoint pentru upload și procesare imagine
app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        console.log('Received upload request.');
        const file = req.file;
        if (!file) {
            console.log('No file uploaded.');
            return res.status(400).json({ error: 'No file uploaded' });
        }
        console.log('File received:', file.originalname);

        // Încarcă fișierul în Azure Blob Storage
        console.log('Uploading to Azure Blob Storage...');
        const blobName = `${Date.now()}-${file.originalname}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.upload(file.buffer, file.buffer.length);
        const blobUrl = blockBlobClient.url;
        console.log('File uploaded to Azure Blob Storage:', blobUrl);

        // Procesează imaginea cu Azure AI Vision (Image Tagging)
        console.log('Sending request to Azure AI Vision...');
        const visionResponse = await axios.post(
            `${process.env.AZURE_VISION_ENDPOINT}/vision/v3.2/tag`,
            { url: blobUrl },
            {
                headers: {
                    'Ocp-Apim-Subscription-Key': process.env.AZURE_VISION_KEY,
                    'Content-Type': 'application/json',
                },
            }
        );
        const tags = visionResponse.data.tags.map(tag => tag.name);
        console.log('Tags received from Azure AI Vision:', tags);

        // Salvează informațiile în Azure SQL Database
        console.log('Connecting to Azure SQL Database...');
        const pool = await sql.connect(process.env.AZURE_SQL_CONNECTION_STRING);
        console.log('Connected to Azure SQL Database.');
        await pool.request()
            .input('file_name', sql.NVarChar, file.originalname)
            .input('blob_url', sql.NVarChar, blobUrl)
            .input('timestamp', sql.DateTime, new Date())
            .input('result', sql.NVarChar, JSON.stringify(tags))
            .query(`
                INSERT INTO requests (file_name, blob_url, timestamp, result)
                VALUES (@file_name, @blob_url, @timestamp, @result)
            `);
        console.log('Data saved to Azure SQL Database.');

        res.status(200).json({ fileName: file.originalname, blobUrl, tags });
    } catch (error) {
        console.error('Error processing image:', error.message);
        res.status(500).json({ error: 'Error processing image' });
    }
});

// Endpoint pentru a obține istoricul cererilor din baza de date
app.get('/requests', async (req, res) => {
    console.log('Received requests GET');
    try {
        const pool = await sql.connect(process.env.AZURE_SQL_CONNECTION_STRING);
        const result = await pool.request().query('SELECT * FROM requests ORDER BY timestamp DESC');
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error retrieving requests:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Backend running on http://0.0.0.0:${port}`);
});