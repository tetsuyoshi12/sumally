<template>
  <div>
    <NuxtPage />
  </div>
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --color-bg: #f5f7fa;
  --color-surface: #ffffff;
  --color-primary: #2b5be0;
  --color-primary-dark: #1e44c4;
  --color-hazard: #e85d5d;
  --color-hazard-light: #fef2f2;
  --color-conv: #27ae60;
  --color-conv-light: #f0fdf4;
  --color-text: #1a1a2e;
  --color-text-sub: #64748b;
  --color-border: #e2e8f0;
  --radius: 12px;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(0, 0, 0, 0.06);
}

body {
  font-family:
    'Hiragino Kaku Gothic ProN',
    'Hiragino Sans',
    'Yu Gothic',
    sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

a {
  color: var(--color-primary);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

button {
  cursor: pointer;
  font-family: inherit;
}
</style>
