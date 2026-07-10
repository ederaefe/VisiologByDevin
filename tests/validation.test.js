import assert from 'node:assert/strict';
import {
    DEFAULT_SECURITY_GATE_TEMPLATE,
    STARTER_TEMPLATES,
    createExtractionPrompt
} from '../api/lib/visitor-schema.js';
import { parseCsv, parseExtractionCsv } from '../api/lib/csv-parser.js';
import { validateVisitorRecords } from '../api/lib/validation.js';

function confidenceFor(template, value = 0.99) {
    return Object.fromEntries(template.fields.map(field => [field.key, value]));
}

function record(template, data, confidence = 0.99, overrides = {}) {
    return {
        fields: { ...data },
        confidence: {
            ...confidenceFor(template, confidence),
            ...(overrides.confidence || {})
        }
    };
}

const security = DEFAULT_SECURITY_GATE_TEMPLATE;
const clean = validateVisitorRecords([
    record(security, {
        name: 'Ada Visitor',
        matric_number: 'MAT-001',
        phone_number: '08012345678',
        parent_phone: '2348012345678',
        phone_imei: '123456789012345',
        time_in: '8:05 am',
        time_out: '17.30',
        visit_date: '12/03/2025'
    })
], security)[0];
assert.equal(clean.data.phone_number, '+2348012345678');
assert.equal(clean.data.parent_phone, '+2348012345678');
assert.equal(clean.data.time_in, '08:05');
assert.equal(clean.data.time_out, '17:30');
assert.equal(clean.data.visit_date, '2025-03-12');
assert.equal(clean.validation_status, 'valid');
assert.equal(clean.review_status, 'pending');

const invalid = validateVisitorRecords([
    record(security, {
        name: 'No ID',
        phone_number: '12345',
        phone_imei: '1234',
        time_in: '25:90',
        visit_date: '2025-02-30'
    })
], security)[0];
assert.equal(invalid.validation_status, 'needs_review');
assert.ok(invalid.validation_errors.some(error => error.code === 'invalid_phone'));
assert.ok(invalid.validation_errors.some(error => error.code === 'invalid_imei_length'));
assert.ok(invalid.validation_errors.some(error => error.code === 'invalid_time'));
assert.ok(invalid.validation_errors.some(error => error.code === 'invalid_date'));

const structural = validateVisitorRecords([
    record(security, { department: 'Security' }),
    {},
    record(security, {
        name: 'Valid',
        staff_id: 'STAFF-1',
        time_in: '10:00',
        time_out: '09:00'
    })
], security);
assert.equal(structural.length, 2);
assert.equal(structural[0].validation_status, 'invalid');
assert.equal(structural[1].validation_status, 'needs_review');
assert.equal(structural[1].row_index, 2);
assert.ok(structural[1].validation_errors.some(error => error.code === 'time_order'));

const duplicates = validateVisitorRecords([
    record(security, {
        name: 'One',
        matric_number: 'MAT-1',
        phone_imei: '111111111111111'
    }),
    record(security, {
        name: 'Two',
        matric_number: 'MAT-1',
        phone_imei: '111111111111111'
    })
], security);
assert.ok(duplicates.every(item => item.review_status === 'needs_review'));
assert.ok(duplicates.every(item => item.validation_errors.some(error => error.code === 'duplicate_value')));

const classroom = STARTER_TEMPLATES.find(template => template.key === 'classroom_attendance');
const classroomClean = validateVisitorRecords([
    record(classroom, {
        name: 'Student One',
        matric_number: 'MAT-101',
        department: 'Physics',
        level: '200',
        course_code: 'PHY201',
        date: '01/04/2025',
        time_in: '09.00',
        time_out: '10:30'
    })
], classroom)[0];
assert.equal(classroomClean.data.date, '2025-04-01');
assert.equal(classroomClean.data.time_in, '09:00');
assert.equal(classroomClean.validation_status, 'valid');

const classroomMissing = validateVisitorRecords([
    record(classroom, { department: 'Physics' })
], classroom)[0];
assert.equal(classroomMissing.validation_status, 'invalid');
assert.ok(classroomMissing.validation_errors.some(error => error.code === 'missing_identity'));
assert.ok(classroomMissing.validation_errors.some(error => error.code === 'required'));

const lowConfidence = validateVisitorRecords([
    record(
        classroom,
        { name: 'Unclear', matric_number: 'MAT-2', date: '2025-04-01' },
        0.99,
        { confidence: { name: 0.5, matric_number: 0.5 } }
    )
], classroom)[0];
assert.equal(lowConfidence.review_status, 'needs_review');
assert.ok(lowConfidence.validation_errors.some(error => error.code === 'low_confidence'));
assert.ok(lowConfidence.validation_errors.some(error => error.code === 'low_overall_confidence'));

const csvSample = [
    'department,name,date',
    'Physics,"Doe, Jane",',
    'Chemistry,"O""Neil, Pat",01/04/2025'
].join('\n');
const csvRecords = parseExtractionCsv(csvSample, classroom);
assert.equal(csvRecords.length, 2);
assert.equal(csvRecords[0].fields.name, 'Doe, Jane');
assert.equal(csvRecords[0].fields.department, 'Physics');
assert.equal(csvRecords[0].fields.date, null);
assert.equal(csvRecords[0].confidence.name, 1.0);
assert.equal(csvRecords[0].confidence.date, 0);
assert.equal(csvRecords[1].fields.name, 'O"Neil, Pat');
assert.equal(csvRecords[1].fields.date, '01/04/2025');

const positionalRecords = parseExtractionCsv(
    'unknown,also_unknown\nPositional Name,Physics',
    classroom
);
assert.equal(positionalRecords[0].fields.name, 'Positional Name');
assert.equal(positionalRecords[0].fields.matric_number, 'Physics');

const multilineRows = parseCsv('name,department\n"Ada\nVisitor",Physics');
assert.equal(multilineRows[1][0], 'Ada\nVisitor');

const extractionPrompt = createExtractionPrompt(classroom);
assert.match(extractionPrompt, /name,matric_number,department,level,course_code,date,time_in,time_out/);
assert.match(extractionPrompt, /Return ONLY raw CSV/);
assert.doesNotMatch(extractionPrompt, /JSON array|confidence object/i);

console.log('CSV parser sanity:', JSON.stringify(csvRecords, null, 2));
console.log('Validation tests passed');
