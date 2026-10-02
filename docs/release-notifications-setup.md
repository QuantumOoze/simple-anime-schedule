# Release notification backend setup

1. Add a managed Postgres integration through the Vercel project, such as Neon.
2. Configure `DATABASE_URL` in the Vercel environment settings.
3. Apply `db/schema.sql` to that database.
   The existing Phase A schema already includes the `claimed_at` field used for delivery claims; no additional migration is required for Phase B.
4. Configure a long random `CRON_SECRET` in the Vercel environment settings.
5. Generate VAPID credentials with a trusted `web-push` key-generation command and configure `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` in the Vercel environment settings. Keep the private key server-side.
6. Redeploy so the API routes and once-per-minute cron configuration are active.

The backend now claims due reminders and sends server-side Web Push notifications. Phase C must still add the service-worker `push` handler and notification display before end-to-end browser notifications work. Frontend reminder synchronization remains intentionally deferred.
