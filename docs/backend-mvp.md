# Backend MVP

## Current Scope

- FastAPI application scaffold
- SQLAlchemy models for `users`, `events`, `photos`
- Event create/list endpoints
- Photo upload metadata endpoint
- Synchronous photo face indexing to Pinecone
- Database-backed login endpoint

## Local Setup

1. Create a virtual environment in `backend/`
2. Install dependencies with `pip install -r requirements.txt`
3. Copy `backend/.env.example` to `backend/.env`
4. Start PostgreSQL and create a `findmyshot` database
5. Run `python3 scripts/seed_admin.py` from `backend/`
6. Start the API with `uvicorn app.main:app --reload`

## Infrastructure Variables

- `STORAGE_BUCKET_NAME`: R2 bucket name
- `STORAGE_ENDPOINT_URL`: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- `STORAGE_ACCESS_KEY`: R2 Access Key ID
- `STORAGE_SECRET_KEY`: R2 Secret Access Key
- `PINECONE_API_KEY`: Pinecone API key
- `PINECONE_INDEX_NAME`: `findmyshot-faces-dev`
- `PINECONE_NAMESPACE`: namespace for tenant/event scoping
- `PINECONE_INDEX_HOST`: optional but recommended later for production

## First Login

- Email: `admin@findmyshot.app`
- Password: `admin123`

## Authenticated Flow

1. `POST /api/auth/login`
2. Copy `access_token`
3. Send `Authorization: Bearer <token>` to:
   - `GET /api/auth/me`
   - `GET /api/events`
   - `POST /api/events`
   - `GET /api/photos/event/{event_id}`
   - `POST /api/photos/upload`
   - `POST /api/photos/{photo_id}/index`

## Next Sprint

- Presigned download URLs for private R2 files
- Async job queue for indexing
- Payment/download unlock flow

## Web Guest App

- `web/` contains a minimal Next.js guest gallery frontend
- Event page route: `/e/[slug]`
- Configure `web/.env.local` from `web/.env.local.example`
- Point `NEXT_PUBLIC_API_BASE_URL` to the running backend
