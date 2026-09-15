# Photo Album with Admin Panel

A photo gallery with an admin page to upload/delete photos yourself, no code
editing required after setup. Built with Next.js and Vercel Blob storage.

## What you get
- `/` — public gallery (what people see when they scan your QR code)
- `/admin` — login page (username + password)
- `/admin/dashboard` — upload new photos, delete old ones

## One-time setup on Vercel

1. Push this whole folder to a new GitHub repository.
2. Go to vercel.com, sign in with GitHub, click **Add New → Project**, and
   import that repository. Click **Deploy** (it may show an error at first —
   that's expected, see step 4).
3. In your new Vercel project, go to **Storage** tab → **Create Database** →
   choose **Blob** → create it and connect it to this project. This
   automatically adds a `BLOB_READ_WRITE_TOKEN` environment variable for you.
4. Go to **Settings → Environment Variables** and add these three:
   - `ADMIN_USERNAME` — whatever username you want to log in with
   - `ADMIN_PASSWORD` — a strong password
   - `AUTH_SECRET` — any long random string (mash your keyboard for 40+
     characters, it just needs to be unpredictable)
5. Go to **Deployments**, click the three dots on the latest one, and
   **Redeploy** so it picks up the new environment variables.
6. Visit `https://your-project.vercel.app/admin`, log in, and upload your
   first photos from the dashboard.
7. Your gallery is live at `https://your-project.vercel.app/` — that's the
   link to put into your QR code.

## Adding/removing photos later
Just go to `/admin`, log in, and upload or delete — the public gallery
updates immediately, no redeploying or GitHub needed.

## Local development (optional, for testing before deploying)
```
npm install
cp .env.example .env.local   # then fill in real values
vercel env pull .env.local   # (optional) pulls the real Blob token if using Vercel CLI
npm run dev
```
