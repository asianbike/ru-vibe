# RU-Vibe — The Scarlet Drop

A real-time party heatmap for Rutgers, restricted to `@scarletmail.rutgers.edu`.

Students post a live photo; it drops as a pin on a shared campus map. **Where the pins pile up is where it's happening right now.** Everything is wiped at 6 AM daily, so the map only ever shows tonight.

> **Status:** core loop complete (auth → capture → upload → map → realtime). Deployment and PWA polish in progress. See [Roadmap](#roadmap).

---

## Why this is built the way it is

The interesting part of this project isn't the UI — it's that **the browser talks to the database directly**, and every rule is enforced server-side rather than in client code.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐
│   Browser    │     │  Next server │     │        Supabase          │
│  (student's  │     │  (our code)  │     │                          │
│    phone)    │     │              │     │  Auth · Postgres · RLS   │
├──────────────┤     ├──────────────┤     │  Storage · Realtime      │
│ camera, GPS  │     │ renders HTML │     ├──────────────────────────┤
│ canvas       │     │ proxy.ts     │     │  ← every rule lives here │
│ Mapbox       │     │ (login gate) │     │                          │
└──────┬───────┘     └──────────────┘     └────────────▲─────────────┘
       │                                               │
       └───────────────────────────────────────────────┘
          uploads, queries, and the realtime socket
          bypass our server entirely
```

Photo bytes never touch the Next.js server. A student's phone uploads straight to Supabase Storage and inserts straight into Postgres. Routing that through our own server would double the bandwidth for zero benefit, because the authorization check has to happen at the database anyway — a client can always skip our server and call the API directly.

So the security model is: **the anon key is a name tag, not a permission slip.** It's compiled into the JavaScript bundle and is visible to anyone. What actually stops abuse is Postgres row-level security.

---

## Engineering decisions

**Daily post limits are a database function, not client state.**
Each student gets 3 photos per day, resetting at 6 AM `America/New_York`. The count is evaluated inside the `INSERT` policy using the database's own clock, so a client that lies about the time — or skips our UI entirely — still gets rejected with a `42501`. The app translates that error code into a human sentence.

```sql
create policy "authenticated users can post within rules"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = user_id and public.can_post(auth.uid()));
```

**Storage permissions are expressed as a path convention.**
Photos upload to `<user_id>/<uuid>.jpg`, and the bucket policy checks that the first path segment equals the `user_id` extracted from the request's verified JWT. Owning a folder means owning your files — no separate ownership table, and no way to overwrite someone else's photo.

**Six-digit codes instead of magic links.**
Magic links log you in *on whichever browser opened the email*. Gmail's app opens links in Google's in-app browser, and session cookies don't cross browsers — so the student ends up logged in somewhere they'll never return to, and logged out in Safari where they actually use the app. No amount of instructional copy fixes that. A code is read with the eyes and typed into the tab that's already open, so the session never leaves the browser it started in.

**Realtime subscription instead of polling.**
Polling costs scale with *viewers × frequency*, not with activity: 100 students idling at 4 AM with an empty map would still generate ~33 requests/second, all answering "nothing changed." A subscription costs nothing while idle, and delivers only the newly inserted row — which drops straight into the same `addMarker()` the initial load uses.

**A public bucket, and full URLs stored in the database.**
The map is viewable without logging in, so `<img src>` has to just work. A private bucket would mean minting a signed URL per photo (50 pins = 50 API calls) that expires in an hour. Storing full URLs instead of storage paths is normally a mistake — URLs rot if you migrate storage — but nothing here survives past 6 AM, so there is no historical data left to rot.

**The native camera app, not `getUserMedia`.**
A custom viewfinder gave up flash, night mode, and stabilization, and cost a lot of iOS-specific debugging. `<input type="file" capture="environment">` hands off to the camera the student already knows. The trade-off is that no custom UI can be overlaid on the live viewfinder — acceptable here, since the timestamp is composited onto the canvas afterward.

---

## Stack

| | |
|---|---|
| **Framework** | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 |
| **Runtime** | Bun |
| **Backend** | Supabase — Auth, Postgres + RLS, Storage, Realtime |
| **Maps** | Mapbox GL JS |

Supabase was chosen so that authentication, row-level authorization, the realtime feed, and the nightly reset job all live in one Postgres instance instead of four separate services.

---

## How it fits together

| Path | Role |
|---|---|
| `proxy.ts` | Request-level login gate for `/capture`. Redirects before the camera ever opens, so a student never shoots a photo only to lose it at the login wall. UX, not security — RLS is the real boundary. |
| `app/(main)/capture/page.tsx` | Orchestrates capture → geolocation → JPEG encode → upload → insert. Holds the coordinates in state between steps. |
| `components/capture/PolaroidCanvas.tsx` | Camera input and canvas compositing (photo + timestamp). Knows nothing about the database. |
| `app/(main)/map/page.tsx` | Mapbox init, initial post query, realtime subscription. |
| `app/(auth)/login/page.tsx` | Two-step OTP flow in a single component, so the email address survives between steps. |
| `lib/supabase/{client,server}.ts` | Browser and server Supabase clients (cookie handling differs between them). |
| `supabase/migrations/*.sql` | The authorization rules — signup domain restriction, `posts` + RLS, storage bucket policy, realtime publication. |

---

## Running locally

```bash
bun install
bun dev
```

`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk....
```

Apply everything in `supabase/migrations/` to your Supabase project in order.

**Testing on a real phone:** the camera and geolocation APIs only work in a secure context, so a LAN IP won't do — the page loads and the features silently die.

```bash
bun dev
cloudflared tunnel --url http://localhost:3000
```

---

## Roadmap

- [x] Scarletmail-only auth (6-digit OTP)
- [x] Capture: native camera, timestamp overlay, geolocation
- [x] Upload to Storage + `posts` insert, server-enforced 3/day limit
- [x] Map with existing pins and photo popups
- [x] Realtime pin drops
- [ ] Nightly 6 AM reset (scheduled Edge Function + Storage cleanup)
- [ ] PWA install prompt, icons, in-app-browser warning banner
- [ ] Deploy

**Known gaps:** no navigation between `/map` and `/capture` yet; the Mapbox token is unrestricted until a production domain exists; login emails land in spam pending SPF/DKIM on a real domain.
