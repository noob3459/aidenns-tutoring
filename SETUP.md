# Aidenn's Tutoring — Backend Setup Checklist

This covers wiring up the real booking backend: Supabase (database), Vercel
(hosting + serverless API + email sending), Resend (email delivery),
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
   - This is the **complete schema** — safe whether this is a brand-new project or you already ran an earlier version of this file. Every statement is idempotent (`if not exists` / `or replace`) and nothing drops or destructively rewrites `bookings` — existing booking rows are always preserved.
   - Creates: `bookings` (original table, unchanged), `site_settings` (editable site copy, auto-seeded with today's defaults on first run), `availability_days` (per-date closed/blackout overrides), `availability_slots` (bookable time slots), `recurring_availability_rules` (weekly templates the admin can generate from), `admin_login_attempts` (rate-limits admin login by a hashed IP — raw IPs are never stored).
   - Adds two hardened database functions (`claim_slot_and_book`, `update_booking_status`) that only the server can call — never reachable from a browser.
   - Turns on **Row Level Security with zero policies** on every table — the public key can't touch any of this data; only the server can, via the service role key and the explicit grants in the file.
   - **No manual data migration is needed** — `site_settings` seeds itself from the file, and `bookings` keeps every existing row exactly as-is.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → this is `SUPABASE_URL`
   - **service_role secret** (not the `anon public` key) → this is `SUPABASE_SERVICE_ROLE_KEY`
4. Treat the service_role key like a master password — it bypasses RLS entirely. It only ever goes into Vercel environment variables, never into any file in this repo, never into frontend code.
5. Bookings are now confirmed/declined/completed/cancelled from the **Admin dashboard's Availability tab** (click a date → each booking has action buttons) — you no longer need to hand-edit the Table Editor, though you still can if you prefer.

### 1a. Admin authentication (passcode + secrets)

The admin passcode used during development (`mathrocks26`) appeared in chat and is **compromised — never use it**. Set a brand-new one yourself, directly in Vercel, without typing it anywhere else:

1. Choose a new, strong passcode. Don't tell it to an AI assistant, don't put it in a file, don't commit it — just remember it (or store it in a password manager).
2. In Vercel: **Project Settings → Environment Variables** → add `ADMIN_PASSCODE` with that value.
3. Generate two more secrets locally (these are random signing keys, not passwords — safe to generate via command line):
   ```bash
   openssl rand -hex 32   # use this value for ADMIN_SESSION_SECRET
   openssl rand -hex 32   # run again, use this DIFFERENT value for IP_HASH_SECRET
   ```
4. Add both to Vercel as `ADMIN_SESSION_SECRET` and `IP_HASH_SECRET`.
5. Add `ALLOWED_ADMIN_ORIGINS` = `https://aidennstutoring.org,https://www.aidennstutoring.org` (comma-separated, no spaces) — this is a CSRF guard on admin actions; `localhost` and Vercel preview URLs are always allowed automatically, no need to list those.
6. Add `BOOKING_HORIZON_MONTHS` = `6` (or however many months ahead visitors should be able to book — past dates are never bookable regardless of this value).

All four are **server-only** — none of them are exposed to the browser.

## 2. Resend (for sending email)

1. Create an account at resend.com (or use an existing one).
2. Go to **API Keys → Create API Key**. Give it a name like "Aidenn's Tutoring site", default permissions are fine.
3. Copy the key immediately — Resend only shows it once.
   - `RESEND_API_KEY` = that key
4. Set the fixed values (already filled in for you in `.env.example`):
   - `MAIL_FROM` = `Aidenn’s Tutoring <aidenn@aidennstutoring.org>`
   - `MAIL_REPLY_TO` = `aidenn@aidennstutoring.org`
   - `BOOKING_NOTIFICATION_EMAIL` = `aidenn@aidennstutoring.org` (change this if you want alerts to land somewhere else)
5. **Before you can actually send from `aidenn@aidennstutoring.org`, the domain must be verified in Resend.** See the next section — do this before deploying, or Resend will reject the send.

### 2a. Verify `aidennstutoring.org` in Resend through GoDaddy

⚠️ **Your domain already runs Microsoft 365 email.** Do not delete or replace
any existing `MX` records, the `autodiscover` `CNAME` record, your existing
`SPF` `TXT` record, or any Microsoft/Office 365 domain-verification `TXT`
record (often something like `MS=ms12345678`). Deleting any of those breaks
your real inbox at `aidenn@aidennstutoring.org`. Everything below is
**additive** — you're adding new records alongside the Microsoft 365 ones,
not replacing them.

1. In the Resend dashboard: **Domains → Add Domain** → enter `aidennstutoring.org` → select the closest region → **Add**.
2. Resend shows you a list of DNS records to add — typically:
   - Several **DKIM** `CNAME` records (e.g. `resend._domainkey` → some `....dkim.resend.com` value, sometimes 2-3 of these).
   - One **SPF** `TXT` record, usually `v=spf1 include:amazonses.com ~all` (Resend sends through Amazon SES).
   - Optionally an `MX` record for bounce/inbound handling — **you almost certainly don't need this**, since Microsoft 365 already owns MX for this domain. Skip any Resend-suggested `MX` record unless you specifically want Resend handling inbound mail (you don't, in this setup).
