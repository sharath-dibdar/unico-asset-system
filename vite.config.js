import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Expose SUPABASE_* vars (without requiring VITE_ prefix) so Hostinger
  // environment variables work without renaming.
  envPrefix: ['VITE_', 'SUPABASE_'],
})
