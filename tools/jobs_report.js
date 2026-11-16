// tools/jobs.js 결과 요약: node tools/jobs_report.js result.json
const rows = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));
const key = (r) => r.hero + '/' + r.line + '/' + r.rank, G = {};
for (const r of rows) (G[key(r)] = G[key(r)] || []).push(r);
const avg = (a, f) => a.length ? a.reduce((s, x) => s + f(x), 0) / a.length : NaN;
const out = [];
for (const [k, a] of Object.entries(G)) {
  const W = a.filter((r) => r.test === 'wave'), B = a.filter((r) => r.test === 'boss');
  const sc = (x, ref) => x.won ? Math.min(2, ref / x.time) : -1 + (1 - x.bossLeft) * 0; // 이기면 빠를수록 높음, 지면 -1
  out.push({ k, name: a[0].name, rank: a[0].rank, n: a.length,
    wWin: W.filter((x) => x.won).length / W.length, wT: avg(W.filter((x) => x.won), (x) => x.time), wDmg: avg(W, (x) => x.taken / x.ehp),
    bWin: B.filter((x) => x.won).length / B.length, bT: avg(B.filter((x) => x.won), (x) => x.time), bDmg: avg(B, (x) => x.taken / x.ehp), bLeft: avg(B.filter((x) => !x.won), (x) => x.bossLeft) });
}
for (const rk of [0, 1, 2]) {
  const rs = out.filter((o) => o.rank === rk);
  const mwT = avg(rs, (o) => o.wT || 0), mbT = avg(rs, (o) => o.bT || 0);
  for (const o of rs) o.score = 100 * (0.35 * o.wWin + 0.65 * o.bWin) * (0.5 * mwT / (o.wT || 999) + 0.5 * mbT / (o.bT || 999)) * (1 - 0.3 * (o.wDmg + o.bDmg) / 2);
  const ms = avg(rs, (o) => o.score);
  console.log(`\n== ${['기본 (2필드)', '1차 진화 (5필드)', '2차 진화 (9필드)'][rk]}`);
  for (const o of rs.sort((a, b) => b.score - a.score)) console.log(`${(o.score / ms * 100).toFixed(0).padStart(4)}%  ${o.k.padEnd(30)} ${o.name.padEnd(10)} 웨이브 ${(o.wWin * 100).toFixed(0).padStart(3)}% ${o.wT.toFixed(0).padStart(3)}초 피해 ${(o.wDmg * 100).toFixed(0).padStart(3)}% | 보스 ${(o.bWin * 100).toFixed(0).padStart(3)}% ${isNaN(o.bT) ? '  -' : o.bT.toFixed(0).padStart(3)}초 피해 ${(o.bDmg * 100).toFixed(0).padStart(3)}% 남은보스 ${isNaN(o.bLeft) ? '-' : (o.bLeft * 100).toFixed(0) + '%'}`);
}
