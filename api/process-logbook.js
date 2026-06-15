import { IncomingForm } from 'formidable';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

// Disable default body parser so Formidable can handle multipart/form-data
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    // Restrict access to POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Invalid request method. Please send a POST request.' });
    }

    try {
        // 1. Parse the incoming request for files and potential custom text fields
        const data = await new Promise((resolve, reject) => {
            const form = new IncomingForm();
            form.parse(req, (err, fields, files) => {
                if (err) return reject(err);
                resolve({ fields, files });
            });
        });

        const uploadedFile = Array.isArray(data.files.file) ? data.files.file[0] : data.files.file;
        
        if (!uploadedFile) {
            return res.status(400).json({ error: 'Missing image in the payload.' });
        }

        // 2. Validate environment configuration
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("Missing GEMINI_API_KEY environment variable.");
        }

        // 3. Read the image file into memory
        const imageBuffer = fs.readFileSync(uploadedFile.filepath);
        const base64Data = imageBuffer.toString('base64');
        const mimeType = uploadedFile.mimetype || 'image/jpeg';

        // 4. Initialize the Generative AI client
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // 5. Establish the extraction instructions
        const defaultPrompt = `
            Evaluate the provided document and transform the visual information into a well-structured JSON array containing objects.
            1. Identify column headers within the visual and map them as JSON keys.
            2. Infer appropriate logical keys if clear headers are absent.
            3. Output strictly a valid JSON array. Exclude all conversational text, markdown wrappers, or backticks.
        `;

        // Check if the frontend supplied custom instructions (like the strict logbook format)
        const userProvidedPrompt = Array.isArray(data.fields.customPrompt) 
            ? data.fields.customPrompt[0] 
            : data.fields.customPrompt;

        const finalPrompt = userProvidedPrompt || defaultPrompt;

        // 6. Execute the model request
        const result = await model.generateContent([
            finalPrompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            }
        ]);

        const responseText = result.response.text();
        
        // 7. Sanitize the response to strip out any residual markdown
        const sanitizedOutput = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const structuredData = JSON.parse(sanitizedOutput);

        // 8. Clean up the temporary file created by Formidable
        try {
            fs.unlinkSync(uploadedFile.filepath);
        } catch (cleanupError) {
            console.warn("Could not remove temporary file:", cleanupError);
        }

        // 9. Return the finalized data
        return res.status(200).json(structuredData);

    } catch (error) {
        console.error("Document Processing Error:", error);
        return res.status(500).json({ error: error.message || "Failed to process the payload." });
    }
}
