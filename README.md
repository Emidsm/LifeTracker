# LifeTracker

![Preact](https://img.shields.io/badge/Preact-10-673AB8?logo=preact&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-serverless-F38020?logo=cloudflare&logoColor=white)
![Cloudflare D1](https://img.shields.io/badge/Cloudflare_D1-SQLite_at_the_edge-F38020?logo=cloudflare&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa)
![License](https://img.shields.io/badge/license-MIT-blue)

A personal productivity PWA built to track daily activity, monitor academic and professional opportunities, and receive intelligent push notifications — all running at the edge with a sub-20 KB frontend bundle.

---

## Features

### Activity Tracking
Log what you are doing throughout the day by selecting a category and optionally adding a note. Each entry is timestamped so the app can compute how long you have spent on each category.

### Visual Day Timeline
A chronological timeline view renders your activity log for the current day, making it easy to see where your time actually went.

### Reports
Aggregated breakdowns per category let you review your productivity patterns over any time range. Useful for understanding recurring habits and identifying time sinks.

### Opportunity Tracker
Keep track of scholarships, internships, and research programs in a structured board. Each opportunity holds a status, deadline, notes, and an optional link, plus a per-opportunity checklist of required documents or steps.

### URL Monitor with Push Notifications
Register any URL (internship listings, fellowship pages, etc.) and a background worker will periodically fetch the page and compare it against a stored hash. When the content changes, a descriptive push notification is sent to your device via the Web Push API. No more manually refreshing pages for application windows to open.

### PIN Authentication
Lightweight authentication via a hashed PIN. Sessions are managed with short-lived tokens stored in D1, keeping the app private without requiring a full account system.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | [Preact](https://preactjs.com/) 10 + Vite |
| Backend | [Cloudflare Workers](https://workers.cloudflare.com/) (serverless, edge) |
| Database | [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite at the edge) |
| Push | Web Push API + VAPID |
| Icons | [Lucide Preact](https://lucide.dev/) |
| Deployment | Wrangler CLI |

The frontend is bundled with Vite using the `@preact/preset-vite` plugin and ships as a single JS file under 20 KB gzipped. The backend is a single Cloudflare Worker that routes requests to modular handlers.

---

## Architecture

```
Browser (PWA)
    |
    |  HTTPS
    v
Cloudflare Worker  (api/index.js)
    |-- /api/auth          PIN login, token validation
    |-- /api/activities    CRUD for time entries
    |-- /api/opportunities CRUD for scholarship/internship board
    |-- /api/monitors      URL monitor management + diff checks
    |-- /api/push          Web Push subscription management
    |-- /api/settings      User preferences, awake window, pause state
    |
    v
Cloudflare D1 (SQLite)
    |-- settings           Global config, notification schedule
    |-- auth_tokens        Session tokens
    |-- activities         Time log entries
    |-- opportunities      Opportunity board
    |-- checklist_items    Per-opportunity document checklists
    |-- push_subscriptions Web Push endpoints
    |-- url_monitors       Monitored URLs + content hashes
```

The URL monitor runs as a scheduled Cloudflare Worker cron trigger. It fetches each active URL, computes a hash of the response body, compares it with the stored hash, and fires a push notification if a diff is detected.

---

## Database Schema

Managed via D1 migrations in `migrations/`. Apply them with:

```bash
# Local development
npm run db:init:local

# Production
wrangler d1 migrations apply lifetracker
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Cloudflare account with Workers and D1 enabled
- Wrangler CLI (`npm i -g wrangler`)

### Local Development

```bash
# Install dependencies
npm install

# Initialize local D1 database
npm run db:init:local
npm run db:seed:local   # optional sample data

# Generate VAPID keys for push notifications
npm run generate-vapid
# Add the output to .dev.vars (see .dev.vars.example)

# Start frontend (Vite) + Worker in parallel
npm run local
```

The Vite dev server starts at `http://localhost:5173` and the Worker at `http://localhost:8788`.

### Production Deployment

```bash
# Apply D1 migrations to production
wrangler d1 migrations apply lifetracker

# Build frontend and deploy Worker
npm run deploy
```

Set the following secrets in the Cloudflare dashboard or via `wrangler secret put`:

| Variable | Description |
|---|---|
| `VAPID_PUBLIC_KEY` | VAPID public key |
| `VAPID_PRIVATE_KEY` | VAPID private key |
| `VAPID_SUBJECT` | `mailto:` address for VAPID |

---

## Project Structure

```
.
├── api/
│   ├── index.js           # Worker entry point and router
│   ├── webpush.js         # VAPID push notification helper
│   └── routes/            # Route handlers
├── src/
│   ├── App.jsx            # Root component and tab router
│   ├── api.js             # Typed fetch wrapper
│   ├── constants.js       # Category definitions
│   ├── components/        # Shared UI components
│   └── tabs/              # Page-level tab components
├── migrations/            # D1 SQL migrations
├── dist/                  # Production build output
└── wrangler.toml          # Worker + D1 binding config
```

---

## Author

Built by **Emiliano**, software engineering student.

---

## License

MIT
