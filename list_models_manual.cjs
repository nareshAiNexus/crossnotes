const fs = require('fs');
const path = require('path');
const https = require('https');

const envPath = path.join(__dirname, '.env');
let apiKey = '';

try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    const match = envFile.match(/VITE_GEMINI_API_KEY=(.+)/);
    if (match) {
        apiKey = match[1].trim();
    }
} catch (e) {
    console.error('Error reading .env:', e);
}

if (!apiKey) {
    console.error('API Key not found in .env');
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error('API Error:', json.error);
            } else if (json.models) {
                console.log('Available Models:');
                json.models.forEach(m => {
                    if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                        console.log(m.name);
                    }
                });
            } else {
                console.log('Unexpected response:', json);
            }
        } catch (e) {
            console.error('JSON Parse Error:', e);
            console.log('Raw Data:', data);
        }
    });
}).on('error', (e) => {
    console.error('Request Error:', e);
});
