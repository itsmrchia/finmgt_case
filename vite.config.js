import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The repository name. When deploying to GitHub Pages the app will be served
// from a sub‑path matching your repository name. Adjust this value if you
// change the repository name.
const repo = 'finmgt_case';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: `/${repo}/`
});