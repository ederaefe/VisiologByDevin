export const VISITOR_FIELDS = [
    'name',
    'matric_number',
    'staff_id',
    'visitor_category',
    'department',
    'faculty',
    'hall',
    'phone_number',
    'parent_phone',
    'phone_brand',
    'phone_imei',
    'laptop_brand',
    'laptop_imei',
    'time_in',
    'time_out',
    'visit_date',
    'security_officer',
    'page_number'
];

export const VISITOR_FIELD_SET = new Set(VISITOR_FIELDS);

export const FIELD_CONFIDENCE_THRESHOLD = 0.85;
export const OVERALL_CONFIDENCE_THRESHOLD = 0.90;

export const AI_MODEL_VERSION = 'gemini-2.5-flash';

const VISITOR_RESPONSE_SHAPE = JSON.stringify({
    fields: Object.fromEntries(VISITOR_FIELDS.map(field => [field, null])),
    confidence: Object.fromEntries(VISITOR_FIELDS.map(field => [field, 0.0]))
}, null, 2);

export const VISITOR_EXTRACTION_PROMPT = `
You are extracting data from a photographed handwritten visitor or attendance logbook page.
Detect the table structure, identify its data rows, and preserve the original row order.

Return one JSON object for each data row. Skip the header row and fully blank rows.
Every object must have exactly this shape:
${VISITOR_RESPONSE_SHAPE}

Use the exact canonical snake_case keys shown above. Missing or unreadable values must be null;
do not invent, infer, silently correct, or combine values. Preserve values as written, except that
confidence values must be numeric values from 0 to 1 indicating how clearly each field was read.
Return only a valid JSON array, with no markdown, code fences, commentary, or extra keys.
`;

export function createVisitorExtractionPrompt() {
    return VISITOR_EXTRACTION_PROMPT;
}
