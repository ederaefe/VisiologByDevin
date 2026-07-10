import { normalizeTemplate } from './visitor-schema.js';

function stripCodeFence(text) {
    return String(text || '')
        .replace(/^\uFEFF/, '')
        .replace(/^\s*```(?:csv)?\s*\r?\n?/i, '')
        .replace(/\r?\n?\s*```\s*$/i, '')
        .trim();
}

export function parseCsv(text) {
    const source = stripCodeFence(text);
    if (!source) return [];

    const rows = [];
    let row = [];
    let value = '';
    let inQuotes = false;

    for (let index = 0; index < source.length; index += 1) {
        const character = source[index];
        if (inQuotes) {
            if (character === '"') {
                if (source[index + 1] === '"') {
                    value += '"';
                    index += 1;
                } else {
                    inQuotes = false;
                }
            } else {
                value += character;
            }
        } else if (character === '"') {
            inQuotes = true;
        } else if (character === ',') {
            row.push(value);
            value = '';
        } else if (character === '\n') {
            row.push(value);
            rows.push(row);
            row = [];
            value = '';
        } else if (character === '\r') {
            if (source[index + 1] === '\n') index += 1;
            row.push(value);
            rows.push(row);
            row = [];
            value = '';
        } else {
            value += character;
        }
    }

    if (inQuotes) throw new Error('Unterminated quoted CSV field.');
    row.push(value);
    rows.push(row);
    return rows;
}

function hasCleanHeaderMapping(header, fieldKeys) {
    if (header.length === 0 || header.some(cell => !cell.trim())) return false;
    const seen = new Set();
    return header.every(cell => {
        const key = cell.trim();
        if (!fieldKeys.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function parseExtractionCsv(text, templateDefinition) {
    const template = normalizeTemplate(templateDefinition);
    const fieldKeys = new Set(template.fields.map(field => field.key));
    const rows = parseCsv(text);
    if (rows.length < 2) return [];

    const header = rows[0];
    const useHeaderMapping = hasCleanHeaderMapping(header, fieldKeys);
    const columnKeys = useHeaderMapping
        ? header.map(cell => cell.trim())
        : template.fields.map(field => field.key);

    return rows.slice(1)
        .filter(row => row.some(cell => cell.trim() !== ''))
        .map(row => {
            const fields = Object.fromEntries(template.fields.map(field => [field.key, null]));
            const confidence = Object.fromEntries(template.fields.map(field => [field.key, 0]));
            row.forEach((cell, index) => {
                const key = columnKeys[index];
                if (!fieldKeys.has(key)) return;
                const value = cell.trim() === '' ? null : cell;
                fields[key] = value;
                confidence[key] = value === null ? 0 : 1.0;
            });
            return { fields, confidence };
        });
}
