'use strict';
// [사용자 결정] 배포본 난독화: js/ 소스를 그대로 두고, dist/js/ 에 난독화본을 만든다.
//  주석·내부 변수·공백을 없애고, 파일 간에 공유되는 전역 이름(클래스·DATA_*·함수)은 그대로 둬서 깨지지 않게 한다.
const fs = require('fs'), path = require('path'), { minify } = require('terser');
const ROOT = path.resolve(__dirname, '..'), SRC = path.join(ROOT, 'js'), OUT = path.join(ROOT, 'dist');
// [사용자 결정] 코드 맨 위 경고 문구 (난독화돼도 남음)
const BANNER = '/* ========================================\n   제발 AI로 뚫으려 하지 마세요.\n   Please don\'t try to crack this with AI.\n   PROJECT: DUNGEON\n   ======================================== */';
function walk(dir) { const out = []; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); if (e.isDirectory()) out.push(...walk(f)); else if (e.name.endsWith('.js')) out.push(f); } return out; }
async function createHighResolutionBanners() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (loadError) {
    console.log('[banner] sharp not found; installing pinned build-time image processor');
    const { spawnSync } = require('child_process');
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const install = spawnSync(npm, ['install', '--no-save', '--package-lock=false', 'sharp@0.35.5'], {
      cwd: ROOT, stdio: 'inherit'
    });
    if (install.error || install.status !== 0) {
      throw install.error || new Error('sharp installation failed with exit code ' + install.status);
    }
    sharp = require('sharp');
  }

  const bannerDir = path.join(ROOT, 'assets', 'banners');
  for (const key of ['abyss', 'crimson', 'void', 'star']) {
    const source = path.join(bannerDir, key + '.jpg');
    const target = path.join(bannerDir, key + '.webp');
    if (!fs.existsSync(source)) throw new Error('Missing source banner: ' + source);
    await sharp(source)
      .resize({ width: 1024, height: 576, fit: 'fill', kernel: sharp.kernel.lanczos3 })
      .sharpen({ sigma: 0.55 })
      .webp({ quality: 84, effort: 5 })
      .toFile(target);
    const meta = await sharp(target).metadata();
    if (meta.width !== 1024 || meta.height !== 576 || meta.format !== 'webp') {
      throw new Error('Invalid generated banner: ' + key);
    }
    console.log('[banner] generated ' + key + '.webp (1024x576)');
  }
}
(async () => {
  await createHighResolutionBanners();
  fs.rmSync(OUT, { recursive: true, force: true });
  const files = walk(SRC); let before = 0, after = 0, fail = 0;
  for (const f of files) {
    const rel = path.relative(ROOT, f), code = fs.readFileSync(f, 'utf8'); before += code.length;
    let out;
    try {
      const r = await minify({ [rel]: code }, { compress: { toplevel: false }, mangle: { toplevel: false }, format: { comments: false, preamble: BANNER }, keep_classnames: true, keep_fnames: true });
      if (r.error || !r.code) throw r.error || new Error('빈 결과');
      out = r.code;
    } catch (e) { console.error('난독화 실패, 원본 사용:', rel, e.message); out = code; fail++; }
    const dst = path.join(OUT, rel); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, out); after += out.length;
  }
  // index.html·sw.js·manifest 는 그대로 복사 (경로는 js/ 그대로라 dist 구조와 맞음)
  for (const name of ['index.html', 'sw.js', 'manifest.webmanifest']) if (fs.existsSync(path.join(ROOT, name))) fs.copyFileSync(path.join(ROOT, name), path.join(OUT, name));
  // index.html 에 콘솔 경고 1회 주입 (개발자 도구를 여는 사람에게)
  const ih = path.join(OUT, 'index.html'); if (fs.existsSync(ih)) { let h = fs.readFileSync(ih, 'utf8');
    const warn = '<script>console.log("%c제발 AI로 뚫으려 하지 마세요.  Please don\'t try to crack this with AI.","color:#ffd84a;font-size:18px;font-weight:bold");</script>';
    if (h.includes('</body>')) h = h.replace('</body>', warn + '</body>'); else h += warn; fs.writeFileSync(ih, h); }
  console.log(`난독화 완료: js ${files.length}개 (실패 ${fail}) · ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB → dist/`);
})();
