# ReachInbox — Full-Stack Email Job Scheduler

Production-grade, distributed email scheduling service and dashboard built for **ReachInbox.ai** (Outbox Labs).

- **Backend**: TypeScript, Express.js, BullMQ, Redis, PostgreSQL (Prisma ORM), Nodemailer (Ethereal fake SMTP), Elasticsearch, Bull-Board
- **Frontend**: React (Vite), TypeScript, Tailwind CSS, Lucide Icons
- **Integrations**: Google OAuth 2.0 (OpenID Connect), Slack OAuth 2.0 (Rate limit alerts)

---

## 🎯 Architecture Overview

```
                      [ React / Vite Dashboard ]
                                   │
                     REST API & Cookie Session
                                   ▼
                       [ Express.js API ]
                     ┌─────────────┴─────────────┐
                     ▼                           ▼
            [ PostgreSQL DB ]            [ Elasticsearch ]
       (Campaign, Email, Outbox)        (Full-Text Email Search)
                     │
         Transactional Outbox &
        Stable BullMQ Delayed Jobs
                     │
                     ▼
          [ BullMQ Queue + Redis ]
                     │
             Worker Concurrency
           Redis Lua Rate-Limiter
                     ▼
           [ BullMQ Worker(s) ]
        ┌────────────┴────────────┐
        ▼                         ▼
 [ Ethereal SMTP ]          [ Slack API ]
 (Simulated Email)     (Hourly Rate-Limit Alert)
```

### 1. How Scheduling Works (No Cron Jobs)
1. **API Scheduling**: When a user schedules emails via `POST /api/emails/schedule`, the campaign, emails, and an `EmailOutbox` entry for each recipient are written to PostgreSQL inside an **atomic ACID transaction**.
2. **Stable Delayed Jobs**: Each email is scheduled into **BullMQ** with `jobId: email.id` and an absolute delayed timestamp (`delay = Math.max(0, scheduledAt - Date.now())`).
3. **No Cron**: Neither OS-level cron nor Node cron libraries (`node-cron`, `agenda`) are used. BullMQ uses Redis sorted sets (`zset`) with epoch millisecond timestamps to wake jobs exactly when they are due.
4. **Transactional Outbox**: The API dispatches newly created outbox entries directly, while the worker runs an outbox recovery sweep on startup to ensure zero lost jobs even under crash conditions.

### 2. How Persistence Across Server Restarts is Handled
1. **Redis Persistence**: Redis is configured with `appendonly yes` (AOF) so that delayed job sorted sets in Redis survive server restarts.
2. **PostgreSQL as Single Source of Truth**: Every email maintains its lifecycle state (`SCHEDULED` ➔ `PROCESSING` ➔ `SENT` / `FAILED`) in PostgreSQL.
3. **Restart Recovery**:
   - Future scheduled jobs remain stored in Redis and BullMQ picks them up automatically when the process restarts.
   - Any pending rows from `EmailOutbox` with `dispatchedAt: null` are immediately swept and queued on worker startup.
   - Emails stuck in `PROCESSING` whose worker stopped unexpectedly are safely flagged by `recoverStaleProcessingEmails()` for manual review rather than unsafely re-sent (preventing double delivery).
4. **Idempotency**:
   - `Idempotency-Key` header prevents duplicate campaign creation from network retries.
   - Unique constraints on `email.id` and `jobId: email.id` in BullMQ prevent duplicate queue insertions.
   - Worker uses atomic PostgreSQL updates (`UPDATE ... WHERE status = 'SCHEDULED'`) to ensure racing workers cannot process the same email twice.

### 3. Throughput, Rate Limiting & Concurrency
1. **Worker Concurrency**: Configurable via `EMAIL_CONCURRENCY` in `backend/.env` (e.g., 5 parallel jobs per worker process).
2. **Minimum Throttle Gap**: Configurable via `MIN_EMAIL_DELAY_MS` (e.g., 2000 ms). An atomic Redis Lua script checks `email:last-send:<senderId>`. If another email from that sender was sent less than `minDelay` ago, the job is delayed by `retryAt = lastSend + minDelay` via BullMQ's `job.moveToDelayed()` and `DelayedError`.
3. **Hourly Sending Limit**: Configurable globally via `MAX_EMAILS_PER_HOUR` and per-campaign via `hourlyLimit`. The Redis Lua script atomically maintains `email:rate:sender:<senderId>:<hourWindow>` with an automatic 2-hour TTL.
4. **Preserving Order Under Limit**: When the hourly quota is reached:
   - Jobs are **never dropped or failed**.
   - The Lua script returns the start of the next hour window (`(hour + 1) * 3600000`).
   - The job is moved to delayed status in BullMQ for that next window, preserving execution order.
