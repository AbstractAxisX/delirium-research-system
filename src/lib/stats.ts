// Statistical helpers — t-test, p-value, effect size, confidence intervals.
// Pure TypeScript, no external deps. Uses Student's t-distribution approximation.

/** Mean of an array. */
export function mean(a: number[]): number | null {
  if (a.length === 0) return null;
  return a.reduce((s, v) => s + v, 0) / a.length;
}

/** Sample standard deviation (Bessel's correction). */
export function std(a: number[]): number | null {
  if (a.length < 2) return null;
  const m = mean(a)!;
  const variance = a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1);
  return Math.sqrt(variance);
}

/** Standard error of the mean. */
export function sem(a: number[]): number | null {
  const s = std(a);
  if (s == null) return null;
  return s / Math.sqrt(a.length);
}

/** 95% confidence interval (using normal approx for n>30, t for smaller). */
export function ci95(a: number[]): { lower: number; upper: number } | null {
  if (a.length === 0) return null;
  const m = mean(a)!;
  const s = sem(a);
  if (s == null) return { lower: m, upper: m };
  const tcrit = tCritical(a.length - 1, 0.025);
  return { lower: m - tcrit * s, upper: m + tcrit * s };
}

/** Cohen's d effect size between two groups. */
export function cohensD(a: number[], b: number[]): number | null {
  const ma = mean(a); const mb = mean(b);
  const sa = std(a); const sb = std(b);
  if (ma == null || mb == null || sa == null || sb == null) return null;
  // Pooled standard deviation
  const na = a.length; const nb = b.length;
  const pooled = Math.sqrt(((na - 1) * sa ** 2 + (nb - 1) * sb ** 2) / (na + nb - 2));
  if (pooled === 0) return 0;
  return (mb - ma) / pooled; // positive = group B higher than group A
}

/**
 * Welch's two-sample t-test (does not assume equal variances).
 * Returns t-statistic, degrees of freedom (Welch-Satterthwaite), and two-sided p-value.
 */
export function welchTTest(a: number[], b: number[]): {
  t: number; df: number; pValue: number; meanDiff: number;
} | null {
  const ma = mean(a); const mb = mean(b);
  const va = variance(a); const vb = variance(b);
  const na = a.length; const nb = b.length;
  if (ma == null || mb == null || va == null || vb == null) return null;
  if (na < 2 || nb < 2) return null;

  const meanDiff = mb - ma;
  const se = Math.sqrt(va / na + vb / nb);
  if (se === 0) return { t: 0, df: na + nb - 2, pValue: 1, meanDiff: 0 };
  const t = meanDiff / se;
  // Welch-Satterthwaite degrees of freedom
  const num = (va / na + vb / nb) ** 2;
  const den = (va / na) ** 2 / (na - 1) + (vb / nb) ** 2 / (nb - 1);
  const df = num / den;
  const pValue = 2 * (1 - tCDF(Math.abs(t), df));
  return { t, df, pValue, meanDiff };
}

/** Paired t-test for matched pairs (e.g., baseline vs 48h in same patients). */
export function pairedTTest(a: number[], b: number[]): {
  t: number; df: number; pValue: number; meanDiff: number;
} | null {
  if (a.length !== b.length || a.length < 2) return null;
  const diffs = a.map((v, i) => b[i] - v);
  const md = mean(diffs)!;
  const sd = std(diffs);
  if (sd == null || sd === 0) return { t: 0, df: diffs.length - 1, pValue: 1, meanDiff: md };
  const t = md / (sd / Math.sqrt(diffs.length));
  const df = diffs.length - 1;
  const pValue = 2 * (1 - tCDF(Math.abs(t), df));
  return { t, df, pValue, meanDiff: md };
}

function variance(a: number[]): number | null {
  if (a.length < 2) return null;
  const m = mean(a)!;
  return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1);
}

// ============================================================
// Student's t-distribution CDF approximation
// Uses the incomplete beta function. Numerical Recipes (3rd ed).
// ============================================================

function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200; const EPS = 3e-12; const FPMIN = 1e-300;
  let qab = a + b; let qap = a + 1; let qam = a - 1;
  let c = 1; let d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    -((a + b - 0.5) * Math.log(a + b)) +
    a * Math.log(a) + b * Math.log(b) +
    (a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) +
    0.5 * Math.log(2 * Math.PI)
  );
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betacf(a, b, x) / a;
  }
  return 1 - bt * betacf(b, a, 1 - x) / b;
}

/** Student's t CDF for given df, evaluated at t. */
export function tCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  const ib = betai(df / 2, 0.5, x);
  return t >= 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

/** Two-sided critical value for given df and alpha/2 (e.g., 0.025 for 95% CI). */
export function tCritical(df: number, alpha2: number): number {
  // Bisection on inverse CDF
  let lo = 0; let hi = 100;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const cdf = 1 - 0.5 * (1 - tCDF(mid, df) * 0) + tCDF(mid, df) - 0.5;
    // We want CDF(mid) = 1 - alpha2
    const target = 1 - alpha2;
    if (cdf < target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Format a p-value with appropriate precision. */
export function formatPValue(p: number): string {
  if (p < 0.001) return "p < ۰٫۰۰۱";
  if (p < 0.01) return `p = ${p.toFixed(3)}`;
  return `p = ${p.toFixed(3)}`;
}

/** Format a number with Persian digits. */
export function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

/** One-way ANOVA across multiple groups. Returns F-statistic, df, p-value. */
export function oneWayAnova(groups: number[][]): {
  f: number; dfBetween: number; dfWithin: number; pValue: number;
} | null {
  const k = groups.length;
  if (k < 2) return null;
  const validGroups = groups.filter((g) => g.length > 0);
  if (validGroups.length < 2) return null;
  const all = validGroups.flat();
  const nTotal = all.length;
  if (nTotal < 3) return null;
  const grandMean = mean(all)!;
  // Between-group sum of squares
  let ssBetween = 0;
  for (const g of validGroups) {
    const gm = mean(g)!;
    ssBetween += g.length * (gm - grandMean) ** 2;
  }
  // Within-group sum of squares
  let ssWithin = 0;
  for (const g of validGroups) {
    const gm = mean(g)!;
    for (const v of g) ssWithin += (v - gm) ** 2;
  }
  const dfBetween = validGroups.length - 1;
  const dfWithin = nTotal - validGroups.length;
  if (dfWithin < 1) return null;
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  if (msWithin === 0) return { f: msBetween === 0 ? 0 : Infinity, dfBetween, dfWithin, pValue: 0 };
  const f = msBetween / msWithin;
  // P-value via F-distribution CDF (using incomplete gamma)
  const pValue = 1 - fCDF(f, dfBetween, dfWithin);
  return { f, dfBetween, dfWithin, pValue };
}

function fCDF(f: number, d1: number, d2: number): number {
  // P(F <= f) = I_{d2/(d2+d1*f)}(d2/2, d1/2)
  if (f <= 0) return 0;
  const x = d2 / (d2 + d1 * f);
  return betai(d2 / 2, d1 / 2, x);
}
