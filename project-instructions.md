# Project Instructions: Dockerized Speed Test Tracker

Build a lightweight self-hosted speed test tracking application that runs in a Docker container.

The goal is to build a clean, simple alternative to existing speed test tracker apps. The app should prioritize clear charts, visible failures, simple configuration, SQLite persistence for run history, and a clean Svelte UI.

The app should be simple, inspectable, and reliable. Do not overbuild it.

## Core Requirements

Use SvelteKit for the application.

Use plain JavaScript, not TypeScript.

Do not add TypeScript typedefs, TypeScript interfaces, or elaborate type scaffolding.

Use SQLite for persisted speed test run history.

Use Apache ECharts for charts.

Run the app in a single Docker container.

Do not add built-in authentication. This app is intended to run behind a reverse proxy, Cloudflare Zero Trust, Tailscale, or on a trusted LAN.

Do not use Postgres, MySQL, MongoDB, Redis, DuckDB, or any unnecessary external services.

## Docker Requirements

The application must run as a single Docker container.

The app should use a persistent data directory mounted at `/data`.

The SQLite database should be stored at `/data/speedtest.db`.

The application config should be stored separately from the SQLite database at `/data/config.json`.

The app should expose a single HTTP port.

The default port should be `3000`.

Environment variables should only be used for basic runtime/bootstrap settings, such as port, host, and data paths.

Normal app settings should be managed through the UI and saved to `/data/config.json`.

## Time Storage Requirement

All timestamps stored in SQLite must be Unix epoch integers.

Use epoch milliseconds consistently.

Do not store dates as strings in SQLite.

The frontend can convert epoch milliseconds into readable local date/time values for display.

## SQLite Data Requirement

SQLite should store speed test run history only.

Do not store application configuration in SQLite.

Do not store a vague `healthy` field. Health should be inferred by the user from the actual measurements.

Every scheduled test attempt must create a persisted run row, including successful runs, failed runs, timeouts, partial runs, and skipped runs.

Failures must not disappear from history.

A failed, timed-out, or skipped run should still create a row with meaningful status and error information.

## Run Data to Store

Each persisted speed test run should store the following data where available.

### Identity and Status

Store:

* run ID
* provider
* status
* scheduled/manual indicator
* scheduled time
* started time
* finished time

Provider values should include:

* Ookla
* Cloudflare

Status values should include:

* success
* failed
* timeout
* partial
* skipped

The scheduled/manual indicator should distinguish scheduled persisted runs from any manual result shape, even though manual runs are not persisted by default.

### Core Measurements

Store:

* download Mbps
* upload Mbps
* ping milliseconds
* jitter milliseconds
* packet loss percent

### Latency Details

Store latency details where available.

For idle/ping latency, store:

* idle latency milliseconds
* idle jitter milliseconds
* idle low milliseconds
* idle high milliseconds

For download latency, store:

* download latency milliseconds
* download jitter milliseconds
* download latency low milliseconds
* download latency high milliseconds

For upload latency, store:

* upload latency milliseconds
* upload jitter milliseconds
* upload latency low milliseconds
* upload latency high milliseconds

Some providers may not return every latency field. Missing fields should be stored as null or omitted from API responses as appropriate.

### Server and Network Metadata

Store:

* ISP
* external IP
* server ID
* server name
* server location
* server host

### Messages and Errors

Store:

* message
* error code
* error message
* raw provider result/details

Raw provider details should be stored so future parsing improvements do not require losing original data.

## Config Storage

Application config must be stored in `/data/config.json`.

If `/data/config.json` does not exist on startup, create it with default settings.

Config should include:

* scheduled tests enabled
* cron string
* active provider
* test timeout
* default chart time range
* Ookla-specific settings
* Cloudflare-specific settings

The default cron schedule should be every 10 minutes.

Only one provider may be active at a time.

The active provider must be either Ookla or Cloudflare.

Do not run both providers on a schedule.

Do not alternate providers.

Do not stagger providers.

Do not build provider comparison charts for v1.

When saving config from the UI:

* validate the full config before saving
* do not save invalid config
* write updates safely so a partial/corrupt config file is not created
* reload scheduler settings after saving if practical
* if live reload is not implemented, clearly tell the user that a container restart is required

## Provider Requirements

The application should support two speed test providers:

* Ookla
* Cloudflare

The provider system should be cleanly separated so more providers can be added later, but v1 should only run one active provider at a time.

### Ookla Provider

The Ookla provider may use the Ookla CLI.

It should support:

* optional server ID
* optional extra CLI arguments
* configurable timeout

It should normalize the result into the common run data shape.

It should return meaningful errors if the CLI is missing, fails, times out, or returns invalid output.

### Cloudflare Provider

The Cloudflare provider should run server-side.

It may call Cloudflare speed test endpoints directly and measure timing/throughput itself.

It should support:

* download test settings
* upload test settings
* optional endpoint overrides
* configurable timeout

It does not need to perfectly clone Cloudflare’s web speed test algorithm in v1. It should provide useful, consistent measurements and store raw details where possible.

## Scheduler Behavior

The scheduler should run only the currently active provider.

