#!/usr/bin/env node
/**
 * Documentation freshness + link check.
 *
 * A date alone is decoration: a doc stamped "reviewed today" after a skim reads as verified when it
 * is not, and nothing ever bumps a date that has gone wrong. This check makes both failures
 * mechanical instead of remembered.
 *
 * A doc may carry one line, near the top:
 *
 *     **Verified 2026-01-31** against `src/billing.ts` · `docs/ARCHITECTURE.md`
 *
 * It is a claim with a subject, not a timestamp. The check then enforces:
 *
 *   1. DEAD LINK   — every relative link a doc names must resolve on disk.
 *   2. DRIFT       — if any file a doc tracks was committed AFTER the verified date, the doc's
 *                    subject moved and the claim has expired. This is the part a person cannot be
 *                    trusted to notice.
 *   3. UNVERIFIED  — a doc with no such line is reported, never failed. Absence of a claim is
 *                    honest; a false claim is not.
 *
 * Exit 1 on dead links or drift. Unverified docs are informational, so adding the line to one doc is
 * always an improvement and never a new obligation on the docs beside it.
 *
 *   node scripts/check-docs.mjs            # report + exit code
 *   node scripts/check-docs.mjs --list     # also list the unverified docs
 *   node scripts/check-docs.mjs --pending  # + which docs the UNCOMMITTED changes will expire
 *
 * WHY --pending EXISTS. Rule 2 reads a COMMIT date, and an uncommitted edit has none — so a doc
 * whose subject was just rewritten is still "fresh" to this script: the pre-commit run reports 0
 * problems and the identical command goes red the moment the work is committed, on CI, with nothing
 * having changed in between. That is not a rare race, it is the normal order of work. `--pending`
 * asks the question the plain run cannot — *if I commit what I am holding, today, which claims
 * expire?* — and it is exactly computable, because the only input rule 2 lacks is the date those
 * files are about to carry. Run it BEFORE committing, and the plain form after.
 *
 * NEEDS FULL HISTORY. Rule 2 asks git when each tracked file last changed, so a shallow clone
 * answers "today" for every file in the repository. This script refuses to guess in that case — see
 * the shallow check below, and set `fetch-depth: 0` on the CI checkout.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const LIST = process.argv.includes('--list');
const PENDING = process.argv.includes('--pending');

// --- What this project counts as documentation ------------------------------------------------
// Adjust both lists to the repository; the reasons matter more than the exact entries.

// Not developer documentation. Web-content roots are here on purpose: their `/pricing`-style links
// are ROUTES, and resolving those against the filesystem reports every one of them as dead.
const EXCLUDED = ['node_modules/', 'vendor/', 'dist/', 'build/', 'coverage/', 'public/', 'static/'];

// Historical records are dated claims about the past. They are supposed to describe a world that no
// longer exists, so drift is their normal state and flagging them is noise.
const HISTORICAL = /^(docs\/archive\/|TODO-COMPLETED\.md$|docs\/TODO-done\.md$)|(^|\/)migrations\//;

/** Local calendar date, in the same YYYY-MM-DD shape `git log --format=%cs` returns. */
const today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/**
 * Every path with an uncommitted change — staged, unstaged or untracked. An untracked file counts:
 * it has no commit date today (so rule 2 ignores it) and will have one the moment it lands.
 *
 * `-z` rather than plain porcelain because paths with spaces or non-ASCII come back quoted and
 * escaped otherwise, and a mangled path silently drops out of the comparison — the failure mode
 * would be this check quietly saying "nothing will expire".
 */
const pendingPaths = () => {
  const out = execFileSync('git', ['status', '--porcelain=v1', '-z'], { cwd: ROOT, encoding: 'utf8' });
  const tokens = out.split('\0').filter(Boolean);
  const paths = new Set();
  for (let i = 0; i < tokens.length; i++) {
    const status = tokens[i].slice(0, 2);
    const file = tokens[i].slice(3);
    // A rename/copy entry is followed by its SOURCE path as a separate token — consume it, and do
    // not treat it as pending: after the commit that path no longer exists.
    if (status[0] === 'R' || status[0] === 'C') i++;
    if (status === 'D ' || status === ' D') continue; // deleted: it will carry no new commit date
    paths.add(file);
  }
  return paths;
};

const shallow =
  execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: ROOT, encoding: 'utf8' }).trim() === 'true';

