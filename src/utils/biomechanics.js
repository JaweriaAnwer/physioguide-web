/**
 * Biomechanics utility functions for skeleton drawing and angle calculations.
 * Used by the SkeletonCanvas replay engine.
 *
 * Unity sends raw_landmarks as an array of { x, y, z, vis } objects
 * where (x, y, z) are MediaPipe Pose world-space coordinates and
 * `vis` is the visibility confidence (0–1).
 */

// MediaPipe Pose landmark indices
export const LANDMARKS = {
    NOSE: 0,
    LEFT_EYE: 2,
    RIGHT_EYE: 5,
    LEFT_EAR: 7,
    RIGHT_EAR: 8,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_KNEE: 25,
    RIGHT_KNEE: 26,
    LEFT_ANKLE: 27,
    RIGHT_ANKLE: 28,
};

// Skeleton connection pairs for drawing lines
export const SKELETON_CONNECTIONS = [
    // Head
    [LANDMARKS.LEFT_EAR, LANDMARKS.LEFT_EYE],
    [LANDMARKS.LEFT_EYE, LANDMARKS.NOSE],
    [LANDMARKS.NOSE, LANDMARKS.RIGHT_EYE],
    [LANDMARKS.RIGHT_EYE, LANDMARKS.RIGHT_EAR],
    // Torso
    [LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER],
    [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP],
    [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP],
    [LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP],
    // Left arm
    [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW],
    [LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_WRIST],
    // Right arm
    [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW],
    [LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_WRIST],
    // Left leg
    [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE],
    [LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE],
    // Right leg
    [LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE],
    [LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE],
];

/**
 * Calculate angle between three points (in degrees).
 * Point B is the vertex.
 */
export function calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * (180.0 / Math.PI));
    if (angle > 180) angle = 360 - angle;
    return angle;
}

/**
 * Get shoulder elevation angle from landmarks.
 */
export function getShoulderElevationAngle(landmarks) {
    const shoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
    const hip = landmarks[LANDMARKS.LEFT_HIP];
    const elbow = landmarks[LANDMARKS.LEFT_ELBOW];
    if (!shoulder || !hip || !elbow) return 0;
    return calculateAngle(hip, shoulder, elbow);
}

/**
 * Get elbow angle from landmarks.
 */
export function getElbowAngle(landmarks) {
    const shoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
    const elbow = landmarks[LANDMARKS.LEFT_ELBOW];
    const wrist = landmarks[LANDMARKS.LEFT_WRIST];
    if (!shoulder || !elbow || !wrist) return 0;
    return calculateAngle(shoulder, elbow, wrist);
}

/**
 * Get visibility value from a landmark.
 * Unity sends `vis`, MediaPipe SDK uses `visibility` — handle both.
 */
function getVis(lm) {
    if (!lm) return 0;
    return lm.vis ?? lm.visibility ?? 0;
}

/**
 * Determine color based on error state for a joint.
 */
export function getJointColor(hasError) {
    return hasError ? '#ef4444' : '#22d3ee';
}

/**
 * Draw a skeleton frame on an HTML5 canvas.
 *
 * Unity raw_landmarks may use arbitrary world-space coordinates
 * (not normalized 0–1), so we compute a bounding box and fit
 * the skeleton into the canvas with a margin.
 */
export function drawSkeleton(ctx, landmarks, errorFlags = {}, width = 400, height = 500) {
    ctx.clearRect(0, 0, width, height);

    if (!landmarks || landmarks.length === 0) return;

    // Only consider visible landmarks (vis >= 0.3) to compute bounding box
    const visible = landmarks.filter(lm => lm && getVis(lm) >= 0.3);
    if (visible.length === 0) return;

    // Compute bounding box of visible landmarks
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const lm of visible) {
        if (lm.x < minX) minX = lm.x;
        if (lm.x > maxX) maxX = lm.x;
        if (lm.y < minY) minY = lm.y;
        if (lm.y > maxY) maxY = lm.y;
    }

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    // Fit into canvas with 10% margin on each side
    const margin = 0.1;
    const drawW = width * (1 - 2 * margin);
    const drawH = height * (1 - 2 * margin);

    // Maintain aspect ratio
    const scaleVal = Math.min(drawW / rangeX, drawH / rangeY);
    const offsetX = width * margin + (drawW - rangeX * scaleVal) / 2;
    const offsetY = height * margin + (drawH - rangeY * scaleVal) / 2;

    const scale = (lm) => ({
        x: offsetX + (lm.x - minX) * scaleVal,
        y: offsetY + (lm.y - minY) * scaleVal,
    });

    // Determine which joints have errors
    const errorJoints = new Set();
    if (errorFlags.hiking || errorFlags.compensation_shoulder_hike) {
        errorJoints.add(LANDMARKS.LEFT_SHOULDER);
        errorJoints.add(LANDMARKS.RIGHT_SHOULDER);
    }
    if (errorFlags.bent_elbow || errorFlags.compensation_elbow_flexion) {
        errorJoints.add(LANDMARKS.LEFT_ELBOW);
        errorJoints.add(LANDMARKS.RIGHT_ELBOW);
    }
    if (errorFlags.flexion || errorFlags.extension) {
        errorJoints.add(LANDMARKS.NOSE);
    }
    if (errorFlags.compensation_trunk) {
        errorJoints.add(LANDMARKS.LEFT_HIP);
        errorJoints.add(LANDMARKS.RIGHT_HIP);
    }

    // Draw connections
    SKELETON_CONNECTIONS.forEach(([i, j]) => {
        const a = landmarks[i];
        const b = landmarks[j];
        if (!a || !b || getVis(a) < 0.3 || getVis(b) < 0.3) return;

        const pa = scale(a);
        const pb = scale(b);

        const hasErr = errorJoints.has(i) || errorJoints.has(j);

        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.strokeStyle = hasErr ? '#ef4444' : 'rgba(34, 211, 238, 0.7)';
        ctx.lineWidth = hasErr ? 4 : 3;
        ctx.stroke();
    });

    // Draw joints
    Object.values(LANDMARKS).forEach((idx) => {
        const lm = landmarks[idx];
        if (!lm || getVis(lm) < 0.3) return;
        const p = scale(lm);
        const hasErr = errorJoints.has(idx);

        ctx.beginPath();
        ctx.arc(p.x, p.y, hasErr ? 7 : 5, 0, 2 * Math.PI);
        ctx.fillStyle = hasErr ? '#ef4444' : '#22d3ee';
        ctx.fill();

        if (hasErr) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 11, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
}
