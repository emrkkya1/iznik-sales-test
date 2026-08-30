#!/usr/bin/env node
/**
 * Local database integration runner.
 *
 * Responsibilities:
 *   - Acquire an exclusive lock so two commands never reset the database
 *     in parallel.
 *   - Start local Supabase (`supabase start`) and reset it to a clean,
 *     migrated, seeded state (`supabase db reset --local`).
 *   - Verify the resolved API/DB URLs target loopback only. Refuse to
 *     continue otherwise so this can never touch a remote/linked project.
 *   - Forward only the keys the test process needs through env vars and
 *     never echo them.
 *   - Spawn Vitest with the integration config and propagate exit status.
 *
 * Safety: this script intentionally uses `supabase db reset --local`.
 * `supabase db reset` defaults to `--local`, but we pass `--local`
 * explicitly to avoid any chance of running against a linked project.
 */
import { spawnSync, spawn } from 'node:child_process';
import { mkdirSync, openSync, closeSync, unlinkSync, existsSync, readFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const lockDir = join(projectRoot, '.git', 'tarihi-iznik-test-lock');
const lockFile = join(lockDir, 'pid');
const EXPECTED_API_PORT = '54321';
const EXPECTED_DB_PORT = '54322';
const LOCK_STALE_MS = 1000 * 60 * 60;

function log(message) {
  // eslint-disable-next-line no-console
  console.log(`[test:db] ${message}`);
}

function fail(message, code = 1) {
  // eslint-disable-next-line no-console
  console.error(`[test:db] ${message}`);
  releaseLock();
  process.exit(code);
}

function readProjectId() {
  const configPath = join(projectRoot, 'supabase', 'config.toml');
  const match = readFileSync(configPath, 'utf8').match(/^project_id\s*=\s*"([^"]+)"/m);
  return match ? match[1] : null;
}

function acquireLock() {
  mkdirSync(lockDir, { recursive: true });
  if (existsSync(lockFile)) {
    const existing = readFileSync(lockFile, 'utf8').trim();
    const existingPid = Number(existing.split('\n')[0]);
    const existingAt = Number(existing.split('\n')[1] ?? '0');
    const ageMs = Date.now() - existingAt;
    if (existingPid && existingPid !== process.pid) {
      try {
        process.kill(existingPid, 0);
        if (ageMs < LOCK_STALE_MS) {
          fail(`Another test:db run is in progress (pid ${existingPid}).`);
        }
      } catch {
        // Process is gone; treat lock as stale.
      }
    }
  }
  const fd = openSync(lockFile, 'w');
  try {
    closeSync(fd);
  } catch {
    // ignore
  }
  // Append write so multiple FS implementations work; truncate first.
  const data = `${process.pid}\n${Date.now()}\n${hostname()}\n`;
  const writeFd = openSync(lockFile, 'w');
  try {
    writeFd && null;
  } finally {
    if (writeFd) {
      try {
        // Node has no portable string write without extra deps; use require.
      } catch {
        // ignore
      }
    }
  }
  // Use spawnSync indirectly via writeFileSync semantics through fs.writeSync.
  // For simplicity, just write via spawn of sh -c.
  spawnSync('sh', ['-c', `printf %s "${data.replace(/\n/g, '\\n')}" > ${lockFile}`]);
}

function releaseLock() {
  try {
    if (existsSync(lockFile)) unlinkSync(lockFile);
  } catch {
    // ignore
  }
}

function isLoopback(host) {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

function runSync(label, args, options = {}) {
  log(`${label}: ${args.join(' ')}`);
  const result = spawnSync('npx', ['supabase', ...args], {
    cwd: projectRoot,
    stdio: 'inherit',
    ...options,
  });
  if (result.status !== 0) {
    fail(`${label} failed with exit ${result.status ?? 'unknown'}.`);
  }
}

function startSupabase() {
  runSync('supabase start', ['start']);
}

function resetDatabase() {
  // `--local` is critical; never call without it.
  runSync('supabase db reset', ['db', 'reset', '--local', '--yes']);
}

function readStatus() {
  const result = spawnSync('npx', ['supabase', 'status', '-o', 'json'], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    fail(`supabase status failed with exit ${result.status ?? 'unknown'}.`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    fail(`Could not parse supabase status JSON: ${error.message}`);
  }
}

function assertLocalOnly(status) {
  const api = new URL(status.API_URL);
  const db = new URL(status.DB_URL);
  if (!isLoopback(api.hostname) || api.port !== EXPECTED_API_PORT) {
    fail(`Refusing to run: API_URL ${status.API_URL} is not loopback:${EXPECTED_API_PORT}.`);
  }
  if (!isLoopback(db.hostname) || db.port !== EXPECTED_DB_PORT) {
    fail(`Refusing to run: DB_URL ${status.DB_URL} is not loopback:${EXPECTED_DB_PORT}.`);
  }
  const expectedProjectId = readProjectId();
  if (!expectedProjectId) {
    fail('Could not read project_id from supabase/config.toml.');
  }
  log(`Connected to local project "${expectedProjectId}" on ${status.API_URL}.`);
}

function runIntegrationTests(status) {
  const env = {
    ...process.env,
    TEST_SUPABASE_URL: status.API_URL,
    TEST_SUPABASE_ANON_KEY: status.ANON_KEY,
    TEST_SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
    SUPABASE_PROJECT_ID: readProjectId() ?? '',
  };
  return new Promise((resolve) => {
    const child = spawn(
      'npx',
      ['vitest', 'run', '--config', 'vitest.integration.config.mjs'],
      { cwd: projectRoot, stdio: 'inherit', env },
    );
    child.on('exit', (code) => resolve(code ?? 1));
    child.on('error', (error) => {
      // eslint-disable-next-line no-console
      console.error(`[test:db] vitest failed to start: ${error.message}`);
      resolve(1);
    });
  });
}

async function main() {
  acquireLock();
  try {
    startSupabase();
    resetDatabase();
    const status = readStatus();
    assertLocalOnly(status);
    const exitCode = await runIntegrationTests(status);
    if (exitCode !== 0) {
      fail(`Integration tests failed with exit ${exitCode}.`, exitCode);
    }
    log('Integration tests passed against a clean local database.');
  } finally {
    releaseLock();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(`[test:db] unexpected error: ${error.message}`);
  releaseLock();
  process.exit(1);
});
