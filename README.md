# Multimodal Media Search

[![Application checks](https://github.com/Griva100/multimodal-media-search/actions/workflows/checks.yml/badge.svg)](https://github.com/Griva100/multimodal-media-search/actions/workflows/checks.yml)
A full stack media library built with React, TypeScript, Node.js, Express and PostgreSQL. Search captions, audio transcripts and text documents in one interface, then filter results by format. Visitors can explore sample records without an account; registered users can upload and manage their own private files.
**Live application:** [https://griva-media-search.vercel.app](https://griva-media-search.vercel.app)

## Features

- Responsive search interface with concept-vector ranking, cosine similarity, format filters and relevance scores.
- Image previews, audio playback with HTTP byte-range support, and text downloads.
- Optional file uploads up to 2 MB, stored persistently in PostgreSQL alongside user-owned metadata.
- Account registration and sign-in with scrypt password hashing, hashed session tokens and HttpOnly cookies.
- Ownership checks on metadata, downloads and deletion; input validation and same-origin mutation checks.
- Automated PostgreSQL integration tests, search relevance tests, Docker Compose and GitHub Actions.

## Search implementation

This application searches **metadata and supplied text**. A small, hand-authored synonym vocabulary maps related terms to shared dimensions; hashed token dimensions retain additional lexical information. Normalised vectors are ranked using cosine similarity. For example, “secure login” retrieves the sample access-control diagram, while “customer activation” retrieves an onboarding transcript.

Images use captions and audio uses transcripts entered by the user. Plain-text uploads are indexed automatically. The application does not run image recognition, speech transcription or a learned embedding model. Similarity scores represent this retrieval method, not factual confidence. Sample cards are clearly labelled and have no original media file attached.

## Run locally

Use Node.js 24, npm and Docker Compose:

```sh
cp .env.example .env
docker compose up -d postgres
npm ci
npm run db:migrate
npm run dev
```

Open `http://127.0.0.1:4189`. Browse the samples or create an account to upload files. Development database credentials are local examples, not production credentials.

Run the complete application in Docker:

```sh
docker compose --profile full up --build
```

## Verify

```sh
npm test
npm run build
```

Integration tests use an isolated local PostgreSQL database, create disposable accounts, and clean up their own records. They cover public samples, password hashing, private uploads, ownership isolation, byte ranges, file limits, filters, persistence across API instances, sign-out, sign-in and deletion. Five search tests cover query ranking, aliases and vector edge cases.

## Deploy to Vercel

The live application uses Vercel and persistent Prisma PostgreSQL storage. Public search, secure registration, private uploads, downloads, byte ranges and user isolation were verified on 26 October 2026.

1. Connect this repository to Vercel with the Vite framework preset. The included `vercel.json` routes API calls to `api/index.ts` and serves the frontend from `dist/`.
2. Set `DATABASE_URL` to a hosted PostgreSQL connection string in Vercel environment variables. Never commit credentials.
3. Vercel builds run the idempotent schema migration before compiling the app. Tables use a `media_` prefix, so they can coexist with Delivery Workspace in the same database. Local migrations remain available through `npm run db:migrate`.
4. Deploy and verify `/api/health`, public search, sign-up, upload, download and deletion. Set optional `APP_URL` to the public origin if a proxy requires it.

The API uses a PostgreSQL pool capped at five connections per instance. Files are intentionally limited to 2 MB to fit small serverless requests. Larger media libraries should use object storage and a dedicated retrieval index. Search currently includes the latest 250 private records per account plus the public samples.

## Architecture

```text
React / TypeScript
        |
   Express REST API
        |
   PostgreSQL
   ├── accounts and hashed sessions
   └── private metadata, vectors and file bytes
```

Developed for Griva Shah with AI assistance. Password reset, email verification, shared libraries, background transcription and learned model embeddings are outside the current implementation.
