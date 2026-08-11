# PhysioGuide — Therapist Web Dashboard

AI-assisted VR physiotherapy platform | Final Year Project, NED University

## What I Built

A React dashboard for physiotherapists to monitor patients doing rehab exercises in VR (Meta Quest 2 + MediaPipe pose tracking). Therapists manage their patient roster, review each VR session's accuracy/reps/form errors, replay a frame-by-frame skeleton of the movement, and export PDF progress reports.

## The Problem

Once a patient leaves the clinic, therapists can't see *how* home exercises were actually performed — only whether the patient says they did them. Bad form goes uncorrected, and reviewing a full caseload manually doesn't scale.

## Architecture

```
+---------------------------+
|  Quest 2 (Unity+MediaPipe)|
|  pose tracking,           |
|  error detection          |
+-------------+-------------+
              | session results
              v
+---------------------------+       +---------------------------+
|  Supabase (Postgres +     |       |  Firebase (Auth +         |
|  Storage)                 |       |  Firestore)                |
|  sessions: accuracy, reps,|       |  therapist accounts,      |
|  error flags, recording   |       |  patient roster           |
+-------------+-------------+       +-------------+-------------+
              |                                   |
              |         reads both                |
              +-----------------+-----------------+
                                |
                                v
              +-------------------------------+
              |        physioguide-web         |
              |  Dashboard -> Patient Profile  |
              |  -> Session Review ->          |
              |  PDF Report Export             |
              +-------------------------------+
```

## How It Works

- **VR client** (Unity, separate repo): Quest 2 + MediaPipe track 16+ body keypoints per exercise, compute joint angles, and flag errors (e.g. shoulder hiking, elbow bending, trunk compensation).
- **Firebase (Auth + Firestore)**: therapist accounts and patient roster, scoped per-therapist.
- **Supabase (Postgres + Storage)**: session results — accuracy, reps, error flags, and the compressed per-frame skeleton recording.
- **This dashboard**: polls Supabase for a patient's sessions, renders trend charts, and replays sessions frame-by-frame on a canvas (`SkeletonCanvas.jsx` + `biomechanics.js`), coloring joints red when an error flag is active on that frame. Reports are generated client-side with `html2canvas` + `jsPDF`.

**Stack**: React 19, Vite, Tailwind, Recharts, Firebase, Supabase.

## Setup

```bash
npm install
cp .env.example .env   # fill in Firebase project keys
npm run dev
```
Supabase URL/anon key can be set via `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`; the app currently falls back to a demo project if unset.

## What I'd Improve With More Time

- Remove the hardcoded Supabase fallback credentials in `firebaseServices.js`
- Real-time session updates (Supabase Realtime) instead of 5-second polling
- Automated tests, especially for the biomechanics/error-flag logic
- Better handling for failed/slow recording fetches
- Accessibility pass on charts and navigation
