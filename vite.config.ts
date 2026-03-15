import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, createReadStream } from 'fs'
import { resolve } from 'path'

// Serve pre-built WASM and wasm_exec.js from www/ during development.
// Run `go run mage.go build` at least once to populate www/ before using `npm run dev`.
function serveWasmPlugin() {
  return {
    name: 'serve-wasm',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? ''
        if (url === '/playground.wasm' || url === '/wasm_exec.js') {
          const filePath = resolve('./www', url.slice(1))
          if (existsSync(filePath)) {
            if (url.endsWith('.wasm')) {
              res.setHeader('Content-Type', 'application/wasm')
            }
            createReadStream(filePath).pipe(res)
            return
          }
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), serveWasmPlugin()],
  build: {
    outDir: 'www',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
})
