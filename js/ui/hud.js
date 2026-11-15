'use strict';
// ════════════════════════════════════════════
// HUD / 오버레이
// ════════════════════════════════════════════
function hudText(ctx, str, x, y, color = '#fff', align = 'left', size = 10) {
  ctx.font = `bold ${size}px 'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'top';
  ctx.fillStyle = '#000'; ctx.fillText(str, x + 1, y + 1);
  ctx.fillStyle = color; ctx.fillText(str, x, y);
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
      hudText(ctx, `로비   ·   보유 골드 ${game.save.bank}`, VIEW_W / 2, 6, '#ffd84a', 'center');
      hudText(ctx, 'F/우클릭 스킬 · E 상호작용 · Esc 조작법', VIEW_W / 2, VIEW_H - 14, '#aaa', 'center', 8);
    } else {
      const W = DATA_WORLDS[game.worldIdx];
      hudText(ctx, `${game.worldIdx + 1}-${game.levelIdx + 1} ${W.name}   골드 ${game.gold}   처치 ${game.kills}`, VIEW_W / 2, 6, '#fff', 'center');
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
    if (w) {
      ctx.strokeStyle = RARITY_COLOR[w.def.rarity]; ctx.strokeRect(VIEW_W - 168.5, VIEW_H - 34.5, 34, 26);
      drawWeaponCentered(ctx, w.def, VIEW_W - 151, VIEW_H - 21);
      hudText(ctx, w.def.name, VIEW_W - 128, VIEW_H - 35, RARITY_COLOR[w.def.rarity], 'left', 10);
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
    hudText(ctx, p.hero.skillName, 8, by + 14, p.skillCooldown > 0 ? '#888' : '#ffd84a', 'left', 9);
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
  minimap(ctx, game) {
    const map = game.map, cw = 11, ch = 9;
    const ox = VIEW_W - GRID_W * cw - 6, oy = 6;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(ox - 3, oy - 3, GRID_W * cw + 6, GRID_H * ch + 6);
    const known = (r) => r.visited || map.edges.some(([a, b]) => (a === r && b.visited) || (b === r && a.visited));
    ctx.fillStyle = '#777';
    for (const [a, b] of map.edges) {
      if (!(a.visited || b.visited)) continue;
      const x0 = ox + a.gx * cw + cw / 2, y0 = oy + a.gy * ch + ch / 2, x1 = ox + b.gx * cw + cw / 2, y1 = oy + b.gy * ch + ch / 2;
      ctx.fillRect(Math.min(x0, x1) - 1, Math.min(y0, y1) - 1, Math.abs(x1 - x0) + 2, Math.abs(y1 - y0) + 2);
    }
    const colors = { start: '#5aa0ff', combat: '#b0b0b0', treasure: '#ffd84a', boss: '#ff5a7a', shop: '#5ad08a', exit: '#7ae0ff' };
    const cur = map.roomAtPoint(game.player.x, game.player.y);
    for (const r of map.rooms) {
      if (!known(r)) continue;
      const x = ox + r.gx * cw + 1, y = oy + r.gy * ch + 1;
      ctx.fillStyle = r.visited ? colors[r.type] : (r.type === 'combat' ? '#444' : colors[r.type] + '88');
      ctx.fillRect(x, y, cw - 2, ch - 2);
      if (r === cur) { ctx.strokeStyle = '#fff'; ctx.strokeRect(x - 0.5, y - 0.5, cw - 1, ch - 1); }
    }
  }
  overlay(ctx, game) {
    const o = game.overlay;
    ctx.fillStyle = o.type === 'codex' || o.type === 'armory' ? 'rgba(8,6,14,0.94)' : 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (o.type === 'pause') {
      hudText(ctx, '일시정지', VIEW_W / 2, 90, '#fff', 'center', 16);
      hudText(ctx, 'WASD 이동 · 마우스 조준/공격 · Space 대시 · F/우클릭 스킬', VIEW_W / 2, 120, '#ccc', 'center', 9);
      hudText(ctx, 'E 상호작용 · Q/휠 무기 교체 · M 소리 켜기/끄기', VIEW_W / 2, 134, '#ccc', 'center', 9);
      hudText(ctx, '원소 반응: 빙결+화상=열충격 · 중독+화상=독 연소 · 빙결+번개=감전', VIEW_W / 2, 148, '#9ad8ff', 'center', 8);
      hudText(ctx, game.mode === 'dungeon' ? 'Esc 이어하기   ·   L 포기하고 로비로' : 'Esc 이어하기', VIEW_W / 2, 164, '#999', 'center', 9);
    } else if (o.type === 'codex' || o.type === 'armory') {
      const sv = game.save, disc = new Set(sv.discovered), armory = o.type === 'armory';
      const m = game.input.mouse;
      const title = armory ? `무기고  ·  보유 골드 ${sv.bank}  ·  시작 보조 무기: ${sv.loadout ? game.data.weapons.get(sv.loadout).name : '없음'}`
        : `무기 도감  (${DATA_WEAPONS.filter((d) => disc.has(d.id)).length}/${DATA_WEAPONS.length})`;
      hudText(ctx, title, VIEW_W / 2, 7, '#ffd84a', 'center', 11);
      let hover = null;
      const tab = o.tab || 0;
      WEAPON_TABS.forEach((T, i) => {
        const r = tabRect(i), n = DATA_WEAPONS.filter(T.test), found = n.filter((d) => disc.has(d.id)).length;
        ctx.fillStyle = i === tab ? 'rgba(255,216,74,0.25)' : 'rgba(255,255,255,0.07)'; ctx.fillRect(r.x, r.y, r.w, r.h);
        hudText(ctx, `${i + 1} ${T.name} ${found}/${n.length}`, r.x + r.w / 2, r.y + 3, i === tab ? '#ffd84a' : '#aaa', 'center', 8);
      });
      for (const c of weaponGrid(tab)) {
        const on = m.x >= c.x && m.x < c.x + c.w && m.y >= c.y && m.y < c.y + c.h;
        if (on) hover = c;
        const owned = sv.armory.includes(c.d.id), eq = sv.loadout === c.d.id;
        ctx.fillStyle = eq ? 'rgba(255,216,74,0.22)' : on && armory ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        if (!disc.has(c.d.id)) { hudText(ctx, '???', c.x + 8, c.y + 8, '#555', 'left', 9); continue; }
        drawWeaponCentered(ctx, c.d, c.x + 13, c.y + c.h / 2);
        hudText(ctx, c.d.name, c.x + 27, c.y + 2, RARITY_COLOR[c.d.rarity], 'left', 8);
        if (armory) {
          const st = eq ? ['장착됨', '#ffd84a'] : owned ? ['보유', '#9fe89f'] : [`해금 ${ARMORY_PRICE[c.d.rarity]}골드`, sv.bank >= ARMORY_PRICE[c.d.rarity] ? '#fff' : '#888'];
          hudText(ctx, st[0], c.x + 27, c.y + 13, st[1], 'left', 7);
        } else hudText(ctx, weaponShortLine(c.d), c.x + 27, c.y + 13, '#aaa', 'left', 7);
      }
      const info = o.msg && o.msg.t > 0 ? o.msg.text : hover && disc.has(hover.d.id) ? `${hover.d.name} — ${RARITY_NAME[hover.d.rarity]} · ${weaponStatLine(hover.d)}`
        : armory ? '던전에서 발견한 무기를 해금해 시작 보조 무기로 장착할 수 있습니다' : '';
      hudText(ctx, info, VIEW_W / 2, VIEW_H - 26, o.msg && o.msg.t > 0 ? o.msg.color : '#ccc', 'center', 9);
      hudText(ctx, '1~4 / 클릭: 탭 전환   ·   E / Esc: 닫기', VIEW_W / 2, VIEW_H - 12, '#888', 'center', 8);
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
    } else if (o.type === 'result') {
      hudText(ctx, o.victory ? '던전 정복!' : '사망했습니다', VIEW_W / 2, 70, o.victory ? '#ffd84a' : '#ff7070', 'center', 18);
      hudText(ctx, `도달: ${game.worldIdx + 1}-${game.levelIdx + 1}   ·   처치 ${game.kills}   ·   획득 골드 ${o.gold}`, VIEW_W / 2, 110, '#ddd', 'center', 10);
      hudText(ctx, `획득한 골드가 로비 보유 골드에 추가됩니다 (보유 ${game.save.bank} → ${game.save.bank + o.gold})`, VIEW_W / 2, 128, '#aaa', 'center', 9);
      hudText(ctx, 'Enter: 로비로', VIEW_W / 2, 160, '#fff', 'center', 10);
    }
  }
  static buffRect(i) { const w = 140, h = 80, gap = 12, total = w * 3 + gap * 2; return { x: (VIEW_W - total) / 2 + i * (w + gap), y: 90, w, h }; }
}
