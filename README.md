# VidyaAI Starter Code

FastAPI + React app for the VidyaAI blueprint: AI doubt solver, adaptive MCQs, study plans, performance tracking, Supabase auth, and Razorpay payments.

## Structure

```text
backend/     FastAPI API
frontend/    React + Vite UI
supabase/    SQL schema and RPC
```

## Included Features

- Email magic-link and Google sign-in via Supabase
- Exam profile selection: JEE, NEET, UPSC
- Streaming doubt solver using Anthropic
- Adaptive MCQ generator with answer submission
- Performance dashboard using Supabase attempt data
- Pro study planner endpoint and UI
- Razorpay order creation and payment verification
- Railway/Vercel-ready config files

## Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

## Frontend

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

## Deploy

### Backend on Render

1. Create a new Render Web Service.
2. Connect this repo and pick `render.yaml` if Render asks for a blueprint.
3. Set the service name to `vidyaai-backend` or keep the default.
4. Add these env vars in Render:

```env
GEMINI_API_KEY=your_new_key
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
FRONTEND_URL=https://your-frontend-domain
```

Render will use:

```bash
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Frontend on Vercel

1. Import the `frontend` folder into Vercel.
2. Set build command to `npm run build`.
3. Set output directory to `dist`.
4. Add env vars:

```env
VITE_API_URL=https://your-render-backend-url
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_RAZORPAY_KEY_ID=...
```

### Key replacement

Replace the old exposed Gemini key in `backend/.env` with your new key, and rotate the old one in Google AI Studio.

## Single Website Mode

If you want one website served directly from FastAPI:

```powershell
cd frontend
npm install
npm run build

cd ..\backend
uvicorn app.main:app --reload
```

Then open:

- `http://localhost:8000/` for the VidyaAI website
- `http://localhost:8000/api/docs` for Swagger UI

You can also use:

```powershell
.\run_vidyaai.ps1
```

## Required Environment

Backend:

- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

Frontend:

- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_RAZORPAY_KEY_ID`

## Notes

- Google OAuth must be enabled in your Supabase Auth providers.
- Razorpay Checkout loads from Razorpay's hosted script at runtime.
- Apply [supabase/schema.sql](C:/Users/DELL/Documents/Codex/2026-04-23-files-mentioned-by-the-user-vidyaai/supabase/schema.sql) before testing authenticated flows.
