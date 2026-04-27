import { db } from './firebase';
import { collection, doc, setDoc, updateDoc, getDocs, getDoc, query, where, deleteDoc, writeBatch } from 'firebase/firestore';

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

    if ('stringValue'  in val) return val.stringValue;
    if ('integerValue' in val) return Number(val.integerValue);
    if ('doubleValue'  in val) return Number(val.doubleValue);
    if ('booleanValue' in val) return val.booleanValue;
    if ('nullValue'    in val) return null;

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
        compliance_rate: 100,
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
    // 1. Get all sessions for this patient
    const sessionsRef = collection(db, 'sessions');
    const q = query(sessionsRef, where('patient_id', '==', patientId));
    const querySnapshot = await getDocs(q);

    // 2. Use a batch to delete all sessions and the patient doc atomically
    const batch = writeBatch(db);

    // Add session deletes to batch
    querySnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
    });

    // Add patient delete to batch (now under therapist subcollection)
    const patientRef = doc(db, 'therapists', uid, 'patients', patientId);
    batch.delete(patientRef);

    // 3. Commit the batch
    await batch.commit();
};

// --- Sessions ---

export const getPatientSessions = async (patientId) => {
    const sessionsRef = collection(db, 'sessions');
    const q = query(sessionsRef, where('patient_id', '==', patientId));
    const querySnapshot = await getDocs(q);

    const sessions = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...normalizeDoc(docSnap),
    }));
    return sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

export const getSessionById = async (sessionId) => {
    const docRef = doc(db, 'sessions', sessionId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...normalizeDoc(docSnap) };
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
        const sessions = await getPatientSessions(patientId);
        if (sessions.length === 0) return;

        // Latest session timestamp → last_active
        const latest = sessions[0];
        const lastActive = latest.timestamp ?? new Date().toISOString();

        // Simple compliance: average accuracy across all sessions (capped 0-100)
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
