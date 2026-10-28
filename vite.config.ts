import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import netlify from '@netlify/vite-plugin'

export default defineConfig(({ mode }) => {
  // No `npm run dev`, as senhas e segredos vêm do arquivo .env (no Netlify, das variáveis do projeto)
  const env = loadEnv(mode, process.cwd(), '')
  for (const name of ['ADMIN_PASSWORD', 'ADMIN_TOTP', 'SESSION_SECRET']) {
    if (env[name] && !process.env[name]) process.env[name] = env[name]
  }

  return {
    // O plugin do Netlify simula Functions e Blobs localmente (só os recursos usados aqui).
    // Redirects e arquivos estáticos ficam com o Vite, que já devolve o index.html em qualquer
    // endereço (/forca-total, /painel, /rede...).
    plugins: [
      react(),
      tailwindcss(),
      netlify({
        edgeFunctions: { enabled: false },
        database: { enabled: false },
        images: { enabled: false },
        aiGateway: { enabled: false },
        geolocation: { enabled: false },
        redirects: { enabled: false },
        staticFiles: { enabled: false },
      }),
    ],
    build: {
      // three.js e o MapLibre passam do limite padrão de aviso; os dois ficam em chunks separados (lazy)
      chunkSizeWarningLimit: 1300,
    },
  }
})
