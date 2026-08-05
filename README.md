# RU-Vibe — The Scarlet Drop

**[ru-vibe.vercel.app](https://ru-vibe.vercel.app)** · a live party heatmap for Rutgers

Students post a photo; it drops as a pin on a shared campus map and glows where pins pile up. Everything is archived at 6 AM, so the map only ever shows tonight. Viewing is open to anyone; posting needs a `@scarletmail.rutgers.edu` address.

## The one idea worth reading

**The browser talks to Supabase directly.** Photo bytes never touch the Next.js server — the phone uploads straight to Storage and inserts straight into Postgres. Proxying that through our own server would double the bandwidth for nothing, because the authorization check has to happen at the database anyway: a client can always skip our server and call the API itself.

So the anon key is a name tag, not a permission slip. It ships inside the JavaScript bundle and anyone can read it. What actually stops abuse is row-level security. `proxy.ts` gates `/capture`, but that's UX — it saves a student from shooting a photo only to hit a login wall — not a boundary.

## Decisions

**Post limits are a database function, not client state.** Three photos a day, resetting at 6 AM `America/New_York`, counted inside the `INSERT` policy against the database's own clock. A client that lies about the time, or skips the UI entirely, still gets a `42501`.

```sql
create policy "authenticated users can post within rules"
  on public.posts for insert to authenticated
  with check (auth.uid() = user_id and public.can_post(auth.uid()));
```

**Storage permission is a path convention.** Photos land at `<user_id>/<uuid>.jpg` and the bucket policy checks the first segment against the `user_id` in the verified JWT. Owning a folder means owning your files — no ownership table, no way to overwrite someone else's photo.

**Six-digit codes, not magic links.** A magic link logs you in *on whichever browser opened the email* — Gmail opens its own in-app browser, session cookies don't cross browsers, and the student ends up authenticated somewhere they'll never return to. No amount of instructional copy fixes that. A code is read with the eyes and typed into the tab that's already open.

**Realtime subscription, not polling.** Polling costs scale with viewers × frequency rather than with activity: 100 idle students at 4 AM would still make ~33 requests/second to be told nothing changed. A subscription is free while idle and delivers the inserted row straight into the same `addMarker()` the initial load uses.

**A public bucket, storing full URLs.** The map is viewable logged out, so `<img src>` has to just work; a private bucket would mean minting a signed URL per photo. Storing URLs instead of storage paths is normally a mistake — they rot on migration — but nothing here survives past 6 AM.

**The native camera, not `getUserMedia`.** A custom viewfinder gave up flash, night mode and stabilization for a lot of iOS-specific debugging. The cost is that nothing can be overlaid on the live preview, which is fine: the Polaroid frame, film grade and caption are composited onto a canvas afterward.

**The nightly reset is `pg_cron` + `pg_net`, not an Edge Function.** The job moves files, copies rows and deletes them. An Edge Function would have added a Deno runtime and a deploy pipeline *plus* a cron to wake it and a key for it to use — and cron was needed regardless. It fires hourly and checks the New York hour inside the function, because a UTC cron expression silently drifts an hour twice a year.

## Stack

| | |
|---|---|
| **Framework** | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Bun |
| **Backend** | Supabase — Auth, Postgres + RLS, Storage, Realtime, `pg_cron` |
| **Maps** | Mapbox GL JS — `📍` markers over a heatmap layer |

Supabase was chosen so authentication, authorization, the realtime feed and the nightly job all live in one Postgres instance instead of four services.

## Running locally

```bash
bun install
bun dev
```

`.env.local` needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`. Apply `supabase/migrations/*.sql` in order.

Camera and geolocation need a secure context, so a LAN IP won't do — the page loads and the features silently die. Use a tunnel:

```bash
cloudflared tunnel --url http://localhost:3000
```

## Known gaps

Login emails land in spam pending SPF/DKIM on a real domain. The archive is write-only — nothing reads it back yet. The map reads the session once per page load, so a second tab can show a stale button until you act on it.
