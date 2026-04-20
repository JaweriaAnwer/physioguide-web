/**
 * Mock data for the PhysioGuide Therapist Dashboard.
 * This data simulates what Unity would send to Firebase.
 * Replace with real Firestore queries once the backend is connected.
 */

export const mockTherapist = {
    id: 'therapist_001',
    name: 'Dr. Wasi',
    email: 'dr.wasi@physioguide.com',
    clinic_id: 'NCCI_Karachi',
};

export const mockPatients = [
    {
        id: 'pat_101',
        full_name: 'Hussain Kazmi',
        assigned_therapist: 'therapist_001',
        current_plan: ['Scaption', 'Chin Tuck'],
        last_active: '2026-02-25T09:30:00',
        compliance_rate: 88,
        status: 'active',
    },
    {
        id: 'pat_102',
        full_name: 'Ahmed Raza',
        assigned_therapist: 'therapist_001',
        current_plan: ['Shoulder Abduction', 'Elbow Flexion'],
        last_active: '2026-02-24T14:15:00',
        compliance_rate: 72,
        status: 'active',
    },
    {
        id: 'pat_103',
        full_name: 'Sara Khan',
        assigned_therapist: 'therapist_001',
        current_plan: ['Wrist Extension', 'Chin Tuck'],
        last_active: '2026-02-23T11:00:00',
        compliance_rate: 95,
        status: 'active',
    },
    {
        id: 'pat_104',
        full_name: 'Bilal Ahmed',
        assigned_therapist: 'therapist_001',
        current_plan: ['Scaption'],
        last_active: '2026-02-20T08:45:00',
        compliance_rate: 45,
        status: 'critical',
    },
    {
        id: 'pat_105',
        full_name: 'Fatima Zahra',
        assigned_therapist: 'therapist_001',
        current_plan: ['Neck Rotation', 'Shoulder Abduction'],
        last_active: '2026-02-25T10:00:00',
        compliance_rate: 91,
        status: 'active',
    },
    {
        id: 'pat_106',
        full_name: 'Omar Farooq',
        assigned_therapist: 'therapist_001',
        current_plan: ['Elbow Flexion'],
        last_active: '2026-02-18T16:30:00',
        compliance_rate: 38,
        status: 'critical',
    },
];

// Generate session history for a patient
function generateSessions(patientId, count = 15) {
    const exercises = ['scaption', 'chin_tuck', 'shoulder_abduction', 'elbow_flexion'];
    const errorTypes = ['hiking', 'bent_elbow', 'compensation_trunk', 'compensation_shoulder_hike', 'flexion', 'extension'];
    const sessions = [];

    for (let i = 0; i < count; i++) {
        const date = new Date('2026-02-25');
        date.setDate(date.getDate() - i * 2);
        const accuracy = 60 + Math.random() * 35;
        const numErrors = Math.floor(Math.random() * 3);
        const errors = [];
        for (let e = 0; e < numErrors; e++) {
            errors.push(errorTypes[Math.floor(Math.random() * errorTypes.length)]);
        }

        sessions.push({
            id: `sess_${patientId}_${i}`,
            patient_id: patientId,
            exercise: exercises[Math.floor(Math.random() * exercises.length)],
            timestamp: date.toISOString(),
            accuracy: Math.round(accuracy * 10) / 10,
            duration_sec: 30 + Math.floor(Math.random() * 90),
            total_reps: 8 + Math.floor(Math.random() * 12),
            error_flags: [...new Set(errors)],
            recording_url: `gs://physioguide/${patientId}/sess_${i}.json`,
        });
    }
    return sessions;
}

export const mockSessions = {};
mockPatients.forEach((p) => {
    mockSessions[p.id] = generateSessions(p.id);
});

// Generate 30-day progress data for charts
export function getProgressData(patientId) {
    const data = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date('2026-02-25');
        date.setDate(date.getDate() - i);
        const baseAccuracy = patientId === 'pat_104' ? 40 : patientId === 'pat_106' ? 35 : 70;
        const trend = (29 - i) * 0.5;
        const noise = (Math.random() - 0.5) * 15;
        data.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            accuracy: Math.min(100, Math.max(0, Math.round((baseAccuracy + trend + noise) * 10) / 10)),
        });
    }
    return data;
}

