# Health Record Organizer — Project Design Document

## 1. Overview

A secure personal vault where users upload, organize, and search all their
health-related documents (lab reports, prescriptions, scans, vaccination
records, appointment slips) in one place, with a timeline view and
(eventually) OCR-powered search and family/emergency access.

**Target platforms:** Web app (React frontend), with mobile-responsive design.
**Core value:** Turns scattered documents (WhatsApp, phone gallery, paper
files) into a searchable, structured personal health history.

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React (Vite) | Fast dev server, simple build |
| Backend | FastAPI (Python) | Async, auto-generated OpenAPI docs |
| Database | PostgreSQL | Relational, good for structured health data |
| File storage | Cloud storage (AWS S3 / Cloudflare R2 / Supabase Storage) | Never store raw files in Postgres |
| Auth | JWT-based (FastAPI + `python-jose`) or Auth0/Clerk for speed | Start simple, swap later if needed |
| OCR (v2) | Tesseract (free) → AWS Textract / Google Document AI (paid, more accurate) | Start free, upgrade if accuracy is a problem |
| Deployment | Backend: Render/Railway/Fly.io. Frontend: Vercel/Netlify. DB: Supabase/Neon/RDS | Pick free tiers to start |

---

## 3. High-Level Architecture

```
┌─────────────┐      HTTPS/JSON      ┌──────────────┐
│   React     │ ───────────────────► │   FastAPI    │
│  Frontend   │ ◄─────────────────── │   Backend    │
└─────────────┘                      └──────┬───────┘
                                             │
                       ┌─────────────────────┼─────────────────────┐
                       ▼                     ▼                     ▼
               ┌───────────────┐   ┌──────────────────┐  ┌──────────────────┐
               │  PostgreSQL   │   │  Cloud Storage    │  │  OCR Service     │
               │ (users, meta) │   │  (raw files)       │  │ (v2, async job)  │
               └───────────────┘   └──────────────────┘  └──────────────────┘
```

Key principle: **Postgres stores metadata and structured fields. Cloud
storage stores the actual files.** The DB never holds binary blobs — just a
URL/key pointing to the file plus everything you need to search and display it.

---

## 4. Database Schema (v1 → v3, noted per table)

### `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| email | text, unique | |
| password_hash | text | never store plaintext |
| full_name | text | |
| date_of_birth | date | nullable |
| created_at | timestamp | |

### `family_members` (v3)
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| owner_user_id | UUID (FK → users.id) | the account holder |
| full_name | text | |
| relationship | text | e.g. "child", "parent" |
| date_of_birth | date | nullable |

> v1/v2: all records belong directly to `users`. In v3, add a
> `profile_id` (nullable FK to `family_members`) on `records` so a record
> can belong to the account holder or a family member under their account.

### `records` (core table — v1)
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK → users.id) | |
| profile_id | UUID (FK → family_members.id, nullable) | v3 |
| category | enum | `lab_report`, `prescription`, `scan`, `vaccination`, `appointment`, `other` |
| title | text | user-facing name, e.g. "CBC Test" |
| record_date | date | date of the test/visit (not upload date) |
| file_url | text | pointer to cloud storage object |
| file_type | text | `pdf`, `jpg`, `png` |
| notes | text | freeform, v1 |
| created_at | timestamp | upload date |
| updated_at | timestamp | |

### `extracted_fields` (v2 — OCR output, structured)
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| record_id | UUID (FK → records.id) | |
| field_name | text | e.g. "Hemoglobin", "Drug Name" |
| field_value | text | e.g. "13.5" |
| unit | text | e.g. "g/dL", nullable |
| reference_range | text | e.g. "12–16", nullable |
| confidence | float | OCR confidence score, nullable |
| confirmed_by_user | boolean | default false — human-in-the-loop check |

> This is what makes "show all blood tests from 2025" actually queryable,
> instead of just filtering filenames.

### `appointments` (v2)
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK) | |
| profile_id | UUID (FK, nullable) | v3 |
| title | text | e.g. "Dentist visit" |
| appointment_date | timestamp | |
| reminder_sent | boolean | |
| linked_record_id | UUID (FK → records.id, nullable) | e.g. slip uploaded after visit |

### `emergency_access_tokens` (v3)
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK) | |
| token | text, unique | random, unguessable |
| expires_at | timestamp | |
| access_level | enum | e.g. `critical_only`, `full` |
| created_at | timestamp | |

> Scanning a QR code with this token opens a read-only page showing only
> critical info (allergies, blood type, current medications) — not the
> full vault.

---

## 5. API Endpoints (FastAPI)

### Auth
- `POST /auth/signup`
- `POST /auth/login` → returns JWT
- `POST /auth/refresh`

### Records (v1)
- `POST /records` — upload file + metadata (multipart form)
- `GET /records` — list, with query params: `category`, `date_from`, `date_to`, `profile_id`
- `GET /records/{id}` — single record detail
- `PATCH /records/{id}` — edit metadata/category
- `DELETE /records/{id}`

### Timeline (v1)
- `GET /timeline` — records grouped/sorted by `record_date`, optionally filtered by `profile_id`

