import { db } from './firebase';
import {
    collection, doc, setDoc, updateDoc, getDocs, getDoc,
    query, where, deleteDoc, writeBatch, orderBy, onSnapshot
} from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Supabase Configuration
// ---------------------------------------------------------------------------
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://yuqrjilbdvxcenivppci.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1cXJqaWxiZHZ4Y2VuaXZwcGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NDA4MzMsImV4cCI6MjA5MzAxNjgzM30.r94G_PBHG5xab1-jBdiSgtOxdtnD_7lD4r1To5Kp9L0';

// ---------------------------------------------------------------------------
// Firestore for Patient/Therapist data (unchanged)
// ---------------------------------------------------------------------------

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
    return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
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
    // Delete sessions from Supabase
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/sessions?patient_id=eq.${patientId}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
    } catch (err) {
        console.warn('Failed to delete sessions from Supabase:', err);
    }

    // Delete patient doc from Firestore
    const patientRef = doc(db, 'therapists', uid, 'patients', patientId);
    await deleteDoc(patientRef);
};

// ---------------------------------------------------------------------------
// Sessions (NOW READING FROM SUPABASE)
// ---------------------------------------------------------------------------

/**
 * Normalise a timestamp to ISO string.
 */
function normalizeTimestamp(ts) {
    if (!ts) return new Date().toISOString();
    if (typeof ts === 'number') {
        return new Date(ts).toISOString();
    }
    if (typeof ts === 'string') {
        return ts;
    }
    return new Date().toISOString();
}

/**
 * Extract active error flags from Supabase JSONB field.
 */
function extractActiveErrorFlags(errorFlags) {
    if (!errorFlags) return [];
    if (Array.isArray(errorFlags)) return errorFlags;
    if (typeof errorFlags === 'object') {
        return Object.entries(errorFlags)
            .filter(([, v]) => v === true)
            .map(([k]) => k);
    }
    return [];
}

/**
 * Normalize a session object from Supabase to the shape the UI expects.
 */
function normalizeSession(data) {
    if (!data) return null;

    return {
        id: data.id ?? '',
        patient_id: data.patient_id ?? '',
        therapist_id: data.therapist_id ?? '',
        exercise: data.exercise ?? 'unknown',
        timestamp: normalizeTimestamp(data.timestamp),
        accuracy: Number(data.accuracy) || 0,
        duration_sec: Number(data.duration_sec) || 0,
        total_reps: Number(data.total_reps) || 0,
        total_frames: Number(data.total_frames) || 0,
        error_flags: extractActiveErrorFlags(data.error_flags),
        error_flags_raw: data.error_flags || {},
        recordingData: data.recordingData || null,
        recording_url: data.recording_url || null,
        recording_filename: data.recording_filename || null,
    };
}

/**
 * Fetch all sessions for a patient from Supabase.
 * GET /rest/v1/sessions?patient_id=eq.{patientId}&order=timestamp.desc
 */
export const getPatientSessions = async (uid, patientId) => {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/sessions?patient_id=eq.${patientId}&order=timestamp.desc`,
            {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );

        if (!response.ok) {
            console.error(`Failed to fetch sessions: HTTP ${response.status}`);
            return [];
        }

        const sessions = await response.json();
        return sessions.map(s => normalizeSession(s)).filter(Boolean);
    } catch (err) {
        console.error('Error fetching sessions from Supabase:', err);
        return [];
    }
};

/**
 * Subscribe to real-time session updates for a patient.
 * Uses polling since Supabase Realtime requires additional setup.
 * Returns an unsubscribe function.
 */
export const subscribeToPatientSessions = (uid, patientId, callback) => {
    let cancelled = false;

    const poll = async () => {
        while (!cancelled) {
            try {
                const sessions = await getPatientSessions(uid, patientId);
                if (!cancelled) {
                    callback(sessions);
                }
            } catch (err) {
                console.error('Session poll error:', err);
            }
            // Poll every 5 seconds
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    };

    poll();

    return () => { cancelled = true; };
};

/**
 * Fetch a single session by ID from Supabase.
 */
export const getSessionById = async (uid, patientId, sessionId) => {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}&patient_id=eq.${patientId}`,
            {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );

        if (!response.ok) {
            console.error(`Failed to fetch session: HTTP ${response.status}`);
            return null;
        }

        const sessions = await response.json();
        if (sessions.length > 0) {
            return normalizeSession(sessions[0]);
        }
        return null;
    } catch (err) {
        console.error('Error fetching session from Supabase:', err);
        return null;
    }
};

/**
 * Search for a session across all patients of a therapist.
 * Scans all patients and checks if the session belongs to any of them.
 */
export const findSessionAcrossPatients = async (uid, sessionId) => {
    try {
        // First try to get session directly if we know patient_id
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}`,
            {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );

        if (response.ok) {
            const sessions = await response.json();
            if (sessions.length > 0) {
                const session = normalizeSession(sessions[0]);
                const patientId = session.patient_id;

                // Get patient name from Firestore
                const patient = await getPatientById(uid, patientId);
                return {
                    session,
                    patientId,
                    patientName: patient?.full_name || patientId,
                };
            }
        }
        return null;
    } catch (err) {
        console.error('Error finding session:', err);
        return null;
    }
};

/**
 * Update patient stats after a new session is added.
 */
export const updatePatientAfterSession = async (therapistUid, patientId) => {
    try {
        const sessions = await getPatientSessions(therapistUid, patientId);
        if (sessions.length === 0) return;

        const latest = sessions[0];
        const lastActive = latest.timestamp ?? new Date().toISOString();

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

// --- Migration: Move global patients to therapist subcollection (Firestore only) ---

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

    const deleteBatch = writeBatch(db);
    for (const patient of globalPatients) {
        const oldRef = doc(db, 'patients', patient.id);
        deleteBatch.delete(oldRef);
    }
    await deleteBatch.commit();

    return { migrated: count };
};

// ---------------------------------------------------------------------------
// Session Recording Download (Supabase Storage)
// ---------------------------------------------------------------------------

export const fetchRecordingData = async (recordingUrl) => {
    if (!recordingUrl) return null;

    try {
        const response = await fetch(recordingUrl);
        if (!response.ok) {
            console.error(`Failed to fetch recording: HTTP ${response.status}`);
            return null;
        }

        const buf = await response.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let text;

        // Check for gzip magic bytes (1F 8B)
        if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
            try {
                const ds = new DecompressionStream('gzip');
                const decompressedStream = new Response(buf).body.pipeThrough(ds);
                text = await new Response(decompressedStream).text();
            } catch (err) {
                console.error('DecompressionStream failed:', err);
                return null;
            }
        } else {
            text = new TextDecoder().decode(bytes);
        }

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (parseErr) {
            console.error('Failed to parse recording JSON:', parseErr);
            return null;
        }

        // Handle Unity's JsonHelper wrapper: { Items: [...] }
        if (parsed && Array.isArray(parsed.Items)) {
            return parsed.Items;
        }
        if (Array.isArray(parsed)) {
            return parsed;
        }

        console.warn('Recording data is not in expected format:', typeof parsed);
        return null;
    } catch (err) {
        console.error('Error fetching recording data:', err);
        return null;
    }
};
