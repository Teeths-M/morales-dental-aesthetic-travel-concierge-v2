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
// cannot ship code UPDATES to them — confirmed 2026-07-19/20: 3/3
// self-contained functions deployed clean, 21/21 `_shared`-importing
// functions failed with this identical error, twice, on separate sessions.
//
// This script works around it WITHOUT ever duplicating shared code in git:
// for each named function it temporarily inlines the exact `_shared/*.ts`
// files that function imports directly into `entry.ts`, deploys that
// self-contained version, then restores the original multi-file source from
// a backup — success or failure, always. The only copy of the shared logic
// that lives in git, ever, is the one under base44/functions/_shared/.
//
// COLLISION HANDLING: if inlining a shared module would redeclare a
// top-level name the function already declares itself (e.g. several senders
// keep their own local `BRAND`/`GOLD` for an unrelated email template), every
// top-level name the shared module exports is renamed with a `__shared_`
// prefix — but only within that one inlined block, only for that one
// function's temporary build. The function's own code, and the real
// `_shared` source in git, are never touched.
//
// Deliberately does NOT support a shared module that itself imports another
// `_shared` file — it fails loudly instead, rather than silently shipping a
// half-bundled function. None of the modules this has been used for
// (cronAuth.ts, notify.ts) have nested imports; extend deliberately if a
// nested case comes up.
//
// Usage:
//   node scripts/deployWithInlinedShared.mjs <functionName...>
//   npx base44 functions deploy <same names> --app-id <id>
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

function topLevelNames(src) {
  const names = new Set();
  const re = /^(?:export\s+)?(?:const|function|class|interface|type)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm;
  let m;
  while ((m = re.exec(src))) names.add(m[1]);
  return names;
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

const importRe = /^import\s+\{[^}]*\}\s+from\s+'\.\.\/_shared\/([A-Za-z0-9_]+)\.ts';\s*$/gm;

try {
  for (const name of argv) {
    const entryPath = join(FUNCTIONS_DIR, name, 'entry.ts');
    if (!existsSync(entryPath)) throw new Error(`No entry.ts for function "${name}"`);
    let src = readFileSync(entryPath, 'utf8');

    const modules = new Set();
    let match;
    importRe.lastIndex = 0;
    while ((match = importRe.exec(src))) modules.add(match[1]);

    if (modules.size === 0) {
      console.log(`  ${name}: no _shared imports — nothing to inline.`);
      continue;
    }

    const targetTop = topLevelNames(src);
    let inlined = '';
    for (const mod of modules) {
      const modPath = join(SHARED_DIR, `${mod}.ts`);
      if (!existsSync(modPath)) throw new Error(`${name} imports _shared/${mod}.ts, which does not exist`);
      let modSrc = readFileSync(modPath, 'utf8');

      if (/from\s+['"]\.\.?\//.test(modSrc)) {
        throw new Error(
          `_shared/${mod}.ts has its own relative import — this script only inlines ` +
          `self-contained shared modules (no nested imports), by design, so it never ` +
          `ships a silently-wrong partial bundle. Extend it deliberately if you need this.`
        );
      }

      const modTop = topLevelNames(modSrc);
      for (const sym of modTop) {
        if (targetTop.has(sym)) {
          console.log(`  ${name}: renaming _shared/${mod}.ts's "${sym}" -> "__shared_${sym}" (collides with ${name}'s own top-level "${sym}")`);
          modSrc = modSrc.replace(new RegExp(`\\b${sym}\\b`, 'g'), `__shared_${sym}`);
        }
      }

      inlined += `\n// ── INLINED from _shared/${mod}.ts (deploy-time only) ──\n${modSrc}\n// ── end inline: ${mod}.ts ──\n`;
    }

    importRe.lastIndex = 0;
    src = src.replace(importRe, '');

    const merged =
      `// GENERATED FOR DEPLOY ONLY by scripts/deployWithInlinedShared.mjs — DO NOT COMMIT.\n` +
      `// If you are reading this in git, restoration failed; run:\n` +
      `//   git checkout -- base44/functions/${name}/entry.ts\n` +
      inlined + '\n' + src;

    const backupPath = `${entryPath}.predeploy.bak`;
    copyFileSync(entryPath, backupPath);
    backups.push({ entryPath, backupPath });
    writeFileSync(entryPath, merged, 'utf8');
    console.log(`  ${name}: inlined [${[...modules].join(', ')}]`);
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
