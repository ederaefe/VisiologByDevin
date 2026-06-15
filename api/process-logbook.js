import { IncomingForm } from 'formidable';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

export const config = {
    api: { bodyParser: false },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    try {
        const data = await new Promise((resolve, reject) => {
            const form = new IncomingForm();
            form.parse(req, (err, fields, files) => {
                if (err) return reject(err);
                resolve({ fields, files });
            });
        });

        const uploadedFile = Array.isArray(data.files.file) ? data.files.file[0] : data.files.file;
        if (!uploadedFile) return res.status(400).json({ error: 'No image payload detected.' });

        const imageBuffer = fs.readFileSync(uploadedFile.filepath);
        const base64Data = imageBuffer.toString('base64');
        const mimeType = uploadedFile.mimetype || 'image/jpeg';

        if (!process.env.GEMINI_API_KEY) {
            throw new Error("API Key configuration error.");
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Use gemini-2.5-flash (Ensure this matches your API provider's exact model name)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // DYNAMIC PROMPT: The AI will now detect headers itself
        const prompt = `
            Analyze this document. Convert the visual data into a clean JSON array of objects.
            1. Look at the column headers in the image and use those as the JSON keys.
            2. If no headers exist, infer logical names.
            3. Return ONLY a valid JSON array. Do not include any text, backticks, or markdown.
        `;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: base64Data, mimeType: mimeType } }
        ]);

        const responseText = result.response.text();
        
        // Strict cleanup
        const sanitizedOutput = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        
        // Final safety check: ensure output is valid JSON before sending
        const structuredData = JSON.parse(sanitizedOutput);

        return res.status(200).json(structuredData);

    } catch (error) {
        console.error("Critical Backend Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
