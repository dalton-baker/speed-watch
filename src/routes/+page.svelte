<script>
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import Chart from '$lib/components/Chart.svelte';
  import SummaryCard from '$lib/components/SummaryCard.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import ResultDetails from '$lib/components/ResultDetails.svelte';
  import { TIME_RANGE_OPTIONS, formatLocalDateTime, formatRelative, formatNumber } from '$lib/timeRange.js';
  import { buildSeriesOption } from '$lib/chartOptions.js';

  let { data } = $props();

  let manualResult = $state(null);
  let manualRunning = $state(false);
  let manualError = $state(null);
  let selectedRunId = $state(null);

  function updateRange(value) {
    const url = new URL(page.url);
    url.searchParams.set('range', value);
    goto(url.pathname + url.search, { invalidateAll: true });
  }

  async function runNow() {
    manualRunning = true;
    manualError = null;
    manualResult = null;
    try {
      const res = await fetch('/api/run', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) {
        manualError = body?.message || body?.error || 'Manual run failed';
      } else {
        manualResult = body.run;
      }
    } catch (e) {
      manualError = e.message;
    } finally {
      manualRunning = false;
      invalidateAll();
    }
  }

  const downloadOption = $derived(
    buildSeriesOption({
      runs: data.runs,
      valueField: 'downloadMbps',
      name: 'Download',
      color: '#22d3ee',
      unit: 'Mbps'
    })
  );
  const uploadOption = $derived(
    buildSeriesOption({
      runs: data.runs,
      valueField: 'uploadMbps',
      name: 'Upload',
      color: '#a78bfa',
      unit: 'Mbps'
    })
  );
  const pingOption = $derived(
    buildSeriesOption({
      runs: data.runs,
      valueField: 'pingMs',
      name: 'Ping',
      color: '#34d399',
      unit: 'ms'
    })
  );
  const jitterOption = $derived(
    buildSeriesOption({
      runs: data.runs,
      valueField: 'jitterMs',
      name: 'Jitter',
      color: '#fbbf24',
      unit: 'ms'
    })
  );

  const totalRuns = $derived(data.summary?.total ?? 0);
  const successes = $derived(data.summary?.successes ?? 0);
  const failures = $derived((data.summary?.failures ?? 0) + (data.summary?.timeouts ?? 0) + (data.summary?.partials ?? 0) + (data.summary?.skipped ?? 0));
  const successRate = $derived(totalRuns > 0 ? Math.round((successes / totalRuns) * 1000) / 10 : null);
</script>

