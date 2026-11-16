'use strict';
// ════════════════════════════════════════════
// HUD / 오버레이
// ════════════════════════════════════════════
function hudText(ctx, str, x, y, color = '#fff', align = 'left', size = 10) {
  ctx.font = `bold ${size}px 'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'top';
  ctx.fillStyle = '#000'; ctx.fillText(str, x + 1, y + 1);
  ctx.fillStyle = color; ctx.fillText(str, x, y);
}
// 너비에 맞춰 줄바꿈 (공백 단위), 그린 줄 수를 돌려줌
function hudWrap(ctx, str, x, y, maxW, color, size, lh) {
  ctx.font = `bold ${size}px 'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif`;
  const lines = []; let cur = '';
  for (const w of str.split(' ')) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  lines.forEach((l, i) => hudText(ctx, l, x, y + i * lh, color, 'center', size));
  return lines.length;
}
function hudBar(ctx, x, y, w, h, ratio, fg) {
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fg; ctx.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, ratio))), h);
}

class HUD {
  render(ctx, game) {
    const p = game.player;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(4, 4, 124, 40);
    [['#e04848', p.hp, p.maxHp], ['#9aa8c0', p.shield, p.maxShield], ['#4a8cff', p.energy, p.maxEnergy]].forEach(([c, v, m], i) => {
      hudBar(ctx, 8, 8 + i * 12, 72, 8, v / m, c);
      hudText(ctx, Math.floor(v) + '/' + m, 84, 6 + i * 12, '#fff', 'left', 9);
    });

    if (game.mode === 'lobby') {
      const ttl = game.save.title && GUILD_TITLES.find((t) => t.id === game.save.title); // 장착한 길드 칭호
      hudText(ctx, `${ttl ? '「' + ttl.name + '」 ' : ''}${game.profile ? game.profile.name : '게스트'}   ·   보유 ${CUR.name} ${game.save.bank}`, VIEW_W / 2, 6, '#ffd84a', 'center');
      hudText(ctx, 'F/우클릭 스킬 · E 상호작용 · Esc 조작법', VIEW_W / 2, VIEW_H - 14, '#aaa', 'center', 8);
    } else {
      const W = game.W;
      hudText(ctx, `${stageLabel(game.worldIdx, game.levelIdx)} ${W.name}   골드 ${game.gold}   처치 ${game.kills}`, VIEW_W / 2, 6, W.deep ? '#9ad8ff' : '#fff', 'center');
      this.minimap(ctx, game);
    }

    const boss = game.enemies.find((e) => e.def.boss && e.alive && e.state !== 'SPAWN');
    if (boss && !game.cinematic) {
      const ph = boss.phase || 1, cols = ['#d050b0', '#e07040', '#ff3a4a'];
      hudText(ctx, `${boss.def.name}  ·  ${boss.def.title || ''}`, VIEW_W / 2, 20, '#ffb0e0', 'center', 9);
      hudText(ctx, ['', 'Ⅰ', 'Ⅱ', 'Ⅲ'][ph], VIEW_W / 2 + 108, 30, cols[ph - 1], 'left', 9);
      ctx.fillStyle = OUTLINE; ctx.fillRect(VIEW_W / 2 - 101, 31, 202, 8);
      hudBar(ctx, VIEW_W / 2 - 100, 32, 200, 6, boss.hp / boss.maxHp, cols[ph - 1]);
      ctx.fillStyle = '#fff'; ctx.fillRect(VIEW_W / 2 - 100 + 66, 31, 1, 8); ctx.fillRect(VIEW_W / 2 - 100 + 132, 31, 1, 8); // 페이즈 경계
      if (boss.state === 'PHASE') { ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.4 * Math.sin(game.time * 20)})`; ctx.fillRect(VIEW_W / 2 - 100, 32, 200, 6); }
    }
    if (game.cinematic) this.cinematic(ctx, game);

    // 무기: 현재 무기(크게) + 보조 칸(작게)
    const w = p.weapon;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(VIEW_W - 172, VIEW_H - 38, 168, 34);
    if (p.treasure) { // 장착한 보구 (R) — 무기 칸과 별도
      const T = p.treasure, ready = p.treasureCd <= 0, bx = VIEW_W - 172, by = VIEW_H - 54;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bx, by, 168, 14);
      ctx.fillStyle = ready ? T.color : '#555'; ctx.fillRect(bx, by + 12, Math.round(168 * (ready ? 1 : 1 - p.treasureCd / T.cooldown)), 2);
      ctx.globalAlpha = ready ? 1 : 0.45; drawTreasureIcon(ctx, T, bx + 8, by + 6, 0.85); ctx.globalAlpha = 1;
      hudText(ctx, `[R] ${T.name}`, bx + 17, by + 2, ready ? T.color : '#888', 'left', 8);
      hudText(ctx, ready ? '준비' : `${Math.ceil(p.treasureCd)}초`, bx + 164, by + 2, ready ? '#fff' : '#888', 'right', 8);
    }
    if (w) {
      ctx.strokeStyle = RARITY_COLOR[w.def.rarity]; ctx.strokeRect(VIEW_W - 168.5, VIEW_H - 34.5, 34, 26);
      drawWeaponCentered(ctx, w.def, VIEW_W - 151, VIEW_H - 21);
      hudText(ctx, weaponTitle(w), VIEW_W - 128, VIEW_H - 35, RARITY_COLOR[w.def.rarity], 'left', 10);
      const cost = w.def.type === 'beam' ? `${w.def.energyPerSec}/초` : (w.def.energyCost || 0);
      const free = p.overdrive > 0 || !w.def.energyCost && w.def.type !== 'beam';
      const warn = game.noEnergyFlash > 0 && Math.floor(game.time * 12) % 2 === 0;
      hudText(ctx, free ? '무제한' : `에너지 ${cost}`, VIEW_W - 128, VIEW_H - 22, warn ? '#ff5050' : free ? '#ffd84a' : '#8ab8ff', 'left', 8);
      if (w.charge > 0) hudBar(ctx, VIEW_W - 166, VIEW_H - 11, 30, 2, w.charge / w.def.chargeTime, '#f0c040');
    }
    const other = p.weapons.find((x) => x !== w);
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(VIEW_W - 40, VIEW_H - 34, 32, 26);
    if (other) drawWeaponCentered(ctx, other.def, VIEW_W - 24, VIEW_H - 23);
    hudText(ctx, 'Q', VIEW_W - 38, VIEW_H - 34, '#888', 'left', 7);

    // 대시 / 스킬
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(4, VIEW_H - 36, 120, 32);
    const by = VIEW_H - 33;
    hudText(ctx, '대시', 8, by, p.dashCooldown > 0 ? '#888' : '#7fe0ff', 'left', 9);
    hudBar(ctx, 34, by + 3, 86, 5, 1 - p.dashCooldown / p.dashCdMax, '#7fe0ff');
    hudText(ctx, p.skillName, 8, by + 14, p.skillCooldown > 0 ? '#888' : '#ffd84a', 'left', 9);
    hudBar(ctx, 66, by + 17, 54, 5, 1 - p.skillCooldown / p.skillCdMax, '#ffd84a');
    if (p.skillCooldown <= 0) { // 스킬 준비 완료: 깜빡이는 테두리
      ctx.strokeStyle = `rgba(255,216,74,${0.4 + 0.4 * Math.sin(game.time * 6)})`; ctx.strokeRect(64.5, by + 15.5, 57, 8);
    }

    if (game.banner && game.banner.t < game.banner.life) {
      const b = game.banner, a = Math.min(1, b.t * 4, (b.life - b.t) * 3);
      ctx.globalAlpha = a;
      hudText(ctx, b.title, VIEW_W / 2, 70, b.color || '#fff', 'center', 16);
      if (b.sub) hudText(ctx, b.sub, VIEW_W / 2, 92, '#ccc', 'center', 10);
      ctx.globalAlpha = 1;
    }
    if (game.overlay) this.overlay(ctx, game);
  }
  // 보스 등장 연출: 위아래 검은 띠 + 이름/칭호 타이틀 카드
  cinematic(ctx, game) {
    const c = game.cinematic, b = c.boss, k = Math.min(1, c.t / 0.4, (2.8 - c.t) / 0.3);
    const bar = Math.round(34 * Math.max(0, k));
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VIEW_W, bar); ctx.fillRect(0, VIEW_H - bar, VIEW_W, bar);
    if (c.t > 1.0) {
      const a = Math.min(1, (c.t - 1.0) / 0.3, (2.8 - c.t) / 0.3), slide = Math.max(0, 1 - (c.t - 1.0) / 0.3) * 40;
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, VIEW_H - 92, VIEW_W, 46);
      ctx.fillStyle = b.def.phaseColors ? b.def.phaseColors[1] : '#ff6a6a'; ctx.fillRect(VIEW_W / 2 - 120 + slide, VIEW_H - 64, 240, 1);
      hudText(ctx, b.def.name, VIEW_W / 2 - slide, VIEW_H - 88, '#ffffff', 'center', 20);
      hudText(ctx, b.def.title || '', VIEW_W / 2 + slide, VIEW_H - 60, '#ffb0c0', 'center', 10);
      ctx.globalAlpha = 1;
    }
  }
  static minimapLayout() { const cw = 11, ch = 9; return { cw, ch, ox: VIEW_W - GRID_W * cw - 6, oy: 6 }; }
  minimap(ctx, game) {
    const map = game.map, { cw, ch, ox, oy } = HUD.minimapLayout();
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(ox - 3, oy - 3, GRID_W * cw + 6, GRID_H * ch + 6);
    const known = (r) => r.visited || map.edges.some(([a, b]) => (a === r && b.visited) || (b === r && a.visited));
    ctx.fillStyle = '#777';
    for (const [a, b] of map.edges) {
      if (!(a.visited || b.visited)) continue;
      const x0 = ox + a.gx * cw + cw / 2, y0 = oy + a.gy * ch + ch / 2, x1 = ox + b.gx * cw + cw / 2, y1 = oy + b.gy * ch + ch / 2;
      ctx.fillRect(Math.min(x0, x1) - 1, Math.min(y0, y1) - 1, Math.abs(x1 - x0) + 2, Math.abs(y1 - y0) + 2);
    }
    const colors = { start: '#5aa0ff', combat: '#b0b0b0', treasure: '#ffd84a', boss: '#ff5a7a', shop: '#5ad08a', exit: '#7ae0ff', fountain: '#4a9ad8', altar: '#c8a0ff', gamble: '#ff9a4a', challenge: '#d04040', forge: '#d07a3a', blood: '#a02020', rack: '#7a9ad0', smithy: '#ffd84a', evolve: '#fff4a0' };
    const cur = map.roomAtPoint(game.player.x, game.player.y);
    for (const r of map.rooms) {
      if (!known(r)) continue;
      const x = ox + r.gx * cw + 1, y = oy + r.gy * ch + 1;
      ctx.fillStyle = r.visited ? colors[r.type] : (r.type === 'combat' ? '#444' : colors[r.type] + '88');
      ctx.fillRect(x, y, cw - 2, ch - 2);
      if (r === cur) { ctx.strokeStyle = '#fff'; ctx.strokeRect(x - 0.5, y - 0.5, cw - 1, ch - 1); }
    }
    const hov = game.minimapTarget(game.input.mouse); // 이미 간 방: 클릭하면 이동
    if (hov) { const x = ox + hov.gx * cw + 1, y = oy + hov.gy * ch + 1; ctx.strokeStyle = '#ffd84a'; ctx.strokeRect(x - 1.5, y - 1.5, cw + 1, ch + 1);
      hudText(ctx, '클릭: 이동', ox + GRID_W * cw / 2, oy + GRID_H * ch + 4, '#ffd84a', 'center', 7); }
  }
  overlay(ctx, game) {
    const o = game.overlay;
    ctx.fillStyle = o.type === 'story' || o.type === 'treasure_pick' ? '#06050a' : o.type === 'codex' || o.type === 'armory' || o.type === 'treasures' || o.type === 'joblevel' || o.type === 'archive' || o.type === 'guild' || o.type === 'hunt' || o.type === 'trade' || o.type === 'gamble' ? 'rgba(8,6,14,0.94)' : 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (o.type === 'pause') {
      hudText(ctx, '일시정지', VIEW_W / 2, 90, '#fff', 'center', 16);
      hudText(ctx, 'WASD 이동 · 마우스 조준/공격 · Space 대시 · F/우클릭 스킬', VIEW_W / 2, 120, '#ccc', 'center', 9);
      const hasTr = (game.save.treasures || []).length > 0 || !!game.player.treasure; // 보구를 얻기 전에는 R 안내를 숨김
      hudText(ctx, `E 상호작용 · Q/휠 무기 교체 · ${hasTr ? 'R 보구 · ' : ''}M 소리 켜기/끄기`, VIEW_W / 2, 134, '#ccc', 'center', 9);
      hudText(ctx, '상태이상: 화상(불) · 빙결(얼음) · 중독(자연) · 전격(번개) · 실명(빛) · 저주(어둠)', VIEW_W / 2, 148, '#c8c0d8', 'center', 8);
      hudText(ctx, '원소 반응: 화상+빙결=열충격 · 화상+중독=독 연소 · 빙결+전격=감전 · 화상+전격=과부하 · 중독+전격=마비', VIEW_W / 2, 160, '#9ad8ff', 'center', 8);
      hudText(ctx, '실명+저주=일식 · 저주+중독=역병 · 화상+저주=지옥불 · 실명+전격=심판', VIEW_W / 2, 172, '#9ad8ff', 'center', 8);
      hudText(ctx, game.mode === 'dungeon' ? 'Esc 이어하기   ·   L 포기하고 로비로' : 'Esc 이어하기   ·   P 프롤로그 다시 보기   ·   L 로그아웃', VIEW_W / 2, 190, '#999', 'center', 9);
    } else if (o.type === 'codex' || o.type === 'armory') {
      const sv = game.save, disc = new Set(sv.discovered), armory = o.type === 'armory';
      const m = game.input.mouse;
      const title = armory ? `무기고  ·  보유 ${CUR.name} ${sv.bank}  ·  시작 보조 무기: ${sv.loadout ? game.data.weapons.get(sv.loadout).name : '없음'}`
        : `무기 도감  (${DATA_WEAPONS.filter((d) => disc.has(d.id)).length}/${DATA_WEAPONS.length})`;
      hudText(ctx, title, VIEW_W / 2, 7, '#ffd84a', 'center', 11);
      let hover = null;
      const tab = o.tab || 0;
      WEAPON_TABS.forEach((T, i) => {
        const r = tabRect(i), n = DATA_WEAPONS.filter(T.test), found = n.filter((d) => disc.has(d.id)).length;
        ctx.fillStyle = i === tab ? 'rgba(255,216,74,0.25)' : 'rgba(255,255,255,0.07)'; ctx.fillRect(r.x, r.y, r.w, r.h);
        hudText(ctx, `${i + 1} ${T.name} ${found}/${n.length}`, r.x + r.w / 2, r.y + 3, i === tab ? '#ffd84a' : '#aaa', 'center', 8);
      });
      const page = Math.min(o.page || 0, gridPages(tab) - 1), pages = gridPages(tab);
      for (const c of weaponGrid(tab, page)) {
        const on = m.x >= c.x && m.x < c.x + c.w && m.y >= c.y && m.y < c.y + c.h;
        if (on) hover = c;
        const owned = sv.armory.includes(c.d.id), eq = sv.loadout === c.d.id;
        ctx.fillStyle = eq ? 'rgba(255,216,74,0.22)' : on && armory ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        if (!disc.has(c.d.id)) { hudText(ctx, '???', c.x + 8, c.y + 8, '#555', 'left', 9); continue; }
        drawWeaponCentered(ctx, c.d, c.x + 13, c.y + c.h / 2);
        hudText(ctx, c.d.name, c.x + 27, c.y + 2, RARITY_COLOR[c.d.rarity], 'left', 8);
        if (armory) {
          const st = eq ? ['장착됨', '#ffd84a'] : owned ? ['보유', '#9fe89f'] : [`해금 ${ARMORY_PRICE[c.d.rarity]} ${CUR.name}`, sv.bank >= ARMORY_PRICE[c.d.rarity] ? '#fff' : '#888'];
          hudText(ctx, st[0], c.x + 27, c.y + 13, st[1], 'left', 7);
        } else hudText(ctx, weaponTraits(c.d, 2), c.x + 27, c.y + 13, '#c8b890', 'left', 7);
      }
      const info = o.msg && o.msg.t > 0 ? o.msg.text : hover && disc.has(hover.d.id) ? `${hover.d.name} — ${RARITY_NAME[hover.d.rarity]} · ${weaponStatLine(hover.d)} · ${weaponTraits(hover.d)}`
        : armory ? '던전에서 발견한 무기를 해금해 시작 보조 무기로 장착할 수 있습니다' : '';
      hudText(ctx, info, VIEW_W / 2, VIEW_H - 26, o.msg && o.msg.t > 0 ? o.msg.color : '#ccc', 'center', 9);
      hudText(ctx, `1~4 / 클릭: 탭 전환   ·   ${pages > 1 ? `A·D / 휠: 페이지 ${page + 1}/${pages}   ·   ` : ''}E / Esc: 닫기`, VIEW_W / 2, VIEW_H - 12, pages > 1 ? '#bbb' : '#888', 'center', 8);
    } else if (o.type === 'archive') { // 이야기 기록
      const m = game.input.mouse; hudText(ctx, '이야기 기록 — 지금까지 본 이야기를 다시 봅니다', VIEW_W / 2, 12, '#e0d0b0', 'center', 11);
      STORY_ARCHIVE.forEach((S, i) => { const r = HUD.guildRow(i), ok = S.unlocked(game.save), on = m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;
        ctx.fillStyle = on && ok ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(r.x, r.y, r.w, r.h); if (ok) { ctx.strokeStyle = '#7a6040'; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1); }
        hudText(ctx, `${i + 1}  ${ok ? S.name : '???'}`, r.x + 10, r.y + 8, ok ? '#fff' : '#555', 'left', 10); hudText(ctx, ok ? '다시 보기' : '아직 보지 못함', r.x + r.w - 10, r.y + 8, ok ? '#e0d0b0' : '#555', 'right', 9); });
      if (o.msg && o.msg.t > 0) hudText(ctx, o.msg.text, VIEW_W / 2, VIEW_H - 28, o.msg.color, 'center', 10);
      hudText(ctx, '숫자 키 / 클릭: 다시 보기   ·   E / Esc: 닫기', VIEW_W / 2, VIEW_H - 12, '#888', 'center', 8);
    } else if (o.type === 'guild' || o.type === 'hunt' || o.type === 'trade' || o.type === 'gamble') { // 탐험가 길드 창들
      const sv = game.save, G = game.guild(), m = game.input.mouse, on = (r) => m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;
      const box = (r, hl, border) => { ctx.fillStyle = hl ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(r.x, r.y, r.w, r.h); if (border) { ctx.strokeStyle = border; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1); } };
      const bar = (x, y, w, k, col) => { ctx.fillStyle = '#2a2638'; ctx.fillRect(x, y, w, 4); ctx.fillStyle = col; ctx.fillRect(x, y, Math.round(w * Math.min(1, k)), 4); };
      const head = { guild: '탐험가 길드 접수처', hunt: '토벌 게시판', trade: '거래상 — 탐험 보급품', gamble: '결정석 도박' }[o.type];
      hudText(ctx, `${head}  ·  보유 ${CUR.name} ${sv.bank}`, VIEW_W / 2, 6, '#ffd84a', 'center', 11);
      if (o.type === 'guild') {
        ['일일 퀘스트', '주간 퀘스트', '칭호'].forEach((t, i) => { const r = HUD.guildTab(i); box(r, o.tab === i, o.tab === i ? '#ffd84a' : null); hudText(ctx, `${i + 1} ${t}`, r.x + r.w / 2, r.y + 4, o.tab === i ? '#ffd84a' : '#aaa', 'center', 9); });
        if (o.tab < 2) {
          (o.tab ? G.weekly : G.daily).forEach((q, i) => { const r = HUD.guildRow(i), ok = q.prog >= q.n; box(r, on(r), q.claimed ? '#555' : ok ? '#ffd84a' : null);
            hudText(ctx, q.name, r.x + 8, r.y + 4, q.claimed ? '#777' : '#fff', 'left', 9); bar(r.x + 8, r.y + 18, 220, q.prog / q.n, ok ? '#ffd84a' : '#7ad0ff');
            hudText(ctx, `${q.prog.toLocaleString()} / ${q.n.toLocaleString()}`, r.x + 236, r.y + 14, '#aaa', 'left', 8);
            hudText(ctx, q.claimed ? '받음' : ok ? `받기  ${CUR.name} +${q.reward}` : `보상 ${CUR.name} ${q.reward}`, r.x + r.w - 8, r.y + 9, q.claimed ? '#666' : ok ? '#ffd84a' : CUR.color, 'right', 9); });
          hudText(ctx, o.tab ? '주간 퀘스트는 매주 월요일에 바뀝니다' : '일일 퀘스트는 매일 바뀝니다', VIEW_W / 2, 152, '#777', 'center', 8);
        } else GUILD_TITLES.forEach((T, i) => { const r = HUD.titleCell(i), got = game.titleUnlocked(T), eq = sv.title === T.id; box(r, on(r) && got, eq ? '#ffd84a' : got ? '#7a6a40' : null);
          hudText(ctx, (eq ? '★ ' : '') + T.name, r.x + 6, r.y + 3, got ? (eq ? '#ffd84a' : '#fff') : '#666', 'left', 9); hudText(ctx, T.desc, r.x + 6, r.y + 15, got ? '#aaa' : '#555', 'left', 7); });
      } else if (o.type === 'hunt') {
        hudText(ctx, `오늘의 의뢰 (클릭: 수락, 동시에 ${GUILD_HUNT.maxActive}개까지)`, 40, 36, '#ffb08a', 'left', 8);
        G.offers.forEach((h, i) => { const r = HUD.guildRow(i), taken = G.active.some((a) => a.id === h.id && a.day === G.day); box(r, on(r) && !taken, h.kind === 'boss' ? '#a04040' : '#4a6a3a');
          hudText(ctx, (h.kind === 'boss' ? '[보스] ' : '[처치] ') + h.name, r.x + 8, r.y + 4, taken ? '#777' : '#fff', 'left', 9); hudText(ctx, h.where, r.x + 8, r.y + 15, '#888', 'left', 7);
          hudText(ctx, taken ? '수락함' : `보상 ${CUR.name} ${h.reward}`, r.x + r.w - 8, r.y + 9, taken ? '#777' : CUR.color, 'right', 9); });
        hudText(ctx, '수락한 의뢰 (완료하면 클릭해서 보상)', 40, HUD.guildRow(5).y - 12, '#ffb08a', 'left', 8);
        if (!G.active.length) hudText(ctx, '수락한 의뢰가 없습니다', VIEW_W / 2, HUD.guildRow(5).y + 6, '#666', 'center', 9);
        G.active.forEach((h, i) => { const r = HUD.guildRow(5 + i); box(r, on(r), h.done ? '#ffd84a' : null); hudText(ctx, h.name, r.x + 8, r.y + 4, '#fff', 'left', 9);
          bar(r.x + 8, r.y + 18, 220, (h.prog || 0) / h.n, h.done ? '#ffd84a' : '#ff9a6a'); hudText(ctx, h.done ? `받기  ${CUR.name} +${h.reward}` : `${h.prog || 0} / ${h.n}`, r.x + r.w - 8, r.y + 9, h.done ? '#ffd84a' : '#aaa', 'right', 9); });
      } else if (o.type === 'trade') {
        hudText(ctx, '"오늘 들어온 물건이야. 하나씩만 팔지." — 사면 다음 탐험을 시작할 때 적용', VIEW_W / 2, 36, '#b0f0b0', 'center', 8);
        G.stock.forEach((id, i) => { const S = GUILD_SUPPLIES.find((x) => x.id === id), r = HUD.guildRow(i), got = G.bought.includes(id); box(r, on(r) && !got, got ? '#555' : '#4a7a4a');
          hudText(ctx, S.name, r.x + 8, r.y + 4, got ? '#777' : '#fff', 'left', 9); hudText(ctx, S.desc, r.x + 8, r.y + 15, got ? '#555' : '#aaa', 'left', 7);
          hudText(ctx, got ? '구매함' : `${S.price} ${CUR.name}`, r.x + r.w - 8, r.y + 9, got ? '#666' : sv.bank >= S.price ? CUR.color : '#866', 'right', 9); });
        const pend = (sv.supplies || []).map((id) => GUILD_SUPPLIES.find((x) => x.id === id).name);
        hudText(ctx, pend.length ? `다음 탐험에 적용: ${pend.join(', ')}` : '준비된 보급품 없음', VIEW_W / 2, 150, pend.length ? '#9fe89f' : '#666', 'center', 8);
      } else if (o.type === 'gamble') {
        hudText(ctx, '판돈을 고르세요 — 꽝 60% · 2배 30% · 3배 8% · 5배 2%', VIEW_W / 2, 36, '#aaa', 'center', 8);
        const cx = VIEW_W / 2, cy = 100;
        for (let i = 0; i < 3; i++) { const spin = o.roll > 0, a = (spin ? game.time * 18 : 0) + i * 2.1, x = cx + (i - 1) * 46, y = cy + (spin ? Math.sin(a) * 6 : 0); // 결정석 세 개
          ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(x + 11, y); ctx.lineTo(x, y + 16); ctx.lineTo(x - 11, y); ctx.closePath(); ctx.fill();
          const lit = !spin && o.result && o.result.mult > 1; ctx.fillStyle = lit ? '#ffd84a' : !spin && o.result ? '#5a6a7a' : CUR.color; ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x + 9, y); ctx.lineTo(x, y + 14); ctx.lineTo(x - 9, y); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x - 3, y - 8, 2, 7); }
        GUILD_GAMBLE.bets.forEach((b, i) => { const r = HUD.betRect(i); box(r, on(r), sv.bank >= b ? CUR.color : '#555'); hudText(ctx, `${i + 1}  ${b} ${CUR.name}`, r.x + r.w / 2, r.y + 6, sv.bank >= b ? '#fff' : '#666', 'center', 10); });
      }
      if (o.msg && o.msg.t > 0) hudText(ctx, o.msg.text, VIEW_W / 2, VIEW_H - 28, o.msg.color, 'center', 10);
      hudText(ctx, 'E / Esc: 닫기', VIEW_W / 2, VIEW_H - 12, '#888', 'center', 8);
    } else if (o.type === 'joblevel') { // 직업 레벨 창
      const sv = game.save, J = BALANCE.jobLevel, m = game.input.mouse;
      hudText(ctx, `직업 레벨  ·  보유 ${CUR.name} ${sv.bank}`, VIEW_W / 2, 7, '#7ad0ff', 'center', 11);
      hudText(ctx, `레벨마다 영구 강화: 최대 체력 +${J.hp} · 공격력 +${J.atk * 100}% · 최대 에너지 +${J.energy}  (최대 Lv.${J.max}, 직업마다 따로)`, VIEW_W / 2, 22, '#aaa', 'center', 8);
      DATA_HEROES.forEach((h, i) => {
        const r = HUD.jobRowRect(i), unlocked = sv.unlocked.includes(h.id), lv = game.jobLevel(h.id), cost = game.jobLevelCost(h.id);
        const on = m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h, sel = sv.selected === h.id;
        ctx.fillStyle = sel ? 'rgba(122,208,255,0.16)' : on && unlocked ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.globalAlpha = unlocked ? 1 : 0.35;
        drawHero(ctx, h, r.x + 24, r.y + 12, 1, 0, false);
        hudText(ctx, `${i + 1}`, r.x + 4, r.y + 3, '#777', 'left', 7);
        hudText(ctx, h.name + (sel ? '  (선택 중)' : ''), r.x + 40, r.y + 3, sel ? '#7ad0ff' : '#fff', 'left', 9);
        for (let k = 0; k < J.max; k++) { ctx.fillStyle = k < lv ? '#7ad0ff' : '#2e2a3e'; ctx.fillRect(r.x + 40 + k * 9, r.y + 16, 7, 5); } // 레벨 칸
        hudText(ctx, `Lv.${lv}`, r.x + 40 + J.max * 9 + 4, r.y + 14, '#7ad0ff', 'left', 8);
        hudText(ctx, lv ? `체력 +${J.hp * lv} · 공격력 +${Math.round(J.atk * lv * 1000) / 10}% · 에너지 +${J.energy * lv}` : '강화 없음', r.x + 200, r.y + 9, '#c8c0d8', 'left', 8);
        const st = !unlocked ? ['미해금', '#888'] : cost === null ? ['최고 레벨', '#ffd84a'] : [`레벨업 ${cost} ${CUR.name}`, sv.bank >= cost ? '#fff' : '#886'];
        hudText(ctx, st[0], r.x + r.w - 6, r.y + 9, st[1], 'right', 8);
        ctx.globalAlpha = 1;
      });
      if (o.msg && o.msg.t > 0) hudText(ctx, o.msg.text, VIEW_W / 2, VIEW_H - 26, o.msg.color, 'center', 9);
      hudText(ctx, '숫자 키 / 클릭: 레벨업   ·   E / Esc: 닫기', VIEW_W / 2, VIEW_H - 12, '#888', 'center', 8);
    } else if (o.type === 'buff') {
      hudText(ctx, '보스 처치! 축복을 하나 고르세요', VIEW_W / 2, 50, '#ffd84a', 'center', 14);
      o.options.forEach((b, i) => {
        const r = HUD.buffRect(i), hover = game.input.mouse.x >= r.x && game.input.mouse.x <= r.x + r.w && game.input.mouse.y >= r.y && game.input.mouse.y <= r.y + r.h;
        ctx.fillStyle = hover ? 'rgba(255,220,120,0.25)' : 'rgba(255,255,255,0.08)'; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = hover ? '#ffd84a' : '#666'; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
        hudText(ctx, `${i + 1}`, r.x + 8, r.y + 6, '#888', 'left', 9);
        hudText(ctx, b.name, r.x + r.w / 2, r.y + 26, '#fff', 'center', 12);
        hudText(ctx, b.desc, r.x + r.w / 2, r.y + 50, '#ccc', 'center', 9);
      });
      hudText(ctx, '클릭 또는 1 / 2 / 3', VIEW_W / 2, 200, '#888', 'center', 9);
    } else if (o.type === 'variant') {
      hudText(ctx, `${game.player.hero.name} — ${o.title}`, VIEW_W / 2, 28, '#ffd84a', 'center', 14);
      hudText(ctx, o.branch ? '진화할 갈래를 고르세요. 고른 갈래로 두 번 진화하며 스킬이 바뀝니다.' : '이번 탐험의 갈래를 고르세요. 전직의 방에서 두 번 진화하며 스킬이 바뀝니다.', VIEW_W / 2, 48, '#bbb', 'center', 8);
      o.lines.forEach((L, i) => { const r = HUD.variantRect(i, o.lines.length), m = game.input.mouse, on = m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;
        ctx.fillStyle = on ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeStyle = L.color || '#ffd84a'; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
        hudText(ctx, `${i + 1}  ${L.name}`, r.x + 6, r.y + 5, L.color || '#ffd84a', 'left', 11);
        hudText(ctx, L.desc, r.x + 6, r.y + 21, '#ccc', 'left', 7);
        hudText(ctx, L.skills.map((s) => s.name).join(' → '), r.x + 6, r.y + 34, '#ffe9a0', 'left', 7);
        hudText(ctx, L.ranks.join(' → '), r.x + 6, r.y + 46, '#8a8a9a', 'left', 7); });
      hudText(ctx, o.branch ? '숫자 키 / 클릭: 선택   ·   E / Esc: 닫기' : '숫자 키 / 클릭: 선택', VIEW_W / 2, VIEW_H - 16, '#888', 'center', 8);
    } else if (o.type === 'evolve') {
      const p = game.player, L = o.npc.branch || p.line, n = p.rank + 1, hy = o.npc.hybrid, sk = hy ? hy.H.skill : L.skills[n];
      hudText(ctx, `${L.ranks[p.rank]}  →  ${hy ? game.hybridTitle(o.npc) : L.ranks[n]}`, VIEW_W / 2, 56, hy ? (hy.el.color || '#ffd84a') : '#ffd84a', 'center', 15);
      if (hy) hudText(ctx, `혼합 전직 — ${hy.el.name}의 마도사 상위자가 나타났습니다 · 근접 공격에 ${Math.round(hy.H.passiveChance * 100)}% 확률로 속성 상태이상`, VIEW_W / 2, 70, '#c8b8e0', 'center', 8);
      hudText(ctx, `새 스킬: ${sk.name}`, VIEW_W / 2, 84, '#ffe9a0', 'center', 11);
      hudText(ctx, sk.desc, VIEW_W / 2, 100, '#ccc', 'center', 9);
      hudText(ctx, `최대 체력 +${EVOLUTION.hp[n - 1]} · 최대 에너지 +${EVOLUTION.energy[n - 1]}`, VIEW_W / 2, 114, '#9fe89f', 'center', 8);
      hudText(ctx, `1  시련 — ${hy ? hy.el.name + '의 마도사 ' : ''}상위자와 대결 (이기면 무료로 진화)`, VIEW_W / 2, 142, '#fff', 'center', 10);
      hudText(ctx, `2  대가 — ${game.evolvePrice()}골드를 내고 바로 진화 (보유 ${game.gold})`, VIEW_W / 2, 160, game.gold >= game.evolvePrice() ? '#fff' : '#888', 'center', 10);
      if (o.msg) hudText(ctx, o.msg, VIEW_W / 2, 180, '#ff9a9a', 'center', 9);
      hudText(ctx, 'E / Esc: 닫기', VIEW_W / 2, VIEW_H - 16, '#888', 'center', 8);
    } else if (o.type === 'resume') {
      const r = game.save.run, hero = r && game.data.heroes.get(r.hero), W = r && worldDef(r.worldIdx);
      hudText(ctx, '진행 중인 탐험이 있습니다', VIEW_W / 2, 70, '#7ad0ff', 'center', 16);
      if (r && W) {
        hudText(ctx, `${stageLabel(r.worldIdx, r.levelIdx)} ${W.name}   ·   ${hero ? hero.name : '?'}`, VIEW_W / 2, 100, '#fff', 'center', 11);
        hudText(ctx, `체력 ${Math.round(r.p.hp)}/${r.p.maxHp}   ·   무기 ${r.p.weapons.map((id) => (game.data.weapons.get(id) || { name: '?' }).name).join(', ')}   ·   골드 ${r.gold}`, VIEW_W / 2, 118, '#ccc', 'center', 9);
        hudText(ctx, '그 스테이지의 시작 지점부터 다시 시작합니다', VIEW_W / 2, 134, '#888', 'center', 8);
      }
      hudText(ctx, 'Enter: 이어하기', VIEW_W / 2, 164, '#ffd84a', 'center', 11);
      hudText(ctx, 'N: 새로 시작 (저장된 탐험은 사라집니다)   ·   Esc: 로비에 머무르기', VIEW_W / 2, 182, '#aaa', 'center', 9);
    } else if (o.type === 'story') {
      if (o.sanctum) { // 형체 없는 빛 (전설의 존재의 외형은 미정)
        const k = Math.min(1, (o.i + o.t) / 3), cx = VIEW_W / 2, cy = 92, R = 30 + 50 * k;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        g.addColorStop(0, `rgba(255,250,230,${0.5 + 0.4 * k})`); g.addColorStop(0.4, `rgba(255,233,160,${0.25 + 0.3 * k})`); g.addColorStop(1, 'rgba(255,233,160,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
      }
      const line = o.lines[Math.min(o.i, o.lines.length - 1)] || '', a = Math.min(1, o.t / 0.6), y0 = o.sanctum ? 180 : 130;
      ctx.globalAlpha = a;
      line.split('\n').forEach((s, j, arr) => hudText(ctx, s, VIEW_W / 2, y0 + (j - (arr.length - 1) / 2) * 16, s.startsWith('「') ? '#ffe9a0' : '#e8e0f0', 'center', s.startsWith('「') ? 14 : 11));
      ctx.globalAlpha = 1;
      hudText(ctx, `${Math.min(o.i + 1, o.lines.length)} / ${o.lines.length}    클릭 · Enter: 다음    Esc: 건너뛰기`, VIEW_W / 2, VIEW_H - 16, '#6a6080', 'center', 8);
    } else if (o.type === 'treasure_pick' || o.type === 'treasures') {
      const pick = o.type === 'treasure_pick', sv = game.save;
      const list = pick ? DATA_TREASURES.filter((t) => !t.questOnly) : DATA_TREASURES.filter((t) => sv.treasures.includes(t.id));
      hudText(ctx, pick ? '보구 선택' : '보구 보관대', VIEW_W / 2, 30, '#ffe9a0', 'center', 16);
      hudText(ctx, pick ? '하나를 골라 영원히 간직합니다. 사망해도 사라지지 않습니다.' : '보유한 보구 중 하나를 골라 탐험에 들고 갑니다 (다시 누르면 해제)', VIEW_W / 2, 54, '#bbb', 'center', 9);
      const had = pick && sv.treasures.length > 0 && !o.picked;
      if (had) hudText(ctx, '이미 첫 보구를 받았습니다. 추가 보구를 얻는 방법은 아직 정해지지 않았습니다.', VIEW_W / 2, 130, '#aaa', 'center', 9);
      else if (!list.length) hudText(ctx, pick ? '제시될 보구가 아직 정해지지 않았습니다 (기획 미정)' : '아직 보유한 보구가 없습니다', VIEW_W / 2, 130, '#888', 'center', 10);
      if (!had) list.forEach((t, i) => {
        const r = HUD.treasureRect(i, list.length), eq = !pick && sv.treasureEquipped === t.id;
        ctx.fillStyle = eq ? 'rgba(255,233,160,0.2)' : 'rgba(255,255,255,0.06)'; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = '#c8a050'; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
        ctx.fillStyle = 'rgba(255,216,74,0.08)'; ctx.beginPath(); ctx.arc(r.x + r.w / 2, r.y + 24, 18 + Math.sin(game.time * 3 + i) * 1.5, 0, TAU); ctx.fill(); // 아이콘 뒤 빛
        drawTreasureIcon(ctx, t, r.x + r.w / 2, r.y + 24, 2);
        hudText(ctx, t.name, r.x + r.w / 2, r.y + 44, '#ffe9a0', 'center', 11);
        if (t.origin) hudText(ctx, t.origin, r.x + r.w / 2, r.y + 59, '#a898c0', 'center', 8);
        if (t.desc) hudWrap(ctx, t.desc, r.x + r.w / 2, r.y + 73, r.w - 12, '#ddd', 8, 11);
        if (t.cooldown) hudText(ctx, `R키 · 쿨타임 ${t.cooldown}초`, r.x + r.w / 2, r.y + r.h - 28, '#c8b890', 'center', 8);
        if (eq) hudText(ctx, '장착됨', r.x + r.w / 2, r.y + r.h - 14, '#ffd84a', 'center', 8);
      });
      hudText(ctx, pick ? (list.length && !had ? '클릭: 선택' : 'Enter: 계속') : '클릭: 장착/해제   ·   E / Esc: 닫기', VIEW_W / 2, VIEW_H - 20, '#999', 'center', 9);
    } else if (o.type === 'result') {
      hudText(ctx, o.victory ? '던전 정복!' : '사망했습니다', VIEW_W / 2, 70, o.victory ? '#ffd84a' : '#ff7070', 'center', 18);
      if (o.after) hudText(ctx, o.after, VIEW_W / 2, 92, '#ffe9a0', 'center', 10);
      else if (game.W.deep) hudText(ctx, `심층 ${game.W.depth}번째 필드까지 내려갔습니다   (최고 기록: 심층 ${game.save.bestDeep || 0})`, VIEW_W / 2, 92, '#9ad8ff', 'center', 10);
      hudText(ctx, `도달: ${stageLabel(game.worldIdx, game.levelIdx)}   ·   처치 ${game.kills}   ·   스테이지 ${o.stages}개 · 보스 ${o.bosses}마리`, VIEW_W / 2, 110, '#ddd', 'center', 10);
      hudText(ctx, `${CUR.name} +${o.reward}   (보유 ${game.save.bank} → ${game.save.bank + o.reward})`, VIEW_W / 2, 128, CUR.color, 'center', 10);
      hudText(ctx, '던전 골드는 로비로 가져가지 않습니다', VIEW_W / 2, 142, '#888', 'center', 8);
      hudText(ctx, 'Enter: 로비로', VIEW_W / 2, 160, '#fff', 'center', 10);
    }
  }
  // 보구 획득 알림: 오른쪽 아래에서 아이콘과 함께 미끄러져 들어와 6초 동안 표시
  static guildTab(i) { return { x: 60 + i * 134, y: 22, w: 126, h: 16 }; }
  static guildRow(i) { return { x: 40, y: 46 + i * 28, w: VIEW_W - 80, h: 25 }; }
  static titleCell(i) { return { x: 40 + (i % 2) * 218, y: 46 + Math.floor(i / 2) * 30, w: 212, h: 27 }; }
  static betRect(i) { return { x: VIEW_W / 2 - 150 + i * 104, y: 150, w: 92, h: 22 }; }
  static jobRowRect(i) { return { x: 36, y: 36 + i * 27, w: VIEW_W - 72, h: 24 }; }
  static variantRect(i, n) { const cols = Math.min(3, n), w = 156, h = 58, gap = 8, rows = Math.ceil(n / cols), total = w * cols + gap * (cols - 1); return { x: (VIEW_W - total) / 2 + (i % cols) * (w + gap), y: 66 + Math.floor(i / cols) * (h + gap) + (rows === 1 ? 30 : 0), w, h }; }
  // 컷신: 위아래 검은 띠 + 아래 띠에 한 자씩 나오는 대사
  static cutscene(ctx, game) {
    const c = game.cutscene, ease = Math.min(1, c.t / 0.5), H = Math.round(40 * ease);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VIEW_W, H); ctx.fillRect(0, VIEW_H - H, VIEW_W, H);
    if (ease < 1) return;
    const line = c.lines[Math.min(c.i, c.lines.length - 1)] || '', n = Math.min(line.length, Math.floor(c.lt * 28)), txt = line.slice(0, n);
    hudText(ctx, txt, VIEW_W / 2, VIEW_H - 28, '#f0e8d0', 'center', 11);
    if (n >= line.length && Math.floor(c.t * 2.5) % 2 === 0) hudText(ctx, '▶', VIEW_W - 22, VIEW_H - 16, '#ffe9a0', 'center', 9);
    hudText(ctx, `${c.i + 1} / ${c.lines.length}`, 14, 14, '#666', 'left', 8);
    hudText(ctx, 'Enter·클릭: 다음   Esc: 건너뛰기', VIEW_W - 10, 14, '#666', 'right', 8);
  }
  // 최종 진화 스킬·보구 사용 컷인: 화면을 가로지르는 띠 + 아이콘/캐릭터 + 이름 (약 1초)
  static cutin(ctx, game) {
    const o = game.cutin, t = (performance.now() - o.start) / 1000, D = o.kind === 'treasure' ? 1.1 : 0.85;
    if (t > D) { game.cutin = null; return; }
    const tr = o.kind === 'treasure', inK = Math.min(1, t / 0.18), outK = Math.min(1, (D - t) / 0.25), k = Math.min(inK, outK), ease = 1 - Math.pow(1 - inK, 3);
    const cy = tr ? VIEW_H / 2 - 6 : 70, h = tr ? 64 : 40, slide = (1 - ease) * -VIEW_W * 0.6 + t * 18;
    ctx.save();
    if (tr) { ctx.fillStyle = `rgba(0,0,0,${0.45 * k})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    ctx.globalAlpha = k;
    const g = ctx.createLinearGradient(0, 0, VIEW_W, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.25, o.color); g.addColorStop(0.75, o.color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = k * 0.35; ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(slide, cy - h / 2 + 8); ctx.lineTo(VIEW_W + slide, cy - h / 2 - 8); ctx.lineTo(VIEW_W + slide, cy + h / 2 - 8); ctx.lineTo(slide, cy + h / 2 + 8); ctx.fill();
    ctx.globalAlpha = k; ctx.fillStyle = o.color; ctx.fillRect(0, cy - h / 2 - 1, VIEW_W, 1); ctx.fillRect(0, cy + h / 2, VIEW_W, 1);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#ffffff'; // 빠르게 지나가는 빛줄기
    for (let i = 0; i < 7; i++) { const yy = cy - h / 2 + 4 + ((i * 37) % (h - 8)), xx = ((t * (500 + i * 90) + i * 140) % (VIEW_W + 120)) - 60; ctx.globalAlpha = k * 0.5; ctx.fillRect(xx, yy, 40 + i * 6, 1); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = k;
    const ix = VIEW_W / 2 - (tr ? 120 : 96) + (1 - ease) * -60;
    if (tr && o.T) drawTreasureIcon(ctx, o.T, ix, cy, 2);
    else if (o.hero) drawSprite(ctx, heroSprite(o.hero, 0), ix, cy + 20, { scale: 2 });
    hudText(ctx, o.name, VIEW_W / 2 + 14 - (1 - ease) * 40, cy - (tr ? 16 : 11), '#ffffff', 'center', tr ? 22 : 16);
    if (o.sub) hudText(ctx, o.sub, VIEW_W / 2 + 14, cy + (tr ? 12 : 9), o.color, 'center', tr ? 10 : 8);
    ctx.restore();
  }
  static treasureToast(ctx, game) {
    const o = game.treasureToast, t = (performance.now() - o.start) / 1000, D = 6;
    if (t > D) { game.treasureToast = null; return; }
    const slide = Math.min(1, t / 0.35), out = Math.max(0, (t - (D - 0.5)) / 0.5), ease = 1 - Math.pow(1 - slide, 3);
    const w = 190, h = 44, x = Math.round(VIEW_W - 8 - w + (1 - ease + out) * (w + 12)), y = VIEW_H - h - 70;
    ctx.globalAlpha = 1 - out;
    ctx.fillStyle = 'rgba(12,10,20,0.92)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#ffd84a'; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); ctx.strokeStyle = 'rgba(255,216,74,0.35)'; ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    const glow = 0.15 + 0.1 * Math.sin(t * 5);
    ctx.fillStyle = `rgba(255,216,74,${glow})`; ctx.beginPath(); ctx.arc(x + 22, y + h / 2, 17, 0, TAU); ctx.fill();
    drawTreasureIcon(ctx, o.T, x + 22, y + h / 2, 2);
    hudText(ctx, '보구 획득', x + 44, y + 9, '#c8b890', 'left', 8);
    hudText(ctx, o.T.name, x + 44, y + 21, '#ffe9a0', 'left', 12);
    if (t < 0.6) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,240,180,${0.5 * (1 - t / 0.6)})`; ctx.fillRect(x, y, w, h); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = 1;
  }
  static treasureRect(i, n) { const w = 140, h = 150, gap = 10, cols = Math.min(n, 3), total = w * cols + gap * (cols - 1); return { x: (VIEW_W - total) / 2 + (i % 3) * (w + gap), y: 74 + Math.floor(i / 3) * (h + gap), w, h }; }
  static buffRect(i) { const w = 140, h = 80, gap = 12, total = w * 3 + gap * 2; return { x: (VIEW_W - total) / 2 + i * (w + gap), y: 90, w, h }; }
}
