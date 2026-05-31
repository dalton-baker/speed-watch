# Speed Watch — Self-Hosted Speed Test Tracker

A lightweight, self-hosted speed test tracker that runs scheduled tests against either Ookla (via the official CLI) or Cloudflare (via direct HTTP requests), stores every result in SQLite, and shows the truth — especially failures — in a clean Svelte UI with Apache ECharts.

It is intended to run behind a reverse proxy, Cloudflare Zero Trust, Tailscale, or on a trusted LAN. It has **no built-in authentication**.

## Features

- Scheduled and on-demand speed tests
- Two providers: **Ookla** and **Cloudflare** (one active at a time)
- SQLite persistence; every scheduled attempt is recorded — successes, failures, timeouts, partials, and skipped runs
- Apache ECharts line charts for download / upload / ping / jitter with failure markers
- Time range filtering, run detail modal, recent runs table, dedicated history page
- Configurable via UI; settings stored in a JSON file alongside the database
- Simple REST API for integrations
- Single Docker container with a single mounted `/data` volume

---

## Running the Docker container

This section is for **using** the prebuilt image (or your own built image) to run the app.

### Quick start (docker run)

```bash
docker run -d \
  --name speed-watch \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/data:/data \
  speed-watch:latest
```

Then open <http://localhost:3000>.

### Quick start (docker compose)

```bash
docker compose up -d
```

This uses the included `docker-compose.yml`, which:

- Builds the image from this repo (or pulls if you change `image:` to a registry tag)
- Maps port `3000` on the host to `3000` in the container
- Mounts `./data` from the host into `/data` in the container

### Data volume

The app stores everything under `/data` inside the container:

- `/data/speedtest.db` — SQLite database with run history
- `/data/config.json` — application configuration (created with defaults on first run)

Mount this directory to a persistent location on the host so data survives container restarts and rebuilds.

### Environment variables

Environment variables are used **only** for bootstrap settings. All normal app settings are managed through the UI and saved to `/data/config.json`.

| Variable      | Default                  | Description                       |
|---------------|--------------------------|-----------------------------------|
| `PORT`        | `3000`                   | HTTP port to listen on            |
| `HOST`        | `0.0.0.0`                | Bind address                      |
| `DATA_DIR`    | `/data`                  | Directory for db + config         |
| `DB_PATH`     | `/data/speedtest.db`     | Override DB path                  |
| `CONFIG_PATH` | `/data/config.json`      | Override config file path         |

### First-time configuration

1. Open the app at `http://<host>:3000`
2. Go to **Config**
3. Pick your active provider (Ookla or Cloudflare), set the cron schedule, and save

Defaults:

- Scheduled tests **enabled**
- Cron: `*/10 * * * *` (every 10 minutes)
- Active provider: `cloudflare`
- Test timeout: 120 seconds

The scheduler reloads automatically after saving a valid config.

### Running behind a reverse proxy

The container exposes plain HTTP on port `3000`. Place it behind your favourite reverse proxy (Caddy, Traefik, nginx, etc.) and add authentication there if needed.

### API

Available HTTP endpoints:

| Method | Path                            | Description                                          |
|--------|---------------------------------|------------------------------------------------------|
| GET    | `/api/runs/latest`              | Most recent scheduled run                            |
| GET    | `/api/runs/latest-success`      | Most recent successful scheduled run                 |
| GET    | `/api/runs?from=&to=&provider=` | Historical runs, time range + optional provider      |
| GET    | `/api/runs/:id`                 | Single run by ID                                     |
| POST   | `/api/run`                      | Run a manual speed test (not persisted)              |
| GET    | `/api/config`                   | Current configuration                                |
| PUT    | `/api/config`                   | Update configuration (validated)                     |
| GET    | `/api/status`                   | Scheduler + run-active flag + range summary          |

All timestamps are Unix epoch **milliseconds**. JSON keys are camelCase.

---

## Building the project

This section is for **building** the Docker image from source, or developing locally without Docker.

### Build the Docker image

```bash
docker build -t speed-watch:latest .
```

The Dockerfile is multi-stage:

1. **Build stage** — installs npm dependencies (including native build deps for `better-sqlite3`) and runs `npm run build` to produce a production server bundle.
2. **Runtime stage** — slim Node 20 image with the Ookla `speedtest` CLI installed from the official Ookla repository, plus the built bundle and pruned `node_modules`.

The final image runs `node build` to start the SvelteKit server on `PORT` (default `3000`).

### Build with docker compose

```bash
docker compose build
```

This builds the image using the `docker-compose.yml` `build:` section.

### Local development (no Docker)

You need:

- Node.js 20+
- The Ookla `speedtest` CLI on `PATH` (only if you want to test the Ookla provider locally) — see <https://www.speedtest.net/apps/cli>

Then:

```bash
npm install
DATA_DIR=./data npm run dev
```

The dev server runs on <http://localhost:3000>. The SQLite database and config are written to `./data/`.

To build and run a production bundle locally:

```bash
DATA_DIR=./data npm run build
DATA_DIR=./data node build
```

### Project layout

```
src/
  app.html
  hooks.server.js               # initializes db, config, scheduler
  lib/
    chartOptions.js
    timeRange.js
    components/                 # Chart, ResultDetails, StatusBadge, SummaryCard
    server/
      paths.js                  # data/db/config paths from env
      db.js                     # SQLite open + migrations
      runs.js                   # run repository
      config.js                 # load/save/validate config
      runManager.js             # overlap-safe run execution
      scheduler.js              # cron scheduler
      providers/
        index.js
        ookla.js
        cloudflare.js
  routes/
    +layout.svelte
    +page.svelte                # home (charts + summary + run now)
    +page.server.js
    history/                    # full run history table
    config/                     # settings page
    api/                        # JSON API
```

### Non-goals

This app intentionally does **not** include: authentication, multi-user support, TypeScript, Postgres/MySQL/Mongo/Redis/DuckDB, provider comparison, provider rotation/alternation, push/email alerts, Kubernetes manifests, distributed workers.

The goal is a clean Dockerized speed test tracker that surfaces problems rather than hiding them.
