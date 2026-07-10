// /api/process-scan.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const id = req.query.id || req.body.id;
    if (!id) {
        return res.status(400).json({ error: 'Missing scan job ID.' });
    }

    const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, GEMINI_API_KEY } = process.env;

    if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY || !GEMINI_API_KEY) {
        return res.status(500).json({ error: 'System configuration missing.' });
    }

    const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

    try {
        // 1. Fetch Job and Mark as Processing
        const { data: scanRecord, error: fetchError } = await supabase
            .from('visiolog_scans')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !scanRecord) {
            return res.status(404).json({ error: 'Scan job not found.' });
        }

        if (scanRecord.status === 'completed') {
            return res.status(200).json({ success: true, message: 'Already processed.', records: scanRecord.extracted_data });
        }

        await supabase
            .from('visiolog_scans')
            .update({ status: 'processing', error_message: null })
            .eq('id', id);

        // 2. Download file from Supabase Storage
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('logbooks')
            .download(scanRecord.filename);

        if (downloadError) throw new Error(`Failed to download image from storage: ${downloadError.message}`);

        const imageBuffer = Buffer.from(await fileData.arrayBuffer());
        const base64Data = imageBuffer.toString('base64');
        const mimeType = scanRecord.filename.endsWith('.png') ? 'image/png' : 'image/jpeg';

        // 3. Fetch current database schema to maintain column consistency
        const { data: dataRecord } = await supabase
            .from('visiolog_data')
            .select('value')
            .eq('key', 'server_data')
            .maybeSingle();

        let existingHeaders = [];
        let sampleRow = null;
        let currentData = [];

        if (dataRecord && Array.isArray(dataRecord.value)) {
            currentData = dataRecord.value;
            if (currentData.length > 0) {
                sampleRow = currentData[0];
                existingHeaders = Object.keys(sampleRow);
            }
        }

        // 4. Build Vision AI prompt
        let schemaContext = '';
        if (existingHeaders.length > 0) {
            schemaContext = `
EXISTING SCHEMA CONTEXT:
The dataset already uses these exact column headers: ${JSON.stringify(existingHeaders)}
Here is one sample row showing the expected format for each field:
${JSON.stringify(sampleRow)}

MATCHING RULES (follow strictly):
- If from the image you notice the headers take them then
- If a field in the new document clearly and confidently represents the same information as an existing header, reuse that EXACT header name (same spelling, case, and wording).
- Only create a new header if you are confident the field does not match any existing header in meaning.
- Do NOT create near-duplicate headers (e.g. do not create "Date" if "date" already exists, do not create "Officer" if "Officer Name" already exists). When in doubt about whether two headers mean the same thing, prefer reusing the existing one only if you are highly confident; otherwise create a new, clearly distinct header.
- If a row has no value for one of the existing headers, set that field to null. Do not omit the key.
`;
        }

        const prompt = `
You are extracting structured data from a photographed page. Your output will be merged into an existing dataset, so consistency with the existing schema matters.

${schemaContext}

EXTRACTION RULES:
1. Identify every column/field visible in the document, including handwritten annotations, stamps, marginal notes, and partially legible text — do not skip or summarize any visible data.
2. Map each field to an existing header if the matching rules above apply; otherwise infer a clear, descriptive new header.
3. Preserve all original values exactly as written — do not paraphrase, correct spelling, normalize formatting, or infer values that are not visibly present. If a value is illegible, set it to null then put your suggested value in bracket.
4. Each row in the document becomes one object in the output array.
5. Output strictly a valid JSON array. No conversational text, no markdown wrappers, no backticks, no explanations.
`;

        // 5. Query Gemini
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

        // 6. Clean and Parse output
        let structuredData;
        try {
            const startArray = responseText.indexOf('[');
            const startObject = responseText.indexOf('{');
            let startIdx = -1;
            let endIdx = -1;

            if (startArray !== -1 && (startObject === -1 || startArray < startObject)) {
                startIdx = startArray;
                endIdx = responseText.lastIndexOf(']');
            } else if (startObject !== -1) {
                startIdx = startObject;
                endIdx = responseText.lastIndexOf('}');
            }

            if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
                throw new Error("Could not find boundaries of JSON in model response");
            }

            const rawJson = responseText.substring(startIdx, endIdx + 1);
            const cleanedJson = rawJson
                .replace(/,\s*([\]}])/g, '$1')
                .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');

            structuredData = JSON.parse(cleanedJson);
        } catch (parseError) {
            console.error("Advanced JSON parsing failed, fallback to basic sanitization:", parseError);
            const sanitizedOutput = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
            structuredData = JSON.parse(sanitizedOutput);
        }

        if (!Array.isArray(structuredData)) {
            structuredData = [structuredData];
        }

        // 7. Deduplicate and merge rows
        const uniqueNewData = [];
        for (const newRow of structuredData) {
            if (typeof newRow !== 'object' || newRow === null) continue;
            let isDuplicate = false;

            // Check against existing database rows
            for (const existingRow of currentData) {
                if (typeof existingRow !== 'object' || existingRow === null) continue;
                const allKeys = new Set([...Object.keys(newRow), ...Object.keys(existingRow)]);
                let diffCount = 0;
                for (const key of allKeys) {
                    if (newRow[key] !== existingRow[key]) {
                        diffCount++;
                    }
                }
                if (diffCount <= 1) {
                    isDuplicate = true;
                    break;
                }
            }

            // Check against buffer of newly extracted rows
            if (!isDuplicate) {
                for (const addedRow of uniqueNewData) {
                    const allKeys = new Set([...Object.keys(newRow), ...Object.keys(addedRow)]);
                    let diffCount = 0;
                    for (const key of allKeys) {
                        if (newRow[key] !== addedRow[key]) {
                            diffCount++;
                        }
                    }
                    if (diffCount <= 1) {
                        isDuplicate = true;
                        break;
                    }
                }
            }

            if (!isDuplicate) {
                uniqueNewData.push(newRow);
            }
        }

        // 8. Update database and job records
        if (uniqueNewData.length > 0) {
            const mergedData = [...currentData, ...uniqueNewData];
            const { error: saveError } = await supabase
                .from('visiolog_data')
                .upsert({
                    key: 'server_data',
                    value: mergedData,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (saveError) throw saveError;
        }

        await supabase
            .from('visiolog_scans')
            .update({
                status: 'completed',
                extracted_data: structuredData
            })
            .eq('id', id);

        return res.status(200).json({ success: true, count: uniqueNewData.length, data: structuredData });

    } catch (err) {
        console.error("Processing Job Error:", err);
        await supabase
            .from('visiolog_scans')
            .update({ status: 'failed', error_message: err.message })
            .eq('id', id);

        return res.status(500).json({ error: err.message || "Failed to process scan." });
    }
}
