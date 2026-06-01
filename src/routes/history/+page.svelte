<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import ResultDetails from '$lib/components/ResultDetails.svelte';
  import { formatLocalDateTime, formatNumber } from '$lib/timeRange.js';

  let { data } = $props();

  let selectedRunId = $state(null);

  function updateParam(name, value) {
    const url = new URL(page.url);
    if (value && value !== 'all' && value !== '') url.searchParams.set(name, value);
    else url.searchParams.delete(name);
    url.searchParams.delete('page');
    goto(url.pathname + url.search, { invalidateAll: true });
  }

  function goToPage(p) {
    const url = new URL(page.url);
    if (p > 1) url.searchParams.set('page', String(p));
    else url.searchParams.delete('page');
    goto(url.pathname + url.search, { invalidateAll: true });
  }
</script>

<div class="topbar">
  <h1>History</h1>
  <div class="filters">
    <label>Provider
      <select value={data.provider} onchange={(e) => updateParam('provider', e.target.value)}>
        <option value="">All</option>
        <option value="ookla">Ookla</option>
        <option value="cloudflare">Cloudflare</option>
      </select>
    </label>
    <label>Status
      <select value={data.status} onchange={(e) => updateParam('status', e.target.value)}>
        <option value="all">All</option>
        <option value="success">Success</option>
        <option value="failed">Failed</option>
        <option value="timeout">Timeout</option>
        <option value="partial">Partial</option>
        <option value="skipped">Skipped</option>
      </select>
    </label>
  </div>
</div>

<p class="muted">Showing page {data.page} of {data.totalPages} ({data.total} runs total)</p>

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Time</th>
        <th>Status</th>
        <th>Provider</th>
        <th>Down (Mbps)</th>
        <th>Up (Mbps)</th>
        <th>Ping (ms)</th>
        <th>Jitter (ms)</th>
        <th>Error</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each data.runs as run}
        <tr>
          <td>{run.id}</td>
          <td>{formatLocalDateTime(run.startedAt)}</td>
          <td><StatusBadge status={run.status} /></td>
          <td>{run.provider}</td>
          <td>{formatNumber(run.downloadMbps)}</td>
          <td>{formatNumber(run.uploadMbps)}</td>
          <td>{formatNumber(run.pingMs)}</td>
          <td>{formatNumber(run.jitterMs)}</td>
          <td class="err">{run.errorCode ? `${run.errorCode}: ${run.errorMessage ?? ''}` : '—'}</td>
          <td><button class="link" onclick={() => (selectedRunId = run.id)}>Details</button></td>
        </tr>
      {:else}
        <tr><td colspan="10" class="muted">No runs.</td></tr>
      {/each}
    </tbody>
  </table>
</div>

{#if data.totalPages > 1}
  <div class="pagination">
    <button disabled={data.page <= 1} onclick={() => goToPage(data.page - 1)}>← Previous</button>
    <span class="muted">Page {data.page} of {data.totalPages}</span>
    <button disabled={data.page >= data.totalPages} onclick={() => goToPage(data.page + 1)}>Next →</button>
  </div>
{/if}

{#if selectedRunId}
  <ResultDetails runId={selectedRunId} onClose={() => (selectedRunId = null)} />
{/if}

<style>
  .topbar { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1rem; margin-bottom: 0.6rem; }
  .topbar h1 { margin: 0; font-size: 1.4rem; color: #f1f5f9; }
  .filters { display: flex; gap: 0.6rem; }
  .filters label { display: flex; flex-direction: column; font-size: 0.75rem; color: #94a3b8; gap: 0.2rem; }
  select { background: #0f172a; color: #e2e8f0; border: 1px solid #1e293b; border-radius: 6px; padding: 0.35rem 0.5rem; }
  .muted { color: #94a3b8; font-size: 0.85rem; }
  .table-wrap { background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; overflow: hidden; overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th, td { padding: 0.55rem 0.8rem; text-align: left; border-bottom: 1px solid #1e293b; }
  th { color: #94a3b8; font-weight: 500; background: #0a1426; }
  td.err { color: #fca5a5; max-width: 360px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  button.link { background: none; border: none; color: #22d3ee; text-decoration: underline; padding: 0; font-size: 0.85rem; cursor: pointer; }
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
  }
  .pagination button {
    background: #0f172a;
    color: #e2e8f0;
    border: 1px solid #1e293b;
    border-radius: 6px;
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
    cursor: pointer;
  }
  .pagination button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
