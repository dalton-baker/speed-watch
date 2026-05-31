<script>
  import { onMount, onDestroy } from 'svelte';

  let { option } = $props();

  let container;
  let chart = null;
  let resizeObs = null;

  onMount(async () => {
    const echarts = await import('echarts');
    chart = echarts.init(container, null, { renderer: 'canvas' });
    chart.setOption(option, true);
    resizeObs = new ResizeObserver(() => chart && chart.resize());
    resizeObs.observe(container);
  });

  onDestroy(() => {
    if (resizeObs) resizeObs.disconnect();
    if (chart) chart.dispose();
  });

  $effect(() => {
    if (chart && option) {
      chart.setOption(option, true);
    }
  });
</script>

<div class="chart" bind:this={container}></div>

<style>
  .chart {
    width: 100%;
    height: 280px;
  }
</style>
