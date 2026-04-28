import { db } from './firebase';
import {
    collection, doc, setDoc, updateDoc, getDocs, getDoc,
    query, where, deleteDoc, writeBatch, orderBy, onSnapshot
} from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Firestore REST ↔ JS SDK bridge
// ---------------------------------------------------------------------------
// Unity writes sessions via the Firestore REST API, which wraps every value
// in a type envelope:  { stringValue: ".." }  { doubleValue: 85.5 }  etc.
// The JS SDK returns those envelopes as plain objects, so we must unwrap them.

/**
 * Unwrap a single Firestore REST value object into a plain JS value.
 * Handles: stringValue, integerValue, doubleValue, booleanValue,
 *          nullValue, arrayValue, mapValue.
 */
export function deserializeFirestoreValue(val) {
    if (val === null || val === undefined) return val;
    if (typeof val !== 'object') return val;          // already a plain scalar

    if ('stringValue' in val) return val.stringValue;
    if ('integerValue' in val) return Number(val.integerValue);
    if ('doubleValue' in val) return Number(val.doubleValue);
    if ('booleanValue' in val) return val.booleanValue;
    if ('nullValue' in val) return null;

    if ('arrayValue' in val) {
        const items = val.arrayValue?.values ?? [];
        return items.map(deserializeFirestoreValue);
    }

    if ('mapValue' in val) {
        return deserializeFirestoreDoc(val.mapValue?.fields ?? {});
    }

    // Not a REST envelope – return as-is (already unwrapped by the JS SDK)
    return val;
}

/**
 * Unwrap a Firestore REST `fields` map into a plain JS object.
 * Works recursively for nested maps / arrays.
 */
export function deserializeFirestoreDoc(fields) {
    if (!fields || typeof fields !== 'object') return fields;
    const result = {};
    for (const [key, val] of Object.entries(fields)) {
        result[key] = deserializeFirestoreValue(val);
    }
    return result;
}

/**
 * Normalise a Firestore document snapshot.
 * If the document data looks like a REST-format `fields` map (i.e. every
 * value is an object with exactly one type key), run it through the
 * deserializer; otherwise return the plain data unchanged.
 */
function normalizeDoc(docSnap) {
    const raw = docSnap.data();
    if (!raw) return null;

    // Detect REST envelope: at least one field whose value is an object
    // containing a recognised Firestore type key.
    const typeKeys = new Set([
        'stringValue', 'integerValue', 'doubleValue',
        'booleanValue', 'nullValue', 'arrayValue', 'mapValue',
    ]);
    const isRestFormat = Object.values(raw).some(
        v => v && typeof v === 'object' && Object.keys(v).some(k => typeKeys.has(k))
    );

    return isRestFormat ? deserializeFirestoreDoc(raw) : raw;
}

// --- Therapist Profile ---

