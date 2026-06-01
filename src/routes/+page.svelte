<script>
  import { onMount } from 'svelte';
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

  // Dashboard data loaded via API
  let runs = $state([]);
  let latest = $state(null);
  let latestSuccess = $state(null);
  let summary = $state(null);
  let lastFailureAt = $state(null);
  let loading = $state(true);

  let selectedRange = $state(data.range);
  let windowFrom = $state(null);
  let windowTo = $state(null);
  let isCustomWindow = $state(false);
  let fetchController = null;

  function getRangeDurationMs() {
    return TIME_RANGE_OPTIONS.find((o) => o.value === selectedRange)?.ms ?? 24 * 60 * 60 * 1000;
  }

  async function fetchDashboardData() {
    if (fetchController) fetchController.abort();
    fetchController = new AbortController();
    const controller = fetchController;

    // Snapshot params synchronously; use server-side range for current windows to avoid clock skew
    const params = isCustomWindow
      ? new URLSearchParams({ from: String(windowFrom), to: String(windowTo) })
      : new URLSearchParams({ range: selectedRange });

    loading = true;
    try {
      const res = await fetch(`/api/dashboard?${params}`, { signal: controller.signal });
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      const body = await res.json();
      runs = body.runs;
      latest = body.latest;
      latestSuccess = body.latestSuccess;
      summary = body.summary;
      lastFailureAt = body.lastFailureAt;
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e);
    } finally {
      if (fetchController === controller) loading = false;
    }
  }

  function setCurrentWindow() {
    const ms = getRangeDurationMs();
    windowTo = Date.now();
    windowFrom = windowTo - ms;
    isCustomWindow = false;
  }

  function updateRange(value) {
    selectedRange = value;
    const url = new URL(window.location.href);
    url.searchParams.set('range', value);
    history.replaceState({}, '', url.pathname + url.search);
    setCurrentWindow();
    fetchDashboardData();
  }

  function goBack() {
    const ms = getRangeDurationMs();
    windowTo = windowFrom;
    windowFrom = windowFrom - ms;
    isCustomWindow = true;
    fetchDashboardData();
  }

  function goForward() {
    const ms = getRangeDurationMs();
    const newTo = windowTo + ms;
    const now = Date.now();
    if (newTo >= now) {
      windowTo = now;
      windowFrom = now - ms;
      isCustomWindow = false;
    } else {
      windowFrom = windowTo;
      windowTo = newTo;
      isCustomWindow = true;
    }
    fetchDashboardData();
  }

  function goCurrent() {
    setCurrentWindow();
    fetchDashboardData();
  }

  onMount(() => {
    setCurrentWindow();
    fetchDashboardData();
  });

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
      fetchDashboardData();
    }
  }

  const rangeMs = $derived(getRangeDurationMs());

  const downloadOption = $derived(
    buildSeriesOption({ runs, valueField: 'downloadMbps', name: 'Download', color: '#22d3ee', unit: 'Mbps', rangeMs })
  );
  const uploadOption = $derived(
    buildSeriesOption({ runs, valueField: 'uploadMbps', name: 'Upload', color: '#a78bfa', unit: 'Mbps', rangeMs })
  );
  const pingOption = $derived(
    buildSeriesOption({ runs, valueField: 'pingMs', name: 'Ping', color: '#34d399', unit: 'ms', rangeMs })
  );
  const jitterOption = $derived(
    buildSeriesOption({ runs, valueField: 'jitterMs', name: 'Jitter', color: '#fbbf24', unit: 'ms', rangeMs })
  );

  const totalRuns = $derived(summary?.total ?? 0);
  const successes = $derived(summary?.successes ?? 0);
  const failures = $derived((summary?.failures ?? 0) + (summary?.timeouts ?? 0) + (summary?.partials ?? 0) + (summary?.skipped ?? 0));
  const successRate = $derived(totalRuns > 0 ? Math.round((successes / totalRuns) * 1000) / 10 : null);
</script>

