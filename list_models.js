import { config } from 'dotenv';
config();

const API_KEY = process.env.VITE_GEMINI_API_KEY;
const URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function listModels() {
    console.log('Fetching models with key:', API_KEY ? 'Present' : 'Missing');
    try {
        const res = await fetch(URL);
        const data = await res.json();

        if (data.error) {
            console.error('Error:', data.error);
            return;
        }

        if (data.models) {
            console.log('Available Models:');
            data.models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.log('No models found or unexpected format:', data);
        }
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

listModels();