export const getTherapistProfile = async (uid) => {
    const docRef = doc(db, 'therapists', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
};

// --- Patients (scoped to therapist) ---

export const getPatients = async (uid) => {
    const patientsRef = collection(db, 'therapists', uid, 'patients');
    const querySnapshot = await getDocs(patientsRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createPatient = async (uid, patientData, generatedKey, therapistName) => {
    const docId = `pat_${generatedKey}`;
    const docRef = doc(db, 'therapists', uid, 'patients', docId);
    await setDoc(docRef, {
        full_name: patientData.name,
        assigned_therapist: therapistName,
        current_plan: patientData.plan.split(',').map(s => s.trim()),
        last_active: new Date().toISOString(),
        compliance_rate: 0,
        status: 'active',
        unique_key: generatedKey,
        therapist_id: uid
    });
    return docId;
};

export const getPatientById = async (uid, patientId) => {
    const docRef = doc(db, 'therapists', uid, 'patients', patientId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
};

export const deletePatientAndSessions = async (uid, patientId) => {
    // 1. Get all sessions for this patient (nested subcollection)
    const sessionsRef = collection(db, 'therapists', uid, 'patients', patientId, 'sessions');
    const querySnapshot = await getDocs(sessionsRef);

    // 2. Use a batch to delete all sessions and the patient doc atomically
    const batch = writeBatch(db);

    // Add session deletes to batch
    querySnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
    });

    // Add patient delete to batch
    const patientRef = doc(db, 'therapists', uid, 'patients', patientId);
    batch.delete(patientRef);

    // 3. Commit the batch
    await batch.commit();
};

// --- Sessions (nested under therapist > patient) ---

/**
 * Normalise a session timestamp.
 * Unity sends timestamps as Unix milliseconds (integer).
 * Convert to ISO string for display, or return as-is if already a string.
 */
function normalizeTimestamp(ts) {
    if (!ts) return new Date().toISOString();
    if (typeof ts === 'number') {
        return new Date(ts).toISOString();
    }
    return ts; // already a string
}

/**
 * Normalise error_flags from a session document.
 * Unity stores error_flags as a map { hiking: true, flexion: false, ... }.
 * Extract only the keys that are `true` and return as an array of strings.
 */
function extractActiveErrorFlags(errorFlags) {
    if (!errorFlags) return [];
    if (Array.isArray(errorFlags)) return errorFlags; // already an array
    if (typeof errorFlags === 'object') {
        return Object.entries(errorFlags)
            .filter(([, v]) => v === true)
            .map(([k]) => k);
    }
    return [];
}

/**
 * Normalise a raw session doc into the shape the UI expects.
 */
function normalizeSession(docSnap) {
    const data = normalizeDoc(docSnap);
    if (!data) return null;

    return {
        id: docSnap.id,
        patient_id: data.patient_id ?? '',
        therapist_id: data.therapist_id ?? '',
        exercise: data.exercise ?? 'unknown',
        timestamp: normalizeTimestamp(data.timestamp),
        accuracy: Number(data.accuracy) || 0,
        duration_sec: Number(data.duration_sec) || 0,
        total_reps: Number(data.total_reps) || 0,
        error_flags: extractActiveErrorFlags(data.error_flags),
        error_flags_raw: data.error_flags || {},
        recordingData: data.recordingData || null,
    };
}

/**
 * Fetch all sessions for a patient from the nested subcollection.
 * Path: therapists/{uid}/patients/{patientId}/sessions
 */
export const getPatientSessions = async (uid, patientId) => {
    const sessionsRef = collection(db, 'therapists', uid, 'patients', patientId, 'sessions');
    const querySnapshot = await getDocs(sessionsRef);

    const sessions = querySnapshot.docs
        .map(docSnap => normalizeSession(docSnap))
        .filter(Boolean);

    // Sort by timestamp descending (most recent first)
    return sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

/**
 * Subscribe to real-time session updates for a patient.
 * Returns an unsubscribe function.
 */
export const subscribeToPatientSessions = (uid, patientId, callback) => {
    const sessionsRef = collection(db, 'therapists', uid, 'patients', patientId, 'sessions');

    return onSnapshot(sessionsRef, (snapshot) => {
        const sessions = snapshot.docs
            .map(docSnap => normalizeSession(docSnap))
            .filter(Boolean)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        callback(sessions);
    }, (error) => {
        console.error('Session subscription error:', error);
    });
};

/**
 * Fetch a single session by ID from the nested subcollection.
 * Requires therapist UID and patient ID to build the correct path.
 */
export const getSessionById = async (uid, patientId, sessionId) => {
    const docRef = doc(db, 'therapists', uid, 'patients', patientId, 'sessions', sessionId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return normalizeSession(docSnap);
    }
    return null;
};

/**
 * Search for a session across all patients of a therapist.
 * Used when we only have a sessionId but not patientId (e.g. direct URL navigation).
 */
export const findSessionAcrossPatients = async (uid, sessionId) => {
    const patientsRef = collection(db, 'therapists', uid, 'patients');
    const patientsSnap = await getDocs(patientsRef);

    for (const patientDoc of patientsSnap.docs) {
        const sessRef = doc(db, 'therapists', uid, 'patients', patientDoc.id, 'sessions', sessionId);
        const sessSnap = await getDoc(sessRef);
        if (sessSnap.exists()) {
            return {
                session: normalizeSession(sessSnap),
                patientId: patientDoc.id,
                patientName: patientDoc.data().full_name || patientDoc.id,
            };
        }
    }
    return null;
};

/**
 * Called after a new session is ingested (or can be triggered by a Cloud
 * Function). Updates the patient's last_active timestamp and recalculates
 * compliance_rate from all their sessions.
 *
 * @param {string} therapistUid  - Firestore UID of the owning therapist
 * @param {string} patientId     - e.g. "pat_ABC123"
 */
export const updatePatientAfterSession = async (therapistUid, patientId) => {
    try {
        const sessions = await getPatientSessions(therapistUid, patientId);
        if (sessions.length === 0) return;

        // Latest session timestamp → last_active
        const latest = sessions[0];
        const lastActive = latest.timestamp ?? new Date().toISOString();

        // Compliance: average accuracy across all sessions (capped 0-100)
        const avgAccuracy =
            sessions.reduce((sum, s) => sum + (Number(s.accuracy) || 0), 0) / sessions.length;
        const complianceRate = Math.min(100, Math.max(0, Math.round(avgAccuracy * 10) / 10));

        const patientRef = doc(db, 'therapists', therapistUid, 'patients', patientId);
        await updateDoc(patientRef, {
            last_active: lastActive,
            compliance_rate: complianceRate,
        });
    } catch (err) {
        console.warn('updatePatientAfterSession failed:', err);
    }
};

// --- Migration: Move global patients to therapist subcollection ---

export const getGlobalPatients = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, 'patients'));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching global patients:', error);
        return [];
    }
};

export const migrateGlobalPatientsToTherapist = async (uid, therapistName) => {
    const globalPatients = await getGlobalPatients();
    if (globalPatients.length === 0) return { migrated: 0 };

    const batch = writeBatch(db);
    let count = 0;

    for (const patient of globalPatients) {
        // Copy patient to therapist's subcollection
        const newRef = doc(db, 'therapists', uid, 'patients', patient.id);
        const { id, ...patientData } = patient;
        batch.set(newRef, {
            ...patientData,
            assigned_therapist: therapistName,
            therapist_id: uid
        });
        count++;
    }

    await batch.commit();

    // Optionally delete old global patients after migration
    const deleteBatch = writeBatch(db);
    for (const patient of globalPatients) {
        const oldRef = doc(db, 'patients', patient.id);
        deleteBatch.delete(oldRef);
    }
    await deleteBatch.commit();

    return { migrated: count };
};
