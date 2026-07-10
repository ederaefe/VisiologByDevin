export const FIELD_TYPES = {
    text: { label: 'Text', description: 'Free-form text' },
    name: { label: 'Name', description: 'Person name; required when configured' },
    phone: { label: 'Phone number', description: 'Nigerian local or +234 phone number' },
    imei: { label: 'IMEI', description: 'Digits with an expected length of 15' },
    time: { label: 'Time', description: 'Normalized to 24-hour HH:MM' },
    date: { label: 'Date', description: 'Normalized to ISO YYYY-MM-DD' },
    number: { label: 'Number', description: 'Numeric value preserved as text' }
};

export const FIELD_CONFIDENCE_THRESHOLD = 0.85;
export const OVERALL_CONFIDENCE_THRESHOLD = 0.90;
export const AI_MODEL_VERSION = 'gemini-2.5-flash';

const SECURITY_GATE_FIELDS = [
    ['name', 'Name', 'name', true, true, false],
    ['matric_number', 'Matric Number', 'text', false, true, true],
    ['staff_id', 'Staff ID', 'text', false, true, false],
    ['visitor_category', 'Visitor Category', 'text', false, false, false],
    ['department', 'Department', 'text', false, false, false],
    ['faculty', 'Faculty', 'text', false, false, false],
    ['hall', 'Hall of Residence', 'text', false, false, false],
    ['phone_number', 'Phone Number', 'phone', false, false, false],
    ['parent_phone', 'Parent/Guardian Number', 'phone', false, false, false],
    ['phone_brand', 'Phone Brand', 'text', false, false, false],
    ['phone_imei', 'Phone IMEI', 'imei', false, false, true],
    ['laptop_brand', 'Laptop Brand', 'text', false, false, false],
    ['laptop_imei', 'Laptop IMEI', 'imei', false, false, false],
    ['time_in', 'Time In', 'time', false, false, false],
    ['time_out', 'Time Out', 'time', false, false, false],
    ['visit_date', 'Visit Date', 'date', false, false, false],
    ['security_officer', 'Security Officer', 'text', false, false, false],
    ['page_number', 'Page Number', 'number', false, false, false]
];

function fieldsFromRows(rows) {
    return rows.map(([key, label, type, required, identity, dedupe_key]) => ({
        key,
        label,
        type,
        required,
        identity,
        dedupe_key
    }));
}

export const DEFAULT_SECURITY_GATE_TEMPLATE = {
    key: 'security_gate',
    name: 'Security Gate / Visitor',
    industry: 'Security',
    is_default: true,
    fields: fieldsFromRows(SECURITY_GATE_FIELDS)
};

export const STARTER_TEMPLATES = [
    DEFAULT_SECURITY_GATE_TEMPLATE,
    {
        key: 'classroom_attendance',
        name: 'Classroom Attendance',
        industry: 'Education',
        is_default: false,
        fields: fieldsFromRows([
            ['name', 'Name', 'name', true, true, false],
            ['matric_number', 'Matric Number', 'text', false, true, true],
            ['department', 'Department', 'text', false, false, false],
            ['level', 'Level', 'number', false, false, false],
            ['course_code', 'Course Code', 'text', false, false, false],
            ['date', 'Date', 'date', true, false, false],
            ['time_in', 'Time In', 'time', false, false, false],
            ['time_out', 'Time Out', 'time', false, false, false]
        ])
    },
    {
        key: 'hospital_registry',
        name: 'Hospital Registry',
        industry: 'Healthcare',
        is_default: false,
        fields: fieldsFromRows([
            ['visitor_name', 'Visitor Name', 'name', true, true, false],
            ['patient_name', 'Patient Name', 'name', false, true, false],
            ['patient_id', 'Patient ID', 'text', false, false, false],
            ['ward', 'Ward', 'text', false, false, false],
            ['relationship', 'Relationship', 'text', false, false, false],
            ['phone_number', 'Phone Number', 'phone', false, false, true],
            ['time_in', 'Time In', 'time', false, false, false],
            ['time_out', 'Time Out', 'time', false, false, false],
            ['visit_date', 'Visit Date', 'date', false, false, false]
        ])
    }
];

export const DEFAULT_TEMPLATE = DEFAULT_SECURITY_GATE_TEMPLATE;

export function normalizeTemplate(template = DEFAULT_TEMPLATE) {
    const source = template && typeof template === 'object' ? template : DEFAULT_TEMPLATE;
    const fields = Array.isArray(source.fields) ? source.fields : [];
    const normalizedFields = fields
        .filter(field => field && typeof field.key === 'string' && field.key.trim())
        .map(field => ({
            key: field.key.trim(),
            label: field.label || field.key,
            type: FIELD_TYPES[field.type] ? field.type : 'text',
            required: field.required === true,
            identity: field.identity === true,
            dedupe_key: field.dedupe_key === true
        }));

    return {
        ...DEFAULT_TEMPLATE,
        ...source,
        fields: normalizedFields.length ? normalizedFields : DEFAULT_TEMPLATE.fields
    };
}

export function createExtractionPrompt(template = DEFAULT_TEMPLATE) {
    const activeTemplate = normalizeTemplate(template);
    const fieldsShape = Object.fromEntries(activeTemplate.fields.map(field => [field.key, null]));
    const confidenceShape = Object.fromEntries(activeTemplate.fields.map(field => [field.key, 0.0]));
    const definitions = activeTemplate.fields
        .map(field => `- ${field.key}: ${field.label} (${field.type})`)
        .join('\n');

    return `
You are extracting data from a photographed handwritten ${activeTemplate.name} logbook page.
This template is for the ${activeTemplate.industry} industry. Detect the table structure,
identify its data rows, and preserve the original row order.

Return one JSON object for each data row. Skip the header row and fully blank rows.
Every object must have exactly this shape:
${JSON.stringify({ fields: fieldsShape, confidence: confidenceShape }, null, 2)}

Template fields:
${definitions}

Use the exact canonical snake_case keys shown in the fields and confidence objects.
Missing or unreadable values must be null; do not invent, infer, silently correct, or combine
values. Preserve values as written, except confidence values must be numeric values from 0 to 1
indicating how clearly each field was read.
Return only a valid JSON array, with no markdown, code fences, commentary, or extra keys.
`;
}

export const createVisitorExtractionPrompt = createExtractionPrompt;
export const VISITOR_FIELDS = DEFAULT_SECURITY_GATE_TEMPLATE.fields.map(field => field.key);
export const VISITOR_FIELD_SET = new Set(VISITOR_FIELDS);
export const VISITOR_EXTRACTION_PROMPT = createExtractionPrompt(DEFAULT_SECURITY_GATE_TEMPLATE);
