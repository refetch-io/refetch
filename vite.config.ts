import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Public path of the resvg WASM the share-image renderer loads at runtime. */
export const RESVG_WASM_PATH = '/assets/resvg.wasm'

/**
 * The server build doesn't emit static assets, and deployed sites don't ship
 * node_modules files, so publish the WASM with the client's static files.
 */
function resvgWasmAsset(): Plugin {
  return {
    name: 'refetch:resvg-wasm',
    apply: 'build',
    applyToEnvironment: (environment) => environment.name === 'client',
    generateBundle() {
      const require = createRequire(import.meta.url)
      this.emitFile({
        type: 'asset',
        fileName: RESVG_WASM_PATH.slice(1),
        source: readFileSync(require.resolve('@resvg/resvg-wasm/index_bg.wasm')),
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Server code reads configuration from `process.env` (Appwrite Sites injects
  // it at runtime). Locally, hydrate it from `.env` files without overriding
  // anything the shell already provides.
  const fileEnv = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(fileEnv)) {
    if (process.env[key] === undefined) process.env[key] = value
  }

  return {
    server: { port: 3000 },
    resolve: { tsconfigPaths: true },
    plugins: [tailwindcss(), tanstackStart(), viteReact(), resvgWasmAsset()],
  }
})
