import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// CHANGE 'pf2e-crafting' to your repo name
export default defineConfig({
  plugins: [react()],
  base: '/pf2e-crafting/',  // <--- add this line
});