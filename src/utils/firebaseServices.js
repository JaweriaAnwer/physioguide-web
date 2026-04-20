import { db } from './firebase';
import { collection, doc, setDoc, getDocs, getDoc, query, where, deleteDoc, writeBatch } from 'firebase/firestore';

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

    const sessions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

export const getSessionById = async (sessionId) => {
    const docRef = doc(db, 'sessions', sessionId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
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
