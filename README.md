# KinFit — Family Workout Planner

A mobile-friendly, private family workout planning application. Parents manage one account and create profiles for every family member; children never log in.

## Test it directly from GitHub

Yes. This repository includes a GitHub Codespaces configuration, so no local installation is needed:

1. On the repository page, select **Code** → **Codespaces** → **Create codespace on this branch**.
2. Wait for the container to finish starting. KinFit starts automatically and GitHub opens the forwarded **KinFit web app** port in a new browser tab.
3. If the tab does not open, select the **Ports** tab in the Codespace and open port `3001`.
4. Select **Create a new parent account**, enter a fictional email address and a password of at least eight characters, then explore the preloaded fictional family.

The Codespace is private to your GitHub account by default. Its family data is stored only inside that Codespace unless you deliberately deploy or export it. To inspect startup output, run `cat /tmp/kinfit-server.log` in the Codespace terminal.

Every push and pull request also runs the isolation tests, build, and syntax checks through GitHub Actions. Open the repository's **Actions** tab to inspect those results. GitHub Pages is not supported because this app requires its private account API; use Codespaces for an immediate browser-based trial.

## Run locally

Requires Node.js 20 or newer. No third-party packages are required.

```bash
npm start
# open http://localhost:3001
```

Create any fictional parent account (password must be at least 8 characters). New accounts are populated with fictional Alex, Maya, and Leo profiles so every flow can be explored immediately.

## Data and production setup

Account passwords are salted and hashed with Node's `scrypt`; opaque session tokens and each family's plan are stored server-side. Data defaults to `data/families.json` (created with owner-only permissions). Set `DATA_FILE=/secure/persistent/path/families.json` to use a mounted production volume, and put the app behind an HTTPS reverse proxy. Back up that volume and restrict access to the service user. The included file store is suited to a single application instance; use a transactional database and secure, expiring cookies before horizontal scaling.

## Tests and build

```bash
npm test
npm run build
```

The API tests create two parents, verify one cannot see the other's edits, reject unauthenticated access, and exercise plan/history persistence.
