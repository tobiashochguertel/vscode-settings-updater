#!/usr/bin/env node
/**
 * VSIX package size traffic-light check.
 *
 * Compares the current .vsix size against a stored baseline and
 * emits a colour-coded result:
 *
 *   🟢 GREEN  — within  YELLOW_PCT % of baseline  → pass
 *   🟡 YELLOW — within  RED_PCT    % of baseline  → pass with warning
 *   🔴 RED    — exceeds RED_PCT    % of baseline  → exit 1 (CI fail)
 *
 * Thresholds (configurable via env vars):
 *   YELLOW_PCT  default 10   e.g. "10" means baseline × 1.10
 *   RED_PCT     default 50   e.g. "50" means baseline × 1.50
 *
 * Baseline is read from scripts/package-size-baseline.json.
 * Update it intentionally with:  node scripts/check-package-size.mjs --update
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { resolve, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..')
const BASELINE_FILE = join(ROOT, 'scripts', 'package-size-baseline.json')

const YELLOW_PCT = Number(process.env.YELLOW_PCT ?? 10)
const RED_PCT = Number(process.env.RED_PCT ?? 50)

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(bytes) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(2)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function findVsix() {
  const files = readdirSync(ROOT).filter((f) => f.endsWith('.vsix'))
  if (files.length === 0) throw new Error('No .vsix file found in repo root. Run `task package` first.')
  if (files.length > 1) console.warn(`⚠️  Multiple .vsix files found — using ${files[0]}`)
  return join(ROOT, files[0])
}

function readBaseline() {
  try {
    return JSON.parse(readFileSync(BASELINE_FILE, 'utf8'))
  } catch {
    return null
  }
}

// ── --update mode ─────────────────────────────────────────────────────────────

if (process.argv.includes('--update')) {
  const vsixPath = findVsix()
  const size = statSync(vsixPath).size
  const data = { baseline: size, updatedAt: new Date().toISOString(), file: vsixPath.replace(ROOT + '/', '') }
  writeFileSync(BASELINE_FILE, JSON.stringify(data, null, 2) + '\n')
  console.log(`✅ Baseline updated → ${fmt(size)}  (${BASELINE_FILE})`)
  process.exit(0)
}

// ── check mode ────────────────────────────────────────────────────────────────

const vsixPath = findVsix()
const current = statSync(vsixPath).size

const stored = readBaseline()
if (!stored) {
  console.log(`ℹ️  No baseline found — run with --update to create one.`)
  console.log(`   Current size: ${fmt(current)}`)
  process.exit(0)
}

const baseline = stored.baseline
const pct = ((current - baseline) / baseline) * 100
const sign = pct >= 0 ? '+' : ''
const pctStr = `${sign}${pct.toFixed(1)}%`

console.log('')
console.log(`📦  VSIX size check`)
console.log(`    Baseline : ${fmt(baseline)}`)
console.log(`    Current  : ${fmt(current)}`)
console.log(`    Delta    : ${pctStr}`)
console.log(`    Thresholds: 🟡 >${YELLOW_PCT}%  🔴 >${RED_PCT}%`)
console.log('')

if (pct > RED_PCT) {
  console.log(`🔴  RED — size increased by ${pctStr} (limit ${RED_PCT}%). Investigate before merging!`)
  console.log(`    If this is intentional, run:  node scripts/check-package-size.mjs --update`)
  process.exit(1)
} else if (pct > YELLOW_PCT) {
  console.log(`🟡  YELLOW — size increased by ${pctStr} (warning threshold ${YELLOW_PCT}%).`)
  console.log(`    Consider running --update if this is an expected growth.`)
  process.exit(0)
} else {
  console.log(`🟢  GREEN — size is within limits (${pctStr}).`)
  process.exit(0)
}
