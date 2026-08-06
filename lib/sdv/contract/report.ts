import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CheckResult, CheckStatus } from './types';
import { isFailure } from './types';

const STATUS_PAD = 18;

export function summarize(results: CheckResult[]): {
  total: number;
  byStatus: Record<CheckStatus, number>;
  failures: CheckResult[];
} {
  const byStatus: Record<CheckStatus, number> = {
    ok: 0,
    expected_empty: 0,
    missing_field: 0,
    map_error: 0,
    semantic_mismatch: 0,
    error: 0,
  };
  for (const r of results) byStatus[r.status] += 1;
  return {
    total: results.length,
    byStatus,
    failures: results.filter((r) => isFailure(r.status)),
  };
}

export function printReport(results: CheckResult[]): void {
  const summary = summarize(results);
  console.log('\n=== SDV Contract Report ===\n');
  console.log(
    `${'STATUS'.padEnd(STATUS_PAD)} ${'SEASON'.padEnd(8)} ${'LAYER'.padEnd(8)} ENTRY / MESSAGE`
  );
  console.log('-'.repeat(100));
  for (const r of results) {
    const line = `${r.status.padEnd(STATUS_PAD)} ${String(r.season).padEnd(8)} ${r.layer.padEnd(8)} ${r.entryId}: ${r.message}`;
    console.log(line);
  }
  console.log('-'.repeat(100));
  console.log(
    `total=${summary.total} ok=${summary.byStatus.ok} expected_empty=${summary.byStatus.expected_empty} ` +
      `failures=${summary.failures.length} ` +
      `(missing=${summary.byStatus.missing_field} map=${summary.byStatus.map_error} ` +
      `semantic=${summary.byStatus.semantic_mismatch} error=${summary.byStatus.error})`
  );
}

/** Write JSON report under tmp/ (gitignored). Returns path. */
export function writeJsonReport(results: CheckResult[], filename = 'sdv-contract-report.json'): string {
  const dir = join(process.cwd(), 'tmp');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, filename);
  const summary = summarize(results);
  writeFileSync(
    path,
    JSON.stringify({ generatedAt: new Date().toISOString(), summary, results }, null, 2),
    'utf8'
  );
  console.log(`\nWrote ${path}`);
  return path;
}
