import {
    FIELD_CONFIDENCE_THRESHOLD,
    OVERALL_CONFIDENCE_THRESHOLD,
    VISITOR_FIELDS
} from './visitor-schema.js';

const IDENTITY_FIELDS = ['name', 'matric_number', 'staff_id'];
const CRITICAL_FIELDS = ['name', 'matric_number', 'staff_id'];
const PHONE_FIELDS = ['phone_number', 'parent_phone'];
const IMEI_FIELDS = ['phone_imei', 'laptop_imei'];

function isBlank(value) {
    return value === null || value === undefined || String(value).trim() === '';
}

function cleanText(value) {
    return isBlank(value) ? null : String(value).trim();
}

function addError(errors, field, code, message) {
    if (!errors.some(error => error.field === field && error.code === code)) {
        errors.push({ field, code, message });
    }
}

function normalizeConfidence(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.min(1, Math.max(0, number));
}

function normalizePhone(value) {
    if (isBlank(value)) return { value: null, digits: null };

    const original = String(value).trim();
    const digits = original.replace(/\D/g, '');
    let normalizedDigits = null;

    if (/^0\d{10}$/.test(digits)) {
        normalizedDigits = `234${digits.slice(1)}`;
    } else if (/^234\d{10}$/.test(digits)) {
        normalizedDigits = digits;
    }

    return {
        value: normalizedDigits ? `+${normalizedDigits}` : original,
        digits: normalizedDigits
    };
}

function normalizeImei(value) {
    if (isBlank(value)) return { value: null, digits: null };
    const original = String(value).trim();
    const digits = original.replace(/\D/g, '');
    return { value: digits || original, digits };
}

