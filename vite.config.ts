import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Injects the build's precache list and a content-derived cache version into
 * `dist/service-worker.js`.
 *
 * Why: Vite emits content-hashed file names (e.g. `assets/index-3f9a.js`), so a
 * hand-written service worker can't know them in advance. Rather than pulling
 * in Workbox, this ~40 line plugin rewrites one marked line in the worker after
 * the bundle is written. The version changes whenever any asset changes, which
 * makes the worker byte-different → the browser installs it → old shell caches
 * are deleted on activate.
 */
function serviceWorkerManifest(): Plugin {
  let bundleFiles: string[] = []
  let publicDir = ''

  return {
    name: 'weatherboard-sw-manifest',
    apply: 'build',
    configResolved(config) {
      publicDir = config.publicDir
    },
    generateBundle(_options, bundle) {
      bundleFiles = Object.keys(bundle).filter((file) => !file.endsWith('.map'))
    },
    writeBundle(options) {
      const outDir = options.dir ?? 'dist'
      const swPath = join(outDir, 'service-worker.js')

      const publicFiles = listFiles(publicDir)
        .map((file) => relative(publicDir, file).split(sep).join('/'))
        .filter((file) => file !== 'service-worker.js')

      const urls = [
        '/', // navigation fallback (served as index.html by any static host)
        ...publicFiles.map((file) => `/${file}`),
        ...bundleFiles.filter((file) => file !== 'index.html').map((file) => `/${file}`),
      ]

      const hash = createHash('sha256')
      hash.update(urls.join('\n'))
      hash.update(readFileSync(join(outDir, 'index.html')))
      const version = hash.digest('hex').slice(0, 12)

      const source = readFileSync(swPath, 'utf8')
      const marker = /\/\* @build-manifest \*\/[\s\S]*?\/\* @end-build-manifest \*\//
      if (!marker.test(source)) {
        throw new Error('service-worker.js is missing its @build-manifest marker')
      }
      const injected = source.replace(
        marker,
        `/* @build-manifest */ const BUILD = ${JSON.stringify({ version, precache: urls })}; /* @end-build-manifest */`,
      )
      writeFileSync(swPath, injected)
      this.info(`service worker: precaching ${urls.length} files, version ${version}`)
    },
  }
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    return entry.isDirectory() ? listFiles(full) : [full]
  })
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serviceWorkerManifest()],
})
