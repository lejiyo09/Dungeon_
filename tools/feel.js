// 무기 사용감 점수: tools/power.js --json 결과에 사거리·탄속·에너지·탄퍼짐 보정을 곱해 등급 평균 대비 %로 표시
// 사용: node tools/power.js --json > p.json && node tools/feel.js p.json
global.window=global; eval(require('fs').readFileSync('js/data/weapons.js','utf8').replace("'use strict';","")+';global.DW=DATA_WEAPONS');
const rows=JSON.parse(require('fs').readFileSync(process.argv[2],'utf8'));const by={};for(const d of DW)by[d.id]=d;
const ord=['common','uncommon','rare','epic','legendary'];
for(const r of rows){const d=by[r.id];
 // 사용감 보정: 사거리(짧으면 위험), 탄속(느리면 빗나감), 에너지(많이 먹으면 오래 못 씀), 탄퍼짐
 const range=d.type==='melee'?40:(d.range||300); const fR=Math.min(1.05,0.7+0.3*Math.min(1,range/320));
 const sp=d.type==='gun'||d.type==='charge'?(d.projectileSpeed||400):600; const fS=d.mine?0.9:Math.min(1,0.75+0.25*sp/400);
 const e=r.energyPerSec; const fE=1/(1+e/14);
 const fSp=d.type==='gun'?1-Math.min(0.15,(d.spreadDeg||0)/120):1;
 r.feel=r.power*fR*fS*fE*fSp; r.range=range; r.sp=sp;}
for(const rar of ord){const rs=rows.filter(r=>r.rarity===rar).sort((a,b)=>b.feel-a.feel);const avg=rs.reduce((s,r)=>s+r.feel,0)/rs.length;
 console.log(`\n== ${rar} 평균 ${avg.toFixed(0)}`);for(const r of rs)console.log(`${(r.feel/avg*100).toFixed(0).padStart(4)}% ${r.id.replace('weapon_','').padEnd(18)} ${r.name.padEnd(10)} ${r.type.padEnd(6)} pow ${r.power.toFixed(0).padStart(4)} 단${r.single.toFixed(0).padStart(4)} 범${r.multi.toFixed(0).padStart(4)} E/s ${r.energyPerSec.toFixed(1)} rng ${r.range} sp ${r.sp}`);}
