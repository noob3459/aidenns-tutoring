# Aidenn's Tutoring — Backend Setup Checklist

This covers wiring up the real booking backend: Supabase (database), Vercel
(hosting + serverless API + email sending), Google/Gmail (notifications),
and GoDaddy (domain). Nothing has been deployed — this is what to do next.

## ⚠️ First: a stray Vercel project was accidentally created

While testing locally, running `vercel dev` auto-created a **real, empty**
project on Vercel under an account/team called
`eddie-s-parts-marketing-s-projects` (project name `aidenns-tutoring`,
project ID `prj_4BAUzVsk7bGJUe7go66kygqBlnxh`). It has zero deployments and
no data in it, but if that isn't your intended Vercel team, delete it:

- Vercel dashboard → that team → Settings → your `aidenns-tutoring` project → **Delete Project**
- or via CLI once logged into the right account: `vercel project rm aidenns-tutoring`

Then do the real import (step 4 below) under the correct account/team.

---

## 1. Supabase

1. Create a project at supabase.com (or use an existing one).
2. Open **SQL Editor** → paste the entire contents of `supabase/schema.sql` from this repo → **Run**.
   - This creates the `bookings` table, a unique constraint on (date, time) to block double-booking, an index for rate-limiting, and turns on **Row Level Security with zero policies** — meaning the public key can't touch this table at all; only the server can, via the service role key.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → this is `SUPABASE_URL`
   - **service_role secret** (not the `anon public` key) → this is `SUPABASE_SERVICE_ROLE_KEY`
4. Treat the service_role key like a master password — it bypasses RLS entirely. It only ever goes into Vercel environment variables, never into any file in this repo, never into frontend code.
5. To confirm a booking later: open **Table Editor → bookings**, find the row, change `status` from `pending` to `confirmed` (or `declined`).

## 2. Google / Gmail (for sending email)

1. Go to your Google Account → **Security**.
2. Turn on **2-Step Verification** if it isn't already on (required for App Passwords).
3. Once 2-Step Verification is on, go to **Security → 2-Step Verification → App passwords** (or search "App Passwords" in your Google Account settings).
4. Create a new app password — name it something like "Aidenn's Tutoring site".
5. Google shows you a 16-character password **once**. Copy it immediately.
   - `GMAIL_USER` = your full Gmail address (e.g. `you@gmail.com`)
   - `GMAIL_APP_PASSWORD` = that 16-character code (not your normal Gmail password)
6. Decide where new-booking-request emails should land — `BOOKING_NOTIFICATION_EMAIL` (can be the same Gmail address, or a different inbox you check).

## 3. Vercel — import the project

1. Push this project to a GitHub repo (Vercel deploys from Git).
   ```bash
   cd ~/Desktop/websites/aidenns-tutoring
   git init
   git add .
   git commit -m "Aidenn's Tutoring site"
   # create a repo on GitHub, then:
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```
2. In the Vercel dashboard: **Add New → Project → Import** your GitHub repo.
3. Vercel auto-detects Vite (build command `vite build`, output `dist`) — leave that as-is.
4. Before deploying, add these **Environment Variables** (Project Settings → Environment Variables), applied to Production, Preview, and Development:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | from Supabase step 3 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from Supabase step 3 |
   | `GMAIL_USER` | your Gmail address |
   | `GMAIL_APP_PASSWORD` | the 16-character app password |
   | `BOOKING_NOTIFICATION_EMAIL` | where you want booking alerts sent |

5. Click **Deploy**. This creates a preview deployment — nothing goes live on your domain yet.
6. Test the live preview URL: go through the booking wizard end-to-end, confirm you get the owner notification email and the parent gets the receipt email, and confirm the row shows up in Supabase's Table Editor.
7. Only promote to Production / attach your domain once you've verified step 6 works.

To test locally before pushing: copy `.env.example` to `.env`, fill in real values, run `vercel dev` (requires being logged into the correct Vercel account first — `vercel login`).

## 4. GoDaddy — connect `aidennstutoring.org`

1. In Vercel: **Project → Settings → Domains → Add** → enter `aidennstutoring.org` → Vercel shows you the exact DNS records it wants (usually an `A` record for the apex domain and a `CNAME` for `www`).
2. In GoDaddy: **My Products → DNS** for `aidennstutoring.org`.
3. Add exactly the records Vercel showed you (don't guess — copy the values Vercel displays, they can change).
   - **Do not delete existing `MX` or `TXT` records** on this domain if it currently sends/receives email or has domain-verification TXT records (e.g. Google Workspace) — only add/edit the `A`/`CNAME` records Vercel asked for.
4. Wait for DNS to propagate (usually minutes, sometimes up to a few hours) — Vercel's Domains page will show a green "Valid Configuration" once it sees it.
5. In Vercel, set `aidennstutoring.org` as the **Primary Domain** for the project (Domains tab → the "..." menu next to the domain → Set as Primary). This makes Vercel 301-redirect any other attached domain (like a bare `www`) to it automatically.

## 5. GoDaddy — redirect `.com` and `www.com` to `.org`

You said not to use masking — this is a clean 301 (search engines and browsers see the real destination URL, not a frame).

1. In GoDaddy: **My Products** → find `aidennstutoring.com` → **DNS** (or **Domain Settings**) → **Forwarding**.
2. Set up forwarding for the apex (`aidennstutoring.com`):
   - Forward to: `https://aidennstutoring.org`
   - Forward type: **Permanent (301)**
   - Settings: **Forward only** — make sure "masking"/"cloaking" is turned **off** (GoDaddy sometimes calls this "Forward with masking" — leave that unchecked).
3. Repeat for `www.aidennstutoring.com` (GoDaddy usually lets you forward `www` separately, or bundles it with a checkbox) → also 301, also no masking, also pointing to `https://aidennstutoring.org`.
4. Same warning as before: **don't delete existing MX/TXT records** on `aidennstutoring.com` if that domain handles any email or has verification records — domain forwarding for the web address doesn't require touching those.

---

## Local testing quick-reference

```bash
npm run dev          # front-end only — /api routes won't work here
vercel dev            # front-end + working /api/book, needs .env filled in and `vercel login` first
npm run build          # production build check
npx oxlint src api      # lint check
```
