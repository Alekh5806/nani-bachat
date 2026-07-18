#!/usr/bin/env node
/**
 * Cloudflare Pages hardcodes an ignore rule for any path containing a
 * "node_modules" segment (see wrangler's pages upload validator), so any
 * static asset that Expo's web export nests under "assets/node_modules/**"
 * (third-party fonts/icons pulled in via `require()`, e.g. @expo/vector-icons
 * fonts and @react-navigation/elements images) silently fails to upload.
 *
 * This script runs after `expo export --platform web` and:
 *   1. Moves every file under dist/assets/**\/node_modules/** to an
 *      equivalent path with the "node_modules" segments stripped out.
 *   2. Rewrites the matching string references inside the exported JS
 *      bundle(s) so they point at the new paths.
 *   3. Removes the now-empty node_modules directories.
 *
 * Native app behavior is completely unaffected; this only touches the
 * generated web build output.
 */
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function main() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`[fix-web-assets] dist directory not found at ${DIST_DIR}, skipping.`);
    return;
  }

  const allFiles = walk(DIST_DIR);
  const affected = allFiles.filter((f) => f.split(path.sep).includes('node_modules'));

  if (affected.length === 0) {
    console.log('[fix-web-assets] No node_modules-nested assets found, nothing to do.');
    return;
  }

  const renames = [];
  for (const absPath of affected) {
    const relPath = path.relative(DIST_DIR, absPath).split(path.sep).join('/');
    const newRelPath = relPath
      .split('/')
      .filter((segment) => segment !== 'node_modules')
      .join('/');

    if (newRelPath === relPath) continue;

    const newAbsPath = path.join(DIST_DIR, newRelPath);
    fs.mkdirSync(path.dirname(newAbsPath), { recursive: true });
    fs.renameSync(absPath, newAbsPath);
    renames.push({ oldUrl: `/${relPath}`, newUrl: `/${newRelPath}` });
  }

  console.log(`[fix-web-assets] Relocated ${renames.length} asset(s) out of node_modules-named folders.`);

  // Rewrite references inside exported JS/CSS/HTML files.
  const textFiles = walk(DIST_DIR).filter((f) => /\.(js|css|html)$/.test(f));
  let filesPatched = 0;
  for (const file of textFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    for (const { oldUrl, newUrl } of renames) {
      if (content.includes(oldUrl)) {
        content = content.split(oldUrl).join(newUrl);
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(file, content);
      filesPatched += 1;
    }
  }
  console.log(`[fix-web-assets] Patched references in ${filesPatched} file(s).`);

  // Clean up now-empty node_modules directories.
  function removeEmptyNodeModulesDirs(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        removeEmptyNodeModulesDirs(full);
        if (entry.name === 'node_modules' && fs.readdirSync(full).length === 0) {
          fs.rmdirSync(full);
        } else if (fs.existsSync(full) && fs.readdirSync(full).length === 0 && entry.name !== 'node_modules') {
          // leave other empty dirs alone; only prune what we just hollowed out
        }
      }
    }
  }
  removeEmptyNodeModulesDirs(DIST_DIR);

  const remaining = walk(DIST_DIR).filter((f) => f.split(path.sep).includes('node_modules'));
  if (remaining.length > 0) {
    console.warn(`[fix-web-assets] Warning: ${remaining.length} file(s) still under a node_modules path.`);
  } else {
    console.log('[fix-web-assets] Done. No remaining node_modules-nested assets.');
  }
}

main();
