'use strict';
// ═══════════════════════════════════════════════════════════════
// 드루이드 야수 계열: 자연의 동맹
// 소환 편성 · 개별 유대 · 고유 연계 · 조합 연계 · 진화 슬롯
// 가시 / 변신 계열 및 다른 직업에는 영향을 주지 않는다.
// ═══════════════════════════════════════════════════════════════
(function () {
  const DRUID = 'hero_druid';
  const BASE = 'base';
  const MAX_SPIRITS = 5;
  const COLORS = {
    wolf: '#9ad8ff', bear: '#c8a070', stag: '#9affb0',
    hawk: '#70d8ff', snake: '#8ddd55', fox: '#d8a0ff'
  };
  const SPIRITS = {
    wolf: { name: '월영', short: '늑', role: '공격', desc: '표식 · 공격 속도 +4%', bonus: '표식 대상에게 플레이어 피해 +6%', damage: 8, rate: 0.82, range: 220, speed: 174, stop: 10, color: '#9ad8ff', accent: '#fff4c0' },
    bear: { name: '거암', short: '곰', role: '수호', desc: '범위 공격 · 받는 피해 -3%', bonus: '받는 피해 3% 감소', damage: 16, rate: 1.42, range: 52, speed: 128, stop: 12, color: '#c8a070', accent: '#e8d0a0' },
    stag: { name: '비화', short: '사', role: '회복', desc: '회복 · 에너지 소비 -5%', bonus: '8초마다 최대 체력의 1% 회복', damage: 6, rate: 1.35, range: 245, speed: 142, stop: 82, color: '#9affb0', accent: '#fff4c0', ranged: true },
    hawk: { name: '청익', short: '매', role: '정밀', desc: '관통 공격 · 치명타 +2%', bonus: '치명타 확률 +2%', damage: 7, rate: 1.02, range: 280, speed: 158, stop: 100, color: '#70d8ff', accent: '#ffffff', ranged: true },
    snake: { name: '녹린', short: '뱀', role: '제어', desc: '중독 · 상태 이상 지속 +8%', bonus: '상태 이상 지속시간 +8%', damage: 6, rate: 1.22, range: 205, speed: 146, stop: 70, color: '#8ddd55', accent: '#d8ff9a', ranged: true },
    fox: { name: '은월', short: '여', role: '기동', desc: '기습 · 이동 속도 +3%', bonus: '이동 속도 +3% · 대시 회복 +4%', damage: 7, rate: 1.04, range: 220, speed: 196, stop: 10, color: '#d8a0ff', accent: '#fff4ff' }
  };
  const PAIRS = [
    { a: 'wolf', b: 'hawk', id: 'moonhunt', name: '월광 추적' },
    { a: 'bear', b: 'stag', id: 'lifecradle', name: '생명의 요람' },
    { a: 'snake', b: 'fox', id: 'venomgrove', name: '환영의 독림' }
  ];
  const SPIRIT_SPRITES = {
        wolf: [
          ".....O..O........",
          "....OSOOSO.......",
          "...OSBBBSOO......",
          "..OSBHHBBBBOOO...",
          ".OSBBBBBBBBBBOO..",
          "OSBBBBBBBBBBBBBO.",
          ".OSBBBBBBBBBBBSO.",
          "..OOSSSOOSSSOO...",
          "....O.O..O.O......"
        ],
        bear: [
          "...OO......OO....",
          "..OSO......OSO...",
          ".OSBBBBBBBBBBBOO.",
          "OSBBBBHBBBBBBBBO.",
          "OSBBBBBBBBBBBBBO.",
          "OSBBBBBBSSBBBBBO.",
          ".OSBBBBBBBBBBBSO.",
          "..OOSSSOOOSSSOO...",
          "...OO..OO..OO....."
        ],
        stag: [
          "..O.O......O.O....",
          "..OSO......OSO....",
          "...OSO....OSO.....",
          "....OOSOOOSO......",
          "......OSBBO.......",
          ".....OSBHHBBO......",
          "....OSBBBBBBO......",
          "....OSBBBBBSO......",
          ".....OOSSSOO.......",
          ".....O.O..O.O......."
        ],
        hawk: [
          "....OO......OO.....",
          "...OSSO....OSSO....",
          "..OOSBBBOOOSBBBOO..",
          ".OSBBBBBBBBBBBBBBO.",
          "..OSBBHHBBBBBBBSO..",
          "...OOSBBBBBBBBOO...",
          "......OSSSSSO.......",
          ".....O.O...O.O......."
        ],
        snake: [
          "...........OOO.....",
          "..........OSHHNO...",
          ".....OOSSSOSBBBBBO..",
          "...OOSBBBBBOO.......",
          ".OOSSSO.............",
          "OSBBBBBO............",
          ".OOSSSOO............",
          "....OOSBBBBBO.......",
          ".......OOSSSO.......",
          "..........OSBBBBBO.."
        ],
        fox: [
          "....O.O.............",
          "...OSOSO............",
          "..OSBBBBBOO.........",
          ".OSBHHBBBBBOO.......",
          "OSBBBBBBBBBBBOO.....",
          ".OSBBBBBBBBBBBO.....",
          "..OOSSSBBBBBBSO......",
          "....OOSSSOOSSO.......",
          "...O.O....O.O........."
        ]
      };
  const isBeast = (p) => !!p && p.hero && p.hero.id 
      const dark = { wolf:'#587c96', bear:'#805c3d', stag:'#4d8961', hawk:'#3b7b9a', snake:'#456b32', fox:'#84518f' }[this.kind];
      const pal = { O:'#14101c', S:dark, B:C.color, H:C.accent, E:'#ffffff', N:'#1a1520' };
      const rows = SPIRIT_SPRITES[this.kind], w = Math.max(...rows.map(r => r.length)), h = rows.length;
      const cell = this.kind === 'bear' ? 1.15 : 1;
      const left = Math.round(x - w * cell / 2), top = Math.round(y + 7 - h * cell);
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.34)';
      ctx.beginPath(); ctx.ellipse(x, y + 8, this.kind === 'bear' ? 10 : 8, 2, 0, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.12;
      ctx.fillStyle = C.color; ctx.beginPath(); ctx.ellipse(x, y - 1, this.kind === 'bear' ? 13 : 10, 5, 0, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.98;
      const flip = this.face < 0;
      for (let r = 0; r < h; r++) {
        let shift = 0;
        if (this.kind === 'hawk' && r < 4) shift = Math.round(Math.sin(this.t * 12) * (r < 2 ? 2 : 1));
        if (this.kind === 'snake') shift = Math.round(Math.sin(this.t * 4 + r * 0.85) * 1.2);
        if (this.kind === 'wolf' && r === 1) shift = Math.round(Math.sin(this.t * 7) * 1);
        if (this.kind === 'fox' && r === 6) shift = Math.round(Math.sin(this.t * 6) * 1);
        for (let c = 0; c < rows[r].length; c++) {
          const ch = rows[r][c], color = pal[ch];
          if (!color) continue;
          const px = left + Math.round((flip ? w - 1 - c : c) * cell + shift);
          const py = top + Math.round(r * cell);
          ctx.fillStyle = this.flashT > 0 ? '#ffffff' : color;
          ctx.fillRect(px, py, Math.ceil(cell), Math.ceil(cell));
        }
      }
      // Species-specific details at native pixel scale: wolf muzzle, stag nose, hawk beak, snake tongue.
      ctx.fillStyle = this.flashT > 0 ? '#ffffff' : (this.kind === 'snake' ? '#f08a8a' : '#ffffff');
      const eyeX = x + (flip ? -3 : 2);
      ctx.fillRect(eyeX, y - 3, 1, 1);
      if (this.kind === 'hawk') { ctx.fillStyle = '#ffd36b'; ctx.fillRect(x + (flip ? -7 : 6), y - 1, 2, 1); }
      if (this.kind === 'snake') { ctx.fillStyle = '#e77b80'; ctx.fillRect(x + (flip ? -7 : 6), y - 1, 2, 1); }
      ctx.restore();
    }
  }

  if (typeof COOP_CLASSES !== 'undefined') COOP_CLASSES.DruidSpirit = DruidSpirit;

  function drawHit(world, p, e, damage, color, options) {
    if (!e || !e.alive) return;
    const o = options || {}, dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
    const src = { damage: world.skillDmg(damage), mods: p.mods, knockback: o.knockback || 3, from: p, minion: true, druidOwner: p, status: o.status || null };
    world.damageEnemy(e, src, dx / d, dy / d, { quiet: true });
  }
  function mark(world, p, e, duration, vulnerability) {
    if (!e) return;
    e.druidMarkUntil = world.time + duration; e.druidMarkOwner = p;
    if (vulnerability) { e.druidMarkBonus = 1 + vulnerability; }
    world.effects.ring(e.x, e.y, e.radius + 10, '#9ad8ff');
    world.effects.text(e.x, e.y - e.radius - 12, '사냥 표식', '#9ad8ff');
  }
  function doIndividual(world, p, kind) {
    const C = SPIRITS[kind], targets = priorityTargets(world, p, 420, 3), first = targets[0];
    if (kind === 'wolf') {
      if (!first) return;
      for (let i = 0; i < 3; i++) drawHit(world, p, first, 13, C.color);
      mark(world, p, first, 4.5, 0.10); world.effects.beamline(p.x, p.y, first.x, first.y, 3, C.color);
    } else if (kind === 'bear') {
      aoe(world, p, 82, 42, C.color, { knockback: 8, stun: 0.65, bossSlow: 0.5, bossSlowK: 0.68 });
      p.shield = Math.min(p.maxShield, p.shield + Math.round(p.maxShield * 0.08));
      world.effects.rays(p.x, p.y, C.color, 14, 88, 0.6); world.addShake(0.16, 3);
    } else if (kind === 'stag') {
      const hp = Math.round(p.maxHp * 0.07), sh = Math.round(p.maxShield * 0.05);
      p.hp = Math.min(p.maxHp, p.hp + hp); p.shield = Math.min(p.maxShield, p.shield + sh); p.energy = Math.min(p.maxEnergy, p.energy + 22);
      world.effects.heal(p.x, p.y); world.effects.ring(p.x, p.y, 54, C.color);
      world.effects.text(p.x, p.y - 25, '생명의 축복', C.color);
    } else if (kind === 'hawk') {
      for (const e of targets) {
        drawHit(world, p, e, 13, C.color); drawHit(world, p, e, 13, C.color);
        world.effects.beamline(p.x, p.y - 18, e.x, e.y, 1.5, C.color);
      }
    } else if (kind === 'snake') {
      aoe(world, p, 86, 25, C.color, { knockback: 1, status: { type: 'poison', chance: 1, duration: 5, dps: world.skillDmg(4) }, stun: 0.7, bossSlow: 1.2, bossSlowK: 0.78 });
      world.effects.rays(p.x, p.y, C.color, 18, 86, 0.6);
    } else if (kind === 'fox') {
      for (const e of targets) { drawHit(world, p, e, 20, C.color); world.effects.slash(e.x, e.y, Math.atan2(e.y - p.y, e.x - p.x), 24, 1.5, C.color); }
      p.druidTempMove = 0.15; p.druidTempMoveUntil = world.time + 4;
      p.dashCooldown = Math.max(0, p.dashCooldown - p.dashCdMax * 0.35);
      world.effects.ring(p.x, p.y, 36, C.color);
    }
    world.effects.text(p.x, p.y - 28, C.name + ' · 유대 발현', C.color);
  }
  function doPair(world, p, pair) {
    if (pair.id === 'moonhunt') {
      const e = priorityTargets(world, p, 500, 1)[0]; if (!e) return;
      for (let i = 0; i < 4; i++) drawHit(world, p, e, 14, '#9ad8ff');
      mark(world, p, e, 5.5, 0.12);
      world.effects.beamline(p.x, p.y, e.x, e.y, 5, '#9ad8ff');
      world.effects.rays(e.x, e.y, '#70d8ff', 10, 34, 0.45);
    } else if (pair.id === 'lifecradle') {
      aoe(world, p, 90, 36, '#9affb0', { knockback: 6, stun: 0.6, bossSlow: 0.45, bossSlowK: 0.75 });
      p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.10));
      p.shield = Math.min(p.maxShield, p.shield + Math.round(p.maxShield * 0.12));
      p.druidTempGuard = 0.10; p.druidTempGuardUntil = world.time + 5;
      world.effects.heal(p.x, p.y); world.effects.rays(p.x, p.y, '#9affb0', 16, 95, 0.7);
    } else {
      aoe(world, p, 94, 27, '#8ddd55', { knockback: 1, status: { type: 'poison', chance: 1, duration: 5, dps: world.skillDmg(4.5) }, stun: 0.8, bossSlow: 1.1, bossSlowK: 0.78 });
      p.druidTempMove = 0.12; p.druidTempMoveUntil = world.time + 4;
      world.effects.ring(p.x, p.y, 94, '#d8a0ff'); world.effects.rays(p.x, p.y, '#8ddd55', 16, 92, 0.65);
    }
    world.effects.text(p.x, p.y - 30, pair.name + '!', '#c8ffb0');
    SFX.play('magic', 0.08);
  }
  function doAncientPulse(world, p) {
    aoe(world, p, 108, 48, '#9affb0', { knockback: 8, stun: 0.8, bossSlow: 1.3, bossSlowK: 0.72 });
    p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.05));
    world.effects.heal(p.x, p.y); world.effects.rays(p.x, p.y, '#9affb0', 24, 116, 0.9);
    world.effects.ring(p.x, p.y, 108, '#ffffff'); world.addShake(0.25, 5);
    world.effects.text(p.x, p.y - 38, '태고의 파동', '#9affb0', true);
  }

  Game.prototype.necroGSkill = (function (original) {
    return function (p) {
      if (isBeast(p)) return { id: 'druid_bond', name: (p.rank || 0) >= 2 ? '대자연의 합일' : (p.rank || 0) >= 1 ? '정령의 합주' : '유대 명령', cd: [16, 15, 14][Math.min(2, p.rank || 0)] };
      return original ? original.call(this, p) : null;
    };
  })(Game.prototype.necroGSkill);
  Game.prototype.necroHudParts = (function (original) {
    return function (p) {
      if (isBeast(p)) {
        const roster = p.natureRoster || [], B = bondMap(p), ready = roster.filter((k) => (B[k] || 0) >= 100).length;
        const active = this.coop && this.coop.guest
          ? (p.druidBuffs && Object.values(p.druidBuffs).some((v) => Number(v) > 0) ? roster.length : 0)
          : getMine(this, p).length;
        return { text: '동료 ' + active + '/' + roster.length + ' · 완전한 유대 ' + ready + '/' + roster.length, color: '#9affb0' };
      }
      return original ? original.call(this, p) : null;
    };
  })(Game.prototype.necroHudParts);

  Game.prototype.druidOpenSelection = function (p) {
    if (!isBeast(p)) return false;
    const current = Array.isArray(p.natureRoster) ? p.natureRoster.slice() : [];
    const goal = rankMax(p);
    const remote = this.coop && this.coop.host && this.remotes
      ? [...this.remotes.values()].find((R) => R.p === p) : null;
    const remoteContext = !!(remote && remote.overlay);
    const previousOverlay = this.overlay;
    this.overlay = { type: 'druid_select', goal: goal, selected: current.slice(), locked: [], msg: null };
    this.input.mouse.down = false;
    // 원격 참가자의 최초 F키는 전역(방장) 창을 점유하지 않고 참가자 전용 창으로 전달한다.
    // 진화 창에서 선택을 처리 중이면 coopRemoteOverlay가 새 창을 보존·전송하므로 여기서는 건드리지 않는다.
    if (remote && !remoteContext) {
      remote.overlay = this.overlay;
      this.overlay = previousOverlay;
      this.coopSendOverlay(remote);
    }
    return true;
  };
  Game.prototype.druidSummon = function (p, freeRefresh) {
    if (!isBeast(p) || !Array.isArray(p.natureRoster) || !p.natureRoster.length) return false;
    // 교체된 동료만 퇴장시킨다. 종별 유대치는 druidBonds에 남아 다시 편성해도 이어진다.
    const wanted = new Set(p.natureRoster);
    for (const ally of this.allies) {
      if (ally instanceof DruidSpirit && ally.owner === p && !wanted.has(ally.kind)) ally.alive = false;
    }
    for (const kind of p.natureRoster) {
      const exists = this.allies.some((a) => a instanceof DruidSpirit && a.owner === p && a.kind === kind && a.alive);
      if (!exists) {
        const ally = new DruidSpirit(p, kind, 0);
        this.allies.push(ally);
        const C = SPIRITS[kind];
        this.effects.sparkle(ally.x, ally.y - 6, C.color);
        this.effects.ring(ally.x, ally.y, 12, C.color);
      }
    }
    p.druidSummonUntil = 0; // 구버전 저장·협동 패킷 호환용
    this.effects.rays(p.x, p.y - 3, '#9affb0', 12 + p.rank * 3, 52 + p.rank * 8, 0.6);
    this.effects.ring(p.x, p.y, 32 + p.rank * 7, '#9affb0');
    if (!freeRefresh) this.effects.text(p.x, p.y - 24, '자연의 동맹!', '#9affb0', true);
    this.druidSyncBuffs(p);
    return true;
  };
  Game.prototype.druidSyncBuffs = function (p) { if (isBeast(p)) syncBuffs(this, p); };
  Game.prototype.druidTick = function (dt) {
    const players = this.allPlayers ? this.allPlayers() : [this.player];
    const seen = new Set();
    for (const p of players) {
      if (!p || seen.has(p) || !isBeast(p)) continue;
      seen.add(p);
      if (p.state !== 'DEAD' && Array.isArray(p.natureRoster)) {
        for (const kind of p.natureRoster) {
          if (!this.allies.some((a) => a instanceof DruidSpirit && a.owner === p && a.kind === kind && a.alive))
            this.allies.push(new DruidSpirit(p, kind, 0));
        }
      }
      syncBuffs(this, p);
      // ratmaTick은 현재 플레이어의 graveCd만 줄이므로, 원격 드루이드의 G 재사용 대기시간은 여기서 별도 처리한다.
      if (p !== this.player && p.graveCd > 0) p.graveCd = Math.max(0, p.graveCd - dt);
    }
    // 방장과 참가자 모두 각자의 G 명령을 처리한다. 실제 피해 계산은 반드시 해당 소유자로 전환해 적용한다.
    for (const p of players) {
      const remote = p && this.remotes ? [...this.remotes.values()].find((R) => R.p === p) : null;
      const ownOverlay = p === this.player ? this.overlay : remote && remote.overlay;
      if (!p || !isBeast(p) || !(p.druidCommandAt > this.time - 0.25) || ownOverlay || p.state === 'DEAD') continue;
      p.druidCommandAt = -1;
      const invoke = () => {
        const g = this.necroGSkill(p), active = getMine(this, p), B = bondMap(p);
        const ready = active.filter((a) => (B[a.kind] || 0) >= 100);
        const say = (s) => this.effects.text(p.x, p.y - 24, s, '#9affb0');
        if (!this.zoneRight('job')) { say('직업의 권리를 빼앗겼다'); return; }
        if (!ready.length) { say('아직 완전한 유대에 도달한 동료가 없습니다'); return; }
        if ((p.graveCd || 0) > 0) { say('유대 명령 대기 ' + Math.ceil(p.graveCd) + '초'); return; }
        const used = new Set(), types = new Set(ready.map((a) => a.kind));
        for (const pair of PAIRS) {
          if (types.has(pair.a) && types.has(pair.b)) {
            doPair(this, p, pair); used.add(pair.a); used.add(pair.b);
          }
        }
        for (const ally of ready) if (!used.has(ally.kind)) doIndividual(this, p, ally.kind);
        if ((p.rank || 0) >= 2 && ready.length >= 3) doAncientPulse(this, p);
        for (const ally of ready) B[ally.kind] = 25;
        p.graveCd = g.cd;
        this.guildEvent('skills'); SFX.play('skill', 0.08);
        this.effects.text(p.x, p.y - 48, ready.length + '개의 유대가 공명한다', '#9affb0', true);
      };
      if (this.player === p || !this.withPlayer) invoke();
      else this.withPlayer(p, invoke);
    }
  };

  const baseUseSkill = Game.prototype.useSkill;
  Game.prototype.useSkill = function () {
    const p = this.player;
    if (!isBeast(p)) return baseUseSkill.call(this);
    if (p.castLock > 0 || p.denyT > 0 || !this.zoneRight('job')) return baseUseSkill.call(this);
    this.druidOpenSelection(p);
  };

  const baseEvolve = Game.prototype.evolve;
  Game.prototype.evolve = function () {
    const p = this.player, before = p ? p.rank : -1;
    const r = baseEvolve.apply(this, arguments);
    if (p && isBeast(p) && p.rank > before) this.druidOpenSelection(p);
    return r;
  };
  const baseUpdateOverlay = Game.prototype.updateOverlay;
  Game.prototype.updateOverlay = function (input) {
    const o = this.overlay;
    if (!o || o.type !== 'druid_select') return baseUpdateOverlay.call(this, input);
    const p = this.player, m = input.mouse;
    const toggle = (kind) => {
      if (o.locked.includes(kind)) return;
      const i = o.selected.indexOf(kind);
      if (i >= 0) o.selected.splice(i, 1);
      else if (o.selected.length < o.goal) o.selected.push(kind);
      else o.msg = '편성할 수 있는 동료 수를 모두 선택했습니다';
    };
    if (input.wasPressed('Escape')) { this.overlay = null; input.mouse.down = false; return; }
    for (let i = 0; i < 6; i++) if (input.wasPressed('Digit' + (i + 1))) toggle(Object.keys(SPIRITS)[i]);
    if (input.wasPressed('Mouse0')) {
      let hit = false;
      for (let i = 0; i < 6; i++) {
        const x = 22 + (i % 3) * 156, y = 56 + Math.floor(i / 3) * 70;
        if (m.x >= x && m.x < x + 148 && m.y >= y && m.y < y + 60) { toggle(Object.keys(SPIRITS)[i]); hit = true; break; }
      }
      if (!hit && m.x >= 176 && m.x < 336 && m.y >= 214 && m.y < 244) {
        if (o.selected.length === o.goal) {
          p.natureRoster = o.selected.slice(); this.overlay = null; input.mouse.down = false;
          this.druidSummon(p, true);
          return;
        }
        o.msg = '동료 ' + o.goal + '종을 모두 선택해야 합니다';
      }
      input.mouse.down = false;
    }
    if (input.wasPressed('Enter')) {
      if (o.selected.length === o.goal) {
        p.natureRoster = o.selected.slice(); this.overlay = null;
        this.druidSummon(p, true);
        return;
      }
      o.msg = '동료 ' + o.goal + '종을 모두 선택해야 합니다';
    }
    return;
  };

  const baseUpdate = Game.prototype.update;
  Game.prototype.update = function (dt) {
    if (isBeast(this.player) && !this.overlay && this.input && this.input.wasPressed('KeyG')) this.player.druidCommandAt = this.time;
    return baseUpdate.call(this, dt);
  };
  if (typeof Game.prototype.coopHostTickRemotes === 'function') {
    const baseCoopHostTickRemotes = Game.prototype.coopHostTickRemotes;
    Game.prototype.coopHostTickRemotes = function (dt) {
      if (this.remotes) for (const R of this.remotes.values()) {
        if (R.p && R.vin && isBeast(R.p) && R.vin.wasPressed('KeyG')) R.p.druidCommandAt = this.time;
      }
      return baseCoopHostTickRemotes.call(this, dt);
    };
  }
  const baseSkillEffects = Game.prototype.updateSkillEffects;
  Game.prototype.updateSkillEffects = function (dt) {
    const r = baseSkillEffects.call(this, dt);
    this.druidTick(dt);
    return r;
  };

  const baseDamageEnemy = Game.prototype.damageEnemy;
  Game.prototype.damageEnemy = function (enemy, src, kx, ky, opts) {
    let source = src;
    if (enemy && source) {
      const owner = enemy.druidMarkOwner;
      if (owner && isBeast(owner) && enemy.druidMarkUntil > this.time && this.player === owner && !source.minion && !source.trap) {
        source = Object.assign({}, source, { damage: source.damage * (enemy.druidMarkBonus || 1.06) });
        awardHit(this, owner, 'wolf', 2);
      }
      const statusOwner = source.druidOwner || (isBeast(this.player) ? this.player : null);
      if (source.status && statusOwner && statusOwner.druidBuffs && statusOwner.druidBuffs.statusDuration) {
        source = Object.assign({}, source, { status: Object.assign({}, source.status, { duration: source.status.duration * (1 + statusOwner.druidBuffs.statusDuration) }) });
      }
    }
    return baseDamageEnemy.call(this, enemy, source, kx, ky, opts);
  };

  const basePlayerTakeDamage = Player.prototype.takeDamage;
  Player.prototype.takeDamage = function (amount) {
    const b = isBeast(this) && this.druidBuffs ? this.druidBuffs : null;
    if (b && b.guard) amount *= 1 - Math.min(0.2, b.guard);
    return basePlayerTakeDamage.call(this, amount);
  };
  const basePlayerUpdate = Player.prototype.update;
  Player.prototype.update = function (dt, input, map, mouseWorld) {
    const b = isBeast(this) && this.druidBuffs ? this.druidBuffs : null, oldSpeed = this.moveSpeed;
    if (b && b.moveSpeed) this.moveSpeed = oldSpeed * (1 + b.moveSpeed);
    try { basePlayerUpdate.call(this, dt, input, map, mouseWorld); }
    finally { this.moveSpeed = oldSpeed; }
    if (b && b.dashRecovery) this.dashCooldown = Math.max(0, this.dashCooldown - dt * b.dashRecovery);
  };
  const modsDescriptor = Object.getOwnPropertyDescriptor(Player.prototype, 'mods');
  if (modsDescriptor && modsDescriptor.get) Object.defineProperty(Player.prototype, 'mods', {
    configurable: true, enumerable: modsDescriptor.enumerable,
    get: function () {
      const m = modsDescriptor.get.call(this), b = isBeast(this) && this.druidBuffs ? this.druidBuffs : null;
      if (b && b.critChance) m.critChance += b.critChance;
      return m;
    }
  });
  const baseFireRate = WeaponSystem.prototype.getFireRate;
  WeaponSystem.prototype.getFireRate = function (player, weapon) {
    const rate = baseFireRate.call(this, player, weapon);
    const b = isBeast(player) && player.druidBuffs ? player.druidBuffs : null;
    return rate * (1 + (b ? b.fireRate : 0));
  };
  const baseSpend = WeaponSystem.prototype.spend;
  WeaponSystem.prototype.spend = function (player, cost) {
    const b = isBeast(player) && player.druidBuffs ? player.druidBuffs : null;
    return baseSpend.call(this, player, cost * (1 - (b ? b.energySave : 0)));
  };

  const baseHudOverlay = HUD.prototype.overlay;
  HUD.prototype.overlay = function (ctx, game) {
    baseHudOverlay.call(this, ctx, game);
    const o = game.overlay;
    if (!o || o.type !== 'druid_select') return;
    ctx.fillStyle = 'rgba(7,12,10,0.97)'; ctx.fillRect(12, 10, 488, 268);
    ctx.strokeStyle = '#6aa884'; ctx.lineWidth = 2; ctx.strokeRect(13, 11, 486, 266);
    hudText(ctx, '자연의 동맹', VIEW_W / 2, 18, '#9affb0', 'center', 17);
    hudText(ctx, '동료 편성 · 선택 ' + o.selected.length + '/' + o.goal + '  ·  F로 언제든 교체', VIEW_W / 2, 39, '#d8e8d8', 'center', 8);
    const B = bondMap(p);
    for (let i = 0; i < 6; i++) {
      const kind = Object.keys(SPIRITS)[i], C = SPIRITS[kind], x = 22 + (i % 3) * 156, y = 56 + Math.floor(i / 3) * 70;
      const chosen = o.selected.includes(kind), locked = o.locked.includes(kind);
      ctx.fillStyle = chosen ? 'rgba(100,190,130,0.22)' : 'rgba(255,255,255,0.045)'; ctx.fillRect(x, y, 148, 60);
      ctx.strokeStyle = chosen ? C.color : locked ? '#9affb0' : '#4a5d50'; ctx.lineWidth = chosen ? 2 : 1; ctx.strokeRect(x + 0.5, y + 0.5, 147, 59);
      ctx.fillStyle = C.color; ctx.fillRect(x + 8, y + 9, 15, 15);
      hudText(ctx, String(i + 1), x + 15.5, y + 10, '#101810', 'center', 8);
      hudText(ctx, C.name + ' · ' + C.role, x + 29, y + 7, C.color, 'left', 9);
      hudText(ctx, C.desc + ' · 유대 ' + Math.round(B[kind] || 0) + '%', x + 8, y + 25, '#d8e0d8', 'left', 7);
      hudText(ctx, chosen ? '편성 중 · 클릭 해제' : '선택하여 편성 · ' + (i + 1) + '번', x + 8, y + 43, chosen ? '#9affb0' : '#8d9a8d', 'left', 7);
    }
    ctx.fillStyle = o.selected.length === o.goal ? '#285d3d' : '#292d2a'; ctx.fillRect(176, 214, 160, 30);
    ctx.strokeStyle = o.selected.length === o.goal ? '#9affb0' : '#59635a'; ctx.strokeRect(176.5, 214.5, 159, 29);
    hudText(ctx, '편성 확정 · Enter', VIEW_W / 2, 222, o.selected.length === o.goal ? '#ffffff' : '#889088', 'center', 9);
    hudText(ctx, o.msg || '교체해도 동료별 유대도는 보존됩니다  ·  Esc 취소', VIEW_W / 2, 253, o.msg ? '#ffb0a0' : '#9aab9d', 'center', 7);
  };
  const baseHudRender = HUD.prototype.render;
  HUD.prototype.render = function (ctx, game) {
    baseHudRender.call(this, ctx, game);
    const p = game.player;
    if (!isBeast(p) || game.overlay || !Array.isArray(p.natureRoster) || !p.natureRoster.length) return;
    const B = bondMap(p), x0 = 4, y0 = 48, width = Math.min(166, 27 * p.natureRoster.length + 8);
    ctx.fillStyle = 'rgba(0,0,0,0.48)'; ctx.fillRect(x0, y0, width, 20);
    p.natureRoster.forEach((kind, i) => {
      const C = SPIRITS[kind], x = x0 + 5 + i * 27, value = B[kind] || 0;
      hudText(ctx, C.short, x + 9, y0 + 2, value >= 100 ? '#ffffff' : C.color, 'center', 7);
      hudBar(ctx, x, y0 + 12, 19, 3, clamp01(value / 100), value >= 100 ? '#ffd84a' : C.color);
    });
  };
})();