5. **Slack Notification on Rate Limit Hit**:
   - Users connect their Slack workspace via standard OAuth (`/api/slack/connect`).
   - The backend encrypts bot access tokens at rest using **AES-256-GCM**.
   - When a sender hits the hourly cap, `notifyHourlyLimit()` sends an instant Slack alert to the configured channel.
   - Alerts are throttled using Redis (`slack:rate-limit-notice:<senderId>:<hour>`) to exactly **one alert per sender per hourly window**.
   - If Slack is disconnected or unconfigured, rate-limit events proceed safely without throwing or crashing.

### 4. Elasticsearch Search
- Emails are indexed into Elasticsearch (`reachinbox-emails`) on creation and upon delivery.
- Both text (tokenized) and keyword (exact) subfields are indexed for `recipient`, `senderEmail`, `subject`, and `body`.
- The dashboard search queries Elasticsearch with multi-match search. If Elasticsearch is temporarily starting up or unavailable, the API gracefully falls back to PostgreSQL case-insensitive query without breaking the user experience.

### 5. Live BullMQ Dashboard
- Real-time queue visibility is exposed through **Bull-Board** at `http://localhost:5000/admin/queues`.
- Accessible directly from the sidebar and header links in the dashboard.
- Protected by authenticated session and admin email whitelist (`QUEUE_ADMIN_EMAILS`).

---

## 📋 Features Implemented

| Area | Feature | Status | Implementation Details |
|---|---|---|---|
| **Backend** | BullMQ Delayed Scheduler | ✅ | No cron jobs; Redis sorted-set delayed jobs with transactional outbox |
| **Backend** | State Persistence | ✅ | Survives server restarts; Redis AOF + Postgres recovery sweeps |
| **Backend** | Worker Concurrency | ✅ | Configurable worker concurrency (`EMAIL_CONCURRENCY`) |
| **Backend** | Throttling Delay | ✅ | Configurable gap between emails (`MIN_EMAIL_DELAY_MS`) via Redis Lua script |
| **Backend** | Hourly Rate Limiting | ✅ | Atomic hourly Redis counters; jobs rescheduled to next hour window |
| **Backend** | Slack Rate-Limit Alerts | ✅ | OAuth connect flow, AES-256 encrypted tokens, live Slack message on limit |
| **Backend** | Elasticsearch Search | ✅ | Indexed recipients, senders, subjects, bodies with resilient database fallback |
| **Backend** | Live BullMQ Board | ✅ | Bull-Board UI mounted at `/admin/queues` with sidebar shortcut |
| **Backend** | Ethereal Fake SMTP | ✅ | Nodemailer with Ethereal SMTP + preview URL output |
| **Frontend** | Google OAuth Login | ✅ | Real Google OpenID Connect login, session cookie, user profile + avatar |
| **Frontend** | Modular Architecture | ✅ | Clean component structure: `types`, `api`, `common`, `layout`, `dashboard`, `campaign`, `settings` |
| **Frontend** | Main Dashboard | ✅ | Scheduled & Sent tabs, summary cards, search with ⌘K, pagination |
| **Frontend** | Compose Modal | ✅ | CSV/TXT lead file upload, detected address parser, date/time picker, throttle & hourly limit inputs |
| **Frontend** | Scheduled Emails Table | ✅ | Recipient, Subject, Sender, Scheduled time, status pills, loading & empty states |
| **Frontend** | Sent Emails Table | ✅ | Recipient, Subject, Sender, Sent time, Sent/Failed status, loading & empty states |
| **Frontend** | Senders & Integrations | ✅ | Manage senders, add custom SMTP, connect Slack, channel selector, queue link |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v20 or v22+
- **PostgreSQL**: Local instance or managed cloud DB (e.g. Neon, Supabase, RDS)
- **Redis**: Local instance with persistence or managed Redis (e.g. Upstash, Redis Cloud, Aiven)
- **Elasticsearch** (Optional for local test; fallback is active): Local or hosted (Elastic Cloud)
- **Or Docker**: Run `docker compose up -d` to launch local Postgres, Redis, and Elasticsearch in one command.

