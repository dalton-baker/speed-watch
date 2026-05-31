# Speed Watch

**[Docker Hub](https://hub.docker.com/r/daltonsbaker/speed-watch) · [GitHub](https://github.com/dalton-baker/speed-watch)**

A lightweight, self-hosted speed test tracker. Runs scheduled tests against either **Ookla** or **Cloudflare**, stores every result in SQLite, and displays the truth — especially failures — in a clean dashboard with charts.

> **No built-in authentication.** Intended to run behind a reverse proxy, Cloudflare Zero Trust, Tailscale, or on a trusted LAN.

## Features

- Scheduled and on-demand speed tests
- Two providers: **Ookla** and **Cloudflare** (one active at a time)
- SQLite persistence — every attempt recorded: successes, failures, timeouts, partials, and skipped runs
- Line charts for download / upload / ping / jitter with failure markers
- Time range filtering, run detail modal, recent runs table, and a full history page
- Configurable via UI; settings saved to a JSON file alongside the database
- Simple REST API for integrations

---

## Quick start

### docker run

```bash
docker run -d \
  --name speed-watch \
  --restart unless-stopped \
  -p 6100:6100 \
  -v $(pwd)/data:/data \
  daltonsbaker/speed-watch:latest
```

Then open <http://localhost:6100>.

### docker compose

Create a `docker-compose.yml`:

```yaml
services:
  speed-watch:
    image: daltonsbaker/speed-watch:latest
    container_name: speed-watch
    restart: unless-stopped
    ports:
      - "6100:6100"
    volumes:
      - ./data:/data
```

Then run:

```bash
docker compose up -d
```

---

## Data volume

Everything is stored under `/data` inside the container:

| Path | Description |
|------|-------------|
| `/data/speedtest.db` | SQLite database with run history |
| `/data/config.json` | Application config (created on first run) |

Mount this to a persistent host directory so data survives restarts and image updates.

---

## Environment variables

These are bootstrap-only settings. All normal configuration is done through the UI and saved to `config.json`.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `6100` | HTTP port to listen on |
| `HOST` | `0.0.0.0` | Bind address |
| `DATA_DIR` | `/data` | Directory for db + config |
| `DB_PATH` | `/data/speedtest.db` | Override DB path |
| `CONFIG_PATH` | `/data/config.json` | Override config path |

---

## First-time setup

1. Open the app at `http://<host>:6100`
2. Go to **Config**
3. Choose your provider (Ookla or Cloudflare), set a cron schedule, and save

Defaults out of the box:

- Scheduled tests **enabled**
- Cron: `*/10 * * * *` (every 10 minutes)
- Active provider: `cloudflare`
- Test timeout: 120 seconds

The scheduler reloads automatically after saving a valid config.

---

## Running behind a reverse proxy

The container speaks plain HTTP on port `6100`. Drop it behind Caddy, Traefik, nginx, or similar and add authentication there if needed.

---

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/runs/latest` | Most recent scheduled run |
| `GET` | `/api/runs/latest-success` | Most recent successful run |
| `GET` | `/api/runs?from=&to=&provider=` | Historical runs with optional filters |
| `GET` | `/api/runs/:id` | Single run by ID |
| `POST` | `/api/run` | Trigger a manual speed test (not persisted) |
| `GET` | `/api/config` | Current configuration |
| `PUT` | `/api/config` | Update configuration (validated) |
| `GET` | `/api/status` | Scheduler state + active-run flag + range summary |

All timestamps are Unix epoch **milliseconds**. JSON keys are camelCase.

---

## Building from source

See [DEVELOPMENT.md](DEVELOPMENT.md).
