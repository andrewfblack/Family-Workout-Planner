# KinFit — Family Workout Planner

A mobile-friendly, private family workout planning application. Parents manage one account and create profiles for every family member; children never log in.

## Test it in GitHub Codespaces

Yes. This repository includes a GitHub Codespaces configuration, so no local installation is needed:

1. Add a `DATABASE_URL` Codespaces secret containing a connection string for a development PostgreSQL database.
2. On the repository page, select **Code** → **Codespaces** → **Create codespace on this branch**.
3. Wait for setup to install dependencies and start KinFit. GitHub opens the forwarded **KinFit web app** port in a new browser tab.
4. If the tab does not open, select the **Ports** tab in the Codespace and open port `3001`.
5. Select **Create a new parent account**, enter a fictional email address and a password of at least eight characters, then explore the preloaded fictional family.

The Codespace is private to your GitHub account by default, but its family data is stored in the configured database. Use a development database with fictional data rather than a production database.

Every push and pull request also runs the isolation tests, build, and syntax checks through GitHub Actions. Open the repository's **Actions** tab to inspect those results. GitHub Pages is not supported because this app requires its private account API; use Codespaces for an immediate browser-based trial.

## Run locally

Requires Node.js 20 or newer and PostgreSQL. Create an empty database, then provide its connection string:

```bash
npm install
export DATABASE_URL='postgresql://user:password@localhost:5432/kinfit'
npm start
# open http://localhost:3001
```

Create any fictional parent account (password must be at least 8 characters). New accounts are populated with fictional Alex, Maya, and Leo profiles so every flow can be explored immediately.

The server creates its `users` table on first use. Account passwords are salted and hashed with Node's `scrypt`; the database stores password hashes, opaque session tokens, and each family's plan as PostgreSQL `JSONB`.

## Deploy to Vercel

1. Import this repository into Vercel.
2. In the project's **Storage** tab, create a Postgres database from the Marketplace (such as Neon), and connect it to the project. Alternatively, add a `DATABASE_URL` environment variable for any Vercel-accessible PostgreSQL database.
3. Redeploy after connecting the database so the environment variable is available to the function.

`vercel.json` builds the static frontend and routes `/api/*` requests to the Vercel Function in `api/index.js`. Use a pooled/serverless PostgreSQL connection string when the provider offers one; this prevents function concurrency from exhausting database connections.

## Data and production setup

All application data is now stored in PostgreSQL rather than the instance filesystem, so it persists across Vercel function invocations and deployments. Back up the database, restrict database credentials to the application, and use separate databases for preview and production deployments. Vercel provides HTTPS automatically; other deployments should put the app behind an HTTPS reverse proxy. For a security-hardened production release, migrate bearer tokens to secure, HTTP-only, expiring cookies.

## Tests and build

```bash
npm test
npm run build
```

The API tests create two parents, verify one cannot see the other's edits, reject unauthenticated access, and exercise plan/history persistence.
