#!/usr/bin/env node
// Blocks commits that would leak secrets. Runs as a git pre-commit hook
// (installed by `npm install`) and can be run by hand: `npm run check:secrets`.
//
// It checks staged files (or all tracked files with --all) for:
//   - any real environment file (.env, .env.local, …)
//   - the literal values of secrets in your local .env
//   - common key formats (AI keys, Stripe keys, DB URLs with passwords, private keys)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const all = process.argv.includes('--all');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });

let files;
try {
  files = (all ? git('ls-files') : git('diff', '--cached', '--name-only', '--diff-filter=ACMR'))
    .split('\n').filter(Boolean);
} catch {
  console.error('check-secrets: not a git repository.');
  process.exit(0);
}

const PATTERNS = [
  [/\bsk-[A-Za-z0-9]{20,}/, 'API secret key (sk-…)'],
  [/\b(sk|rk)_live_[A-Za-z0-9]{10,}/, 'Stripe live key'],
  [/\bwhsec_[A-Za-z0-9]{10,}/, 'Stripe webhook secret'],
  [/\bnpg_[A-Za-z0-9]{8,}/, 'Neon database password'],
  [/postgres(?:ql)?:\/\/[^:\s/]+:(?!PASSWORD@|password@|postgres@)[^@\s]{6,}@(?!localhost|127\.0\.0\.1)/, 'database URL with password'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
];

// Exact values from the local .env (anything long enough to be a secret).
const localSecrets = [];
if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && /KEY|SECRET|PASSWORD|TOKEN|DATABASE_URL/.test(m[1]) && m[2].length >= 12) localSecrets.push([m[1], m[2]]);
  }
}

const problems = [];
for (const file of files) {
  const base = file.split('/').pop();
  if (/^\.env(\..+)?$/.test(base) && base !== '.env.example') {
    problems.push(`${file}: environment files must never be committed`);
    continue;
  }
  if (file === 'scripts/check-secrets.mjs' || !fs.existsSync(file)) continue;
  const buf = fs.readFileSync(file);
  if (buf.includes(0)) continue; // binary
  const text = buf.toString('utf8');
  for (const [name, value] of localSecrets) {
    if (text.includes(value)) problems.push(`${file}: contains the value of ${name} from .env`);
  }
  for (const [re, label] of PATTERNS) {
    if (re.test(text)) problems.push(`${file}: looks like a ${label}`);
  }
}

if (problems.length) {
  console.error('\n✖ Commit blocked — possible secrets found:\n');
  for (const p of problems) console.error(`  • ${p}`);
  console.error('\nMove secrets into .env (which is gitignored) and try again.\n');
  process.exit(1);
}
console.log(`✓ check-secrets: ${files.length} file(s) clean`);
