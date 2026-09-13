# CoolGym — Backend / Frontend split

This is the original CoolGym Flask app, split into two independently
deployable stacks:

- **Backend/** — Flask JSON API (deploy to **Render**)
- **Frontend/** — React SPA built with Vite (deploy to **Netlify**)

The original app was a server-rendered Flask app (Jinja2 templates,
cookie-based sessions, Flask-WTF forms) — there was no separate frontend to
extract. `Backend/` is the same Flask app with every route converted from
`render_template`/`redirect` to JSON, and `Frontend/` is a new React app that
calls those JSON endpoints. Business logic (auth rules, admin/coach
permissions, membership/booking logic, the WebRTC video-call signaling) is
unchanged from the original.

## 1. Deploy the backend (Render)

1. Push `Backend/` to a git repo (or connect this repo and set the root
   directory to `Backend`).
2. In Render, create a **Web Service** from that repo.
   - Render will use `render.yaml` if present, or you can set:
     - Build command: `pip install -r requirements.txt`
     - Start command: (see `Procfile`)
3. Set these environment variables in Render:
   - `SECRET_KEY` — any long random string
   - `FLASK_ENV=production`
   - `SQLITE_DATABASE_URI` — your DB URL. For a real deployment, add a Render
     Postgres database and use its connection string here (despite the name,
     this variable works with any SQLAlchemy URL — Postgres included).
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — creates/updates the admin account on
     every deploy
   - `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`
     — for profile picture uploads (same as before)
   - `FRONTEND_ORIGINS` — comma-separated list of allowed origins, e.g.
     `https://your-app.netlify.app`
4. Deploy. Your API will be live at `https://your-backend.onrender.com`.
   Check `https://your-backend.onrender.com/api/health`.

## 2. Deploy the frontend (Netlify)

1. Push `Frontend/` to a git repo (or set the root directory to `Frontend`
   if using the same repo).
2. In Netlify, create a new site from that repo.
   - Build command: `npm run build`
   - Publish directory: `dist`
   - (`netlify.toml` already sets these + the SPA redirect rule.)
3. Set an environment variable in Netlify:
   - `VITE_API_URL` — your Render backend URL, e.g.
     `https://your-backend.onrender.com` (no trailing slash)
4. Deploy. Once live, go back to Render and set `FRONTEND_ORIGINS` to your
    Netlify URL (and redeploy the backend) so CORS/cookies work.

### Google Sign-In setup

Create a **Web application** OAuth client in Google Cloud Console and configure
its OAuth consent screen. Add `http://localhost:5173` and your already-deployed
Netlify frontend URL as Authorized JavaScript origins. Do not add a placeholder
domain as a real origin. Set the same client ID as `GOOGLE_CLIENT_ID` on Render
and `VITE_GOOGLE_CLIENT_ID` on Netlify, then redeploy both services. No Google
client secret is used by the frontend or required for this ID-token flow.

## Local development

**Backend:**
```bash
cd Backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in SECRET_KEY, ADMIN_EMAIL, etc.
flask --app wsgi:app db upgrade
flask --app wsgi:app seed-admin
python coolgym.py       # runs on http://127.0.0.1:5000
```

**Frontend:**
```bash
cd Frontend
npm install
cp .env.example .env   # VITE_API_URL=http://127.0.0.1:5000
npm run dev             # runs on http://127.0.0.1:5173
```

## Why cross-origin auth still works

The frontend and backend now live on different domains. Login still uses
Flask-Login's normal session cookie (no rewrite to JWTs), configured with
`SameSite=None; Secure` in production so the browser sends it on cross-site
requests to Render. The frontend's `fetch` calls always pass
`credentials: 'include'`, and CORS on the backend is locked down to the
`FRONTEND_ORIGINS` you configure — so only your Netlify site can use the
cookie.

## What changed vs. the original app

- All Flask routes now return JSON instead of rendering Jinja2 templates.
- A new React app reproduces every page (public site, login/register, member
  dashboard, messaging, admin panel, coach panel, video call rooms).
- `flask-cors` added; cookie config updated for cross-site requests.
- WebRTC signaling (`Flask-SocketIO` on the backend, the join/offer/answer/
  ICE flow) is functionally unchanged — the client-side logic was ported
  from `calls.js` into `Frontend/src/pages/calls/Room.jsx`.
- Profile picture uploads still go straight to Cloudinary (unchanged), so no
  local file storage is needed on either host.
- Static marketing images/videos moved to `Frontend/public/assets`.

## Known simplifications

Given this was a full rewrite, a few things are new/simplified rather than
pixel-for-pixel ports of the original Jinja templates:
- The visual design follows the original's color/typography (Bebas Neue +
  DM Sans, black/yellow theme) but layouts were rebuilt for React/Tailwind
  rather than copied line-by-line from the old HTML/CSS.
- Decorative JS (custom cursor, scroll-triggered animations) from the
  original `main.js` was not ported — it was cosmetic and unrelated to
  functionality.