const docs = execFileSync('git', ['ls-files', '*.md'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((f) => !EXCLUDED.some((p) => f.startsWith(p)))
  // `git ls-files` reads the index, which still lists files deleted in the working tree. Check what
  // is actually there.
  .filter((f) => fs.existsSync(path.join(ROOT, f)));

const commitDate = (rel) => {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', rel], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
    return out || null; // null = never committed (a new file)
  } catch {
    return null;
  }
};

const problems = [];
const unverified = [];
/** Every well-formed claim, kept so --pending can re-ask rule 2 with a different date. */
const claims = [];
let verifiedCount = 0;

for (const doc of docs) {
  const abs = path.join(ROOT, doc);
  let text;
  try {
    text = fs.readFileSync(abs, 'utf8');
  } catch {
    continue;
  }
  const historical = HISTORICAL.test(doc);
  // A fenced block SHOWS syntax rather than using it: a link inside one is an example, and a doc
  // that documents this convention would otherwise be the first file the convention lies about.
  const body = text.replace(/^```[\s\S]*?^```/gm, '');

  // ---- 1. dead links -------------------------------------------------------
  for (const m of body.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const target = m[1].split('#')[0];
    // Skipped: anchors, external URLs, mail links, root-relative site routes, and any target still
    // holding an unfilled `{{PLACEHOLDER}}` — that one is the scaffold's job to fill, not a defect.
    if (!target || /^(https?:|mailto:|#|\/)/.test(target) || target.includes('{{')) continue;
    if (!fs.existsSync(path.resolve(path.dirname(abs), target))) {
      problems.push({ doc, kind: 'dead link', detail: target });
    }
  }

  // ---- 2. freshness claim --------------------------------------------------
  const claim = body.match(/\*\*Verified (\d{4}-\d{2}-\d{2})\*\*\s+against\s+([^\n]+)/);
  if (!claim) {
    if (!historical) unverified.push(doc);
    continue;
  }
  verifiedCount++;
  const verified = claim[1];
  const tracked = [...claim[2].matchAll(/`([^`]+)`/g)].map((x) => x[1]);
  if (tracked.length === 0) {
    problems.push({ doc, kind: 'malformed claim', detail: 'no `path` listed after "against"' });
    continue;
  }
  claims.push({ doc, verified, tracked });
  if (shallow) continue; // rule 2 is unanswerable here; reported once, below
  for (const rel of tracked) {
    if (!fs.existsSync(path.join(ROOT, rel))) {
      problems.push({ doc, kind: 'tracks missing file', detail: rel });
      continue;
    }
    const changed = commitDate(rel);
    if (changed && changed > verified) {
      problems.push({ doc, kind: 'DRIFT', detail: `${rel} changed ${changed}, doc verified ${verified}` });
    }
  }
}

// A shallow clone holds one commit, dated today, so every file reports as changed today and every
// claim older than the run looks expired. Answering anyway would produce a wall of drift naming
// files the branch never touched — noise that trains a reader to ignore the check. Say what is
// wrong with the checkout instead.
if (shallow && claims.length) {
  problems.push({
    doc: '(checkout)',
    kind: 'shallow clone',
    detail: 'no commit history — set fetch-depth: 0 on the checkout; freshness was not evaluated',
  });
}

for (const p of problems) {
  console.log(`  ${p.kind.padEnd(19)} ${p.doc}: ${p.detail}`);
}

console.log(
  `\n${docs.length} markdown files · ${verifiedCount} carry a freshness claim · ` +
    `${unverified.length} unverified · ${problems.length} problem(s)`,
);

if (LIST && unverified.length) {
  console.log('\nUnverified (no freshness claim — not a failure):');
  for (const d of unverified) console.log(`  ${d}`);
}

// ---- 4. --pending: rule 2, re-asked with the date the uncommitted work will carry --------------
// Reported separately from `problems` because it is not a failure of the tree as it stands — it is
// a failure of the tree about to be created, and the whole point is to hear it while fixing it is
// still one line. The exit code covers it so a skill or hook can gate the commit on it.
let predicted = 0;
if (PENDING) {
  const pending = pendingPaths();
  const day = today();
  const willExpire = [];
  for (const { doc, verified, tracked } of claims) {
    if (!(day > verified)) continue; // committing today cannot outdate a claim dated today or later
    const hits = tracked.filter((rel) => pending.has(rel));
    if (hits.length) willExpire.push({ doc, verified, hits });
  }
  predicted = willExpire.length;

  console.log(`\n--pending · ${pending.size} changed path(s) · ${predicted} claim(s) will expire on commit`);
  for (const { doc, verified, hits } of willExpire) {
    console.log(`  WILL DRIFT         ${doc}: verified ${verified}, committing ${hits.join(', ')} today`);
  }
  if (predicted) {
    console.log(
      `\nFix each BEFORE committing: re-read the doc against the file(s) named, then set its\n` +
        `**Verified** date to ${day} — or, if every path on that line cannot honestly be verified\n` +
        `(someone else's in-flight edit, a measurement not re-taken), say so in the report rather\n` +
        `than stamping a date that was not earned.`,
    );
  }
}

process.exit(problems.length || predicted ? 1 : 0);
