import { defineConfig } from 'vite';

function normalizeBasePath(basePath) {
  if (!basePath || basePath === '/') return '/';

  let normalized = basePath.trim();
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  if (!normalized.endsWith('/')) normalized = `${normalized}/`;
  return normalized;
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  base: normalizeBasePath(process.env.VITE_BASE_PATH || '/'),
});