<div class="topbar">
  <div class="left">
    <h1>Dashboard</h1>
    <span class="muted">Active provider: <strong>{data.config.activeProvider}</strong></span>
  </div>
  <div class="right">
    <label for="range" class="muted">Range</label>
    <select id="range" value={data.range} onchange={(e) => updateRange(e.target.value)}>
      {#each TIME_RANGE_OPTIONS as opt}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
    <button class="primary" onclick={runNow} disabled={manualRunning}>
      {manualRunning ? 'Running…' : 'Run Now'}
    </button>
  </div>
</div>

{#if manualError}
  <div class="alert error">
    <strong>Manual run error:</strong> {manualError}
  </div>
{/if}

{#if manualResult}
  <div class="manual-result">
    <div class="manual-header">
      <strong>Manual result</strong>
      <StatusBadge status={manualResult.status} />
      <span class="muted">Provider: {manualResult.provider}</span>
      <span class="muted">Not persisted to history</span>
      <button class="link" onclick={() => (manualResult = null)}>Dismiss</button>
    </div>
    <div class="manual-grid">
      <div><span class="muted">Download</span> <strong>{formatNumber(manualResult.downloadMbps)} Mbps</strong></div>
      <div><span class="muted">Upload</span> <strong>{formatNumber(manualResult.uploadMbps)} Mbps</strong></div>
      <div><span class="muted">Ping</span> <strong>{formatNumber(manualResult.pingMs)} ms</strong></div>
      <div><span class="muted">Jitter</span> <strong>{formatNumber(manualResult.jitterMs)} ms</strong></div>
    </div>
    {#if manualResult.errorMessage}
      <div class="manual-error">{manualResult.errorCode}: {manualResult.errorMessage}</div>
    {/if}
  </div>
{/if}

<section class="cards">
  <SummaryCard
    label="Latest download"
    value={formatNumber(data.latestSuccess?.downloadMbps)}
    unit="Mbps"
    sub={data.latestSuccess ? formatRelative(data.latestSuccess.startedAt) : 'no successful runs'}
  />
  <SummaryCard
    label="Latest upload"
    value={formatNumber(data.latestSuccess?.uploadMbps)}
    unit="Mbps"
    sub={data.latestSuccess ? formatRelative(data.latestSuccess.startedAt) : 'no successful runs'}
  />
  <SummaryCard
    label="Latest ping"
    value={formatNumber(data.latestSuccess?.pingMs)}
    unit="ms"
    sub={data.latestSuccess ? `jitter ${formatNumber(data.latestSuccess.jitterMs)} ms` : '—'}
  />
  <SummaryCard
    label="Last run"
    value={data.latest ? data.latest.status : '—'}
    sub={data.latest ? formatRelative(data.latest.startedAt) : 'no runs yet'}
  />
  <SummaryCard
    label="Last failure"
    value={data.lastFailureAt ? formatRelative(data.lastFailureAt) : 'none'}
    sub={data.lastFailureAt ? formatLocalDateTime(data.lastFailureAt) : '—'}
  />
  <SummaryCard
    label="Success rate"
    value={successRate == null ? '—' : `${successRate}%`}
    sub={`${successes}/${totalRuns} runs in range`}
  />
  <SummaryCard
    label="Failures in range"
    value={failures}
    sub={`${data.summary?.failures ?? 0} failed · ${data.summary?.timeouts ?? 0} timeout · ${data.summary?.partials ?? 0} partial · ${data.summary?.skipped ?? 0} skipped`}
  />
  <SummaryCard
    label="Active provider"
    value={data.config.activeProvider}
    sub={data.config.scheduledTestsEnabled ? `cron: ${data.config.cron}` : 'scheduled tests disabled'}
  />
</section>

<section class="charts">
  <div class="chart-card">
    <h3>Download (Mbps)</h3>
    <Chart option={downloadOption} />
  </div>
  <div class="chart-card">
    <h3>Upload (Mbps)</h3>
    <Chart option={uploadOption} />
  </div>
  <div class="chart-card">
    <h3>Ping (ms)</h3>
    <Chart option={pingOption} />
  </div>
  <div class="chart-card">
    <h3>Jitter (ms)</h3>
    <Chart option={jitterOption} />
  </div>
</section>

<section class="recent">
  <div class="recent-header">
    <h3>Recent runs</h3>
    <a href="/history">View all →</a>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Status</th>
          <th>Provider</th>
          <th>Download</th>
          <th>Upload</th>
          <th>Ping</th>
          <th>Error</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each [...data.runs].reverse().slice(0, 12) as run}
          <tr>
            <td>{formatLocalDateTime(run.startedAt)}</td>
            <td><StatusBadge status={run.status} /></td>
            <td>{run.provider}</td>
            <td>{formatNumber(run.downloadMbps)}</td>
            <td>{formatNumber(run.uploadMbps)}</td>
            <td>{formatNumber(run.pingMs)}</td>
            <td class="err">{run.errorCode ? `${run.errorCode}: ${run.errorMessage ?? ''}` : '—'}</td>
            <td><button class="link" onclick={() => (selectedRunId = run.id)}>Details</button></td>
          </tr>
        {:else}
          <tr><td colspan="8" class="muted">No runs in selected range.</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

{#if selectedRunId}
  <ResultDetails runId={selectedRunId} onClose={() => (selectedRunId = null)} />
{/if}

<style>
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.2rem;
    flex-wrap: wrap;
    gap: 0.8rem;
  }
  .topbar h1 {
    margin: 0;
    font-size: 1.4rem;
    color: #f1f5f9;
  }
  .left { display: flex; gap: 0.8rem; align-items: baseline; }
  .right { display: flex; gap: 0.6rem; align-items: center; }
  .muted { color: #94a3b8; font-size: 0.85rem; }
  select {
    background: #0f172a;
    color: #e2e8f0;
    border: 1px solid #1e293b;
    border-radius: 6px;
    padding: 0.45rem 0.6rem;
  }
  button.primary {
    background: #22d3ee;
    color: #0f172a;
    border: none;
    border-radius: 6px;
    padding: 0.5rem 0.9rem;
    font-weight: 600;
  }
  button.primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  button.link {
    background: none;
    border: none;
    color: #22d3ee;
    text-decoration: underline;
    padding: 0;
    font-size: 0.85rem;
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
  .manual-result {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 0.9rem 1rem;
    margin-bottom: 1.2rem;
  }
  .manual-header {
    display: flex;
    gap: 0.8rem;
    align-items: center;
    margin-bottom: 0.6rem;
    flex-wrap: wrap;
  }
  .manual-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.6rem 1.2rem;
  }
  .manual-error {
    margin-top: 0.6rem;
    color: #fca5a5;
    font-size: 0.85rem;
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.7rem;
    margin-bottom: 1.4rem;
  }
  .charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
    gap: 0.8rem;
    margin-bottom: 1.4rem;
  }
  .chart-card {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 0.8rem 1rem 0.4rem;
  }
  .chart-card h3 {
    margin: 0 0 0.4rem 0;
    font-size: 0.95rem;
    color: #cbd5e1;
  }
  .recent { margin-top: 1rem; }
  .recent-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem; }
  .recent-header h3 { margin: 0; color: #f1f5f9; }
  .table-wrap {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 8px;
    overflow: hidden;
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  th, td { padding: 0.55rem 0.8rem; text-align: left; border-bottom: 1px solid #1e293b; }
  th { color: #94a3b8; font-weight: 500; background: #0a1426; }
  td.err { color: #fca5a5; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