### Search (v2)
- `GET /search?q=...&category=...&date_from=...&date_to=...`
- Internally: full-text search over `records.title`/`notes` + structured
  filtering over `extracted_fields`

### OCR (v2)
- `POST /records/{id}/extract` — triggers OCR job (async)
- `GET /records/{id}/extracted-fields` — get OCR results
- `PATCH /extracted-fields/{id}` — user corrects a field (sets `confirmed_by_user = true`)

### Appointments (v2)
- `POST /appointments`
- `GET /appointments`
- `PATCH /appointments/{id}`

### Family Profiles (v3)
- `POST /family-members`
- `GET /family-members`
- `PATCH /family-members/{id}`
- `DELETE /family-members/{id}`

### Emergency Access (v3)
- `POST /emergency-access` — generate token/QR
- `GET /emergency-access/{token}` — public, read-only endpoint (no auth) — returns only critical fields
- `DELETE /emergency-access/{id}` — revoke

---

## 6. Frontend Structure (React)

```
src/
  pages/
    Login.jsx
    Signup.jsx
    Dashboard.jsx
    Timeline.jsx
    UploadRecord.jsx
    RecordDetail.jsx
    Search.jsx           (v2)
    Appointments.jsx      (v2)
    FamilyProfiles.jsx    (v3)
    EmergencyAccess.jsx   (v3)
  components/
    RecordCard.jsx
    CategoryFilter.jsx
    TimelineItem.jsx
    UploadDropzone.jsx
    ExtractedFieldEditor.jsx   (v2 — human-in-the-loop OCR review)
  api/
    client.js             (axios/fetch wrapper, attaches JWT)
    records.js
    auth.js
  context/
    AuthContext.jsx
```

---

## 7. User Journey (mapped to endpoints)

1. **Sign up / Login** → `POST /auth/signup`, `POST /auth/login`
2. **Upload a report** → `POST /records` (file goes to cloud storage, metadata to Postgres)
3. **(v2) OCR runs** → `POST /records/{id}/extract` → results shown to user for confirmation → `PATCH /extracted-fields/{id}`
4. **View timeline** → `GET /timeline`
5. **Search later** → `GET /search?q=blood+test&date_from=2025-01-01&date_to=2025-12-31`

---

## 8. Feature Breakdown by Version

### v1 — Foundation
- Auth (signup/login)
- Upload documents (PDF/image → cloud storage)
- Categorize records (manual dropdown: lab, prescription, scan, vaccination, appointment, other)
- Timeline view (sorted by `record_date`)

### v2 — Intelligence
- OCR text extraction (Tesseract to start)
- Structured field extraction into `extracted_fields`, with user confirmation step
- Search (by category, date range, extracted field values)
- Appointment reminders (email/push, simple cron job checking `appointments` table)

### v3 — Multi-user & Safety
- Family profiles (multiple people under one account)
- Health summaries (auto-generated overview per profile: recent labs, active prescriptions)
- Emergency access (QR/token-based read-only page, critical info only)

### Future
- Doctor sharing (scoped, time-limited access links — similar mechanism to emergency access but doctor-facing)
- Trend charts (e.g., HbA1c over time, pulled from `extracted_fields` history)
- Medical history export (PDF/CSV export of full record set)

---

## 9. Security & Privacy Design

- **Encryption in transit:** HTTPS everywhere (enforced at load balancer/CDN level).
- **Encryption at rest:** Enable at the storage layer (S3 SSE, or Postgres-level encryption depending on host).
- **Auth:** Passwords hashed with bcrypt/argon2, never stored plaintext. JWT tokens short-lived, refresh token rotation.
- **Access control:** Every query scoped to `user_id` (and `profile_id` for family members) — never trust a record ID alone; always verify ownership server-side.
- **Emergency access tokens:** Random, unguessable, time-limited, revocable, and scoped to a minimal "critical info" view — never the full vault.
- **File uploads:** Validate file type/size server-side, scan for malware if possible, store with non-guessable object keys (not sequential IDs).
- **Data deletion:** Provide a real "delete my account" flow that removes both DB rows and cloud storage files, not just a soft flag.
- **Compliance awareness:** Health data may fall under HIPAA (US) or India's DPDP Act depending on users — not something to fully implement as a hobby project, but worth designing with those principles (minimal data collection, user control over deletion, no unnecessary sharing) in mind from day one.

---

## 10. Non-Functional Notes

- **OCR accuracy:** Expect it to be imperfect, especially on handwriting. Always show extracted fields to the user for confirmation before treating them as "truth" (human-in-the-loop, see `confirmed_by_user` field).
- **File size limits:** Cap uploads (e.g., 10–20MB) to keep storage costs and OCR processing predictable.
- **Async OCR:** OCR should run as a background job (e.g., FastAPI `BackgroundTasks` or a task queue like Celery/RQ for v2+), not block the upload request.

---

## 11. Suggested Build Order

1. `users` table + auth endpoints
2. `records` table + upload endpoint + cloud storage wiring
3. Timeline + category filter endpoints
4. Frontend: login/signup → upload → timeline (v1 complete, demoable)
5. OCR integration + `extracted_fields` + search (v2)
6. Appointments + reminders (v2)
7. Family profiles + emergency access (v3)
