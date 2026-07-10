import assert from 'node:assert/strict';
import { validateVisitorRecords } from '../api/lib/validation.js';

const confidence = Object.fromEntries([
    'name', 'matric_number', 'staff_id', 'visitor_category', 'department', 'faculty',
    'hall', 'phone_number', 'parent_phone', 'phone_brand', 'phone_imei', 'laptop_brand',
    'laptop_imei', 'time_in', 'time_out', 'visit_date', 'security_officer', 'page_number'
].map(field => [field, 0.99]));

function record(fields, overrides = {}) {
    return {
        fields: { ...fields },
        confidence: { ...confidence, ...(overrides.confidence || {}) }
    };
}

const clean = validateVisitorRecords([
    record({
        name: 'Ada Visitor',
        matric_number: 'MAT-001',
        phone_number: '08012345678',
        parent_phone: '2348012345678',
        phone_imei: '123456789012345',
        time_in: '8:05 am',
        time_out: '17.30',
        visit_date: '12/03/2025'
    })
])[0];
assert.equal(clean.fields.phone_number, '+2348012345678');
assert.equal(clean.fields.parent_phone, '+2348012345678');
assert.equal(clean.fields.time_in, '08:05');
assert.equal(clean.fields.time_out, '17:30');
assert.equal(clean.fields.visit_date, '2025-03-12');
assert.equal(clean.fields.phone_imei, '123456789012345');
assert.equal(clean.validation_status, 'valid');
assert.equal(clean.review_status, 'pending');

const invalid = validateVisitorRecords([
    record({ name: 'No ID', phone_number: '12345', phone_imei: '1234', time_in: '25:90', visit_date: '2025-02-30' })
])[0];
assert.equal(invalid.validation_status, 'needs_review');
assert.ok(invalid.validation_errors.some(error => error.code === 'identity_required'));
assert.ok(invalid.validation_errors.some(error => error.code === 'invalid_phone'));
assert.ok(invalid.validation_errors.some(error => error.code === 'invalid_imei_length'));
assert.ok(invalid.validation_errors.some(error => error.code === 'invalid_time'));
assert.ok(invalid.validation_errors.some(error => error.code === 'invalid_date'));

const structural = validateVisitorRecords([
    record({ department: 'Security' }),
    {},
    record({ name: 'Valid', staff_id: 'STAFF-1', time_in: '10:00', time_out: '09:00' })
]);
assert.equal(structural.length, 2);
assert.equal(structural[0].validation_status, 'invalid');
assert.equal(structural[1].validation_status, 'needs_review');
assert.equal(structural[1].row_index, 2);
assert.ok(structural[1].validation_errors.some(error => error.code === 'time_order'));

const duplicates = validateVisitorRecords([
    record({ name: 'One', matric_number: 'MAT-1', phone_imei: '111111111111111' }),
    record({ name: 'Two', matric_number: 'MAT-1', phone_imei: '111111111111111' })
]);
assert.ok(duplicates.every(item => item.review_status === 'needs_review'));
assert.ok(duplicates.every(item => item.validation_errors.some(error => error.code === 'duplicate_imei')));
assert.ok(duplicates.every(item => item.validation_errors.some(error => error.code === 'duplicate_visitor')));

const lowConfidence = validateVisitorRecords([
    record(
        { name: 'Unclear', matric_number: 'MAT-2' },
        { confidence: { name: 0.5, matric_number: 0.5 } }
    )
])[0];
assert.equal(lowConfidence.review_status, 'needs_review');
assert.ok(lowConfidence.validation_errors.some(error => error.code === 'low_confidence'));
assert.ok(lowConfidence.validation_errors.some(error => error.code === 'low_overall_confidence'));

console.log('Validation tests passed');
