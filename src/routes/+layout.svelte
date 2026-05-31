<script>
  import { page } from '$app/state';
  let { children } = $props();

  const links = [
    { href: '/', label: 'Home' },
    { href: '/history', label: 'History' },
    { href: '/config', label: 'Config' }
  ];
</script>

<div class="app">
  <header>
    <div class="brand">
      <span class="logo">⚡</span>
      <span>Speed Watch</span>
    </div>
    <nav>
      {#each links as link}
        <a href={link.href} class:active={page.url.pathname === link.href}>{link.label}</a>
      {/each}
    </nav>
  </header>
  <main>
    {@render children()}
  </main>
</div>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    background: #020617;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    min-height: 100vh;
  }
  :global(*) {
    box-sizing: border-box;
  }
  :global(button) {
    font-family: inherit;
    cursor: pointer;
  }
  :global(input, select, textarea) {
    font-family: inherit;
  }
  :global(a) {
    color: #22d3ee;
    text-decoration: none;
  }
  :global(a:hover) {
    text-decoration: underline;
  }
  .app {
    max-width: 1280px;
    margin: 0 auto;
    padding: 1rem 1.5rem 4rem;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.8rem 0 1.4rem;
    border-bottom: 1px solid #1e293b;
    margin-bottom: 1.4rem;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    font-size: 1.1rem;
    color: #f1f5f9;
  }
  .logo {
    color: #22d3ee;
    font-size: 1.3rem;
  }
  nav {
    display: flex;
    gap: 0.4rem;
  }
  nav a {
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    color: #94a3b8;
    font-size: 0.9rem;
    font-weight: 500;
    text-decoration: none;
  }
  nav a:hover {
    color: #e2e8f0;
    background: #0f172a;
    text-decoration: none;
  }
  nav a.active {
    color: #22d3ee;
    background: #0f172a;
    border: 1px solid #1e293b;
  }
</style>
