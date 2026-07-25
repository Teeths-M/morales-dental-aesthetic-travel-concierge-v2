// ── Real-browser session capture ────────────────────────────────────────────
//
// Fallback for when auth.setup.js's approach (Playwright launching Edge with
// a fresh, isolated profile — even via `channel: 'msedge'`) gets blocked by
// Google with "This browser or app may not be secure." That block is
// Google's own automation-risk scoring — it's not something the app or this
// script controls, and it can trigger even in headed mode with a real human
// typing the password, because a fresh profile still carries the automation
// flags Playwright sets.
//
// The fix: use your REAL, everyday Edge session — but Chromium hard-refuses
// to enable remote-debugging on a browser's actual default profile
// directory ("DevTools remote debugging requires a non-default data
// directory"). That block is intentional (stops automation of someone's
// live, logged-in browser) and no amount of closing other Edge windows works
// around it — retrying against the real profile directory just fails the
// same way every time.
//
// So instead: copy the real profile (cookies, Google session, everything
// needed to stay signed in) into a private, disposable directory outside the
// real one, and launch Playwright against the copy. It's no longer "the
// default data directory", so Chromium allows it — but it still carries your
// real Google session, so this usually needs no fresh sign-in challenge at
// all. The copy is wiped and rebuilt fresh on every run and lives entirely
// in the OS temp directory — never in this repo, never committed.
//
// Run: node tests/e2e/captureRealBrowserSession.mjs         (client session)
//      node tests/e2e/captureRealBrowserSession.mjs admin   (admin session)
//
// Saves to the exact same files auth.setup.js / admin.auth.setup.js use, so
// everything downstream (ai-agent.spec.js etc.) works identically either way.

import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

dotenv.config({ path: '.env.local' });

// Edge keeps a background process alive after every window is closed
// ("Continue running background apps when Microsoft Edge is closed" is on
// by default) and holds an exclusive OS-level lock on Cookies while it's
// running — so "close your windows" alone isn't enough; the profile copy
// below fails with EBUSY until Edge is *fully* closed. Check for it upfront
// with a clear, actionable message instead of a raw filesystem error.
function isEdgeRunning() {
  try {
    const out = execSync('tasklist /FI "IMAGENAME eq msedge.exe" /FO CSV /NH', { encoding: 'utf8' });
    return out.toLowerCase().includes('msedge.exe');
  } catch {
    return false; // tasklist itself failing shouldn't block the run — the copy step will surface a real error if Edge is in fact still open.
  }
}

if (isEdgeRunning()) {
  console.error('\n>> Edge is still running in the background — right-click its icon in the system tray (bottom-right of the taskbar) and choose "Exit", or end every "Microsoft Edge" process in Task Manager.');
  console.error('>> Closing just the visible windows isn\'t enough: Edge keeps a background process alive by default, and it locks your cookies file while running.\n');
  process.exit(1);
}

const BASE_URL = process.env.E2E_BASE_URL || 'https://sentinel-dental-care.base44.app';
const isAdmin = process.argv[2] === 'admin';
const authFile = isAdmin ? 'tests/e2e/.auth/admin.json' : 'tests/e2e/.auth/user.json';
const REAL_EDGE_USER_DATA_DIR = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data');
const PROFILE_COPY_DIR = path.join(os.tmpdir(), 'morales-e2e-edge-profile');

// Large, freely-rebuildable caches — skipping these keeps the copy fast
// (seconds, not minutes) without losing anything the session needs.
const SKIP_DIR_NAMES = new Set([
  'Cache', 'Code Cache', 'GPUCache', 'DawnCache', 'GrShaderCache', 'ShaderCache', 'Crashpad', 'blob_storage',
]);

function copyRealProfile() {
  console.log(`>> Copying your Edge profile into a private, disposable directory (${PROFILE_COPY_DIR})...`);
  console.log('>> so Chromium will allow automation on it, without touching your real profile.\n');

  fs.rmSync(PROFILE_COPY_DIR, { recursive: true, force: true });
  fs.mkdirSync(PROFILE_COPY_DIR, { recursive: true });

  // Local State holds the key Chromium uses to decrypt saved cookies — the
  // copied session won't work without it, even though it lives one level
  // above the actual profile folder.
  const localStateSrc = path.join(REAL_EDGE_USER_DATA_DIR, 'Local State');
  if (fs.existsSync(localStateSrc)) {
    fs.copyFileSync(localStateSrc, path.join(PROFILE_COPY_DIR, 'Local State'));
  }

  const defaultSrc = path.join(REAL_EDGE_USER_DATA_DIR, 'Default');
  if (!fs.existsSync(defaultSrc)) {
    throw new Error(`Couldn't find your Edge profile at ${defaultSrc}. If you use a non-default Edge profile, this script needs updating to point at it.`);
  }
  fs.cpSync(defaultSrc, path.join(PROFILE_COPY_DIR, 'Default'), {
    recursive: true,
    force: true,
    filter: (src) => !SKIP_DIR_NAMES.has(path.basename(src)),
  });
}

try {
  copyRealProfile();
} catch (err) {
  console.error(`\n>> Couldn't copy your Edge profile: ${err.message}`);
  console.error('>> Make sure every Edge window (and any Edge running in the background/system tray) is fully closed, then try again.\n');
  process.exit(1);
}

console.log(`>> Launching a private copy of your Edge session (originals untouched at ${REAL_EDGE_USER_DATA_DIR}).\n`);

const context = await chromium.launchPersistentContext(PROFILE_COPY_DIR, {
  channel: 'msedge',
  headless: false,
  viewport: { width: 1280, height: 900 },
});

try {
  const page = context.pages()[0] ?? await context.newPage();
  // domcontentloaded, not the default 'load' — a real browser profile can
  // carry extensions/background connections that never let 'load' fire.
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30_000 });

  console.log('>> If you land on the Dashboard immediately, you were already signed in — nothing more to do.');
  console.log('>> Otherwise, sign in normally in the window that opened.');
  console.log(`>> Waiting up to 4 minutes for the ${isAdmin ? 'admin' : 'client'} Dashboard...\n`);

  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 240_000 });

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await context.storageState({ path: authFile });
  console.log(`\n>> Session saved to ${authFile}.\n`);
} finally {
  await context.close();
}