For each scheduled tick:

* read the current config
* do nothing if scheduled tests are disabled
* prevent overlapping tests
* run only the active provider
* persist the result to SQLite

If a scheduled run starts while another test is still active, create a skipped run row.

Skipped runs should be visible in the UI and history.

Config should be read at the start of a run. If config changes while a test is already running, that change should affect future runs, not the active run.

## Manual Run Behavior

The home page must include a “Run Now” button.

The button should immediately run a speed test using the currently active provider.

Manual run results should be shown in the UI after completion.

Manual run results should not be inserted into the historical SQLite database by default.

The UI should clearly label manual results as manual and non-persisted.

Manual runs should respect the no-overlap rule. If a scheduled test is already running, the UI should say that a test is already active.

## Home Page UI

The home page should contain:

* summary cards
* charts
* time range selector
* Run Now button
* latest manual run result area
* failure visibility
* link to config page

### Summary Cards

Show:

* latest successful download
* latest successful upload
* latest ping
* latest jitter
* last run status
* last failure time
* success/failure rate over selected range
* active provider

### Charts

Use Apache ECharts.

Create separate charts for:

* download Mbps over time
* upload Mbps over time
* ping milliseconds over time
* jitter milliseconds over time

Charts should support:

* time range filtering
* tooltips
* zooming and panning where practical
* visible failure markers or failure bands

Failures, timeouts, partial results, and skipped runs must be obvious.

Do not connect chart lines across missing or failed data in a way that makes the graph look healthy.

Failure visibility is one of the most important features of this app.

## Result Details UI

Provide a result details modal or details page.

The result details view should show the stored run data clearly.

### Result Overview

Show:

* ID
* created/scheduled time
* status
* download
* upload
* ping
* jitter
* packet loss

### Latency Sections

Provide collapsible sections for:

* download latency
* upload latency
* ping details

Only show fields that actually have values. Do not fill the UI with empty junk.

### Server and Metadata

Show:

* provider/service
* server name
* server ID
* ISP
* server location
* server host
* external IP
* scheduled/manual indicator
* message
* error code
* error message

## Config UI

Create a config/settings page.

The config page should allow editing:

### General Settings

* scheduled tests enabled
* cron string
* active provider
* default chart time range
* test timeout

### Ookla Settings

These settings are only used when the active provider is Ookla.

Allow editing:

* optional server ID
* optional extra CLI arguments

### Cloudflare Settings

These settings are only used when the active provider is Cloudflare.

Allow editing:

* download settings
* upload settings
* optional endpoint overrides

The config UI may show both provider config sections, but it should clearly indicate which provider is currently active.

The config page should validate inputs before saving.

Invalid config should not be saved.

Validation errors should be clear and visible.

## API Requirements

Expose a simple API so other apps can display current speed test status.

Required API capabilities:

* get latest persisted scheduled run
* get latest successful persisted scheduled run
* get historical persisted runs by time range
* trigger a manual run
* get current config
* update config

Historical run queries should support time range filtering.

Provider filtering for historical data may be supported because the user may switch providers over time.

The manual run API should run the currently active provider and return the result directly.

Manual run results should not be persisted by default.

API responses should use clean camelCase JSON.

## Error Handling

Errors should be useful and visible.

Store provider errors in the database for scheduled runs.

Show provider errors in the UI.

Do not swallow errors silently.

Use meaningful error codes.

Examples of useful error codes include:

* timeout
* provider_disabled
* previous_run_still_active
* ookla_cli_missing
* ookla_cli_failed
* ookla_invalid_output
* cloudflare_request_failed
* cloudflare_upload_failed
* cloudflare_download_failed
* invalid_config
* unknown_error

## Suggested Structure

Keep the implementation organized around these responsibilities:

* database setup and migrations
* configuration loading/saving/validation
* scheduler
* run manager / overlap prevention
* provider implementations
* run history repository
* API routes
* home page UI
* config UI
* chart option helpers

Do not mix provider logic directly into UI components.

Do not mix database logic directly into UI components.

Do not bury scheduling behavior in random route handlers.

## Implementation Priorities

Build in this order:

1. SvelteKit app
2. Dockerfile and Docker Compose
3. SQLite setup and migrations
4. JSON config loading/saving
5. provider abstraction
6. Ookla provider
7. Cloudflare provider
8. run manager with overlap prevention
9. scheduler using cron config
10. API endpoints
11. home page charts
12. config UI
13. result details UI
14. failure markers and status timeline polish

## Non-Goals for v1

Do not add:

* authentication
* multiple users
* TypeScript
* TypeScript typedefs
* Postgres
* MySQL
* MongoDB
* Redis
* DuckDB
* complex role permissions
* email alerts
* push notifications
* Kubernetes support
* distributed workers
* remote agents
* multiple simultaneous providers
* provider comparison dashboard
* provider staggering
* provider rotation
* separate schedules per provider

The goal is a clean Dockerized speed test tracker that shows the truth, especially failures, instead of hiding bad runs and pretending everything is fine.


Please also add a readme file, describing how to use the docker container, and how to build the project. Make the sections on running and building clealy separate.