3. In GoDaddy: **My Products → DNS** for `aidennstutoring.org`.
4. Add the **DKIM CNAME records exactly as Resend shows them** — these are new record names (like `resend._domainkey`), so they can't conflict with anything Microsoft 365 uses. Just add them.
5. **The SPF TXT record needs special handling — do not add a second SPF record.** A domain can only have one `v=spf1 ...` TXT record; having two causes SPF to fail (a "PermError") for *both* Microsoft 365 and Resend, which can hurt deliverability or cause your legitimate mail to be marked as spam.
   - First, look at your **existing** SPF record in GoDaddy's DNS list (a `TXT` record at the root/`@` that starts with `v=spf1`). It's probably close to:
     ```
     v=spf1 include:spf.protection.outlook.com -all
     ```
   - **Don't add Resend's SPF line as a separate record.** Instead, **edit your existing SPF TXT record** to include both mail systems in one line:
     ```
     v=spf1 include:spf.protection.outlook.com include:amazonses.com -all
     ```
     (Keep whatever `all` qualifier your existing record already used — `-all` or `~all` — there should only be one `all` mechanism, at the very end, after both `include:` entries.)
   - If your existing SPF record has other `include:` entries too (e.g. for a marketing tool), keep those and just add `include:amazonses.com` alongside them in the same record.
6. Wait for DNS to propagate, then back in Resend's **Domains** page, click **Verify** (or wait — Resend also polls automatically). All records should turn green.
7. Once verified, test by triggering a real booking against a deployed preview URL (see step 6 in the Vercel section below) and confirming both emails arrive and pass authentication (Resend's dashboard shows delivery status per email).

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
   | `RESEND_API_KEY` | from Resend step 3 |
   | `MAIL_FROM` | `Aidenn’s Tutoring <aidenn@aidennstutoring.org>` |
   | `MAIL_REPLY_TO` | `aidenn@aidennstutoring.org` |
   | `BOOKING_NOTIFICATION_EMAIL` | where you want booking alerts sent (`aidenn@aidennstutoring.org` by default) |
   | `ADMIN_PASSCODE` | the new passcode you chose in step 1a — type it directly into Vercel, not here |
   | `ADMIN_SESSION_SECRET` | from step 1a (`openssl rand -hex 32`) |
   | `IP_HASH_SECRET` | from step 1a (a *different* `openssl rand -hex 32`) |
   | `ALLOWED_ADMIN_ORIGINS` | `https://aidennstutoring.org,https://www.aidennstutoring.org` |
   | `BOOKING_HORIZON_MONTHS` | `6` |

5. Click **Deploy**. This creates a preview deployment — nothing goes live on your domain yet.
6. **Before testing the booking flow, log into `/admin` on the preview URL first** (your new passcode from step 1a) → **Availability** tab → click a few upcoming dates and add some time slots (or set up a recurring weekly rule and generate from it). The public booking calendar only shows dates/times you've explicitly created — nothing is bookable until you do this.
7. Test the live preview URL: go through the booking wizard end-to-end, confirm you get the owner notification email and the parent gets the receipt email, and confirm the row shows up in Supabase's Table Editor (or the admin dashboard's date view).
8. Only promote to Production / attach your domain once you've verified step 7 works.

To test locally before pushing: copy `.env.example` to `.env`, fill in real values, run `vercel dev` (requires being logged into the correct Vercel account first — `vercel login`).

## 4. GoDaddy — connect `aidennstutoring.org`

1. In Vercel: **Project → Settings → Domains → Add** → enter `aidennstutoring.org` → Vercel shows you the exact DNS records it wants (usually an `A` record for the apex domain and a `CNAME` for `www`).
2. In GoDaddy: **My Products → DNS** for `aidennstutoring.org`.
3. Add exactly the records Vercel showed you (don't guess — copy the values Vercel displays, they can change).
   - **Do not delete existing `MX`, `autodiscover` `CNAME`, `SPF` `TXT`, or Microsoft/Office 365 verification `TXT` records** on this domain — this domain runs real Microsoft 365 email. Only add/edit the `A`/`CNAME` records Vercel specifically asked for; everything Microsoft 365 needs stays untouched. (See section 2a above if you also need to add Resend's SPF include — merge it into the existing SPF record, don't create a second one.)
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
4. Same warning as before: **don't delete existing MX/Autodiscover/SPF/verification records** on `aidennstutoring.com` if that domain also handles any Microsoft 365 email — domain forwarding for the web address doesn't require touching those.

---

## Local testing quick-reference

```bash
npm run dev          # front-end only — /api routes won't work here
vercel dev            # front-end + working /api/book, needs .env filled in and `vercel login` first
npm run build          # production build check
npx oxlint src api      # lint check
```
