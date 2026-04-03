# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **AI Engine**: Groq (llama3-70b-8192)
- **Auth & Database**: Supabase (PostgreSQL + Auth + Storage)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Project: Exam War Room

AI-powered CBSE Class 10 exam preparation platform with a dark military "War Room" aesthetic.

### Features
- **Dashboard (War Room HQ)**: Exam countdown, readiness score, subject heat map, daily streak, XP/rank system, mock test history charts, weak topic spotlight
- **AI Tutor (Mission Briefing)**: Subject/chapter selector, step-by-step Groq-powered teaching, comprehension checks, XP awards
- **Doubt Solver**: AI-powered Q&A with Groq, session history, XP rewards per question
- **Mock Test (Battle Arena)**: AI-generated tests (Full/Chapter/Mini/Speed), timer, SWOT analysis, Battle Score
- **Study Planner**: AI-generated 30-day study plans, calendar view, exam date management
- **Notes Chatbot (Intel Database)**: PDF upload to Supabase Storage, text extraction, document-grounded Q&A
- **Profile & Settings**: XP progress, rank badge, user info

### Gamification
- XP Points: Doubt (+10), Tutor session (+50), Quiz (+30), Mock test (+100), Daily login (+20)
- Ranks: Cadet (0-200) → Soldier → Sergeant → Commander → General → War Hero (5001+)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (Groq AI routes, PDF extraction)
│   └── exam-war-room/      # React + Vite frontend (dark military UI)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM (unused — using Supabase instead)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Environment Variables

### Secrets (set in Replit Secrets)
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (used by backend)
- `GROQ_API_KEY` — Groq API key for llama3-70b-8192

### Shared Env Vars
- `VITE_SUPABASE_URL` — Same as SUPABASE_URL (exposed to frontend)
- `VITE_SUPABASE_ANON_KEY` — Same as SUPABASE_ANON_KEY (exposed to frontend)

## API Routes (Express backend)

- `POST /api/groq/chat` — General chat completions
- `POST /api/groq/tutor` — AI tutor for a subject/chapter
- `POST /api/groq/doubt` — Doubt solver with step-by-step reasoning
- `POST /api/groq/generate-test` — Generate CBSE mock test questions
- `POST /api/groq/analyze-results` — SWOT analysis of test results
- `POST /api/groq/generate-plan` — 30-day study plan generation
- `POST /api/groq/notes-chat` — Document-grounded Q&A
- `POST /api/groq/evaluate-answer` — Evaluate student comprehension answer
- `POST /api/extract-pdf` — Extract text from PDF (via Supabase Storage)

## Supabase Database Tables

- `profiles` — User profiles (extends auth.users), XP, rank, streak
- `exam_schedule` — Subject exam dates per user
- `topic_progress` — Chapter-level progress tracking (Not Started/In Progress/Revised/Mastered)
- `mock_tests` — Mock test history with questions, answers, scores
- `doubt_history` — Q&A history from doubt solver
- `study_plans` — Daily study plans (AI-generated)
- `uploaded_docs` — PDF/DOCX uploads metadata + extracted text
