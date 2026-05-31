<script>
  import { onMount } from 'svelte';
  import StatusBadge from './StatusBadge.svelte';
  import { formatLocalDateTime, formatNumber } from '$lib/timeRange.js';

  let { runId, onClose } = $props();

  let run = $state(null);
  let error = $state(null);
  let loading = $state(true);

  let openLatency = $state({ idle: true, download: false, upload: false, raw: false });

  onMount(async () => {
    try {
      const res = await fetch(`/api/runs/${runId}`);
      if (!res.ok) {
        error = `Failed to load run: ${res.status}`;
        return;
      }
      const body = await res.json();
      run = body.run;
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  });

  function field(label, value, unit = '') {
    return { label, value, unit };
  }

  function hasAny(obj, keys) {
    return keys.some((k) => obj?.[k] != null);
  }

  function close() {
    onClose?.();
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
  }
</script>

<svelte:window on:keydown={onKey} />

<div class="overlay" onclick={close} role="presentation">
  <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
    <button class="close" onclick={close} aria-label="Close">×</button>

    {#if loading}
      <p class="muted">Loading…</p>
    {:else if error}
      <p class="error">{error}</p>
    {:else if run}
      <h2>Run #{run.id}</h2>
      <div class="header-row">
        <StatusBadge status={run.status} />
        <span class="muted">{run.provider}</span>
        <span class="muted">{run.trigger}</span>
      </div>

      <section class="grid">
        <div><span class="lbl">Scheduled</span><span>{formatLocalDateTime(run.scheduledAt)}</span></div>
        <div><span class="lbl">Started</span><span>{formatLocalDateTime(run.startedAt)}</span></div>
        <div><span class="lbl">Finished</span><span>{formatLocalDateTime(run.finishedAt)}</span></div>
        <div><span class="lbl">Download</span><span>{formatNumber(run.downloadMbps)} Mbps</span></div>
        <div><span class="lbl">Upload</span><span>{formatNumber(run.uploadMbps)} Mbps</span></div>
        <div><span class="lbl">Ping</span><span>{formatNumber(run.pingMs)} ms</span></div>
        <div><span class="lbl">Jitter</span><span>{formatNumber(run.jitterMs)} ms</span></div>
        <div><span class="lbl">Packet loss</span><span>{formatNumber(run.packetLossPct)}{run.packetLossPct != null ? ' %' : ''}</span></div>
      </section>

      {#if hasAny(run, ['idleLatencyMs', 'idleJitterMs', 'idleLowMs', 'idleHighMs'])}
        <section class="collapsible">
          <button class="collapse-header" onclick={() => (openLatency.idle = !openLatency.idle)}>
            <span>{openLatency.idle ? '▾' : '▸'}</span> Idle / ping latency
          </button>
          {#if openLatency.idle}
            <div class="grid">
              {#if run.idleLatencyMs != null}<div><span class="lbl">Idle latency</span><span>{formatNumber(run.idleLatencyMs)} ms</span></div>{/if}
              {#if run.idleJitterMs != null}<div><span class="lbl">Idle jitter</span><span>{formatNumber(run.idleJitterMs)} ms</span></div>{/if}
              {#if run.idleLowMs != null}<div><span class="lbl">Idle low</span><span>{formatNumber(run.idleLowMs)} ms</span></div>{/if}
              {#if run.idleHighMs != null}<div><span class="lbl">Idle high</span><span>{formatNumber(run.idleHighMs)} ms</span></div>{/if}
            </div>
          {/if}
        </section>
      {/if}

      {#if hasAny(run, ['downloadLatencyMs', 'downloadJitterMs', 'downloadLatencyLowMs', 'downloadLatencyHighMs'])}
        <section class="collapsible">
          <button class="collapse-header" onclick={() => (openLatency.download = !openLatency.download)}>
            <span>{openLatency.download ? '▾' : '▸'}</span> Download latency
          </button>
          {#if openLatency.download}
            <div class="grid">
              {#if run.downloadLatencyMs != null}<div><span class="lbl">Latency</span><span>{formatNumber(run.downloadLatencyMs)} ms</span></div>{/if}
              {#if run.downloadJitterMs != null}<div><span class="lbl">Jitter</span><span>{formatNumber(run.downloadJitterMs)} ms</span></div>{/if}
              {#if run.downloadLatencyLowMs != null}<div><span class="lbl">Low</span><span>{formatNumber(run.downloadLatencyLowMs)} ms</span></div>{/if}
              {#if run.downloadLatencyHighMs != null}<div><span class="lbl">High</span><span>{formatNumber(run.downloadLatencyHighMs)} ms</span></div>{/if}
            </div>
          {/if}
        </section>
      {/if}

      {#if hasAny(run, ['uploadLatencyMs', 'uploadJitterMs', 'uploadLatencyLowMs', 'uploadLatencyHighMs'])}
        <section class="collapsible">
          <button class="collapse-header" onclick={() => (openLatency.upload = !openLatency.upload)}>
            <span>{openLatency.upload ? '▾' : '▸'}</span> Upload latency
          </button>
          {#if openLatency.upload}
            <div class="grid">
              {#if run.uploadLatencyMs != null}<div><span class="lbl">Latency</span><span>{formatNumber(run.uploadLatencyMs)} ms</span></div>{/if}
              {#if run.uploadJitterMs != null}<div><span class="lbl">Jitter</span><span>{formatNumber(run.uploadJitterMs)} ms</span></div>{/if}
              {#if run.uploadLatencyLowMs != null}<div><span class="lbl">Low</span><span>{formatNumber(run.uploadLatencyLowMs)} ms</span></div>{/if}
              {#if run.uploadLatencyHighMs != null}<div><span class="lbl">High</span><span>{formatNumber(run.uploadLatencyHighMs)} ms</span></div>{/if}
            </div>
          {/if}
        </section>
      {/if}

      <section>
        <h3>Server & network</h3>
        <div class="grid">
          {#if run.isp != null}<div><span class="lbl">ISP</span><span>{run.isp}</span></div>{/if}
          {#if run.externalIp != null}<div><span class="lbl">External IP</span><span>{run.externalIp}</span></div>{/if}
          {#if run.serverName != null}<div><span class="lbl">Server name</span><span>{run.serverName}</span></div>{/if}
          {#if run.serverId != null}<div><span class="lbl">Server ID</span><span>{run.serverId}</span></div>{/if}
          {#if run.serverLocation != null}<div><span class="lbl">Server location</span><span>{run.serverLocation}</span></div>{/if}
          {#if run.serverHost != null}<div><span class="lbl">Server host</span><span>{run.serverHost}</span></div>{/if}
        </div>
      </section>

      {#if run.message || run.errorCode || run.errorMessage}
        <section>
          <h3>Messages</h3>
          {#if run.message}<p>{run.message}</p>{/if}
          {#if run.errorCode || run.errorMessage}
            <p class="error">
              {#if run.errorCode}<strong>{run.errorCode}</strong>{/if}
              {#if run.errorMessage}: {run.errorMessage}{/if}
            </p>
          {/if}
        </section>
      {/if}

      {#if run.rawDetails}
        <section class="collapsible">
          <button class="collapse-header" onclick={() => (openLatency.raw = !openLatency.raw)}>
            <span>{openLatency.raw ? '▾' : '▸'}</span> Raw provider details
          </button>
          {#if openLatency.raw}
            <pre>{JSON.stringify(run.rawDetails, null, 2)}</pre>
          {/if}
        </section>
      {/if}
    {/if}
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.7);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    z-index: 100;
    padding: 3rem 1rem;
    overflow-y: auto;
  }
  .modal {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 1.4rem 1.6rem;
    width: 100%;
    max-width: 760px;
    position: relative;
    color: #e2e8f0;
  }
  .close {
    position: absolute;
    top: 0.5rem;
    right: 0.7rem;
    background: none;
    border: none;
    font-size: 1.6rem;
    color: #94a3b8;
    cursor: pointer;
    line-height: 1;
  }
  .close:hover { color: #e2e8f0; }
  h2 { margin: 0 0 0.4rem 0; }
  h3 { margin: 1.4rem 0 0.4rem; color: #cbd5e1; font-size: 1rem; }
  .header-row { display: flex; gap: 0.6rem; align-items: center; margin-bottom: 0.8rem; flex-wrap: wrap; }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.5rem 1rem;
    font-size: 0.9rem;
  }
  .grid > div { display: flex; flex-direction: column; }
  .lbl { color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .muted { color: #94a3b8; font-size: 0.85rem; }
  .error { color: #fca5a5; }
  .collapsible { margin-top: 1rem; }
  .collapse-header {
    background: none;
    border: none;
    color: #cbd5e1;
    font-size: 0.95rem;
    font-weight: 600;
    padding: 0.3rem 0;
    cursor: pointer;
    text-align: left;
    width: 100%;
  }
  pre {
    background: #020617;
    padding: 0.7rem;
    border-radius: 6px;
    overflow: auto;
    font-size: 0.75rem;
    max-height: 380px;
    border: 1px solid #1e293b;
  }
</style>
