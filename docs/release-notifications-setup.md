# Release notification backend setup

1. Add a managed Postgres integration through the Vercel project, such as Neon.
2. Configure `DATABASE_URL` in the Vercel environment settings.
3. Apply `db/schema.sql` to that database.
4. Configure a long random `CRON_SECRET` in the Vercel environment settings.
5. Redeploy so the API routes and once-per-minute cron configuration are active.

This phase only stores anonymous subscriptions and reminder registrations. Web Push delivery and frontend synchronization are intentionally deferred.