### 2. Environment Variables Configuration

Copy `backend/.env.example` to `backend/.env` and fill in the values:

```bash
cd backend
cp .env.example .env
```

| Variable | Description | Example |
|---|---|---|
| `PORT` | API server port | `5000` |
| `NODE_ENV` | Runtime environment | `development` locally; `production` on deployment |
| `FRONTEND_URL` | Frontend origin for CORS and OAuth redirects | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://reachinbox:reachinbox_secret@localhost:5432/reachinbox?schema=public` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password (if any) | `""` |
| `REDIS_URL` | Redis URL (if using managed Redis `rediss://...`) | `""` |
| `JWT_SECRET` | Secret key for signing session tokens | Generate with: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `TOKEN_ENCRYPTION_KEY` | 32-byte base64 AES key for Slack tokens & SMTP passwords | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `GOOGLE_CLIENT_ID` | Google OAuth Web Client ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | From Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | Google OAuth callback redirect | `http://localhost:5000/api/auth/google/callback` |
| `SLACK_CLIENT_ID` | Slack App Client ID | From Slack Developer Portal |
| `SLACK_CLIENT_SECRET` | Slack App Client Secret | From Slack Developer Portal |
| `SLACK_CALLBACK_URL` | Slack App OAuth redirect | `http://localhost:5000/api/slack/callback` |
| `ETHEREAL_USER` | Ethereal SMTP username | Free test account from [ethereal.email](https://ethereal.email) |
| `ETHEREAL_PASS` | Ethereal SMTP password | From [ethereal.email](https://ethereal.email) |
| `ELASTICSEARCH_NODE` | Elasticsearch endpoint | `http://localhost:9200` |
| `ELASTICSEARCH_API_KEY` | API key for a hosted Elasticsearch deployment | Keep this secret; leave blank for local Elasticsearch without auth |
| `SMTP_ALLOWED_HOSTS` | Comma-separated allow-list for user-provided SMTP sender hosts | `smtp.ethereal.email` |
| `EMAIL_CONCURRENCY` | Worker concurrency level | `5` |
| `MIN_EMAIL_DELAY_MS` | Minimum throttle delay between sends (ms) | `2000` |
| `MAX_EMAILS_PER_HOUR` | Server cap on emails per hour per sender | `100` |
| `QUEUE_ADMIN_EMAILS` | Comma-separated admin emails allowed to open Bull-Board | `admin@company.com` (set this for production; may be blank in local development) |

#### Setting up Ethereal Email Credentials
1. Go to [https://ethereal.email/create](https://ethereal.email/create).
2. It will instantly generate a test account with an email and password.
3. Put those in `ETHEREAL_USER` and `ETHEREAL_PASS` in `backend/.env`.
4. Whenever an email is sent, the worker logs output the Ethereal message preview URL where you can view the rendered message in your browser.

---

### 3. Running the Stack

#### Step A: Run Infrastructure (Docker Compose Option)
```bash
docker compose up -d
```
*(Binds Postgres on 5432, Redis with AOF on 6379, and Elasticsearch on 9200).*

#### Step B: Backend Database & Build
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
```

#### Step C: Run API Server (Terminal 1)
```bash
cd backend
npm run dev
```
API runs on `http://localhost:5000`.

#### Step D: Run BullMQ Worker (Terminal 2)
```bash
cd backend
npm run worker
```
Worker starts with concurrency: `5`, watching the email queue and transactional outbox.

#### Step E: Run Frontend Dashboard (Terminal 3)
```bash
cd frontend
npm install
npm run dev
```
Dashboard opens at `http://localhost:5173`.

---

## ☁️ Deploy on Vercel (Hobby-friendly)

The repository-root `vercel.json` defines a Vite frontend, an HTTP API container built from `backend/Dockerfile.api`, and a BullMQ worker daemon built from `backend/Dockerfile`. Set the Vercel project root to the repository root and choose the **Services** framework. Vercel builds both images remotely; Docker Desktop is not required locally.

Vercel Daemons are in public beta and use the plan's compute allowance. The Hobby plan currently includes 360 GB-hours of provisioned memory per month, so an always-on worker can consume a substantial share of the free allowance. Check Vercel's current usage and daemon limits before relying on it for continuous operation. Daemons run only in production, not preview deployments. See [Vercel Daemons](https://vercel.com/docs/daemons) and [Hobby plan usage](https://vercel.com/docs/plans/hobby).

Add the required backend variables from `backend/.env` to the Vercel production environment and keep their values private. Set `FRONTEND_URL` to the production Vercel URL without a trailing slash, set `NODE_ENV=production`, and set `QUEUE_ADMIN_EMAILS` to the admin's sign-in email. Do not copy a local `PORT=5000` value into Vercel; the API container listens on port 80 by default. Use these callback URLs in both Vercel and the respective provider consoles:

```text
https://<your-vercel-domain>/api/auth/google/callback
https://<your-vercel-domain>/api/slack/callback
```

The frontend uses same-origin `/api` routes in production, so leave `VITE_API_URL` unset. The local development default remains `http://localhost:5000`. Before deploying, rotate any credentials that were exposed and use only the replacement values in Vercel. Never commit `.env` files.

---

## 🧪 Running Automated Tests

Run backend unit tests (covering validations, CSV parsing, AES-256-GCM token encryption, rate limiting, and timestamp calculations):

```bash
cd backend
npm test
```

---

## 📹 Demo Video Script (Under 5 Minutes)

Here is a recommended walkthrough for your assignment submission video:

1. **Google Login (0:00 - 0:30)**:
   - Navigate to the deployed application URL (or `http://localhost:5173` for a local demo).
   - Click "Continue with Google".
   - Show dashboard with your user name, email, and Google avatar in top header and sidebar.
2. **Scheduling Campaign (0:30 - 1:30)**:
   - Click "Compose New Email".
   - Import a small `.csv` or `.txt` test lead file (show detected valid lead count).
   - Enter Subject and Body.
   - Set Start time (e.g., in 1 minute), Delay between sends (e.g., 2s), and Hourly limit.
   - Click "Schedule emails".
   - Switch to **Scheduled** tab: show emails waiting with recipient, sender, scheduled time, and "Scheduled" badge.
3. **Queue and Delivery (1:30 - 2:15)**:
   - Click "Queue Monitor" to open `/admin/queues` and show a delayed job.
   - Show the email move from **Scheduled** to **Sent** and open its Ethereal preview URL.
4. **Restart & Persistence (2:15 - 3:15)**:
   - Use the local API and worker for this part so the process can be stopped and restarted from a terminal.
   - Schedule a future test email, stop the worker (`Ctrl+C`), and show that the job remains scheduled.
   - Restart it with `npm run worker` before the due time and show the email is processed once.
5. **Slack Rate-Limit Alert (3:15 - 4:15)**:
   - Before recording, connect Slack and select a notification channel.
   - Schedule two Ethereal test recipients with an hourly campaign limit of `1` and a short interval.
   - Show the first email send, the second job move to **Delayed**, and the live Slack rate-limit notification.
6. **Search (4:15 - 4:45)**:
   - Search for a known test recipient or subject and show the matching email.

Use Ethereal-backed sender credentials and test recipient addresses. Ethereal provides a preview instead of delivering to real inboxes. Keep the merged video under five minutes.

### Submission Checklist (outside the demo video)
- Set the GitHub repository visibility to **Private** and grant repository access to the reviewer account(s) named in the assignment.
- Upload the demo video (maximum 5 minutes) and submit the repository and video links through the assignment form.
- Include any assumptions, shortcuts, or trade-offs in this README's section below.

---

## ⚖️ Assumptions and Trade-offs

1. **At-Least-Once Delivery vs Exactly-Once Delivery**:
   In distributed email architectures, network failures during SMTP handshakes mean a worker could send an email and crash before storing `SENT` in the database. To minimize duplicates, we claim emails atomically (`UPDATE ... WHERE status = 'SCHEDULED'`) prior to SMTP transport, and flag orphaned worker crashes (`recoverStaleProcessingEmails`) for manual review.
2. **Elasticsearch Resilience**:
   Elasticsearch is used for high-performance text and keyword search across large recipient databases. If Elasticsearch is unreachable during development, the API gracefully falls back to case-insensitive database filtering so core scheduling functionality is never blocked.
3. **Queue Deduplication**:
   Every BullMQ job uses `jobId: email.id`. BullMQ guarantees that identical job IDs cannot exist simultaneously in the queue, preventing duplicate scheduling across retry loops.
