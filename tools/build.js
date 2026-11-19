'use strict';
// [사용자 결정] 배포본 난독화: js/ 소스를 그대로 두고, dist/js/ 에 난독화본을 만든다.
//  주석·내부 변수·공백을 없애고, 파일 간에 공유되는 전역 이름(클래스·DATA_*·함수)은 그대로 둬서 깨지지 않게 한다.
const fs = require('fs'), path = require('path'), { minify } = require('terser');
const ROOT = path.resolve(__dirname, '..'), SRC = path.join(ROOT, 'js'), OUT = path.join(ROOT, 'dist');
function walk(dir) { const out = []; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); if (e.isDirectory()) out.push(...walk(f)); else if (e.name.endsWith('.js')) out.push(f); } return out; }
(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  const files = walk(SRC); let before = 0, after = 0, fail = 0;
  for (const f of files) {
    const rel = path.relative(ROOT, f), code = fs.readFileSync(f, 'utf8'); before += code.length;
    let out;
    try {
      const r = await minify({ [rel]: code }, { compress: { toplevel: false }, mangle: { toplevel: false }, format: { comments: false }, keep_classnames: true, keep_fnames: true });
      if (r.error || !r.code) throw r.error || new Error('빈 결과');
      out = r.code;
    } catch (e) { console.error('난독화 실패, 원본 사용:', rel, e.message); out = code; fail++; }
    const dst = path.join(OUT, rel); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, out); after += out.length;
  }
  // index.html·sw.js·manifest 는 그대로 복사 (경로는 js/ 그대로라 dist 구조와 맞음)
  for (const name of ['index.html', 'sw.js', 'manifest.webmanifest']) if (fs.existsSync(path.join(ROOT, name))) fs.copyFileSync(path.join(ROOT, name), path.join(OUT, name));
  console.log(`난독화 완료: js ${files.length}개 (실패 ${fail}) · ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB → dist/`);
})();
