# Human 3.0 Dashboard

A personal daily dashboard built on Dan Koe's Human 3.0 model. Glance at it a few
times a day: log with one tap, check in with an AI coach for two minutes, and
re-score your radar once a week.

## How it works

- **Today**: set one focus, tap to log drinks, vape/cigarettes, gym and pages read.
- **Tapers, not cold turkey**: drinks and nicotine have weekly budgets that start at
  your current amount. The budget steps down (5/10/15% of your start) only after a
  week you stayed inside it. A bad week holds the budget; it never punishes you.
- **No streaks**: consistency is "showed up X of the last 7 days", plus a
  "never miss twice" prompt the day after a miss.
- **Coach** (Claude): morning focus, evening check-in, and an "Ask" tab for cravings
  or bad days. It sees your last 14 days and your radar.
- **Weekly review**: score the 12 slices (1.1 to 3.3). The coach gives an honest take,
  and the radar shows this week against last week as a dashed line.
- **Reminders**: browser notifications at your morning, midday and evening times,
  plus an optional morning email. A GitHub Actions job pings the app hourly.

## Setup (about 15 minutes)

1. **Database (Supabase, free)**: create a project at supabase.com. In the SQL editor,
   run `supabase/schema.sql`. From Project Settings → API, copy the Project URL and
   the `service_role` key.
2. **Claude API key**: create one at console.anthropic.com → API keys.
3. **Deploy (Vercel, free)**: import this repo at vercel.com/new and add these
   environment variables:
   - `APP_PASSCODE`: the passcode you'll type to open the app
   - `ANTHROPIC_API_KEY`
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET`: any long random string
   - `APP_URL`: your Vercel URL, e.g. `https://human-3-dashboard.vercel.app`
   - Optional email: `RESEND_API_KEY`, `REMINDER_EMAIL_TO` (from resend.com)
4. **Reminders**: in this GitHub repo, Settings → Secrets and variables → Actions,
   add `APP_URL` and `CRON_SECRET` (same values as above).
5. Open the app, do the two-minute setup, then Settings → **Turn on notifications**.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in what you have; without Supabase it uses .data/db.json
npm run dev
```