function normalizeTime(value) {
    if (isBlank(value)) return null;
    const text = String(value).trim().toLowerCase().replace(/\s+/g, ' ');
    let match = text.match(/^(\d{1,2})(?::|\.)(\d{2})\s*(am|pm)?$/);
    if (!match) {
        const hourOnlyMatch = text.match(/^(\d{1,2})\s*(am|pm)$/);
        if (hourOnlyMatch) {
            match = [hourOnlyMatch[0], hourOnlyMatch[1], '00', hourOnlyMatch[2]];
        }
    }
    if (!match) return null;

    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const meridiem = match[3];

    if (meridiem) {
        if (hour < 1 || hour > 12 || minute > 59) return null;
        if (meridiem === 'am' && hour === 12) hour = 0;
        if (meridiem === 'pm' && hour !== 12) hour += 12;
    } else if (hour > 23 || minute > 59) {
        return null;
    }

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function normalizeDate(value) {
    if (isBlank(value)) return null;
    const text = String(value).trim();
    let year;
    let month;
    let day;
    let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
        year = Number(match[1]);
        month = Number(match[2]);
        day = Number(match[3]);
    } else {
        match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (!match) return null;
        day = Number(match[1]);
        month = Number(match[2]);
        year = Number(match[3]);
    }

    const date = new Date(Date.UTC(year, month - 1, day));
    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null;
    }
    return `${year.toString().padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function timeToMinutes(value) {
    if (!value) return null;
    const [hour, minute] = value.split(':').map(Number);
    return hour * 60 + minute;
}

function prepareRecord(extractedRecord, rowIndex) {
    const sourceFields = extractedRecord?.fields && typeof extractedRecord.fields === 'object'
        ? extractedRecord.fields
        : extractedRecord && typeof extractedRecord === 'object'
            ? extractedRecord
            : {};
    const sourceConfidence = extractedRecord?.confidence && typeof extractedRecord.confidence === 'object'
        ? extractedRecord.confidence
        : {};
    const fields = {};
    const confidence = {};
    const rawExtra = {};

    for (const field of VISITOR_FIELDS) {
        fields[field] = cleanText(sourceFields[field]);
        confidence[field] = normalizeConfidence(sourceConfidence[field]);
    }

    for (const [key, value] of Object.entries(sourceFields)) {
        if (!VISITOR_FIELDS.includes(key) && key !== 'raw_extra') {
            rawExtra[key] = value;
        }
    }
    if (extractedRecord && typeof extractedRecord === 'object') {
        for (const [key, value] of Object.entries(extractedRecord)) {
            if (key !== 'fields' && key !== 'confidence' && key !== 'raw_extra') {
                rawExtra[key] = value;
            }
        }
    }
    if (sourceFields.raw_extra && typeof sourceFields.raw_extra === 'object') {
        Object.assign(rawExtra, sourceFields.raw_extra);
    }

    return { fields, confidence, rawExtra, rowIndex };
}

export function validateVisitorRecords(extractedRecords) {
    const records = (Array.isArray(extractedRecords) ? extractedRecords : [])
        .map(prepareRecord)
        .filter(record => Object.values(record.fields).some(value => !isBlank(value)));
    const seenImeis = new Map();
    const seenMatric = new Map();
    const seenPhoneImei = new Map();

    for (const record of records) {
        const { fields, confidence } = record;
        const errors = [];

        if (IDENTITY_FIELDS.every(field => isBlank(fields[field]))) {
            addError(errors, 'record', 'missing_identity', 'Record has no name, matric number, or staff ID.');
        }
        if (isBlank(fields.name)) {
            addError(errors, 'name', 'required', 'Name is required.');
        }
        if (isBlank(fields.matric_number) && isBlank(fields.staff_id)) {
            addError(errors, 'matric_number', 'identity_required', 'At least one of matric_number or staff_id is required.');
        }

        for (const field of PHONE_FIELDS) {
            if (!isBlank(fields[field])) {
                const normalized = normalizePhone(fields[field]);
                fields[field] = normalized.value;
                if (!normalized.digits) {
                    addError(errors, field, 'invalid_phone', 'Phone number must be a Nigerian number in 11-digit or 234-prefixed format.');
                }
            }
        }

        for (const field of IMEI_FIELDS) {
            if (!isBlank(fields[field])) {
                const normalized = normalizeImei(fields[field]);
                fields[field] = normalized.value;
                if (normalized.digits.length !== 15) {
                    addError(errors, field, 'invalid_imei_length', 'IMEI must contain exactly 15 digits.');
                }
                if (normalized.digits) {
                    const existing = seenImeis.get(normalized.digits) || [];
                    existing.push({ record, field });
                    seenImeis.set(normalized.digits, existing);
                }
                if (field === 'phone_imei' && normalized.digits) {
                    const existing = seenPhoneImei.get(normalized.digits) || [];
                    existing.push(record);
                    seenPhoneImei.set(normalized.digits, existing);
                }
            }
        }

        for (const field of ['time_in', 'time_out']) {
            if (!isBlank(fields[field])) {
                const normalized = normalizeTime(fields[field]);
                if (!normalized) {
                    addError(errors, field, 'invalid_time', 'Time must be a valid 24-hour time.');
                } else {
                    fields[field] = normalized;
                }
            }
        }

        if (fields.time_in && fields.time_out && timeToMinutes(fields.time_out) < timeToMinutes(fields.time_in)) {
            addError(errors, 'time_out', 'time_order', 'Time out cannot be earlier than time in.');
        }

        if (!isBlank(fields.visit_date)) {
            const normalized = normalizeDate(fields.visit_date);
            if (!normalized) {
                addError(errors, 'visit_date', 'invalid_date', 'Visit date must be a valid date.');
            } else {
                fields.visit_date = normalized;
            }
        }

        const presentFields = VISITOR_FIELDS.filter(field => !isBlank(fields[field]));
        const overallConfidence = presentFields.length === 0
            ? 0
            : presentFields.reduce((sum, field) => sum + confidence[field], 0) / presentFields.length;
        const lowConfidenceCriticalField = CRITICAL_FIELDS.some(field =>
            !isBlank(fields[field]) && confidence[field] < FIELD_CONFIDENCE_THRESHOLD
        );
        if (lowConfidenceCriticalField) {
            addError(errors, 'confidence', 'low_confidence', 'A critical identity field has low extraction confidence.');
        }
        if (overallConfidence < OVERALL_CONFIDENCE_THRESHOLD) {
            addError(errors, 'confidence', 'low_overall_confidence', 'Overall extraction confidence is below the review threshold.');
        }

        record.errors = errors;
        record.validationStatus = errors.some(error => error.code === 'missing_identity')
            ? 'invalid'
            : errors.length > 0 ? 'needs_review' : 'valid';
        record.overallConfidence = Number(overallConfidence.toFixed(4));
        record.reviewStatus = errors.length > 0 ? 'needs_review' : 'pending';
    }

    for (const [imei, matchingRecords] of seenImeis.entries()) {
        if (matchingRecords.length > 1) {
            matchingRecords.forEach(({ record, field }) => {
                addError(record.errors, field, 'duplicate_imei', `IMEI ${imei} appears more than once in this batch.`);
                record.validationStatus = record.validationStatus === 'invalid' ? 'invalid' : 'needs_review';
                record.reviewStatus = 'needs_review';
            });
        }
    }

    for (const [imei, matchingRecords] of seenPhoneImei.entries()) {
        if (matchingRecords.length > 1) {
            matchingRecords.forEach(record => {
                addError(record.errors, 'phone_imei', 'duplicate_visitor', `Phone IMEI ${imei} identifies a possible duplicate visitor in this batch.`);
                record.validationStatus = record.validationStatus === 'invalid' ? 'invalid' : 'needs_review';
                record.reviewStatus = 'needs_review';
            });
        }
    }

    for (const record of records) {
        const matric = record.fields.matric_number?.toLowerCase();
        if (matric) {
            const matchingRecords = seenMatric.get(matric) || [];
            matchingRecords.push(record);
            seenMatric.set(matric, matchingRecords);
        }
    }
    for (const [matric, matchingRecords] of seenMatric.entries()) {
        if (matchingRecords.length > 1) {
            matchingRecords.forEach(record => {
                addError(record.errors, 'matric_number', 'duplicate_visitor', `Matric number ${matric} identifies a possible duplicate visitor in this batch.`);
                record.validationStatus = record.validationStatus === 'invalid' ? 'invalid' : 'needs_review';
                record.reviewStatus = 'needs_review';
            });
        }
    }

    return records.map(record => ({
        fields: record.fields,
        confidence: record.confidence,
        overall_confidence: record.overallConfidence,
        validation_status: record.validationStatus,
        validation_errors: record.errors,
        review_status: record.reviewStatus,
        raw_extra: record.rawExtra,
        row_index: record.rowIndex
    }));
}
