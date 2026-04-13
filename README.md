# Daily Digest — Personalised News Aggregation

A personal Next.js web application that aggregates, summarises, and stores news from multiple categories using Gemini 1.5 Flash with Google Search Grounding. Reports are generated daily via Vercel Cron and delivered via browser push notifications.

## Features

- **20 predefined news categories** (AI, Tech, Sports, Music, etc.)
- **Automated daily reports** via Vercel Cron (7 AM UTC)
- **Browser push notifications** when reports are ready
- **Historical report browsing** — revisit any past daily digest
- **Supabase storage** for summaries and thumbnails
- **No paid APIs** — Gemini 1.5 Flash free tier + Google Search Grounding

---

## Prerequisites

- Node.js 18+
- npm / yarn / pnpm / bun
- A [Supabase](https://supabase.com) account (free tier)
- A [Google AI Studio](https://ai.google.dev/) account for Gemini API key (free)

---

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Initialize the Design Skill

```bash
npx uipro init --ai claude
```

This generates `design-system/` and `.claude/skills/ui-ux-pro-max/`. Commit these directories.

### 3. Configure Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

#### Environment Variables Reference

| Variable | Description | Where to Get |
|---|---|---|
| `GEMINI_API_KEY` | Gemini 1.5 Flash API key | [Google AI Studio](https://ai.google.dev/) — free tier |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Supabase Dashboard → Settings → API |
| `CRON_SECRET` | Bearer token for cron security | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key for push | `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | VAPID private key (server-only) | `npx web-push generate-vapid-keys` |

### 4. Supabase Setup

#### Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be provisioned

#### Run Migrations

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
3. Run the SQL — this creates all 4 tables:
   - `categories` — news categories
   - `reports` — daily report records
   - `summaries` — individual category summaries
   - `push_subscriptions` — browser push notification subscriptions

#### Seed Categories

1. Copy and paste the contents of `supabase/seed.sql`
2. Run the SQL — this inserts all 20 predefined categories

#### Create Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Create a new bucket named `thumbnails`
3. Set it to **Public**

### 5. Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

You'll receive a public and private key. Add them to your `.env.local`:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = the public key
- `VAPID_PRIVATE_KEY` = the private key

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Vercel Deployment

### 1. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

### 2. Configure Environment Variables

In the Vercel dashboard:

1. Go to your project → **Settings** → **Environment Variables**
2. Add all 7 variables from `.env.example`:

| Name | Value |
|---|---|
| `GEMINI_API_KEY` | (your Gemini API key) |
| `NEXT_PUBLIC_SUPABASE_URL` | (your Supabase URL) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (your Supabase anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | (your Supabase service role key) |
| `CRON_SECRET` | (your cron secret) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | (your VAPID public key) |
| `VAPID_PRIVATE_KEY` | (your VAPID private key) |

### 3. Verify Cron Job

After deployment, Vercel automatically configures the cron job defined in `vercel.json`.

To verify:
1. Go to your project in Vercel dashboard
2. Navigate to **Cron Jobs** tab
3. You should see `0 7 * * *` executing `/api/cron/generate-report`

If the cron job doesn't appear, redeploy the project.

### 4. Redeploy After Adding Environment Variables

After adding environment variables, trigger a new deployment:
- Go to **Deployments** → click **Redeploy** on your latest deployment
- Or push a new commit to trigger automatic deployment

---

## Usage

### Category Selection

Visit `/settings` to select which news categories you're interested in. Your selections are saved to Supabase and used during the next daily report generation.

### Viewing Reports

- **Today's report**: Visit `/` (home page)
- **History**: Visit `/history` to browse past reports by date

### Browser Notifications

On first visit, your browser will request permission to send push notifications. When a daily report is generated, you'll receive a desktop notification.

---

## Manual Cron Testing

To trigger the daily report generation manually:

```bash
curl -X POST https://<your-vercel-app>.vercel.app/api/cron/generate-report \
  -H "Authorization: Bearer <CRON_SECRET>"
```

Replace:
- `<your-vercel-app>` with your Vercel deployment URL
- `<CRON_SECRET>` with your cron secret environment variable

A successful response looks like:
```json
{
  "reportId": "uuid-here",
  "summaryCount": 5
}
```

---

## File Structure

```
├── app/
│   ├── api/
│   │   ├── cron/generate-report/    # Cron endpoint
│   │   ├── notifications/subscribe/ # Push subscription endpoint
│   │   └── reports/[date]/add-category/ # Add category to report
│   ├── history/
│   │   ├── page.tsx                # History list
│   │   └── [date]/page.tsx         # Single report view
│   ├── settings/
│   │   ├── page.tsx                # Category selection
│   │   └── actions.ts              # Server actions
│   ├── layout.tsx
│   ├── page.tsx                    # Home / Today's report
│   └── globals.css
├── components/
│   ├── CategoryCard.tsx
│   ├── GenerateButton.tsx
│   ├── NavBar.tsx
│   ├── PushSubscriber.tsx
│   ├── ReportEmptyState.tsx
│   ├── ReportListItem.tsx
│   └── SummaryCard.tsx
├── lib/
│   ├── gemini/
│   │   ├── client.ts
│   │   └── summarise.ts
│   ├── reports/
│   │   └── generateReport.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   └── webpush/
│       └── send.ts
├── public/
│   └── sw.js                       # Service Worker
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seed.sql
├── types/
│   └── summary.ts
├── design-system/                   # UI UX Pro Max skill
├── .env.example                     # Environment variable template
├── .env.local                       # Local environment (gitignored)
└── vercel.json                      # Cron configuration
```

---

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **AI**: Gemini 1.5 Flash with Google Search Grounding
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (thumbnails)
- **Push**: Native Web Push API (no third-party services)
- **Deployment**: Vercel (including Cron Jobs)
- **Styling**: Tailwind CSS + UI UX Pro Max design skill

---

## API Reference

### POST `/api/cron/generate-report`

Generates a daily report for all selected categories.

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Response:**
- `200`: Report generated successfully
- `401`: Missing or invalid CRON_SECRET
- `409`: Report for today already exists

### POST `/api/notifications/subscribe`

Subscribes a browser to push notifications.

**Body:**
```json
{
  "endpoint": "https://...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

### POST `/api/reports/[date]/add-category`

Adds a new category summary to an existing report.

**Body:**
```json
{
  "categoryId": "uuid"
}
```

**Response:**
- `200`: Summary added
- `404`: Report not found
- `409`: Category already in report
