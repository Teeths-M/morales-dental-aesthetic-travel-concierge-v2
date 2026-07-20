#!/usr/bin/env node
// deployWithInlinedShared.mjs
//
// Base44's CLI bundler refuses to deploy any function whose code imports a
// file from outside its own folder:
//
//   main.ts:2:31: Cannot import "../_shared/cronAuth.ts": it must reference a
//   file bundled with this function ... Relative imports can't reach outside
//   the function; import dependencies with an npm: or jsr: specifier.
//
// Nearly every function in base44/functions/ imports `_shared/` helpers
// (auth guards, notification senders, etc.), so `base44 functions deploy`
// cannot ship code UPDATES to them, and cannot CREATE a new one that imports
// `_shared` either — confirmed 2026-07-19/20: 3/3 self-contained functions
// deployed clean, 21/21 `_shared`-importing functions failed with this
// identical error across two separate sessions.
//
// This script works around it WITHOUT ever duplicating shared code in git:
// for each named function it temporarily inlines the exact `_shared/*.ts`
// files that function needs — TRANSITIVELY, since a shared module may itself
// import another shared module (e.g. createHandler.ts -> incidentReporting.ts
// -> emailTemplate.ts) — directly into `entry.ts`, deploys that self-contained
// version, then restores the original multi-file source from a backup,
// success or failure, always. The only copy of the shared logic that lives in
// git, ever, is the one under base44/functions/_shared/.
//
// COLLISION HANDLING: if inlining a shared module would redeclare a
// top-level name already in scope (the target function's own code, or a
// shared module inlined earlier in the same build — e.g. several senders
// keep their own local `BRAND` for an unrelated email template, which would
// otherwise redeclare notify.ts's module-level `BRAND`), every top-level name
// that module declares is renamed with a `__shared_` prefix — scoped to that
// one inlined block, for that one function's temporary build only. The
// function's own code and the real `_shared` source in git are never
// touched.
//
// Usage:
//   node scripts/deployWithInlinedShared.mjs <functionName...>
//
// Restoration happens automatically, even on error or Ctrl-C.

import { readFileSync, writeFileSync, copyFileSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FUNCTIONS_DIR = join(ROOT, 'base44', 'functions');
const SHARED_DIR = join(FUNCTIONS_DIR, '_shared');

const argv = process.argv.slice(2);
if (argv.length === 0) {
  console.error('Usage: node scripts/deployWithInlinedShared.mjs <functionName...>');
  process.exit(1);
}

// Matches `export function X`, `export async function X`, `export const X`,
// `export interface X`, etc., and the same without `export` (module-private
// helpers, which still occupy the top-level scope once inlined).
function topLevelNames(src) {
  const names = new Set();
  const re = /^(?:export\s+)?(?:async\s+)?(?:const|function|class|interface|type)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm;
  let m;
  while ((m = re.exec(src))) names.add(m[1]);
  return names;
}

// A _shared module referencing a sibling uses either `./X.ts` (same folder)
// or, in principle, `../_shared/X.ts` — accept both.
const NESTED_IMPORT_RE = /^import\s+\{[^}]*\}\s+from\s+'(?:\.\/|\.\.\/_shared\/)([A-Za-z0-9_]+)\.ts';\s*$/gm;

/**
 * Recursively resolves a _shared module and everything it transitively
 * imports from _shared, post-order (dependencies before dependents), into
 * `order`. Each entry's import lines to other _shared modules are stripped —
 * they're satisfied by inlining, not by the import statement anymore.
 */
function resolveSharedModule(modName, visited, order) {
  if (visited.has(modName)) return;
  visited.add(modName);

  const modPath = join(SHARED_DIR, `${modName}.ts`);
  if (!existsSync(modPath)) throw new Error(`_shared/${modName}.ts does not exist`);
  let src = readFileSync(modPath, 'utf8');

  const nestedNames = [];
  let m;
  NESTED_IMPORT_RE.lastIndex = 0;
  while ((m = NESTED_IMPORT_RE.exec(src))) nestedNames.push(m[1]);

  for (const dep of nestedNames) resolveSharedModule(dep, visited, order);

  NESTED_IMPORT_RE.lastIndex = 0;
  src = src.replace(NESTED_IMPORT_RE, '');

  order.push({ name: modName, src });
}

