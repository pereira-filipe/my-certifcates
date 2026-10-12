# Deploying My Certificates

Production runs on **Fly.io** (the app, one machine plus a disk for uploaded files) with the database on **Neon** (free tier). See [specs/BACKEND.md §7–8](specs/BACKEND.md) for why.

| Piece | Where | Backups |
|---|---|---|
| App (Docker image from `Dockerfile`) | Fly.io, region `gru` (São Paulo) | — |
| Uploaded files (`/data/uploads`) | Fly volume `uploads`, 1 GB | Fly daily snapshots, kept 14 days |
| Database | Neon, region AWS `sa-east-1` (São Paulo) | `.github/workflows/backup.yml`: daily encrypted dump, kept 30 days |

Rough cost (check current prices): Fly about $3–6/month for a 1 GB machine plus the 1 GB volume; Neon $0.

## First deployment

### 1. Database (Neon)
1. Sign up at <https://neon.com> and create a project named `my-certificates`, region **AWS São Paulo (sa-east-1)**.
2. Open **Connect**, turn **connection pooling off** (the host must *not* contain `-pooler`), and note the host, database, user and password.

### 2. Secrets file
1. `cp .env.production.example .env.production` (git-ignored, never committed).
2. Fill it in: the JDBC URL `jdbc:postgresql://<host>/<database>?sslmode=require`, user, password, and the **email + password you'll log in with** on the live site (at least 12 characters).

### 3. Fly.io
1. Sign up at <https://fly.io> (Fly asks for a payment card) and log in: `fly auth login`.
2. Create the app. The name becomes the address `https://<name>.fly.dev`; if you choose another name than `filipe-certificates`, change `app` and `APP_BASE_URL` in `fly.toml`.
   ```bash
   fly apps create filipe-certificates
   fly volumes create uploads --app filipe-certificates --region gru --size 1 --snapshot-retention 14 --yes
   fly secrets import --app filipe-certificates --stage < .env.production
   fly deploy
   ```
3. Open `https://filipe-certificates.fly.dev/login`, log in, then **Settings → Profile** to set your display name, and copy your share link.

## Automatic deploys and backups (GitHub)

In the repository: **Settings → Secrets and variables → Actions → New repository secret**.

| Secret | Value | Used by |
|---|---|---|
| `FLY_API_TOKEN` | output of `fly tokens create deploy --app filipe-certificates` | `deploy.yml`: deploys every push to `main` after CI passes |
| `NEON_DATABASE_URL` | Neon connection string (`postgresql://…`, no `-pooler`) | `backup.yml` |
| `BACKUP_PASSPHRASE` | a long random passphrase — **save it in your password manager**, backups can't be opened without it | `backup.yml` |

Then run **Actions → Database backup → Run workflow** once to check it.

Without these secrets the workflows just skip, with a note.

## Everyday operations

```bash
fly logs                      # live logs
fly status                    # machine and health
fly ssh console               # shell inside the machine
fly volumes snapshots list <volume-id>   # file backups
```

**Restore the database from a backup:** download the artifact from the backup run, then

```bash
gpg --decrypt my-certificates-db-YYYY-MM-DD.dump.gpg > db.dump      # asks for BACKUP_PASSPHRASE
pg_restore --clean --if-exists --no-owner --dbname "<NEON postgresql:// URL>" db.dump
```

**Restore uploaded files:** `fly volumes snapshots list <volume-id>`, then `fly volumes create uploads --snapshot-id <id> --region gru` and redeploy.

**Change the login password:** in the app, Settings → Password. (`APP_OWNER_*` secrets are only read the very first time.)

## Things to know
- Deploys restart the single machine, so the site is down for a few seconds. A volume can only be attached to one machine.
- Logging in again is needed after a deploy (sessions live in the app's memory).
- Neon's free database sleeps after 5 idle minutes; the first request after that takes about a second longer. The app's health check doesn't touch the database, so it can sleep.
