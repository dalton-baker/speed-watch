<script>
  import { invalidateAll } from '$app/navigation';
  import { TIME_RANGE_OPTIONS } from '$lib/timeRange.js';

  let { data } = $props();

  let form = $state(structuredClone($state.snapshot(data.config)));
  let saving = $state(false);
  let errors = $state([]);
  let savedAt = $state(null);

  async function save() {
    saving = true;
    errors = [];
    savedAt = null;
    try {
      const payload = {
        ...form,
        cloudflare: {
          ...form.cloudflare,
          downloadBytes: Number(form.cloudflare.downloadBytes),
          uploadBytes: Number(form.cloudflare.uploadBytes)
        },
        testTimeoutSeconds: Number(form.testTimeoutSeconds)
      };
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: payload })
      });
      const body = await res.json();
      if (!res.ok) {
        errors = body.details || [body.message || body.error || 'Failed to save'];
      } else {
        savedAt = new Date();
        form = structuredClone(body.config);
        invalidateAll();
      }
    } catch (e) {
      errors = [e.message];
    } finally {
      saving = false;
    }
  }

  function resetFromServer() {
    form = structuredClone($state.snapshot(data.config));
    errors = [];
    savedAt = null;
  }
</script>

<h1>Configuration</h1>
<p class="muted">Settings are saved to <code>/data/config.json</code>. The scheduler reloads automatically after a successful save.</p>

{#if errors.length}
  <div class="alert error">
    <strong>Validation failed:</strong>
    <ul>
      {#each errors as e}<li>{e}</li>{/each}
    </ul>
  </div>
{/if}

{#if savedAt}
  <div class="alert success">Saved at {savedAt.toLocaleTimeString()}. Scheduler reloaded.</div>
{/if}

<section>
  <h2>General</h2>
  <div class="grid">
    <label class="check">
      <input type="checkbox" bind:checked={form.scheduledTestsEnabled} />
      Scheduled tests enabled
    </label>
    <label>
      Cron schedule
      <input type="text" bind:value={form.cron} placeholder="*/10 * * * *" />
      <small>Default: every 10 minutes</small>
    </label>
    <label>
      Active provider
      <select bind:value={form.activeProvider}>
        <option value="ookla">Ookla</option>
        <option value="cloudflare">Cloudflare</option>
      </select>
    </label>
    <label>
      Test timeout (seconds)
      <input type="number" min="5" max="600" bind:value={form.testTimeoutSeconds} />
    </label>
    <label>
      Default chart time range
      <select bind:value={form.defaultChartTimeRange}>
        {#each TIME_RANGE_OPTIONS as opt}<option value={opt.value}>{opt.label}</option>{/each}
      </select>
    </label>
  </div>
</section>

<section class:active={form.activeProvider === 'ookla'}>
  <h2>
    Ookla settings
    {#if form.activeProvider === 'ookla'}<span class="badge-active">ACTIVE</span>{/if}
  </h2>
  <div class="grid">
    <label>
      Server ID (optional)
      <input type="text" bind:value={form.ookla.serverId} placeholder="e.g. 12345" />
    </label>
    <label>
      Extra CLI arguments (optional)
      <input type="text" bind:value={form.ookla.extraArgs} placeholder='e.g. --interface eth0' />
    </label>
  </div>
</section>

<section class:active={form.activeProvider === 'cloudflare'}>
  <h2>
    Cloudflare settings
    {#if form.activeProvider === 'cloudflare'}<span class="badge-active">ACTIVE</span>{/if}
  </h2>
  <div class="grid">
    <label>
      Download bytes
      <input type="number" min="1000" bind:value={form.cloudflare.downloadBytes} />
      <small>Size of the download test payload</small>
    </label>
    <label>
      Upload bytes
      <input type="number" min="1000" bind:value={form.cloudflare.uploadBytes} />
      <small>Size of the upload test payload</small>
    </label>
    <label>
      Download endpoint (optional)
      <input type="text" bind:value={form.cloudflare.downloadEndpoint} placeholder="https://speed.cloudflare.com/__down?bytes=" />
    </label>
    <label>
      Upload endpoint (optional)
      <input type="text" bind:value={form.cloudflare.uploadEndpoint} placeholder="https://speed.cloudflare.com/__up" />
    </label>
    <label>
      Latency endpoint (optional)
      <input type="text" bind:value={form.cloudflare.latencyEndpoint} placeholder="https://speed.cloudflare.com/__down?bytes=0" />
    </label>
  </div>
</section>

<div class="actions">
  <button class="primary" onclick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
  <button class="ghost" onclick={resetFromServer} disabled={saving}>Reset</button>
</div>

<style>
  h1 { margin: 0 0 0.4rem; color: #f1f5f9; }
  h2 { color: #cbd5e1; font-size: 1.1rem; display: flex; align-items: center; gap: 0.6rem; }
  .muted { color: #94a3b8; font-size: 0.85rem; margin: 0 0 1.2rem; }
  .muted code { background: #0f172a; padding: 0.05rem 0.35rem; border-radius: 4px; }
  section {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 1rem 1.2rem 1.2rem;
    margin-bottom: 1rem;
  }
  section.active { border-color: #22d3ee44; }
  .badge-active {
    background: rgba(34, 211, 238, 0.18);
    color: #22d3ee;
    font-size: 0.65rem;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    letter-spacing: 0.05em;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 0.8rem 1.2rem;
  }
  label { display: flex; flex-direction: column; font-size: 0.85rem; color: #cbd5e1; gap: 0.3rem; }
  label small { color: #64748b; font-size: 0.7rem; }
  label.check { flex-direction: row; align-items: center; gap: 0.5rem; }
  input[type="text"], input[type="number"], select {
    background: #020617;
    color: #e2e8f0;
    border: 1px solid #1e293b;
    border-radius: 6px;
    padding: 0.45rem 0.6rem;
    font-size: 0.9rem;
  }
  input[type="checkbox"] { accent-color: #22d3ee; }
  .actions { display: flex; gap: 0.6rem; margin-top: 1rem; }
  button.primary {
    background: #22d3ee;
    color: #0f172a;
    border: none;
    border-radius: 6px;
    padding: 0.55rem 1.1rem;
    font-weight: 600;
    cursor: pointer;
  }
  button.primary:disabled { opacity: 0.6; cursor: not-allowed; }
  button.ghost {
    background: transparent;
    color: #94a3b8;
    border: 1px solid #1e293b;
    border-radius: 6px;
    padding: 0.55rem 1.1rem;
    cursor: pointer;
  }
  .alert {
    padding: 0.7rem 0.9rem;
    border-radius: 6px;
    margin-bottom: 1rem;
  }
  .alert.error {
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid #7f1d1d;
    color: #fca5a5;
  }
  .alert.error ul { margin: 0.4rem 0 0; padding-left: 1.2rem; }
  .alert.success {
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid #065f46;
    color: #6ee7b7;
  }
</style>
