<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/d6d42459-626e-457d-8c7b-439e14698314

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Supabase Setup

1. In the Supabase dashboard, open the SQL Editor and run [`supabase_schema.sql`](supabase_schema.sql).
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Project Settings > API.
3. Restart the Vite dev server, then submit an order. Successful orders are inserted into `public.cafe_menu`.

The browser uses the public anon key and the SQL policy allows anonymous inserts only. Do not add a service-role key to a `VITE_` variable; manage order reads through an authenticated staff interface.
