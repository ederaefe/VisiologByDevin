import { IncomingForm } from 'formidable';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

// Vercel Configuration: Disable the default body parser so Formidable can handle the raw image
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    // Enforce POST requests only
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
        // 1. Parse the incoming image from the frontend
        const data = await new Promise((resolve, reject) => {
            const form = new IncomingForm();
            form.parse(req, (err, fields, files) => {
                if (err) return reject(err);
                resolve({ fields, files });
            });
        });

        const uploadedFile = Array.isArray(data.files.file) ? data.files.file[0] : data.files.file;
        
        if (!uploadedFile) {
            return res.status(400).json({ error: 'No image payload detected.' });
        }

        // 2. Read the image into memory for the Gemini API
        const imageBuffer = fs.readFileSync(uploadedFile.filepath);
        const base64Data = imageBuffer.toString('base64');
        const mimeType = uploadedFile.mimetype || 'image/jpeg';

        // 3. Initialize the Gemini SDK using your secure Vercel Environment Variable
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // 4. The precise extraction instructions
        const prompt = `
            Analyze this logbook document. Extract the data into a strict JSON array of objects.
            Each object must represent one row/entry and contain exactly these keys:
            - "date": String (Format: YYYY-MM-DD)
            - "unitId": String
            - "operator": String
            - "duration": Number (in minutes)
            - "status": String (Must be either "Cleared" or "Flagged")
            - "notes": String (Brief summary of any remarks)

            Respond ONLY with the raw JSON array. Do not include markdown formatting, backticks, or conversational text.
        `;

        // 5. Send to Gemini
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            }
        ]);

        const responseText = result.response.text();
        
        // 6. Clean the output to ensure it is perfect JSON
        const sanitizedOutput = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const structuredData = JSON.parse(sanitizedOutput);

        // 7. Send the data back to the webpage
        return res.status(200).json(structuredData);

    } catch (error) {
        console.error("Ingestion Error:", error);
        return res.status(500).json({ error: "Failed to process the document payload." });
    }
          }
          
