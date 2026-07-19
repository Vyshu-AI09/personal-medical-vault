# Health Record Organizer — v1

A personal vault for health documents: lab reports, prescriptions, scans,
vaccination records, and appointment slips, organized into a searchable
timeline.

This is the **v1** build: login, upload, categorize, timeline view. See
`health-record-organizer-design.md` (if included alongside this) for the
full multi-version design doc.

## Stack

- Backend: FastAPI (Python) + SQLite (dev) / PostgreSQL-ready
- Frontend: React (Vite)
- Storage: local disk (dev) — swappable for cloud storage later

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm

## 1. Run the backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # defaults work as-is
uvicorn app.main:app --reload --port 8000
```

The API is now running at `http://localhost:8000`.
Interactive API docs: `http://localhost:8000/docs`

By default this uses a local SQLite file (`health_vault.db`) and stores
uploaded files in `backend/storage/uploads/`. No external services required
to get started.

### Switching to PostgreSQL

Set `DATABASE_URL` in `.env` to a Postgres connection string, e.g.:

```
DATABASE_URL=postgresql://user:password@localhost:5432/health_vault
```

Then install the Postgres driver:

```bash
pip install psycopg2-binary
```

No other code changes needed — SQLAlchemy handles both the same way.

## 2. Run the frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The app is now running at `http://localhost:5173`.

## 3. Try it out

1. Open `http://localhost:5173`
2. Sign up for an account
3. Upload a PDF or image (lab report, prescription, etc.)
4. See it appear in your timeline, filterable by category

## Project structure

```
backend/
  app/
    main.py          - FastAPI app entrypoint
    config.py         - settings (DB URL, JWT secret, storage path)
    database.py        - SQLAlchemy engine/session
    models.py          - User, Record tables
    schemas.py          - Pydantic request/response models
    auth.py              - password hashing, JWT logic
    routers/
      auth.py             - /auth/signup, /auth/login
      records.py           - upload, list, get, update, delete, file download
      timeline.py            - /timeline (records grouped by month)
  storage/uploads/       - uploaded files land here (local dev storage)
  requirements.txt
  .env.example

frontend/
  src/
    api/                - axios client + auth/records API calls
    context/AuthContext.jsx - global auth state
    components/Layout.jsx   - shared topbar
    pages/
      Login.jsx, Signup.jsx
      Timeline.jsx            - main dashboard / timeline view
      UploadRecord.jsx         - upload form
      RecordDetail.jsx          - view/edit/delete a record, file preview
    App.jsx                - routing
```

## What's next (v2+)

See the full design doc for the roadmap: OCR-powered field extraction,
real search, appointment reminders, family profiles, emergency access,
doctor sharing, and trend charts.

A good next step for whoever picks this up: wire OCR (Tesseract to start)
into the upload flow, add an `extracted_fields` table, and build a review
UI so users confirm extracted values before they're trusted as structured
data.

## Notes for whoever extends this

- All record endpoints are scoped to the logged-in user's `user_id` server-side
  — don't trust a record ID alone in new endpoints, always verify ownership.
- File uploads are validated by extension and size server-side
  (`ALLOWED_EXTENSIONS`, `max_upload_size_mb` in `config.py`).
- Passwords are hashed with bcrypt directly (not passlib — there's a known
  passlib/bcrypt version incompatibility, so this project avoids it).
- JWT tokens last 24 hours by default (`access_token_expire_minutes` in
  `config.py`).