// Generate a mock recording with skeleton landmark frames
export function generateMockRecording(frameCount = 120) {
    const frames = [];

    for (let f = 0; f < frameCount; f++) {
        const t = f / frameCount;
        const armAngle = Math.sin(t * Math.PI * 4) * 0.3;

        // Generate 33 MediaPipe landmarks
        const landmarks = [];
        for (let i = 0; i < 33; i++) {
            landmarks.push({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 });
        }

        // Position key joints for a realistic upper body
        // Head
        landmarks[0] = { x: 0.5, y: 0.12, z: 0, visibility: 1 };    // nose
        landmarks[2] = { x: 0.48, y: 0.1, z: 0, visibility: 1 };     // left eye
        landmarks[5] = { x: 0.52, y: 0.1, z: 0, visibility: 1 };     // right eye
        landmarks[7] = { x: 0.46, y: 0.12, z: 0, visibility: 1 };    // left ear
        landmarks[8] = { x: 0.54, y: 0.12, z: 0, visibility: 1 };    // right ear

        // Shoulders
        landmarks[11] = { x: 0.38, y: 0.28, z: 0, visibility: 1 };   // left shoulder
        landmarks[12] = { x: 0.62, y: 0.28, z: 0, visibility: 1 };   // right shoulder

        // Left arm - animated lift
        const leftElbowY = 0.38 - armAngle * 0.3;
        const leftElbowX = 0.28 - armAngle * 0.15;
        landmarks[13] = { x: leftElbowX, y: leftElbowY, z: 0, visibility: 1 };  // left elbow
        landmarks[15] = { x: leftElbowX - 0.08, y: leftElbowY - 0.08, z: 0, visibility: 1 }; // left wrist

        // Right arm - static
        landmarks[14] = { x: 0.72, y: 0.38, z: 0, visibility: 1 };   // right elbow
        landmarks[16] = { x: 0.8, y: 0.44, z: 0, visibility: 1 };    // right wrist

        // Hips
        landmarks[23] = { x: 0.42, y: 0.55, z: 0, visibility: 1 };   // left hip
        landmarks[24] = { x: 0.58, y: 0.55, z: 0, visibility: 1 };   // right hip

        // Legs
        landmarks[25] = { x: 0.42, y: 0.72, z: 0, visibility: 1 };   // left knee
        landmarks[26] = { x: 0.58, y: 0.72, z: 0, visibility: 1 };   // right knee
        landmarks[27] = { x: 0.42, y: 0.9, z: 0, visibility: 1 };    // left ankle
        landmarks[28] = { x: 0.58, y: 0.9, z: 0, visibility: 1 };    // right ankle

        // Simulated metrics
        const sea = 30 + armAngle * 80;
        const hasHiking = armAngle > 0.2 && Math.random() > 0.6;

        frames.push({
            rep_count: Math.floor(t * 10) + 1,
            state: armAngle > 0 ? 'LIFTING' : 'LOWERING',
            metrics: {
                SEA: Math.round(sea * 10) / 10,
                EA: 165 + Math.random() * 10,
                SHM: hasHiking ? 12 + Math.random() * 5 : 3 + Math.random() * 3,
                NAM: 0.85 + Math.random() * 0.1,
                HRM: 15 + Math.random() * 10,
                SMI: 0.7 + Math.random() * 0.2,
            },
            error_flags: {
                hiking: hasHiking,
                bent_elbow: false,
                compensation_trunk: false,
                compensation_elbow_flexion: false,
                compensation_shoulder_hike: hasHiking,
                flexion: false,
                extension: false,
            },
            raw_landmarks: landmarks,
        });
    }

    return {
        summary: {
            patient_id: 'pat_101',
            patient_name: 'Hussain Kazmi',
            exercise: 'scaption',
            timestamp: '2026-02-25T09:30:00',
            duration_sec: 45,
            total_reps: 10,
            total_frames: frameCount,
            accuracy: 85.3,
            error_flags_detected: ['hiking', 'compensation_shoulder_hike'],
            recording_filename: 'recording_scaption.json',
        },
        frames,
    };
}
