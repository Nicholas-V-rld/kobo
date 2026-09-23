# Kobo

Income and spending tracker for freelancers (PWA). React + Vite frontend, Convex backend with password auth.

- Live: https://kobo-jade.vercel.app (Vercel project `majostechs-projects/kobo`)
- Convex project `kobo` (team `majos-daniel`): dev `fabulous-dinosaur-125`, prod `spotted-bird-479`

## Develop

- `npx convex dev` keeps the dev backend in sync (writes `.env.local`)
- `npm run dev` starts the frontend
- `npm test` runs the backend tests in `convex/finance.test.ts`

## Deploy

1. `npx convex deploy` (backend to prod)
2. `npx vercel deploy --prod` (frontend; `VITE_CONVEX_URL` is set in the Vercel project)

## How money flows

- Dollar income waits in the dollar balance. Converting it to naira splits the naira into
  Savings / Product / Bills / Living using the percentages in Settings.
- Naira income is split the moment it is logged.
- Product returns (money the network marketing business pays back) go into the Product bucket.
- Spending comes out of the bucket you choose. "Move" shifts money between buckets.
- Safe to spend today = Living balance ÷ days left in the month.

Every Convex function derives the user from the auth session; nobody can read or change another user's rows.
