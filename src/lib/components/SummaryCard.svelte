<script>
  let { label, value, unit = '', sub = '' } = $props();
</script>

<div class="card">
  <div class="label">{label}</div>
  <div class="value">{value}{#if unit}<span class="unit"> {unit}</span>{/if}</div>
  {#if sub}<div class="sub">{sub}</div>{/if}
</div>

<style>
  .card {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 0.9rem 1rem;
    min-height: 86px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .label {
    font-size: 0.75rem;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .value {
    font-size: 1.4rem;
    color: #e2e8f0;
    font-weight: 600;
  }
  .unit {
    font-size: 0.85rem;
    color: #94a3b8;
    font-weight: 400;
  }
  .sub {
    font-size: 0.75rem;
    color: #64748b;
  }
</style>
