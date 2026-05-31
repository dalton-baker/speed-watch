<script>
  let { status } = $props();

  const classes = {
    success: 'badge success',
    failed: 'badge failed',
    timeout: 'badge timeout',
    partial: 'badge partial',
    skipped: 'badge skipped'
  };

  const labels = {
    success: 'Success',
    failed: 'Failed',
    timeout: 'Timeout',
    partial: 'Partial',
    skipped: 'Skipped'
  };
</script>

<span class={classes[status] || 'badge'}>{labels[status] || status}</span>

<style>
  .badge {
    display: inline-block;
    padding: 0.1rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: 4px;
    border: 1px solid transparent;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .success { color: #10b981; border-color: #065f46; background: rgba(16, 185, 129, 0.1); }
  .failed { color: #ef4444; border-color: #7f1d1d; background: rgba(239, 68, 68, 0.12); }
  .timeout { color: #f97316; border-color: #7c2d12; background: rgba(249, 115, 22, 0.12); }
  .partial { color: #a855f7; border-color: #581c87; background: rgba(168, 85, 247, 0.12); }
  .skipped { color: #f59e0b; border-color: #78350f; background: rgba(245, 158, 11, 0.12); }
</style>
