import {
    DEFAULT_TEMPLATE,
    FIELD_CONFIDENCE_THRESHOLD,
    OVERALL_CONFIDENCE_THRESHOLD,
    normalizeTemplate
} from './visitor-schema.js';

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

function prepareRecord(extractedRecord, rowIndex, templateFields) {
    const sourceFields = extractedRecord?.fields && typeof extractedRecord.fields === 'object'
        ? extractedRecord.fields
        : extractedRecord && typeof extractedRecord === 'object'
            ? extractedRecord
            : {};
    const sourceConfidence = extractedRecord?.confidence && typeof extractedRecord.confidence === 'object'
        ? extractedRecord.confidence
        : {};
    const data = {};
    const confidence = {};
    const rawExtra = {};

    for (const field of templateFields) {
        data[field.key] = cleanText(sourceFields[field.key]);
        confidence[field.key] = normalizeConfidence(sourceConfidence[field.key]);
    }
    for (const [key, value] of Object.entries(sourceFields)) {
        if (!templateFields.some(field => field.key === key) && key !== 'raw_extra') {
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
    if (extractedRecord?.raw_extra && typeof extractedRecord.raw_extra === 'object') {
        Object.assign(rawExtra, extractedRecord.raw_extra);
    }
    return { data, confidence, rawExtra, rowIndex };
}

function normalizedDedupeValue(value, type) {
    if (type === 'phone') return normalizePhone(value).digits;
    if (type === 'imei') return normalizeImei(value).digits;
    return isBlank(value) ? null : String(value).trim().toLowerCase();
}

function markNeedsReview(record) {
    record.validationStatus = record.validationStatus === 'invalid' ? 'invalid' : 'needs_review';
    record.reviewStatus = 'needs_review';
}

export function validateVisitorRecords(extractedRecords, templateDefinition = DEFAULT_TEMPLATE) {
    const template = normalizeTemplate(templateDefinition);
    const templateFields = template.fields;
    const fieldByKey = new Map(templateFields.map(field => [field.key, field]));
    const timeFields = templateFields.filter(field => field.type === 'time');
    const timeInField = fieldByKey.get('time_in') || timeFields[0];
    const timeOutField = fieldByKey.get('time_out') || timeFields[1];
    const identityFields = templateFields.filter(field => field.identity);
    const criticalFields = templateFields.filter(field => field.identity || field.required);
    const records = (Array.isArray(extractedRecords) ? extractedRecords : [])
        .map((record, index) => prepareRecord(record, index, templateFields))
        .filter(record => Object.values(record.data).some(value => !isBlank(value)));
    const dedupeValues = new Map();

    for (const record of records) {
        const { data, confidence } = record;
        const errors = [];
        if (identityFields.length > 0 && identityFields.every(field => isBlank(data[field.key]))) {
            addError(errors, 'record', 'missing_identity', 'Record has no value in any identity field.');
        }
        for (const field of templateFields.filter(item => item.required)) {
            if (isBlank(data[field.key])) {
                addError(errors, field.key, 'required', `${field.label} is required.`);
            }
        }

        for (const field of templateFields) {
            if (isBlank(data[field.key])) continue;
            if (field.type === 'phone') {
                const normalized = normalizePhone(data[field.key]);
                data[field.key] = normalized.value;
                if (!normalized.digits) {
                    addError(errors, field.key, 'invalid_phone', 'Phone number must be a Nigerian number in 11-digit or 234-prefixed format.');
                }
            } else if (field.type === 'imei') {
                const normalized = normalizeImei(data[field.key]);
                data[field.key] = normalized.value;
                if (normalized.digits.length !== 15) {
                    addError(errors, field.key, 'invalid_imei_length', 'IMEI must contain exactly 15 digits.');
                }
            } else if (field.type === 'time') {
                const normalized = normalizeTime(data[field.key]);
                if (!normalized) {
                    addError(errors, field.key, 'invalid_time', 'Time must be a valid 24-hour time.');
                } else {
                    data[field.key] = normalized;
                }
            } else if (field.type === 'date') {
                const normalized = normalizeDate(data[field.key]);
                if (!normalized) {
                    addError(errors, field.key, 'invalid_date', 'Date must be a valid date.');
                } else {
                    data[field.key] = normalized;
                }
            }
        }

        if (
            timeInField &&
            timeOutField &&
            data[timeInField.key] &&
            data[timeOutField.key] &&
            timeToMinutes(data[timeOutField.key]) < timeToMinutes(data[timeInField.key])
        ) {
            addError(errors, timeOutField.key, 'time_order', 'Time out cannot be earlier than time in.');
        }

        const presentFields = templateFields.filter(field => !isBlank(data[field.key]));
        const overallConfidence = presentFields.length === 0
            ? 0
            : presentFields.reduce((sum, field) => sum + confidence[field.key], 0) / presentFields.length;
        if (criticalFields.some(field =>
            !isBlank(data[field.key]) && confidence[field.key] < FIELD_CONFIDENCE_THRESHOLD
        )) {
            addError(errors, 'confidence', 'low_confidence', 'A critical field has low extraction confidence.');
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

        for (const field of templateFields.filter(item => item.dedupe_key)) {
            const value = normalizedDedupeValue(data[field.key], field.type);
            if (value) {
                const key = `${field.key}:${value}`;
                const matching = dedupeValues.get(key) || [];
                matching.push({ record, field });
                dedupeValues.set(key, matching);
            }
        }
    }

    for (const [dedupeKey, matchingRecords] of dedupeValues.entries()) {
        if (matchingRecords.length < 2) continue;
        const [, value] = dedupeKey.split(':');
        matchingRecords.forEach(({ record, field }) => {
            addError(record.errors, field.key, 'duplicate_value', `${field.label} value ${value} appears more than once in this batch.`);
            markNeedsReview(record);
        });
    }

    return records.map(record => ({
        data: record.data,
        confidence: record.confidence,
        overall_confidence: record.overallConfidence,
        validation_status: record.validationStatus,
        validation_errors: record.errors,
        review_status: record.reviewStatus,
        raw_extra: record.rawExtra,
        row_index: record.rowIndex
    }));
}
