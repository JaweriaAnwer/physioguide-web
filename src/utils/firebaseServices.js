import { db } from './firebase';
import { collection, doc, setDoc, getDocs, getDoc, query, where, deleteDoc, writeBatch } from 'firebase/firestore';

// --- Patients ---

export const getPatients = async () => {
    const querySnapshot = await getDocs(collection(db, 'patients'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createPatient = async (patientData, generatedKey) => {
    const docId = `pat_${generatedKey}`;
    const docRef = doc(db, 'patients', docId);
    await setDoc(docRef, {
        full_name: patientData.name,
        assigned_therapist: 'Dr. Wasi', // Hardcoded for now
        current_plan: patientData.plan.split(',').map(s => s.trim()),
        last_active: new Date().toISOString(),
        compliance_rate: 100, // starting rate
        status: 'active',
        unique_key: generatedKey
    });
    return docId;
};

export const getPatientById = async (patientId) => {
    const docRef = doc(db, 'patients', patientId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
};

export const deletePatientAndSessions = async (patientId) => {
    // 1. Get all sessions for this patient
    const sessionsRef = collection(db, 'sessions');
    const q = query(sessionsRef, where('patient_id', '==', patientId));
    const querySnapshot = await getDocs(q);

    // 2. We can use a batch to delete all sessions and the patient doc atomically
    const batch = writeBatch(db);

    // Add session deletes to batch
    querySnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
    });

    // Add patient delete to batch
    const patientRef = doc(db, 'patients', patientId);
    batch.delete(patientRef);

    // 3. Commit the batch
    await batch.commit();
};

// --- Sessions ---

export const getPatientSessions = async (patientId) => {
    const sessionsRef = collection(db, 'sessions');
    const q = query(sessionsRef, where('patient_id', '==', patientId));
    const querySnapshot = await getDocs(q);

    // Sort client side or add compound index to Firestore (requiring user to create an index in the console).
    // Sorting here to avoid needing index creation on Firebase side right away.
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