const backups = [];
function restoreAll() {
  for (const { entryPath, backupPath } of backups.splice(0)) {
    if (existsSync(backupPath)) {
      copyFileSync(backupPath, entryPath);
      unlinkSync(backupPath);
    }
  }
}
process.on('exit', restoreAll);
process.on('SIGINT', () => { restoreAll(); process.exit(130); });

const TOP_IMPORT_RE = /^import\s+\{[^}]*\}\s+from\s+'\.\.\/_shared\/([A-Za-z0-9_]+)\.ts';\s*$/gm;

try {
  for (const name of argv) {
    const entryPath = join(FUNCTIONS_DIR, name, 'entry.ts');
    if (!existsSync(entryPath)) throw new Error(`No entry.ts for function "${name}"`);
    let src = readFileSync(entryPath, 'utf8');

    const directModules = new Set();
    let match;
    TOP_IMPORT_RE.lastIndex = 0;
    while ((match = TOP_IMPORT_RE.exec(src))) directModules.add(match[1]);

    if (directModules.size === 0) {
      console.log(`  ${name}: no _shared imports — nothing to inline.`);
      continue;
    }

    // Resolve the FULL transitive closure, dependencies first.
    const order = [];
    const visited = new Set();
    for (const mod of directModules) resolveSharedModule(mod, visited, order);

    // Cumulative collision avoidance: each module is checked against the
    // target's own names AND every module already inlined earlier in this
    // same build (order matters — dependencies were resolved first).
    const inScope = topLevelNames(src);
    let inlined = '';
    for (const { name: modName, src: modSrc0 } of order) {
      let modSrc = modSrc0;
      const modTop = topLevelNames(modSrc);
      for (const sym of modTop) {
        if (inScope.has(sym)) {
          console.log(`  ${name}: renaming _shared/${modName}.ts's "${sym}" -> "__shared_${sym}" (collides with an already in-scope "${sym}")`);
          modSrc = modSrc.replace(new RegExp(`\\b${sym}\\b`, 'g'), `__shared_${sym}`);
        }
      }
      for (const sym of topLevelNames(modSrc)) inScope.add(sym);
      inlined += `\n// ── INLINED from _shared/${modName}.ts (deploy-time only) ──\n${modSrc}\n// ── end inline: ${modName}.ts ──\n`;
    }

    TOP_IMPORT_RE.lastIndex = 0;
    src = src.replace(TOP_IMPORT_RE, '');

    const merged =
      `// GENERATED FOR DEPLOY ONLY by scripts/deployWithInlinedShared.mjs — DO NOT COMMIT.\n` +
      `// If you are reading this in git, restoration failed; run:\n` +
      `//   git checkout -- base44/functions/${name}/entry.ts\n` +
      inlined + '\n' + src;

    const backupPath = `${entryPath}.predeploy.bak`;
    copyFileSync(entryPath, backupPath);
    backups.push({ entryPath, backupPath });
    writeFileSync(entryPath, merged, 'utf8');
    console.log(`  ${name}: inlined [${order.map((o) => o.name).join(', ')}]`);
  }

  console.log(`\nDeploying: ${argv.join(' ')}`);
  try {
    execFileSync('npx', ['base44', 'functions', 'deploy', ...argv, '--app-id', '6a01c1305c540b75f24dd373'], { stdio: 'inherit', shell: true });
  } catch (deployErr) {
    console.log(`\n(base44 deploy exited non-zero — see output above; restoring originals regardless)`);
  }
} finally {
  restoreAll();
  console.log('Restored all original entry.ts files from backup.');
}
