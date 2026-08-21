import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli/index.ts'],
  format: ['esm', 'cjs'],
  target: 'node18',
  clean: true,
  minify: true,
  splitting: false,
  shims: false,
  sourcemap: true,
  // We bundle everything to make it a standalone CLI, except native modules if any, 
  // but let's just mark everything as external or bundle them.
  // Actually, bundling node_modules into the CLI makes it ultra-fast.
  noExternal: [/^(?!playwright|playwright-core|fsevents|chromium-bidi|term\.js|pty\.js).*/],
  external: ["playwright", "playwright-core", "fsevents", "chromium-bidi", "term.js", "pty.js"],
  esbuildOptions(options, context) {
    if (context.format === 'cjs') {
      options.define = {
        ...options.define,
        'import.meta.url': '"file:///C:/sea-bundle.cjs"'
      }
    }
  }, // Exclude heavy binaries that shouldn't be bundled
  outDir: 'dist',
  banner: {
    js: '#!/usr/bin/env node',
  },
});