<div class="topbar">
  <div class="left">
    <h1>Dashboard</h1>
    <span class="muted">Active provider: <strong>{data.config.activeProvider}</strong></span>
  </div>
  <div class="right">
    <select id="range" value={selectedRange} onchange={(e) => updateRange(e.target.value)}>
      {#each TIME_RANGE_OPTIONS as opt}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
    <div class="nav-buttons">
      <button class="nav" onclick={goBack} disabled={loading} title="Previous period">‹</button>
      <button class="nav" onclick={goForward} disabled={loading || !isCustomWindow} title="Next period">›</button>
      <button class="nav current" onclick={goCurrent} disabled={loading || !isCustomWindow} title="Jump to current">Now</button>
    </div>
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
    value={formatNumber(latestSuccess?.downloadMbps)}
    unit="Mbps"
    sub={latestSuccess ? formatRelative(latestSuccess.startedAt) : 'no successful runs'}
  />
  <SummaryCard
    label="Latest upload"
    value={formatNumber(latestSuccess?.uploadMbps)}
    unit="Mbps"
    sub={latestSuccess ? formatRelative(latestSuccess.startedAt) : 'no successful runs'}
  />
  <SummaryCard
    label="Latest ping"
    value={formatNumber(latestSuccess?.pingMs)}
    unit="ms"
    sub={latestSuccess ? `jitter ${formatNumber(latestSuccess.jitterMs)} ms` : '—'}
  />
  <SummaryCard
    label="Last run"
    value={latest ? latest.status : '—'}
    sub={latest ? formatRelative(latest.startedAt) : 'no runs yet'}
  />
  <SummaryCard
    label="Last failure"
    value={lastFailureAt ? formatRelative(lastFailureAt) : 'none'}
    sub={lastFailureAt ? formatLocalDateTime(lastFailureAt) : '—'}
  />
  <SummaryCard
    label="Success rate"
    value={successRate == null ? '—' : `${successRate}%`}
    sub={`${successes}/${totalRuns} runs in range`}
  />
</section>

<section class="charts">
  <div class="chart-card">
    <h3>Download (Mbps)</h3>
    {#if loading}
      <div class="chart-loading"><div class="spinner"></div></div>
    {:else}
      <Chart option={downloadOption} />
    {/if}
  </div>
  <div class="chart-card">
    <h3>Upload (Mbps)</h3>
    {#if loading}
      <div class="chart-loading"><div class="spinner"></div></div>
    {:else}
      <Chart option={uploadOption} />
    {/if}
  </div>
  <div class="chart-card">
    <h3>Ping (ms)</h3>
    {#if loading}
      <div class="chart-loading"><div class="spinner"></div></div>
    {:else}
      <Chart option={pingOption} />
    {/if}
  </div>
  <div class="chart-card">
    <h3>Jitter (ms)</h3>
    {#if loading}
      <div class="chart-loading"><div class="spinner"></div></div>
    {:else}
      <Chart option={jitterOption} />
    {/if}
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
        {#if loading}
          <tr><td colspan="8" class="muted loading-cell"><div class="spinner spinner-sm"></div> Loading…</td></tr>
        {:else}
          {#each [...runs].reverse().slice(0, 12) as run}
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
        {/if}
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
  .right { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; }
  .muted { color: #94a3b8; font-size: 0.85rem; }
  select {
    background: #0f172a;
    color: #e2e8f0;
    border: 1px solid #1e293b;
    border-radius: 6px;
    padding: 0.45rem 0.6rem;
  }
  .nav-buttons {
    display: flex;
    gap: 2px;
  }
  button.nav {
    background: #0f172a;
    color: #cbd5e1;
    border: 1px solid #1e293b;
    border-radius: 6px;
    padding: 0.45rem 0.65rem;
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
  }
  button.nav.current {
    font-size: 0.8rem;
    padding: 0.45rem 0.6rem;
    color: #22d3ee;
    border-color: #164e63;
  }
  button.nav:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  button.nav:not(:disabled):hover {
    background: #1e293b;
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
    grid-template-columns: 1fr;
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
  .chart-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 280px;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #1e293b;
    border-top-color: #22d3ee;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  .spinner-sm {
    width: 16px;
    height: 16px;
    border-width: 2px;
  }
  .loading-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
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
