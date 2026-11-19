'use strict';
// ════════════════════════════════════════════
// 게임
// ════════════════════════════════════════════
// 현재 맵 (렌더링 보조용)
function GAME_MAP() { return window.__game ? window.__game.map : null; }

class Game {
  constructor(canvas, data) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.data = data;
    this.input = new InputManager(canvas);
    this.effects = new Effects(); this.hud = new HUD();
    this.weaponSystem = new WeaponSystem(this);
    this.shake = 0; this.shakeMag = 0; this.time = 0;
    this.cam = { x: 0, y: 0 }; this.transition = null; this.banner = null; this.overlay = null;
    this.flow = null; this.flowTile = -1; this.flowTimer = 0;
    this.save = loadSave();
    this.hitStopT = 0; this.hurtFlash = 0; this.heartT = 0; this.noEnergyFlash = 0;
    this.cinematic = null; this.slowMo = null; this.screenFlash = 0;
    SFX.setMuted(!!this.save.muted);
    this.dpsLog = [];
  }
  start() {
    this.fitToScreen();
    this.enterLobby();
    window.addEventListener('resize', () => this.fitToScreen());
    PERF.onChange = () => this.fitToScreen(); // 자동 품질이 바뀌면 해상도도 다시 맞춤
    this.loop = new GameLoop((dt) => this.update(dt), () => this.render());
    this.loop.runHidden = () => !!(this.coop && this.coop.host); // 멀티 방장은 창을 내려도 계산 계속
    this.loop.start();
  }
  // 캔버스 해상도를 실제 표시 픽셀(devicePixelRatio 포함)에 맞춤 → 글자/선은 선명, 도트는 nearest 확대
  fitToScreen() {
    const css = Math.max(0.5, Math.min(innerWidth / VIEW_W, innerHeight / VIEW_H));
    const dpr = Math.min(window.devicePixelRatio || 1, PERF.low ? 1 : 2); // 2배 넘는 화면은 차이가 거의 없어 2까지만, 가벼운 모드는 1
    const cw = Math.round(VIEW_W * css), ch = Math.round(VIEW_H * css);
    this.canvas.style.width = cw + 'px';
    this.canvas.style.height = ch + 'px';
    const k = Math.min(cw * dpr, VIEW_W * (PERF.low ? 2 : 4)) / cw; // 내부 해상도 상한: 보통 4배(2048×1152, 그 이상은 차이 없음), 가벼운 모드 2배(1024×576) // 가벼운 모드: 내부 해상도를 최대 2배(1024×576)로 → 큰 화면에서 그리는 픽셀이 크게 줄어듦 (브라우저가 확대)
    this.canvas.width = Math.round(cw * k);
    this.canvas.height = Math.round(ch * k);
    this.canvas.style.imageRendering = PERF.low ? 'pixelated' : ''; // 확대할 때 도트가 번지지 않게
    this.R = this.canvas.width / VIEW_W;
  }
  heroDef(id) { return this.data.heroes.get(id) || DATA_HEROES[0]; }
  weaponDef(id) {
    const d = this.data.weapons.get(id);
    if (!d) throw new Error('알 수 없는 무기 ID: ' + id);
    return d;
  }
  makePlayer(x, y) {
    const hero = this.heroDef(this.save.selected);
    const p = new Player(x, y, hero, this.data.base);
    const J = BALANCE.jobLevel, lv = this.jobLevel(hero.id); // 직업 레벨 보너스
    if (lv) { p.maxHp += J.hp * lv; p.hp = p.maxHp; p.maxEnergy += J.energy * lv; p.energy = p.maxEnergy; p.stats.attackBonus += J.atk * lv; }
    p.weapons.push(new WeaponInstance(this.weaponDef(hero.startWeapon)));
    const lo = this.save.loadout; // 무기고에서 장착한 시작 보조 무기
    if (lo && lo !== hero.startWeapon && this.data.weapons.get(lo) && this.save.armory.includes(lo)) p.weapons.push(new WeaponInstance(this.weaponDef(lo)));
    return p;
  }
  jobLevel(id) { return (this.save.jobLv && this.save.jobLv[id]) || 0; }
  jobLevelCost(id) { const J = BALANCE.jobLevel, lv = this.jobLevel(id); return lv >= J.max ? null : J.base + J.perLevel * lv; }
  // 직업 레벨업 → 결과 메시지 [글, 색] (직업 레벨 창에서 사용)
  levelUpJob(hero) {
    const s = this.save, cost = this.jobLevelCost(hero.id), p = this.player;
    if (!s.unlocked.includes(hero.id)) { SFX.play('deny'); return ['아직 해금하지 않은 직업입니다', '#ff9a9a']; }
    if (cost === null) return ['이미 최고 레벨입니다', '#ffd84a'];
    if (s.bank < cost) { SFX.play('deny'); return [`${CUR.name}이 부족합니다 (${cost} 필요)`, '#ff9a9a']; }
    s.bank -= cost; s.jobLv = s.jobLv || {}; s.jobLv[hero.id] = this.jobLevel(hero.id) + 1; writeSave(s);
    const { x, y } = p; this.player = this.makePlayer(x, y);
    this.effects.ring(x, y, 30, '#7ad0ff'); this.effects.burst(x, y, '#7ad0ff', 18); SFX.play('buy');
    return [`${hero.name} Lv.${s.jobLv[hero.id]} 달성!`, '#7ad0ff'];
  }
  // ── 탐험가 길드 (제안): 일일·주간 퀘스트, 토벌 의뢰, 칭호, 거래상 보급품, 결정석 도박
  guild() {
    const sv = this.save, G = sv.guild = sv.guild || {}, day = guildDayKey(), week = guildWeekKey();
    sv.stats = sv.stats || {};
    const roll = (key, kind) => { const r = guildSeedRand(key + kind), pool = GUILD_QUESTS.slice(), out = [];
      while (out.length < 3 && pool.length) { const q = pool.splice(Math.floor(r() * pool.length), 1)[0], [n, reward] = q[kind]; out.push({ stat: q.stat, name: q.name.replace('{n}', n.toLocaleString()), n, reward, prog: 0, claimed: false }); }
      return out; };
    if (G.day !== day) { G.day = day; G.daily = roll(day, 'daily'); G.offers = this.rollHunts(day); G.stock = this.rollSupplies(day); G.bought = []; }
    if (G.hv !== 2) { G.hv = 2; G.offers = this.rollHunts(day); } // 예전 방식(같은 의뢰가 겹침)으로 만든 오늘 의뢰는 한 번 다시 뽑음
    if (!G.huntDone || G.huntDone.day !== day) G.huntDone = { day, ids: [] }; // 오늘 보상을 받은 의뢰 (같은 날 다시 수락 못 함)
    if (G.week !== week) { G.week = week; G.weekly = roll(week, 'weekly'); }
    G.active = G.active || [];
    return G;
  }
  rollHunts(day) { // 가 본 필드 안에서 보스 토벌 최대 2개 + 몬스터 처치 — 같은 대상은 겹치지 않게 (예전엔 같은 보스 의뢰가 두 번 나와 한 번 잡으면 둘 다 완료됨)
    const r = guildSeedRand(day + 'hunt'), maxW = Math.max(0, Math.min(DATA_WORLDS.length - 1, Math.floor(((this.save.bestStage || 1) - 1) / STAGES_PER_WORLD))), H = GUILD_HUNT, out = [];
    const take = (arr) => arr.splice(Math.floor(r() * arr.length), 1)[0];
    const worlds = Array.from({ length: maxW + 1 }, (_, w) => w), nBoss = Math.min(2, worlds.length);
    for (let i = 0; i < nBoss; i++) { const w = take(worlds), W = DATA_WORLDS[w], bd = this.data.enemies.get(W.boss);
      out.push({ id: 'h' + out.length, kind: 'boss', target: W.boss, name: `${bd.name} 토벌`, where: W.name, n: 1, reward: H.bossReward[0] + H.bossReward[1] * w }); }
    const mobs = []; for (let w = 0; w <= maxW; w++) for (const [id] of DATA_WORLDS[w].enemies) if (!mobs.some((m) => m.id === id)) mobs.push({ id, w });
    while (out.length < H.offers && mobs.length) { const { id, w } = take(mobs), W = DATA_WORLDS[w], ed = this.data.enemies.get(id), n = H.mobCount[0] + Math.floor(r() * (H.mobCount[1] - H.mobCount[0]));
      out.push({ id: 'h' + out.length, kind: 'mob', target: id, name: `${ed.name} ${n}마리 처치`, where: W.name, n, reward: H.mobReward + 3 * w }); }
    return out;
  }
  rollSupplies(day) { const r = guildSeedRand(day + 'shop'), pool = GUILD_SUPPLIES.map((x) => x.id), out = []; while (out.length < 3) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]); return out; }
  guildEvent(stat, amt = 1, target) { // 게임 중 행동 → 평생 기록 · 퀘스트 · 토벌 진행
    if (this.coop && this.coop.host && this.remotes) { // 멀티: 함께 한 일(처치·보스·스테이지 등)은 참가자 기록에도, 참가자 혼자 한 일(스킬)은 그 사람 기록에만
      const R = [...this.remotes.values()].find((q) => q.p === this.player);
      if (R && (stat === 'skills' || stat === 'startKills')) { (R.gev = R.gev || []).push([stat, amt, target]); return; } /* 그 사람 혼자 한 일 */
      if (['kills', 'bosses', 'elites', 'stages', 'reactions', 'gold'].includes(stat)) for (const Q of this.remotes.values()) (Q.gev = Q.gev || []).push([stat, amt, target]);
    }
    const sv = this.save; if (!sv) return;
    sv.stats = sv.stats || {}; sv.stats[stat] = (sv.stats[stat] || 0) + amt;
    const G = sv.guild; if (!G) return;
    for (const q of (G.daily || []).concat(G.weekly || [])) if (q.stat === stat && !q.claimed) q.prog = Math.min(q.n, q.prog + amt);
    if (target) for (const h of G.active || []) if (!h.done && ((h.kind === 'boss' && stat === 'bosses') || (h.kind === 'mob' && stat === 'kills')) && h.target === target) { h.prog = Math.min(h.n, (h.prog || 0) + 1); if (h.prog >= h.n) { h.done = true; if (this.mode === 'dungeon') this.effects.text(this.player.x, this.player.y - 28, `토벌 완료: ${h.name}`, '#ffd84a', true); } }
  }
  guildPay(n, what) { this.save.bank += n; writeSave(this.save); SFX.play('buy'); return [`${what} — ${CUR.name} +${n}`, CUR.color]; }
  claimQuest(q) { if (q.claimed) return ['이미 받은 보상입니다', '#888']; if (q.prog < q.n) return ['아직 완료하지 않았습니다', '#ff9a9a']; q.claimed = true; this.guildEvent('quests'); return this.guildPay(q.reward, '퀘스트 완료'); }
  acceptHunt(o) {
    const G = this.guild(); if (G.active.some((h) => h.id === o.id && h.day === G.day)) return ['이미 수락한 의뢰입니다', '#888'];
    if (G.huntDone.ids.includes(o.id)) return ['오늘 이미 완료한 의뢰입니다 (내일 새 의뢰가 붙어요)', '#888'];
    if (G.active.filter((h) => !h.claimed).length >= GUILD_HUNT.maxActive) return [`의뢰는 동시에 ${GUILD_HUNT.maxActive}개까지 수락할 수 있습니다`, '#ff9a9a'];
    G.active.push(Object.assign({}, o, { day: G.day, prog: 0, done: false, claimed: false })); writeSave(this.save); SFX.play('ui'); return [`수락: ${o.name}`, '#9fe89f'];
  }
  claimHunt(h) { if (!h.done) return ['아직 토벌하지 못했습니다', '#ff9a9a']; h.claimed = true; const G = this.guild(); if (h.day === G.day && !G.huntDone.ids.includes(h.id)) G.huntDone.ids.push(h.id); G.active = G.active.filter((x) => x !== h); this.guildEvent('hunts'); return this.guildPay(h.reward, '토벌 완료'); }
  buySupply(id) {
    const G = this.guild(), S = GUILD_SUPPLIES.find((x) => x.id === id), sv = this.save;
    if (G.bought.includes(id)) return ['오늘은 이미 샀습니다', '#888']; if (sv.bank < S.price) { SFX.play('deny'); return [`${CUR.name}이 부족합니다`, '#ff9a9a']; }
    sv.bank -= S.price; G.bought.push(id); sv.supplies = (sv.supplies || []).concat([id]); this.guildEvent('trades'); writeSave(sv); SFX.play('buy'); return [`${S.name} 구매 — 다음 탐험에 적용됩니다`, '#9fe89f'];
  }
  applySupplies() {
    const sv = this.save, list = sv.supplies || [], p = this.player; if (!list.length) return;
    for (const id of list) {
      if (id === 's_bless') pick(DATA_BUFFS).apply(p);
      else if (id === 's_whet' && p.weapons[0]) p.weapons[0].lv = Math.min(BALANCE.upgrade.maxLevel, (p.weapons[0].lv || 0) + 1);
      else if (id === 's_purse') this.gold += 80;
      else if (id === 's_mana') { p.maxEnergy += 60; p.energy = p.maxEnergy; }
      else if (id === 's_amulet') { p.maxHp += 30; p.hp = p.maxHp; }
    }
    sv.supplies = []; writeSave(sv);
  }
  gambleStart() { // 판돈을 내고 결정석 3개를 섞어 둠 (고르기 전에 창을 닫거나 새로고침해도 결과는 그대로 → 다음에 열면 이어서 고름)
    const sv = this.save, B = GUILD_GAMBLE.bet; if (sv.bank < B) { SFX.play('deny'); return false; }
    sv.bank -= B; sv.gambleCards = shuffled(GUILD_GAMBLE.prizes.slice()); writeSave(sv); SFX.play('ui'); return true;
  }
  gamblePick(i) {
    const sv = this.save, cards = sv.gambleCards; if (!cards) return null;
    const prize = cards[i], B = GUILD_GAMBLE.bet; sv.bank += prize; sv.gambleCards = null;
    if (prize > B) { this.guildEvent('gambleWins'); SFX.play('victory'); } else SFX.play(prize > 0 ? 'coin' : 'deny');
    writeSave(sv);
    return { pick: i, cards, prize, text: prize > B ? `대박! ${CUR.name} ${prize}개 (+${prize - B})` : prize > 0 ? `${CUR.name} ${prize}개 (-${B - prize})` : `꽝… ${CUR.name} -${B}`, color: prize > B ? '#ffd84a' : prize > 0 ? '#9ad8ff' : '#ff9a9a' };
  }
  // 멀린: 보구가 없으면 '…'만, 보구를 얻은 뒤 처음 말을 걸면 정체가 드러나며 시련을 줌 → 시련을 마치면 가든 오브 아발론
  talkMerlin(npc) {
    const sv = this.save, M = sv.merlin = sv.merlin || { quest: 0, gate: 0, deep: 0 }; if (merlinGateToDeep(M, sv)) writeSave(sv);
    if (!(sv.treasures || []).length) { npc.bubble = { text: '…', t: 2 }; return; }
    if (!M.revealed) { this.playCutscene(MERLIN_REVEAL_LINES, { always: true, force: true, focus: { x: npc.x, y: npc.y }, done: () => { M.revealed = true; M.quest = 1; writeSave(sv); this.showBanner('멀린의 시련', `${MERLIN_TRIAL.gate ? `무명의 문지기 다시 쓰러뜨리기 (${M.gate}/${MERLIN_TRIAL.gate}) · ` : ''}심층 보스 처치 (${M.deep}/${MERLIN_TRIAL.deep})`, '#ffb0d8'); } }); return; }
    if (M.quest === 1) {
      if ((M.gate || 0) >= MERLIN_TRIAL.gate && (M.deep || 0) >= MERLIN_TRIAL.deep) {
        this.playCutscene(MERLIN_REWARD_LINES, { always: true, force: true, focus: { x: npc.x, y: npc.y }, done: () => {
          M.quest = 2; const T = DATA_TREASURES.find((t) => t.id === 'treasure_garden_of_avalon');
          if (!sv.treasures.includes(T.id)) sv.treasures.push(T.id); writeSave(sv); this.treasureToast = { T, start: performance.now() };
          this.effects.rays(npc.x, npc.y, '#ffb0d8', 16, 70, 1); for (let i = 0; i < 24; i++) this.effects.part(npc.x + randInt(-30, 30), npc.y + randInt(-10, 10), randInt(-10, 10), -30 - Math.random() * 30, { color: i % 2 ? '#ffb0d8' : '#ffffff', life: 1.2, size: 2, size2: 0, drag: 1, add: true }); } });
      } else npc.bubble = { text: `시련: ${MERLIN_TRIAL.gate ? `문지기 ${M.gate || 0}/${MERLIN_TRIAL.gate} · ` : ''}심층 보스 ${M.deep || 0}/${MERLIN_TRIAL.deep}`, t: 3 };
      return;
    }
    if (M.quest === 2) { // 두 번째 시련: 롱고미니아드의 인정 → 보스전 (도전 여부 선택)
      this.playCutscene(MERLIN_SPEAR_LINES, { always: true, force: true, focus: { x: npc.x, y: npc.y }, done: () => { M.quest = 3; writeSave(sv); this.askRhongoTrial(); } }); return;
    }
    if (M.quest === 3) { this.askTrial('rhongo'); return; }
    if (M.quest === 4) { /* 세 번째 퀘스트: 로드 투 카멜롯 */
      this.playCutscene(MERLIN_CAMELOT_LINES, { always: true, force: true, focus: { x: npc.x, y: npc.y }, done: () => { M.quest = 5; writeSave(sv); this.askTrial('camelot'); } }); return; }
    if (M.quest === 5) { this.askTrial('camelot'); return; }
    if (M.quest === 6) { /* 카멜롯 2층: 반전의 기사 트리스탄 */
      this.playCutscene(MERLIN_TRISTAN_LINES, { always: true, force: true, focus: { x: npc.x, y: npc.y }, done: () => { M.quest = 7; writeSave(sv); this.askTrial('camelot2'); } }); return; }
    if (M.quest === 7) { this.askTrial('camelot2'); return; }
    if (M.quest === 8) { /* 카멜롯 3층: 폭주의 기사 모드레드 */
      this.playCutscene(MERLIN_MORDRED_LINES, { always: true, force: true, focus: { x: npc.x, y: npc.y }, done: () => { M.quest = 9; writeSave(sv); this.askTrial('camelot3'); } }); return; }
    if (M.quest === 9) { this.askTrial('camelot3'); return; }
    if (M.quest === 10) { /* 카멜롯 4층: 부정의 기사 가레스 */
      this.playCutscene(MERLIN_GARETH_LINES, { always: true, force: true, focus: { x: npc.x, y: npc.y }, done: () => { M.quest = 11; writeSave(sv); this.askTrial('camelot4'); } }); return; }
    if (M.quest === 11) { this.askTrial('camelot4'); return; }
    if (M.quest === 12) { /* 카멜롯 5층: 철벽의 기사 갤러해드 */
      this.playCutscene(MERLIN_GALAHAD_LINES, { always: true, force: true, focus: { x: npc.x, y: npc.y }, done: () => { M.quest = 13; writeSave(sv); this.askTrial('camelot5'); } }); return; }
    if (M.quest === 13) { this.askTrial('camelot5'); return; }
    if (M.quest === 14) { /* 카멜롯 6층: 치열의 기사 랜슬롯 */
      this.playCutscene(MERLIN_LANCELOT_LINES, { always: true, force: true, focus: { x: npc.x, y: npc.y }, done: () => { M.quest = 15; writeSave(sv); this.askTrial('camelot6'); } }); return; }
    if (M.quest === 15) { this.askTrial('camelot6'); return; }
    if (M.quest === 16) { /* 카멜롯 7층: 철완의 기사 아그라베인 */
      this.playCutscene(MERLIN_AGRAVAIN_LINES, { always: true, force: true, focus: { x: npc.x, y: npc.y }, done: () => { M.quest = 17; writeSave(sv); this.askTrial('camelot7'); } }); return; }
    if (M.quest === 17) { this.askTrial('camelot7'); return; }
    if (M.quest === 18) { /* 카멜롯 8층: 충절의 기사 베디비어 */
      this.playCutscene(MERLIN_BEDIVERE_LINES, { always: true, force: true, focus: { x: npc.x, y: npc.y }, done: () => { M.quest = 19; writeSave(sv); this.askTrial('camelot8'); } }); return; }
    if (M.quest === 19) { this.askTrial('camelot8'); return; }
    if (M.quest === 20) { /* 카멜롯 왕좌: 로드 로그레스 [아서 왕] */
      this.playCutscene(MERLIN_ARTHUR_LINES, { always: true, force: true, focus: { x: npc.x, y: npc.y }, done: () => { M.quest = 21; writeSave(sv); this.askTrial('camelot9'); } }); return; }
    if (M.quest === 21) { this.askTrial('camelot9'); return; }
    if (this.admin) { this.askTrial(M.quest >= 21 ? 'camelot9' : M.quest >= 19 ? 'camelot8' : M.quest >= 17 ? 'camelot7' : M.quest >= 15 ? 'camelot6' : M.quest >= 13 ? 'camelot5' : M.quest >= 11 ? 'camelot4' : M.quest >= 9 ? 'camelot3' : M.quest >= 7 ? 'camelot2' : M.quest >= 5 ? 'camelot' : 'rhongo'); return; } // 관리자는 시련을 마친 뒤에도 언제든 다시 도전
    npc.bubble = { text: pick(MERLIN_CHATTER), t: 3 };
  }
  // ── 롱고미니아드의 시련: 따로 준비된 장비로 신령 롱고미니아드와 1:1 (진행 중인 탐험·보상·기록에는 영향 없음)
  //  (로드 투 카멜롯도 같은 방식: TRIALS[id]에 이름·던전·장비·대사)
  get trialDef() { return TRIALS[this.trialId] || RHONGO_TRIAL; }
  askRhongoTrial() { this.askTrial('rhongo'); }
  babylonRumorReady() { const M = this.save.merlin; return !!(M && M.quest >= 4) && !(this.save.babylon && this.save.babylon.rumor); } /* 롱고미니아드를 쓰러뜨렸고 아직 소문을 안 들음 */
  babylonOpen() { const M = this.save.merlin; return !!(M && M.quest >= 4); } /* 금빛 포탈이 나오는 조건: 롱고미니아드 처치 */
  enterBabylon() { /* [사용자 결정] 금빛 포탈: 길가메시의 왕좌로 (멀티에서는 아직 예전처럼 장면만) */
    const B = this.save.babylon = this.save.babylon || {}, first = !B.visited; B.visited = true; writeSave(this.save);
    if (this.coop) { /* 멀티: 왕좌는 아직 혼자일 때만 */
      for (const q of this.allPlayers()) q.y += 30;
      if (this.coop.host) Net.relay({ k: 'babylon' });
      this.playCutscene(BABYLON_GATE_LINES, { always: true, force: true, focus: { x: this.player.x, y: this.player.y - 30 }, done: () => { if (first) this.showBanner('빠른 이동 열림', '로비에서 + 키: 카멜롯 · 바빌로니아 (왕좌는 혼자일 때)', '#ffd84a'); } });
      return; }
    const pending = this.mode === 'dungeon' && !this.trialW ? this.settleRun() : null; /* 심층 탐험은 귀환처럼 정산해 두고 (결과는 왕좌 장면 뒤에) */
    this.startBabylonThrone(pending);
  }
  settleRun() { /* 귀환과 같은 정산 (결과 창만 나중에) */
    this.submitRunScore(true); this.guildEvent('runs'); SFX.stopMusic(); this.save.run = null; this.save.runReviveUsed = false;
    const { stages, bosses, reward } = this.runReward(true); this.save.clears++; writeSave(this.save); return { victory: true, stages, bosses, reward };
  }
  startBabylonThrone(pending) { /* 길가메시의 왕좌: 지금 캐릭터 그대로 (로비에서 바로 오면 심층 기본 장비) */
    this.babylonPending = pending || null; this.babylonFall = null;
    const fromLobby = this.mode !== 'dungeon' || !this.player || this.trialW;
    this.trialId = 'babylon'; this.trialRank = 2; this.mode = 'dungeon'; this.areaId = null;
    this.trialW = Object.assign({}, worldDef(DEEP_START + 9), BABYLON_TRIAL.W); this.worldIdx = DEEP_START + 9; this.levelIdx = STAGES_PER_WORLD - 1;
    let cp = null;
    if (fromLobby) { this.gold = 0; this.kills = 0;
      if (this.save.run && !this.save.stashRun && !this.save.run.zone) { this.save.stashRun = this.save.run; writeSave(this.save); } /* [버그 수정] 진행 중이던 탐험 기록을 따로 보관 (지하가 이어하기 칸을 덮어써서 기록이 사라지던 것) — 바빌로니아가 끝나면 되돌림 */
      this.player = this.makePlayer(0, 0); const tr = DATA_TREASURES.find((t) => t.id === this.save.treasureEquipped);
      cp = this.deepCheckpoint(this.save.selected); /* [버그 수정] 심층과 같은 캐릭터 기록 (10-4를 깬 그대로) — 직업 데이터가 사라지던 것 */
      if (cp) { this.player = this.playerFromSnapshot(this.player.hero, cp); this.useCheckpoint(this.player, cp, tr); } else if (tr) this.player.treasure = tr; }
    const p = this.player; p.fallK = 0; p.hp = p.maxHp; p.shield = p.maxShield; p.energy = p.maxEnergy;
    this.loadStage();
    const room = this.map.roomOf('boss'), c = this.map.tileCenter(room.cx, room.cy);
    this.decorateThroneHall(room); p.x = c.x; p.y = c.y + 3 * TILE; /* 왕좌 앞으로 소환 */
    const begin = () => this.playCutscene(GILGAMESH_INTRO_LINES, { always: true, force: true, focus: { x: c.x, y: (room.y0 + 3) * TILE } });
    if (fromLobby && !cp) this.askVariant(() => { this.applyDeepKit(this.player); begin(); }); else begin(); /* 기록이 없을 때만 기본 심층 장비 */
  }
  gilgameshYield(e) { /* 체력 1: 꽤 하는군 → 게이트 오브 바빌론의 사슬 → 하지만 여기까지다 → 지하로 */
    e.scripted = true; e.laser = null; e.setState('IDLE'); this.enemyBullets.length = 0; this.hazards.length = 0;
    const p = this.player; p.castLock = 99; this.addShake(0.2, 3);
    this.playCutscene(GILGAMESH_YIELD_LINES, { always: true, force: true, focus: { x: e.x, y: e.y }, done: () => {
      this.zones.push(new GateChains(p)); this.screenFlash = 0.25; this.flashColor = '255,216,74'; SFX.play('gate'); this.addShake(0.3, 4);
      this.playCutscene(GILGAMESH_FINAL_LINES, { always: true, force: true, focus: { x: p.x, y: p.y }, done: () => { this.babylonFall = { t: 0 }; SFX.play('explode'); } }); } });
  }
  updateBabylonFall(dt) { /* 바닥이 갈라지고 떨어짐 */
    const F = this.babylonFall, p = this.player; F.t += dt; p.fallK = Math.min(1, F.t / 1.3); this.addShake(0.1, 3 + 3 * p.fallK);
    if (Math.random() < 0.6) this.effects.part(p.x + randInt(-14, 14), p.y + randInt(-4, 8), randInt(-20, 20), -30 - Math.random() * 30, { color: Math.random() < 0.5 ? '#ffd84a' : '#2a48b8', life: 0.6, size: 2, size2: 0, drag: 1 });
    if (F.t >= 1.8 && !F.done) { F.done = true; this.transition = { t: 0, swapped: false, action: () => this.finishBabylon(false) }; }
  }
  finishBabylon(died) { /* 왕좌 장면 끝 → (떨어진 뒤는 아직 없음) → 심층 탐험 결과 또는 로비 */
    this.babylonFall = null; this.trialW = null; this.trialId = null; if (this.player) { this.player.fallK = 0; this.player.castLock = 0; } this.zones = []; this.enemies = []; this.enemyBullets = [];
    const P = this.babylonPending; this.babylonPending = null;
    const toEnd = () => { if (P) this.overlay = Object.assign({ type: 'result' }, P, { after: '길가메시에게 쓰러졌다… (심층 탐험 보상은 그대로)' }); else this.enterLobby(); };
    if (died) { this.restoreStashRun(); toEnd(); return; }
    if (P && P.reward) { this.save.bank += P.reward; writeSave(this.save); } /* 심층 탐험 보상은 떨어지기 전에 바로 정산 */
    this.overlay = { type: 'story', lines: BABYLON_FALL_LINES, i: 0, t: 0, done: () => { this.overlay = null; this.startBabylonUnder(P ? P.reward : 0); } };
  }
  restoreStashRun() { const sv = this.save; if (sv.stashRun) { sv.run = sv.stashRun; delete sv.stashRun; writeSave(sv); } } /* 바빌로니아 전에 진행 중이던 탐험 기록을 되돌림 */
  startBabylonUnder(paid = 0) { /* [사용자 결정] 바빌로니아 지하: 기본 무기 하나 + 1진으로 새로 시작 (사슬에 힘이 묶임) */
    const Z = ZONES.babylon_under;
    this.mode = 'dungeon'; this.trialW = null; this.trialId = null; this.areaId = Z.id; this.zoneField = 0; this.runDeep = false;
    this.cinematic = null; this.slowMo = null; this.cutin = null;
    this.worldIdx = zoneWorld(Z.id, 0).scaleWorld; this.levelIdx = 0; this.gold = 0; this.kills = 0;
    this.runStart = { stage: this.stageIndex, world: this.worldIdx, zs: 0, zf: 0 }; this.save.runReviveUsed = false;
    const p = this.player = this.makePlayer(0, 0); p.weapons.length = 1; p.slot = 0; /* 무기고 보조 무기도 없이 기본 무기만 */
    this.zoneRights = 0; /* [사용자 결정] 길가메시가 권리를 모두 빼앗음: 직업 스킬·무기·단련·거래·진화·축복·보구 — 층 보스를 쓰러뜨릴 때마다 하나씩 되찾음 */
    const tr = DATA_TREASURES.find((t) => t.id === this.save.treasureEquipped); if (tr) p.treasure = tr; /* 보구는 지니고 있지만 '보구의 권리'를 되찾기 전까지 응답하지 않음 (효과도 그때 적용) */
    this.loadStage();
    this.askVariant(() => {
      if (paid) this.showBanner('심층 탐험 보상 정산', `결정석 +${paid} (떨어지기 전에 은행에 들어감)`, '#9ad8ff');
      this.playCutscene(BABYLON_UNDER_WAKE_LINES, { id: 'babylon_under', always: true, force: true, focus: null });
    });
  }
  rollChainShard(c) { /* [사용자 결정] 금빛 사슬 조각: 바빌로니아 지하 상자에서만, 10개면 하늘의 사슬 */
    const S = CHAIN_SHARD, sv = this.save; if (sv.treasures.includes(S.treasure)) return;
    if (Math.random() >= (S[c.content] || S.chest)) return;
    sv.chainShards = Math.min(S.need, (sv.chainShards || 0) + 1); const n = sv.chainShards;
    this.effects.goldBurst(c.x, c.y - 8, 14); this.effects.ring(c.x, c.y - 6, 18, '#ffd84a'); SFX.play('gate', 0.4);
    this.effects.text(c.x, c.y - 30, `금빛 사슬 조각 ${n}/${S.need}`, '#ffd84a', true);
    if (n >= S.need) { const T = DATA_TREASURES.find((t) => t.id === S.treasure); sv.treasures.push(T.id); sv.chainShards = 0; this.treasureToast = { T, start: performance.now() };
      this.showBanner('하늘의 사슬', '금빛 사슬 조각 10개가 하나로 이어졌다 — 엔키두의 보구 (로비 보구 보관대)', '#9ae8d8'); }
    else this.showBanner(`금빛 사슬 조각 (${n}/${S.need})`, '바빌로니아에서만 얻을 수 있는 조각 — 10개를 모으면 무언가가 이어진다', '#ffd84a');
    writeSave(sv);
  }
  zoneRight(id) { const i = BABYLON_RIGHTS.findIndex((r) => r.id === id); return !this.areaId || i < 0 || (this.zoneRights || 0) > i; } /* 귀환길에서 그 권리를 되찾았는지 */
  grantZoneRight(n) { /* n번째 권리(1부터)를 되찾음 */
    const R = BABYLON_RIGHTS[n - 1], p = this.player; if (!R || (this.zoneRights || 0) >= n) return; this.zoneRights = n;
    if (R.id === 'rank1' || R.id === 'rank2') { const want = R.id === 'rank1' ? 1 : 2; while (p.rank < want) { const br = p.rank === 0 && branchesAtEvolve(p.hero.id) ? jobLines(p.hero.id).find((l) => l.id === p.lineChoice) : null; const r0 = p.rank; this.evolve(null, br || null); if (p.rank === r0) break; } }
    else if (R.id === 'bless') { const b = pick(DATA_BUFFS); b.apply(p); p.buffs.push(b.id); }
    else if (R.id === 'treasure') { if (p.treasure && p.treasure.apply) p.treasure.apply(p); p.treasureCd = 0; }
    else if (R.id === 'king') { p.maxHp += 40; p.hp += 40; p.maxEnergy += 60; p.energy = p.maxEnergy; for (const w of p.weapons) w.lv = Math.min(BALANCE.upgrade.maxLevel, (w.lv || 0) + 2); }
    this.effects.ring(p.x, p.y, 34, '#ffd84a'); this.effects.ring(p.x, p.y, 54, '#fff4c0'); this.effects.goldBurst(p.x, p.y - 6, 18); this.effects.rays(p.x, p.y, '#ffd84a', 14, 70, 0.8); SFX.play('solomon', 0.5);
    const gift = R.id === 'king'; /* 왕을 마주할 권리: 빼앗긴 게 아니라 엔키두가 새로 건넨 권리 */
    this.effects.text(p.x, p.y - 34, gift ? `${R.name} 획득` : `${R.name} 회복`, gift ? '#9ae8d8' : '#ffd84a', true);
    this.showBanner(gift ? `새로운 권리 — ${R.name} (${n}/${BABYLON_RIGHTS.length})` : `권리 회복 — ${R.name} (${n}/${BABYLON_RIGHTS.length})`, R.desc, gift ? '#9ae8d8' : '#ffd84a');
  }
  babylonUnderBoss(c, W) { /* 귀환길 필드 보스 처치: 위로 올라가거나 귀환 · 지구라트 4-4 길가메시를 쓰러뜨리면 끝 */
    this.props.push(new Chest(c.x, c.y - 24, 'boss'));
    if (W.finalField) {
      const B = this.save.babylon = this.save.babylon || {}; B.gilgameshDown = (B.gilgameshDown || 0) + 1; writeSave(this.save);
      this.portals.push(new Portal(c.x, c.y + 24, () => this.endRun(true), '원래 세계로 — 귀환', [255, 216, 74]));
      this.effects.rays(c.x, c.y, '#ffd84a', 20, 120, 1.2); this.screenFlash = 0.25; this.flashColor = '255,216,74'; SFX.play('gate', 0.6);
      this.playCutscene(GILGAMESH_UNDER_WIN_LINES, { id: 'gilgamesh_under_win', always: true, focus: { x: c.x, y: c.y }, done: () => { /* 왕의 하사품: 하늘의 황소의 뿔 */
        const T = DATA_TREASURES.find((t) => t.id === 'treasure_bull_horn'); if (T && !this.save.treasures.includes(T.id)) { this.save.treasures.push(T.id); writeSave(this.save); this.treasureToast = { T, start: performance.now() }; }
        this.showBanner('왕의 하사품 — 하늘의 황소의 뿔', '로비의 보구 보관대에서 장착할 수 있어요', '#ff8a5a'); } });
      return; }
    this.grantZoneRight(this.zoneField + 1); /* 층 보스를 꺾음: 빼앗긴 권리 하나를 되찾음 */
    if (W.boss === 'boss_clay_enkidu') { const FW = this.data.weapons.get('weapon_friendchain_001'); /* [사용자 결정] 진흙의 엔키두: 길가메시 사냥 특화 고유 무기를 남김 */
      if (FW) { this.pickups.push(new Pickup('weapon', c.x, c.y - 52, { def: FW, still: true })); this.discover(FW.id); this.effects.skyBeam(c.x, c.y - 52, '#9ae8d8', 0, 10); this.effects.rays(c.x, c.y - 52, '#9ae8d8', 16, 70, 1); }
      this.playCutscene(ENKIDU_GIFT_LINES, { id: 'enkidu_gift', focus: { x: c.x, y: c.y - 40 } }); }
    const nf = this.zoneField + 1, next = zoneWorld(this.areaId, nf);
    this.portals.push(new Portal(c.x + 26, c.y + 24, () => this.advanceStage(), `${zoneLabel(this.areaId, nf, 0)} ${next.name}`, next.finalField ? [255, 216, 74] : [58, 200, 184]));
    this.portals.push(new Portal(c.x - 26, c.y + 24, () => this.endRun(true), '귀환 (탐험 종료)', [255, 210, 90]));
    if (this.zoneField === 0) this.playCutscene(BABYLON_UNDER_CLEAR_LINES, { id: 'babylon_under_clear', always: true, focus: { x: c.x, y: c.y } }); /* 라마수: 수문 너머로 위층 계단 */
    if (next.finalField) this.showBanner('왕좌의 방으로 이어지는 계단', '이 위에 — 그가 있다', '#ffd84a');
  }
  camelotFloors() { /* 갈 수 있는 카멜롯 층 (멀린의 시련 진행도: N층은 quest >= 3 + 2N) */
    const q = (this.save.merlin && this.save.merlin.quest) || 0, out = [];
    for (let n = 1; n <= 9; n++) if (q >= 3 + 2 * n) out.push(n === 1 ? 'camelot' : 'camelot' + n); return out; }
  askTrial(id) { this.overlay = { type: 'trial_confirm', id }; this.input.mouse.down = false; }
  startRhongoTrial(rank = 2) { this.startQuestTrial('rhongo', rank); }
  startQuestTrial(id, rank = 2) { /* rank: 고른 진화 단계 0~2 (1진·2진·3진) */
    const T = TRIALS[id] || RHONGO_TRIAL; this.trialId = T.id;
    rank = clamp(rank | 0, 0, 2); this.trialRank = rank;
    this.mode = 'dungeon'; this.trialW = Object.assign({}, worldDef(T.world), T.W);
    this.worldIdx = T.world; this.levelIdx = STAGES_PER_WORLD - 1; this.gold = 0; this.kills = 0;
    const p = this.player = this.makePlayer(0, 0), K = T.kit;
    const tr = DATA_TREASURES.find((t) => t.id === this.save.treasureEquipped); if (tr) { p.treasure = tr; if (tr.apply) tr.apply(p); }
    const kit = () => { /* 시련 장비: 고른 진화 단계 + 영웅·전설 무기(강화) + 체력·버프 */
      if (p.line) this.setJob(p, p.line, rank); p.skillCooldown = 0;
      p.maxHp += K.hp; for (let i = 0; i < rank; i++) { p.maxHp += EVOLUTION.hp[i]; p.maxEnergy += EVOLUTION.energy[i]; } p.hp = p.maxHp; p.energy = p.maxEnergy;
      p.weapons = K.rarity.map((r) => new WeaponInstance(pick(DATA_WEAPONS.filter((d) => d.rarity === r && !d.questOnly)), K.lv)); p.slot = 0; // 기본값 (테스트 도구용)
      for (const b of shuffled(DATA_BUFFS).slice(0, K.buffs)) { b.apply(p); p.buffs.push(b.id); }
      if (window.__toolMode) { for (let i = 0; i < (K.picks || 0); i++) { const b = this.trialBuffOptions()[0]; b.apply(p); p.buffs.push(b.id); } return; } // 테스트 도구: 고르기 대신 무작위
      this.overlay = { type: 'trial_weapons', tab: 0, page: 0, picked: [], msg: null }; this.input.mouse.down = false; // 보스전 전에 무기 2개 고르기
    };
    this.loadStage();
    this.askVariant(kit, rank); /* 갈래 창도 고른 진화 단계의 이름·스킬로 */
  }
  pickTrialWeapons(ids) { // 고른 무기 (도감에서 발견한 것 중 최대 2개, 모두 +강화)
    const p = this.player, T = this.trialDef, K = T.kit;
    p.weapons = ids.map((id) => new WeaponInstance(this.data.weapons.get(id), K.lv)); p.slot = 0;
    this.overlay = null; this.input.mouse.down = false;
    if (K.picks) { this.trialBuffPick(K.picks, K.picks); return; } /* 카멜롯: 무기를 고른 뒤 축복 3개 중 1개 고르기를 여러 번 */
    this.showBanner(T.W.name, `${p.line ? p.line.ranks[p.rank] + (p.rank === 2 ? '(최종 진화)' : `(${p.rank + 1}진)`) + ' · ' + p.skillName + ' · ' : ''}${p.weapons.map((w) => w.def.name).join(' + ')} (+${K.lv})`, T.color);
  }
  trialBuffOptions() { const owned = new Set(this.player.buffs); return shuffled(DATA_BUFFS.filter((b) => !owned.has(b.id) || b.id === 'buff_atk' || b.id === 'buff_hp')).slice(0, 3); }
  trialBuffPick(left, total) { /* 시련 시작 축복 고르기: 3개 중 1개 × total번 → 끝나면 장비 안내 */
    const p = this.player, T = this.trialDef, K = T.kit;
    if (left <= 0) { this.showBanner(T.W.name, `${p.line ? p.line.ranks[p.rank] + (p.rank === 2 ? '(최종 진화)' : `(${p.rank + 1}진)`) + ' · ' + p.skillName + ' · ' : ''}${p.weapons.map((w) => w.def.name).join(' + ')} (+${K.lv}) · 축복 ${total}개`, T.color); return; }
    this.overlay = { type: 'buff', options: this.trialBuffOptions(), title: `${T.title} — 축복 고르기 (${total - left + 1}/${total})`, after: () => this.trialBuffPick(left - 1, total) }; this.input.mouse.down = false;
  }
  endRhongoTrial(win) { this.endTrial(win); }
  endTrial(win) {
    const M = this.save.merlin, T = this.trialDef; SFX.stopMusic();
    if (win) { M.quest = Math.max(M.quest || 0, T.questDone || 0); this.save.bank += T.reward || 0;
      const TT = T.treasure && DATA_TREASURES.find((t) => t.id === T.treasure); if (TT) { if (!this.save.treasures.includes(TT.id)) this.save.treasures.push(TT.id); this.treasureToast = { T: TT, start: performance.now() }; } }
    this.guildEvent('runs'); writeSave(this.save);
    this.overlay = { type: 'result', victory: win, stages: 0, bosses: 0, reward: 0, trial: true, trialId: T.id };
  }
  // ── 관리자 계정: 직업·무기·보구·이야기·직업 레벨 전부 해금, 결정석 넉넉히 (로그인할 때마다 다시 채움)
  applyAdmin() {
    const s = this.save;
    s.unlocked = DATA_HEROES.map((h) => h.id); s.discovered = DATA_WEAPONS.map((d) => d.id); s.armory = DATA_WEAPONS.map((d) => d.id);
    s.bank = Math.max(s.bank || 0, 999999); s.treasures = DATA_TREASURES.map((t) => t.id); if (!s.treasureEquipped) s.treasureEquipped = 'treasure_excalibur';
    s.sanctumReached = true; s.prologueSeen = true; s.merlin = Object.assign({ gate: 1, deep: 2 }, s.merlin, { revealed: true, quest: Math.max(4, (s.merlin && s.merlin.quest) || 0) });
    s.jobLv = {}; for (const h of DATA_HEROES) s.jobLv[h.id] = BALANCE.jobLevel.max;
    s.scenesSeen = ['origin_arrival', 'gatekeeper_intro', 'gatekeeper_fall'];
    writeSave(s);
  }
  // 관리자 메뉴 (` 키): 숫자 키로 실행
  adminActions() {
    const A = this.admin, d = this.mode === 'dungeon', p = this.player;
    return [
      { name: `무적 ${A.god ? '[켜짐]' : '[꺼짐]'}`, run: () => { A.god = !A.god; } },
      { name: `쿨타임 없음 (스킬·보구) ${A.nocd ? '[켜짐]' : '[꺼짐]'}`, run: () => { A.nocd = !A.nocd; } },
      { name: '체력·보호막·에너지 모두 회복', ok: d, run: () => { p.hp = p.maxHp; p.shield = p.maxShield; p.energy = p.maxEnergy; } },
      { name: '던전 골드 +5000', ok: d && !this.trialW, run: () => { this.gold += 5000; } },
      { name: '다음 진화 단계로', ok: d && p.line && p.rank < 2, run: () => this.evolve() },
      { name: '이 필드의 보스 스테이지로', ok: d && !this.trialW && !this.isBossStage, run: () => { this.levelIdx = STAGES_PER_WORLD - 1; this.loadStage(); } },
      { name: `다음 필드로 (${stageLabel(this.worldIdx + 1, 0)})`, ok: d && !this.trialW, run: () => { this.worldIdx++; this.levelIdx = 0; this.loadStage(); } },
      { name: '결정석 999,999로 채우기', run: () => { this.save.bank = 999999; writeSave(this.save); } },
      { name: '롱고미니아드의 시련 바로 시작', ok: !this.trialW, run: () => { this.transition = { t: 0, swapped: false, action: () => this.startQuestTrial('rhongo') }; } },
      { name: '로드 투 카멜롯 바로 시작', ok: !this.trialW, run: () => { this.transition = { t: 0, swapped: false, action: () => this.startQuestTrial('camelot') }; } },
      { name: '카멜롯 2층 (트리스탄) 바로 시작', ok: !this.trialW, run: () => { this.transition = { t: 0, swapped: false, action: () => this.startQuestTrial('camelot2') }; } },
      { name: '카멜롯 3층 (모드레드) 바로 시작', ok: !this.trialW, run: () => { this.transition = { t: 0, swapped: false, action: () => this.startQuestTrial('camelot3') }; } },
      { name: '카멜롯 4층 (가레스) 바로 시작', ok: !this.trialW, run: () => { this.transition = { t: 0, swapped: false, action: () => this.startQuestTrial('camelot4') }; } },
      { name: '카멜롯 5층 (갤러해드) 바로 시작', ok: !this.trialW, run: () => { this.transition = { t: 0, swapped: false, action: () => this.startQuestTrial('camelot5') }; } },
      { name: '카멜롯 6층 (랜슬롯) 바로 시작', ok: !this.trialW, run: () => { this.transition = { t: 0, swapped: false, action: () => this.startQuestTrial('camelot6') }; } },
      { name: '카멜롯 7층 (아그라베인) 바로 시작', ok: !this.trialW, run: () => { this.transition = { t: 0, swapped: false, action: () => this.startQuestTrial('camelot7') }; } },
      { name: '카멜롯 8층 (베디비어) 바로 시작', ok: !this.trialW, run: () => { this.transition = { t: 0, swapped: false, action: () => this.startQuestTrial('camelot8') }; } },
      { name: '카멜롯 왕좌 (아서 왕) 바로 시작', ok: !this.trialW, run: () => { this.transition = { t: 0, swapped: false, action: () => this.startQuestTrial('camelot9') }; } }
    ];
  }
  // ── 멀티 (1단계): 내 위치를 보내고, 다른 사람 위치를 부드럽게 따라감
  // ── 단체 입장: 방 사람이 모두 같은 포탈(던전·심층)에 모이면 3초 뒤 함께 출발 (방장이 계산해 알림, 방장은 E로 바로 출발)
  gatherMembers(po) { // 이 포탈 위에 서 있는 사람 수 (나 + 로비에 있는 동료)
    const R = 22, me = this.player; let n = Math.hypot(me.x - po.x, me.y - po.y) < R ? 1 : 0;
    for (const P of Net.peers.values()) if (P.mode === 'lobby' && Net.players.some((q) => q.id === P.id) && Math.hypot(P.tx - po.x, P.ty - po.y) < R) n++;
    return n;
  }
  updateGather(dt, input) {
    const total = Net.players.length; this.gather = this.gather || {};
    if (!Net.isHost) return; // 참가자: 방장이 보내 준 상태를 그리기만
    let best = null, bn = 0; for (const po of this.portals) if (po.group) { const n = this.gatherMembers(po); if (n > bn) { bn = n; best = po; } }
    const G = this.gather, meOn = best && Math.hypot(this.player.x - best.x, this.player.y - best.y) < 22;
    const go = () => { const po = G.po; this.gather = {}; Net.relay({ k: 'gather', label: null }); if (this.save.run && po.group === 'run') { this.overlay = { type: 'resume' }; this.player.y += 22; } else this.transition = { t: 0, swapped: false, action: po.onEnter }; };
    if (best && bn >= total) { if (G.po !== best || G.t === undefined) { G.po = best; G.t = 3; SFX.play('ui'); } G.t -= dt; if (G.t <= 0) { go(); return; } }
    else { G.po = bn ? best : null; G.t = undefined; }
    if (meOn && input.wasPressed('KeyE') && bn >= 1) { G.po = best; go(); return; } // 방장: 다 안 모여도 바로 출발 (방 사람 모두 함께)
    G.n = bn; G.total = total; G.sendT = (G.sendT || 0) - dt;
    const key = (G.po ? G.po.label : '') + bn + total + (G.t !== undefined ? Math.ceil(G.t) : '');
    if (G.sendT <= 0 || key !== G.key) { G.sendT = 1; G.key = key; Net.relay({ k: 'gather', label: G.po ? G.po.label : null, n: bn, total, t: G.t !== undefined ? Math.ceil(G.t) : null }); }
  }
  renderGather(ctx) { // 포탈 위 안내 (월드 좌표)
    if (this.mode !== 'lobby' || !Net.inRoom || Net.players.length < 2) return;
    const G = this.gather || {}, total = Net.players.length, label = G.po ? G.po.label : G.label;
    for (const po of this.portals) if (po.group) {
      const on = label === po.label, n = on ? (G.n || 0) : 0, t = on ? (G.t !== undefined && G.t !== null ? Math.ceil(G.t) : null) : null;
      const x = Math.round(po.x), y = Math.round(po.y) - 58; // 포탈 이름 위쪽
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 56, y - 2, 112, t ? 13 : 21);
      hudText(ctx, t ? `${t}초 뒤 함께 출발!` : `단체 입장 ${n}/${total}`, x, y, t ? '#7affc0' : n ? '#ffd27a' : '#c8c8d8', 'center', 8);
      if (!t) hudText(ctx, Net.isHost ? '모두 모이면 출발 · E: 지금 출발' : '모두 모이면 함께 출발', x, y + 11, '#aaa', 'center', 6);
      if (on && n) { ctx.strokeStyle = t ? '#7affc0' : '#ffd27a'; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(this.time * 6); ctx.beginPath(); ctx.arc(x, Math.round(po.y), 22, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    }
  }
  updateNet(dt) {
    if (!Net.inRoom) return;
    const p = this.player; this.netT = (this.netT || 0) - dt;
    if (this.netT <= 0 && p && !document.hidden) { this.netT = 1 / NET_CONFIG.sendHz; // 탭을 내려 두면 보내지 않음
      const msg = { k: 'pos', x: Math.round(p.x), y: Math.round(p.y), f: p.faceVis < 0 ? -1 : 1, h: p.hero.id, l: p.line && p.line.look ? p.line.look : null, sk: this.skinSprite(p.hero.id, this.playerLineId(p)), m: this.mode, mv: !!p.moving }, key = JSON.stringify(msg);
      this.netIdle = key === this.netLast ? (this.netIdle || 0) + 1 / NET_CONFIG.sendHz : 0;
      if (key !== this.netLast || this.netIdle >= NET_CONFIG.idleSend) { Net.relay(msg); this.netLast = key; this.netIdle = 0; } } // 바뀌었을 때만 (가만히 있으면 가끔)
    for (const P of Net.peers.values()) { const k = Math.min(1, dt * 12); P.x += (P.tx - P.x) * k; P.y += (P.ty - P.y) * k; }
  }
  netName() { return this.profile ? this.profile.name : '게스트'; }
  peerActors() { // 같은 화면(지금은 로비)에 있는 다른 사람들
    if (!Net.inRoom || this.mode !== 'lobby') return [];
    const out = [];
    for (const P of Net.peers.values()) { if (P.mode !== 'lobby' || performance.now() - P.seen > 8000) continue;
      const base = this.data.heroes.get(P.hero) || DATA_HEROES[0], sk = skinSpriteOk(P.sk), hero = P.look || sk ? heroWithLook(base, Object.assign({}, P.look || {}, sk ? { sprite: sk } : {})) : base, name = Net.nameOf(P.id), t = this.time; /* 동료 스킨 */
      out.push({ y: P.y, render: (ctx) => { const spr = heroSprite(hero, P.moving ? Math.floor(t * 8) % 2 : 0); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(Math.round(P.x), Math.round(P.y) + 7, 6, 2, 0, 0, TAU); ctx.fill();
        drawSprite(ctx, spr, P.x, P.y + 7, { flip: P.face < 0 }); hudText(ctx, name, Math.round(P.x), Math.round(P.y) - 20, '#7affc0', 'center', 7); } }); }
    return out;
  }
  // ── 랭킹판: 탐험이 끝나면 기록을 보냄 (계정이 있을 때만, 관리자 계정·시련 제외)
  runScoreRow(victory, o = {}) {
    const W = this.W, stage = o.stage ?? this.stageIndex + 1;
    return { name: this.profile ? this.profile.name : '', hero: this.save.selected, stage, label: o.label || stageLabel(this.worldIdx, this.levelIdx), deep: o.deep ?? (W && W.deep ? W.depth : 0), kills: o.kills ?? this.kills, victory: !!victory,
      partySize: o.partySize || (this.coop && this.coop.host ? this.partyCount() : 1), partyNames: o.partyNames || (this.coop && this.coop.host ? Net.players.map((p) => p.name) : null), title: this.myTitleId() };
  }
  submitRunScore(victory, o) { if (!this.profile || this.admin || this.trialW || (this.areaId && !o)) return; /* 바빌로니아 지하는 랭킹 도달 기록에 넣지 않음 */ if (!o) { this.save.bestKills = Math.max(this.save.bestKills || 0, this.kills); writeSave(this.save); } Net.submitScore(this.runScoreRow(victory, o)); }
  backfillScore() { // 지금까지의 최고 도달·심층·한 판 처치 (계정마다 한 번)
    const s = this.save; if (!this.profile || this.admin || s.scoreBackfill || !Net.httpBase() || !(s.bestStage > 0)) return;
    const n = s.bestStage; s.scoreBackfill = 1; writeSave(s);
    Net.submitScore({ name: this.profile.name, hero: s.selected, stage: n, label: stageLabel(Math.floor((n - 1) / STAGES_PER_WORLD), (n - 1) % STAGES_PER_WORLD), deep: s.bestDeep || 0, kills: s.bestKills || 0, victory: (s.clears || 0) > 0, partySize: 1, title: this.myTitleId() });
  }
  openRanking() {
    const o = this.overlay = { type: 'rank', tab: 0, data: null, err: null, loading: true }; this.input.mouse.down = false;
    const tp = this.profile && !this.admin ? Net.postTitle(this.profile.name, this.myTitleId()) : Promise.resolve(); /* 이미 얻은 칭호도 랭킹에 반영 */
    tp.then(() => Net.flushScores()).catch(() => {}).then(() => Net.syncScores()).then((d) => { o.data = d; o.loading = false; }).catch((e) => { o.err = Net.scoreErr(e); o.loading = false; }); // 서버가 초기화됐으면 이 브라우저의 사본으로 복구
  }
  applyDeepKit(p) { // 로비에서 바로 심층에 들어갈 때의 시작 장비 (BALANCE.deepStart)
    const K = BALANCE.deepStart;
    if (p.line && p.rank < 2) { if (p.rank < 1) { p.maxHp += EVOLUTION.hp[0]; p.maxEnergy += EVOLUTION.energy[0]; } p.maxHp += EVOLUTION.hp[1]; p.maxEnergy += EVOLUTION.energy[1]; this.setJob(p, p.line, 2); p.skillCooldown = 0; }
    p.maxHp += K.hp; p.hp = p.maxHp; p.energy = p.maxEnergy;
    p.weapons = K.rarity.map((r) => new WeaponInstance(pick(DATA_WEAPONS.filter((d) => d.rarity === r && !d.questOnly)), K.lv)); p.slot = 0;
    for (const id of p.weapons.map((w) => w.def.id)) this.discover(id);
    for (const b of shuffled(DATA_BUFFS).slice(0, K.buffs)) { b.apply(p); p.buffs.push(b.id); }
    if (p === this.player) this.showBanner('심층 입장', `최종 진화 · ${p.weapons.map((w) => w.def.name).join(' + ')} (+${K.lv}) · 축복 ${K.buffs}개`, '#9ad8ff');
  }
  // [사용자 결정] 심층 입장 기록: 직업 안에서도 진화 루트(계열)마다 따로 — 키 '직업|계열'
  deepKey(heroId, lineId) { return heroId + '|' + (lineId || this.chosenLine(heroId).id); }
  deepCps() { /* 예전 기록(직업만 키)은 그 기록의 계열로 옮김 */
    const c = this.save.deepCheckpoints = this.save.deepCheckpoints || {}; let moved = false;
    for (const k of Object.keys(c)) if (!k.includes('|')) { const cp = c[k]; delete c[k]; moved = true; if (cp && typeof cp === 'object' && this.data.heroes.get(k)) { const nk = this.deepKey(k, cp.line || null); if (!c[nk] || (c[nk].t || 0) < (cp.t || 0)) c[nk] = cp; } }
    if (moved) writeSave(this.save); return c; }
  deepCheckpoint(heroId, lineId) { return this.deepCps()[this.deepKey(heroId, lineId)] || null; } // 직업·계열마다 10-4를 깼을 때의 캐릭터
  deepEntryHero() { // 로비에서 심층 입장: 고른 직업·진화 루트에 10-4 기록이 없으면 가장 최근에 10-4를 깬 직업·계열로 바꿈 → 바꿨으면 그 직업 id
    const c = this.deepCps(); if (c[this.deepKey(this.save.selected)]) return null;
    let best = null; for (const [k, cp] of Object.entries(c)) { const [hid, lid] = k.split('|'); if (cp && typeof cp === 'object' && this.data.heroes.get(hid) && jobLines(hid).some((l) => l.id === lid) && (!best || (cp.t || 0) > (c[best].t || 0))) best = k; }
    if (!best) return null; const [hid, lid] = best.split('|');
    this.save.selected = hid; this.save.lineChoice = this.save.lineChoice || {}; this.save.lineChoice[hid] = lid; writeSave(this.save); /* 그 기록의 진화 루트로 */
    return hid;
  }
  useCheckpoint(p, cp, tr) { // 체력·에너지 가득, 보구는 지금 장착한 것
    p.hp = p.maxHp; p.energy = p.maxEnergy; p.shield = p.maxShield; p.skillCooldown = 0;
    p.treasure = tr || null; if (tr && tr.apply) tr.apply(p);
    if (p === this.player) for (const w of p.weapons) this.discover(w.def.id);
  }
  skinOnMap() { /* 예전 장착 기록(직업 키)을 직업·계열 키로 옮김 */
    const sv = this.save, M = sv.skinOn = sv.skinOn || {};
    for (const k of Object.keys(M)) if (!k.includes('|')) { const K = SKINS.find((q) => q.id === M[k] && q.hero === k); if (K && K.line) { M[skinKey(K)] = K.id; delete M[k]; } }
    return M; }
  skinSprite(heroId, lineId) { /* 이 직업·계열에 켜 둔 스킨의 외형 이름 (없으면 null) — lineId를 안 주면 로비에서 고른 진화 루트 기준 */
    const lid = lineId === undefined ? this.chosenLine(heroId).id : lineId, M = this.skinOnMap(), own = this.save.skins || [];
    const K = SKINS.find((k) => k.hero === heroId && (!k.line || k.line === lid) && own.includes(k.id) && M[skinKey(k)] === k.id); return K ? K.sprite : null; }
  chosenLine(heroId) { /* [사용자 결정] 로비에서 고른 진화 루트 (없으면 첫 갈래) */
    const lines = jobLines(heroId), id = this.save.lineChoice && this.save.lineChoice[heroId]; return lines.find((l) => l.id === id) || lines[0]; }
  playerLineId(p) { return p.line ? p.line.id : this.mode === 'lobby' ? this.chosenLine(p.hero.id).id : null; } /* 스킨 판정용: 로비에서는 고른 진화 루트 */
  redeemGift(code) { /* 선물 코드 입력 → [문구, 색] */
    code = String(code || '').trim().toUpperCase(); if (!code) return ['코드를 입력해 주세요', '#ff9a9a'];
    const G = GIFT_CODES.find((g) => g.hash === giftHash(code)); if (!G) return ['올바르지 않은 코드입니다', '#ff9a9a'];
    const sv = this.save; sv.giftsUsed = sv.giftsUsed || []; sv.skins = sv.skins || []; sv.skinOn = sv.skinOn || {};
    if (sv.giftsUsed.includes(G.hash)) return ['이미 받은 선물입니다', '#ffb07a'];
    sv.giftsUsed.push(G.hash); const K = SKINS.find((k) => k.id === G.skin);
    if (K && !sv.skins.includes(K.id)) sv.skins.push(K.id); if (K) this.skinOnMap()[skinKey(K)] = K.id; /* 받자마자 켬 */
    writeSave(sv); SFX.play('victory'); if (this.profile == null) return [`스킨 '${K.name}' 획득! (게스트는 저장되지 않아요)`, '#ffd84a'];
    return [`스킨 '${K ? K.name : '?'}' 획득! — ${K ? this.data.heroes.get(K.hero).name : ''} 외형이 바뀝니다 (Esc → K로 켜기/끄기)`, '#ffd84a'];
  }
  myTitleId() { const T = this.save.title && GUILD_TITLES.find((t) => t.id === this.save.title); return T && this.titleUnlocked(T) && !this.admin ? T.id : ''; } /* 랭킹에 보낼 장착 칭호 (얻은 것만) */
  titleUnlocked(T) { if (this.admin) return true; return T.test(this.save.stats || {}, this.save); }
  visibleTitles() { return GUILD_TITLES.filter((T) => !T.hidden || this.titleUnlocked(T)); } /* 히든 칭호는 얻은 뒤에만 목록에 나옴 */
  discover(id) { if (!this.save.discovered.includes(id)) { this.save.discovered.push(id); writeSave(this.save); } }
  resetWorldLists(map) {
    this.map = map;
    this.enemies = []; this.projectiles = []; this.enemyBullets = []; this.pickups = [];
    this.props = []; this.portals = []; this.hazards = []; this.allies = []; this.zones = []; this.corpses = []; /* corpses: 망자의 파수기가 터뜨릴 시체 */
    this.activeRoom = null; this.effects.clear(); this.interactTarget = null;
    this.flow = new Int16Array(map.width * map.height).fill(-1); this.flowTile = -1;
  }

  // ── 로비
  enterLobby() {
    Net.wake(); // 로비에 오면 서버를 미리 깨움 (10분에 한 번까지)
    SFX.stopMusic(); this.cinematic = null; this.slowMo = null; this.trialW = null; this.areaId = null;
    this.mode = 'lobby'; this.overlay = null;
    this.worldIdx = 0; this.levelIdx = 0;
    this.resetWorldLists(buildLobby());
    const sp = this.map.tileCenter(17, 14);
    this.player = this.makePlayer(sp.x, sp.y);
    DATA_HEROES.forEach((h, i) => { const c = this.map.tileCenter(6 + i * 3, 8); this.props.push(new Pedestal(c.x, c.y, h, i % 2)); });
    const cb = this.map.tileCenter(5, 12); this.props.push(new CodexBoard(cb.x, cb.y));
    { const ms = this.map.tileCenter(28, 16); this.props.push(new MultiStone(ms.x, ms.y)); } // 멀티 플레이 석판
    { const rb = this.map.tileCenter(5, 16); this.props.push(new RankBoard(rb.x, rb.y)); } // 명예의 전당
    const ar = this.map.tileCenter(9, 16); this.props.push(new Armory(ar.x, ar.y));
    if (this.save.sanctumReached) { const tv = this.map.tileCenter(25, 16); this.props.push(new TreasureVault(tv.x, tv.y)); }
    const dm = this.map.tileCenter(28, 12);
    this.enemies.push(new Enemy(dm.x, dm.y, this.data.enemies.get('dummy_001'), { hp: 1, dmg: 1 }, this.map.startRoom));
    // 탐험가 길드 (아래쪽)
    const gp = (tx, ty) => this.map.tileCenter(tx, ty);
    this.props.push(new GuildCounter(27 * TILE, 23 * TILE, 29 * TILE, 35 * TILE)); // 오른쪽 벽을 따라 세로로 긴 접수대
    { const c = gp(26, 27); this.props.push(new GuildClerk(c.x, c.y, 'quest', 'reception', 29.6 * TILE)); }  // 퀘스트·칭호 접수원 (카펫 끝)
    { const c = gp(26, 32); this.props.push(new GuildClerk(c.x, c.y, 'trade', 'clerk2', 29.6 * TILE)); }    // 보급품 접수원
    this.props.push(new WallBoard(7.5 * TILE, 22 * TILE, 'hunt'), new WallBoard(23 * TILE, 22 * TILE, 'notice')); // 벽에 붙은 게시판
    const tbl = (tx, ty, seats, o) => this.props.push(new GuildTable((tx + 1) * TILE, ty * TILE + 8, seats, o));
    tbl(6, 26, [[-22, 'a'], [22, 'b']], { line: GUILD_CHATTER[0], rumor: true }); /* 바빌로니아 소문 탁자 */
    tbl(6, 31, [[-22, 'c'], [22, null]], { line: GUILD_CHATTER[3] });
    tbl(20, 26, [[-22, 'd'], [22, 'e']], { line: GUILD_CHATTER[1] });
    tbl(20, 31, [[-22, 'f'], [22, 'dealer']], { gamble: true });
    tbl(10, 34, [[-22, 'b'], [22, 'a']], { line: GUILD_CHATTER[2] });
    { const t = new MerlinTable(24 * TILE, 34 * TILE + 8); this.props.push(t); } // 오른쪽 구석: 후드를 쓴 마법사
    this.props.push(new StoryShelf(3 * TILE + 8, 30 * TILE)); // 왼쪽 벽: 이야기 기록 책장
    this.guild(); // 오늘의 퀘스트·의뢰·진열 준비
    const pc = this.map.tileCenter(17, 18);
    this.portals.push(new Portal(pc.x, pc.y, () => this.startRun(), '던전 입장')); this.portals[this.portals.length - 1].group = 'run'; // 멀티: 단체 입장
    if (this.save.sanctumReached) { const dc = this.map.tileCenter(21, 18); this.portals.push(new Portal(dc.x, dc.y, () => this.startRun(true), '심층 입장', [120, 200, 255])); this.portals[this.portals.length - 1].group = 'deep'; } // 심층을 열면 로비에서 바로 심층으로
    this.snapCamera();
    this.showBanner('로비', '캐릭터를 고르고 포탈로 들어가세요');
  }
  selectHero(hero) {
    const s = this.save;
    if (!s.unlocked.includes(hero.id)) {
      if (s.bank < hero.price) { this.effects.text(this.player.x, this.player.y - 18, `${CUR.name}이 부족합니다`, '#ff7070'); return; }
      s.bank -= hero.price; s.unlocked.push(hero.id);
      this.effects.burst(this.player.x, this.player.y, '#ffd84a', 14);
    }
    s.selected = hero.id; writeSave(s);
    const { x, y } = this.player;
    this.player = this.makePlayer(x, y);
    this.discover(hero.startWeapon);
    this.banner = null; // 캐릭터 교체 시 안내 배너는 생략하고, 선택한 단상에서 E로 상세 정보 확인
  }

  // ── 런 진행
  startRun(deep = false) {
    this.mode = 'dungeon'; this.trialW = null; this.areaId = null; this.runDeep = !!deep;
    this.worldIdx = deep ? DEEP_START : 0; this.levelIdx = 0; this.gold = deep ? BALANCE.deepStart.gold : 0; this.kills = 0; // 심층 입장: 심층 1번째 필드부터
    this.runStart = { stage: this.stageIndex, world: this.worldIdx }; // 이번 탐험을 시작한 곳 (결정석은 실제로 깬 스테이지·보스만)
    this.save.runReviveUsed = false; // 새 탐험마다 부활 기회 초기화
    const switched = deep ? this.deepEntryHero() : null; // 이 직업으로 10-4를 깬 적이 없으면 가장 최근에 깬 직업으로
    this.player = this.makePlayer(0, 0);
    const tr = DATA_TREASURES.find((t) => t.id === this.save.treasureEquipped); // 로비에서 고른 보구 (사망해도 영구 보유)
    const cp = deep && this.deepCheckpoint(this.save.selected);
    if (cp) { this.player = this.playerFromSnapshot(this.player.hero, cp); this.gold = cp.gold || 0; this.useCheckpoint(this.player, cp, tr); } // 심층 입장: 10-4를 깬 그대로 (보구는 지금 장착한 것)
    else if (tr) { this.player.treasure = tr; if (tr.apply) tr.apply(this.player); }
    this.guild(); this.applySupplies(); // 길드 퀘스트 준비 · 거래상에서 산 보급품
    this.loadStage();
    if (cp) {
      this.showBanner(switched ? `심층 입장 — ${this.player.hero.name}(으)로 바꿈` : '심층 입장', `${switched ? '이 직업·진화 루트로 10-4를 깬 기록이 없어 가장 최근에 10-4를 깬 캐릭터로 · ' : `${this.player.line ? this.player.line.name + ' 계열 · ' : ''}10-4를 깬 그대로 · `}${this.player.weapons.map((w) => w.def.name).join(' + ')} · 축복 ${this.player.buffs.length}개`, '#9ad8ff'); if (switched && Net.inRoom) Net.profile(this.netName(), switched); }
    else { const after = deep ? () => this.applyDeepKit(this.player) : null; // 이 직업의 10-4 기록이 없으면 기본 심층 장비
      if (!this.save.prologueSeen) this.showPrologue(() => this.askVariant(after)); else this.askVariant(after); }
    if (Net.inRoom && Net.isHost && Net.players.length > 1) this.coopHostStart(); // 멀티: 방 사람들과 함께 출발
  }
  // ── 이어하기: 스테이지 시작 시점의 런 상태 (맵은 그 스테이지를 새로 생성)
  snapshotRun() {
    const p = this.player;
    return { v: 1, t: Date.now(), hero: p.hero.id, zone: this.areaId || null, zf: this.zoneField || 0, zr: this.zoneRights || 0, worldIdx: this.worldIdx, levelIdx: this.levelIdx, gold: this.gold, kills: this.kills, start: this.runStart || null,
      p: { maxHp: p.maxHp, hp: p.hp, maxShield: p.maxShield, maxEnergy: p.maxEnergy, energy: p.energy, moveSpeed: p.moveSpeed,
        dashCdMax: p.dashCdMax, skillCdMax: p.skillCdMax, vampire: p.vampire, damageReduction: p.damageReduction, feast: p.feast || 0,
        stats: Object.assign({}, p.stats), buffs: p.buffs.slice(), weapons: p.weapons.map((w) => w.def.id), weaponLv: p.weapons.map((w) => w.lv || 0), slot: p.slot,
        treasure: p.treasure ? p.treasure.id : null, line: p.line ? p.line.id : null, rank: p.rank || 0, hybrid: p.hybrid ? { id: p.hybrid.id, el: p.hybrid.el } : null, fleeceUsed: p.fleeceUsed || 0 } };
  }
  playerFromSnapshot(hero, s, p = new Player(0, 0, hero, this.data.base)) { // 저장된 캐릭터 상태 → 플레이어 (이어하기·심층 기록 공용)
    return this.withPlayer(p, () => {
      for (const k of ['maxHp', 'hp', 'maxShield', 'maxEnergy', 'energy', 'moveSpeed', 'dashCdMax', 'skillCdMax', 'vampire', 'damageReduction', 'fleeceUsed', 'feast']) if (typeof s[k] === 'number') p[k] = s[k];
      Object.assign(p.stats, s.stats); p.buffs = s.buffs || [];
      p.weapons = (s.weapons || []).map((id, i) => [id, (s.weaponLv || [])[i] || 0]).filter(([id]) => this.data.weapons.get(id)).map(([id, lv]) => new WeaponInstance(this.data.weapons.get(id), lv));
      if (!p.weapons.length) p.weapons.push(new WeaponInstance(this.weaponDef(hero.startWeapon)));
      p.slot = Math.min(s.slot || 0, p.weapons.length - 1);
      p.treasure = DATA_TREASURES.find((t) => t.id === s.treasure) || null; // 보구 효과는 위 능력치에 이미 반영돼 있음
      const ln = jobLines(hero.id).find((l) => l.id === s.line) || jobLines(hero.id)[0]; if (ln) { this.setJob(p, ln, Math.min(2, s.rank || 0)); p.skillCdMax = p.skillBaseCd * ((s.skillCdMax || p.skillBaseCd) / p.skillBaseCd); } // 계열·진화 단계
      if (s.hybrid && HYBRID_JOBS[s.hybrid.id]) { const H = HYBRID_JOBS[s.hybrid.id], el = jobLines(H.master).find((l) => l.id === s.hybrid.el); if (el) this.setHybrid(p, H, el); } // 혼합 직업 (쿨타임 감소 비율 유지)
      return p;
    });
  }
  resumeRun() {
    const r = this.save.run, hero = r && this.data.heroes.get(r.hero);
    if (!r || !hero) { this.save.run = null; writeSave(this.save); this.startRun(); return; }
    this.mode = 'dungeon'; this.areaId = r.zone && ZONES[r.zone] ? r.zone : null; this.zoneField = this.areaId ? Math.max(0, Math.min(ZONES[this.areaId].fields.length - 1, r.zf | 0)) : 0; this.zoneRights = this.areaId ? (typeof r.zr === 'number' ? r.zr : this.zoneField) : 0; this.worldIdx = r.worldIdx; this.levelIdx = r.levelIdx; this.gold = r.gold; this.kills = r.kills; this.runStart = r.start && typeof r.start.stage === 'number' ? r.start : { stage: 0, world: 0 };
    this.player = this.playerFromSnapshot(hero, r.p);
    this.player.treasure = DATA_TREASURES.find((t) => t.id === this.save.treasureEquipped) || null; /* 보구는 지금 로비에서 장착한 것 (저장된 판의 보구로 되돌아가던 버그 — 판 중에 얻은 보구로 바꿔도 이어하기에 반영 안 됨) */
    this.loadStage();
    this.showBanner(`이어하기 · ${this.stageName()} ${this.W.name}`, '스테이지 시작 지점부터 다시 시작합니다', '#7ad0ff');
    if (Net.inRoom && Net.isHost && Net.players.length > 1) this.coopHostStart(); // 멀티: 이어하기도 방 사람들과 함께
  }
  // 프롤로그 (첫 던전 입장 시 1회, 로비 일시정지 메뉴에서 다시 보기)
  showPrologue(then) { this.overlay = { type: 'story', lines: PROLOGUE_LINES, i: 0, t: 0, done: () => { this.save.prologueSeen = true; writeSave(this.save); if (then) then(); } }; }
  // 기원의 성역 깊은 곳: 전설의 존재와 마주함 → 소원이 드러남 → 보구 선택
  enterSanctum() {
    this.save.sanctumReached = true;
    if (!this.trialW && this.player) { const c = this.deepCps(); c[this.deepKey(this.player.hero.id, this.player.line && this.player.line.id)] = Object.assign(this.snapshotRun().p, { gold: this.gold, t: Date.now() }); } /* 직업·계열마다 따로 */ // 10-4를 깬 캐릭터 저장 → 로비에서 심층 입장 시 그대로
    writeSave(this.save);
    if (this.coop && this.coop.host) for (const R of this.remotes.values()) { // 멀티: 동료도 성역 도달·10-4 캐릭터 저장·보구 선택
      const cp = this.withPlayer(R.p, () => Object.assign(this.snapshotRun().p, { gold: this.gold, t: Date.now() })); Net.relay({ k: 'sanctum', cp }, R.id); }
    SFX.stopMusic();
    this.overlay = { type: 'story', sanctum: true, lines: SANCTUM_LINES, i: 0, t: 0, done: () => { this.overlay = { type: 'treasure_pick', msg: null }; } };
  }
  treasurePage(o, all, input) { // 보구 창 쪽 넘기기 (휠·←→·A/D·화살표 버튼) → 이번 쪽의 보구 3개 (버튼을 눌렀으면 null)
    const pages = Math.max(1, Math.ceil(all.length / 3)), m = input.mouse, hit = (r) => input.wasPressed('Mouse0') && m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;
    let pg = Math.min(o.page || 0, pages - 1);
    if (input.wasPressed('WheelPageDown') || input.wasPressed('ArrowRight') || input.wasPressed('KeyD') || (pages > 1 && hit(HUD.treasurePageBtn(1)))) { o.page = Math.min(pages - 1, pg + 1); return null; }
    if (input.wasPressed('WheelPageUp') || input.wasPressed('ArrowLeft') || input.wasPressed('KeyA') || (pages > 1 && hit(HUD.treasurePageBtn(0)))) { o.page = Math.max(0, pg - 1); return null; }
    o.page = pg; return all.slice(pg * 3, pg * 3 + 3);
  }
  pickTreasure(tr) {
    const s = this.save;
    if (tr && !s.treasures.includes(tr.id)) { s.treasures.push(tr.id); if (!s.treasureEquipped) s.treasureEquipped = tr.id; this.treasureToast = { T: tr, start: performance.now() }; }
    writeSave(s);
    const p = this.player;
    if (tr && !p.treasure) { p.treasure = tr; p.treasureCd = 0; } // 이번 탐험부터 바로 R로 사용
    if (tr && this.coop && this.coop.guest) Net.relay({ k: 'trpick', id: tr.id }, this.coop.hostId); // 멀티 참가자: 방장 쪽 내 캐릭터에도 (보구가 없을 때)
    this.overlay = null; this.input.mouse.down = false;
    const c = this.portalSpot || { x: p.x, y: p.y - 30 }, next = worldDef(this.worldIdx + 1);
    this.portals = [];
    this.portals.push(new Portal(c.x + 26, c.y + 24, () => this.advanceStage(), `${stageLabel(this.worldIdx + 1, 0)} ${next.name}`, [120, 200, 255]));
    this.portals.push(new Portal(c.x - 26, c.y + 24, () => this.endRun(true), '귀환 (탐험 종료)', [255, 210, 90]));
    this.showBanner(SANCTUM_AFTER, '심층으로 내려가거나, 여기서 돌아갈 수 있습니다', '#9ad8ff');
  }
  get W() { return this.trialW || (this.areaId && zoneWorld(this.areaId, this.zoneField || 0)) || worldDef(this.worldIdx); }
  stageName() { return this.areaId ? zoneLabel(this.areaId, this.zoneField || 0, this.levelIdx) : stageLabel(this.worldIdx, this.levelIdx); } /* 화면 표시용 (바빌로니아 지하는 '지하 1-1') */
  get stageIndex() { return this.worldIdx * STAGES_PER_WORLD + this.levelIdx; }
  get isBossStage() { return this.levelIdx === STAGES_PER_WORLD - 1; }
  get scale() { const S = BALANCE.stageScale, k = this.mode === 'lobby' ? 0 : this.stageIndex, i = k > S.taperFrom ? S.taperFrom + (k - S.taperFrom) * S.taper : k; return { hp: 1 + BALANCE.stageScale.hp * i, dmg: 1 + BALANCE.stageScale.dmg * i, deep: this.mode !== 'lobby' && !!this.W.deep }; }
  loadStage() {
    const W = this.W;
    if (W.deep && !W.trial) this.save.bestDeep = Math.max(this.save.bestDeep || 0, W.depth); // 가장 깊이 내려간 심층
    const map = W.trial ? generateDungeon({ roomCount: W.rooms || 2, specials: ['boss'], waves: W.waves || 0, palette: W.palette, bossSize: W.bossRoom }) // 시련: 시작 방 + 보스 방 (카멜롯은 전투 방도)
      : this.isBossStage
      ? generateDungeon({ roomCount: 4, specials: ['boss'], waves: W.waves, palette: W.palette, bossSize: W.bossRoom })
      : generateDungeon({ roomCount: Math.min(15, 9 + this.worldIdx), specials: (this.areaId && !this.zoneRight('trade') ? ['exit', 'treasure'] : ['exit', 'treasure', 'shop']).concat(this.rollSpecialRoom()), waves: W.waves, palette: W.palette }); // 특수방 하나
    this.resetWorldLists(map);
    const s = map.startRoom, sp = map.tileCenter(s.cx, s.cy), p = this.player;
    p.x = sp.x; p.y = sp.y; p.state = 'NORMAL'; p.shield = p.maxShield;
    const tr = map.roomOf('treasure');
    if (tr) { const c = map.tileCenter(tr.cx, tr.cy); this.props.push(new Chest(c.x, c.y, 'weapon')); }
    const shop = map.roomOf('shop');
    if (shop) this.stockShop(shop);
    this.stockSpecialRooms(map);
    const ex = map.roomOf('exit');
    if (ex) { const c = map.tileCenter(ex.cx, ex.cy); this.portals.push(new Portal(c.x, c.y, () => this.advanceStage(), '다음 스테이지')); }
    if (!W.trial) { if (!this.areaId) this.save.bestStage = Math.max(this.save.bestStage, this.stageIndex + 1);
      this.save.run = this.snapshotRun(); writeSave(this.save); } // 시련은 이어하기·기록에 남기지 않음 // 이어하기용: 이 스테이지 시작 지점을 저장
    if (W.sanctum) this.decorateSanctum(map);
    this.snapCamera();
    if (W.sanctum && this.levelIdx === 0) this.playCutscene(ORIGIN_ARRIVAL_LINES, { id: 'origin_arrival', focus: null });
    if (W.finalField && this.isBossStage) { const br = map.roomOf('boss'); if (br) this.decorateThroneHall(br); }
    if (W.surface && this.levelIdx === 0) this.playCutscene(BABYLON_SURFACE_LINES, { id: 'babylon_surface', focus: null }); /* 지상으로 나옴 (처음 한 번) */
    if (W.ziggurat && this.levelIdx === 0) this.playCutscene(BABYLON_ZIGGURAT_LINES, { id: 'babylon_ziggurat', focus: null }); /* 지구라트 첫 단 */
    if (W.finalField && this.isBossStage) this.playCutscene(GILGAMESH_UNDER_INTRO_LINES, { id: 'gilgamesh_under', always: true, focus: null }); /* 지구라트 4-4 왕좌의 방: 영웅왕 길가메시 */
    if (W.deep && !W.trial && W.depth === 1 && this.levelIdx === 0) this.playCutscene(DEEP_ARRIVAL_LINES, { id: 'deep_arrival', focus: null }); // 심층에 처음 들어설 때 (한 번만)
    if (this.coop && this.coop.host) this.coopOnStage(); // 멀티: 동료 배치·부활 + 새 맵 보내기
    if (W.trial) { this.showBanner(W.name, this.trialDef.intro, this.trialDef.color); return; }
    this.showBanner(`${this.stageName()}  ${W.name}`, this.isBossStage ? '보스가 기다리고 있습니다' : W.deep && this.levelIdx === 0 ? `심층 ${W.depth}번째 필드 — 던전은 더 깊은 곳으로 이어진다` : '출구 포탈을 찾으세요', W.deep ? '#9ad8ff' : undefined);
  }
  advanceStage() {
    this.guildEvent('stages');
    this.levelIdx++;
    if (this.levelIdx >= STAGES_PER_WORLD) { this.levelIdx = 0;
      if (this.areaId) { this.zoneField = (this.zoneField || 0) + 1; if (this.zoneField >= ZONES[this.areaId].fields.length) { this.endRun(true); return; } this.worldIdx = this.W.scaleWorld; } /* 지하: 다음 필드 (세기는 필드마다 정해 둔 곡선) */
      else this.worldIdx++; }
    this.loadStage();
  }
  rollSpecialRoom() { // 일반 스테이지마다 chance 확률로 특수방 하나 (전직의 방은 진화할 단계가 남았을 때 더 자주)
    const SR = BALANCE.specialRooms; if (Math.random() >= SR.chance) return [];
    const p = this.player, canEvolve = p && p.line && p.rank < 2 && !p.line.noEvolveRoom; /* 소울 이터는 전직의 방이 아니라 포식 스택으로 진화 */
    const ER = canEvolve ? SR.evolveByRank[p.rank] : null, evolveOk = ER && this.worldIdx >= ER.fromWorld; // 진화 단계별로 나오는 필드·빈도가 다름
    const pool = this.areaId ? ZONES[this.areaId].specialPool.concat(this.zoneRight('arms') ? ['rack'] : [], this.zoneRight('forge') ? ['smithy', 'forge'] : [], this.zoneRight('bless') ? ['altar', 'blood'] : []) : SR.pool.filter((t) => t !== 'evolve' || evolveOk); /* 귀환길: 되찾은 권리만큼 특수방이 늘어남 (전직의 방은 없음 — 진화는 권리로) */ /* 지하: 무기·진화가 안 나오는 방만 */
    return [weightedPick(pool, (t) => (t === 'evolve' ? ER.weight : (SR.weight && SR.weight[t]) || 1))];
  }
  // 특수방 소품 배치
  stockSpecialRooms(map) {
    const inflate = 1 + BALANCE.shopInflate * this.stageIndex, SR = BALANCE.specialRooms;
    for (const r of map.rooms) {
      const c = map.tileCenter(r.cx, r.cy);
      if (r.type === 'fountain') this.props.push(new Fountain(c.x, c.y));
      else if (r.type === 'altar') this.props.push(new BuffAltar(c.x, c.y, pick(DATA_BUFFS), Math.round(SR.altarPrice * inflate)));
      else if (r.type === 'gamble') this.props.push(new SlotMachine(c.x, c.y, Math.round(SR.gamblePrice * inflate)));
      else if (r.type === 'challenge') this.props.push(new ChallengeStone(c.x, c.y, r));
      else if (r.type === 'forge') this.props.push(new Forge(c.x, c.y, Math.round(SR.forgePrice * inflate)));
      else if (r.type === 'blood') this.props.push(new BloodAltar(c.x, c.y));
      else if (r.type === 'evolve') { // 2차 진화 차례면 일정 확률로 다른 직업의 상위자 (혼합 전직)
        const npc = new MasterNPC(c.x, c.y, r), p = this.player, H = Object.values(HYBRID_JOBS).find((h) => h.from === p.hero.id);
        if (H && p.rank === 1 && Math.random() < H.chance) { const el = pick(jobLines(H.master)); npc.hybrid = { H, el, masterHero: heroWithLook(this.data.heroes.get(H.master), el.look) }; }
        this.props.push(npc);
      }
      else if (r.type === 'smithy') this.props.push(new UpgradeAnvil(c.x, c.y, BALANCE.upgrade.forgeRoomDiscount, BALANCE.upgrade.forgeRoomBonus, true)); // 강화소: 싸고 성공률 높음
      else if (r.type === 'rack') { // 무기 진열대: 셋 중 하나만 가져갈 수 있음
        const a = this.randomWeaponDef(), b = this.randomWeaponDef(0, [a.id]), d = this.randomWeaponDef(0, [a.id, b.id]), grp = {};
        [a, b, d].forEach((def, i) => this.pickups.push(new Pickup('weapon', c.x + (i - 1) * 32, c.y + 4, { def, still: true, group: grp })));
      }
    }
  }
  startChallenge(r) { // 도전방: 강화된 정예 웨이브
    r.challenge = true; r.wavesLeft = BALANCE.specialRooms.challenge.waves; r.state = 'idle';
    this.showBanner('도전!', `강화된 정예 몬스터 ${BALANCE.specialRooms.challenge.waves}번의 습격을 버티세요`, '#ff7a7a'); SFX.play('boss'); this.addShake(0.2, 3);
    this.activateRoom(r);
  }
  stockShop(room) {
    const m = this.map, inflate = 1 + BALANCE.shopInflate * this.stageIndex;
    const mc = m.tileCenter(room.cx, room.y0 + 1); this.props.push(new Merchant(mc.x, mc.y));
    this.props.push(new UpgradeAnvil(mc.x + 40, mc.y + 4, 1, 0)); // 상점 강화대
    const w1 = this.randomWeaponDef(0, [], true), w2 = this.randomWeaponDef(0, [w1.id], true); // 상점은 영웅·전설 확률을 소폭 높임
    const items = [['weapon', w1], ['weapon', w2 !== w1 ? w2 : null], ['hp'], ['energy']].filter(([k, d]) => k !== 'weapon' || d);
    items.forEach(([kind, def], i) => {
      const c = m.tileCenter(room.cx - 4 + i * 3 - (i >= 2 ? 0 : 0), room.cy + 1);
      const price = Math.round(BALANCE.shopPrice[kind === 'weapon' ? def.rarity : kind] * inflate);
      this.props.push(new ShopItem(c.x + (i >= 2 ? 8 : 0), c.y, kind, price, def));
    });
  }
  reviveRun() {
    const COST = 200, p = this.player;
    if (this.mode !== 'dungeon' || this.trialW || !p || p.state !== 'DEAD' || this.save.runReviveUsed || this.save.bank < COST) return false;
    this.save.bank -= COST;
    this.save.runReviveUsed = true;
    writeSave(this.save); // 재접속으로 부활 횟수를 초기화할 수 없도록 즉시 저장
    p.state = 'NORMAL'; p.deathTimer = 0;
    p.hp = Math.max(1, Math.ceil(p.maxHp * 0.5));
    p.shield = Math.ceil(p.maxShield * 0.5);
    p.hurtInvuln = 2.5; p.dashInvuln = 0; p.dashRemaining = 0;
    p.castLock = 0; p.swing = null;
    this.overlay = null;
    this.effects.ring(p.x, p.y, 34, '#7ad0ff');
    this.effects.burst(p.x, p.y, '#ffffff', 18);
    SFX.play('heal');
    this.showBanner('부활!', `결정석 ${COST}개 사용 · 이번 탐험의 부활 기회 소진`, '#7ad0ff');
    return true;
  }
  endRun(victory) {
    if (this.trialW && this.trialId === 'babylon') { SFX.stopMusic(); this.finishBabylon(true); return; } /* 길가메시에게 쓰러짐 */
    if (this.trialW) { this.endTrial(victory); return; }
    if (this.coop && this.coop.guest) { this.coopGuestEnd({ victory: false, quit: true }); return; }
    this.submitRunScore(victory); // 랭킹판에 기록
    if (this.coop && this.coop.host) this.coopHostEnd(victory);
    this.guildEvent('runs');
    SFX.stopMusic(); this.save.run = null; this.save.runReviveUsed = false; writeSave(this.save);
    if (this.areaId) this.restoreStashRun(); /* 바빌로니아 귀환길이 끝나면 그 전 탐험 기록을 되돌림 */
    SFX.play(victory ? 'victory' : 'hurt');
    // 로비 재화: 클리어한 스테이지 수 · 쓰러뜨린 필드 보스 수 · 승리 보너스 (던전 골드는 런과 함께 사라짐)
    const { stages, bosses, reward } = this.runReward(victory);
    this.overlay = { type: 'result', victory, stages, bosses, reward };
    if (victory) { this.save.clears++; writeSave(this.save); }
  }
  runReward(victory) { // 로비 재화: 이번 탐험에서 실제로 깬 스테이지·필드 보스 수 (로비에서 바로 심층에 들어간 탐험도 일반과 같은 기준)
    if (this.areaId) { const S = this.runStart || {}, f = this.zoneField || 0, stages = Math.max(0, f * STAGES_PER_WORLD + this.levelIdx - (S.zs || 0) + (victory ? 1 : 0)), bosses = Math.max(0, f - (S.zf || 0) + (victory ? 1 : 0)); /* 지하: 필드 번호로 셈 */
      return { stages, bosses, reward: stages * CUR.perStage + bosses * CUR.perBoss + (victory ? CUR.victory : 0) }; }
    const S = this.runStart || { stage: 0, world: 0 }, stages = Math.max(0, this.stageIndex - S.stage + (victory ? 1 : 0)), bosses = Math.max(0, this.worldIdx - S.world + (victory ? 1 : 0));
    return { stages, bosses, reward: stages * CUR.perStage + bosses * CUR.perBoss + (victory ? CUR.victory : 0) };
  }
  finishResult() {
    if (!this.overlay.trial) { this.save.bank += this.overlay.reward; writeSave(this.save); }
    this.overlay = null;
    this.transition = { t: 0, swapped: false, action: () => this.enterLobby() };
  }

  // 타격감: 아주 짧게 시뮬레이션을 멈춤 (입력은 다음 프레임으로 이월)
  hitStop(t) { this.hitStopT = Math.max(this.hitStopT, t); }
  toggleMute() { this.save.muted = !this.save.muted; SFX.setMuted(this.save.muted); writeSave(this.save); this.showBanner(this.save.muted ? '소리 끔' : '소리 켬', 'M: 전환'); }
  // ── 계정
  login(profile) {
    Auth.current = profile; this.profile = profile;
    this.save = loadSave(); SFX.setMuted(!!this.save.muted);
    this.admin = profile && profile.admin ? { god: false, nocd: false } : null; if (this.admin) this.applyAdmin();
    this.locked = false; this.enterLobby();
    if (this.save.run) this.overlay = { type: 'resume' };
    this.backfillScore(); // 랭킹판이 생기기 전의 내 최고 기록도 한 번 올림
    if (Net.httpBase()) Net.flushScores().catch(() => {}); // 지난번에 보내지 못한 기록
    this.showBanner(profile ? `환영합니다, ${profile.name}!` : '게스트로 시작', this.admin ? '관리자 계정 — 모든 것이 해금됨 · ` 키: 관리자 메뉴' : profile ? '진행도가 이 계정에 저장됩니다' : '게스트 진행도는 저장되지 않습니다', '#ffd84a');
  }
  logout() {
    writeSave(this.save); Auth.current = null; this.profile = null; Auth.setAuto(null);
    this.overlay = null; this.locked = true; this.enterLobby();
    if (typeof LoginUI !== 'undefined') LoginUI.show(this); // const 전역은 window 속성이 아니므로 typeof로 확인
  }
  showBanner(title, sub, color) { this.banner = { title, sub, color, t: 0, life: 2.4 }; }
  addShake(t, mag) { this.shake = Math.max(this.shake, t); this.shakeMag = Math.max(this.shakeMag, mag); }

  // ── 카메라
  mouseWorld() { if (this.coop && this.coop.aim) return this.coop.aim; return { x: this.input.mouse.x + Math.round(this.cam.x), y: this.input.mouse.y + Math.round(this.cam.y) }; }
  cameraTarget() { // 멀티: 내가 쓰러지면 동료를 비춤
    const p = this.coop && this.player.state === 'DEAD' ? this.allPlayers().find((q) => q.state !== 'DEAD') || this.player : this.player, mx = this.input.mouse.x - VIEW_W / 2, my = this.input.mouse.y - VIEW_H / 2;
    let fx = p.x + mx * 0.2, fy = p.y + my * 0.2;
    const cs = this.cutscene, focus = cs && cs.focus ? cs.focus : this.cinematic ? this.cinematic.boss : this.slowMo ? this.slowMo : null; // 컷신·보스 등장·처치 연출 중에는 그쪽을 비춤
    if (focus) { fx = focus.x; fy = focus.y; }
    return {
      x: clamp(fx - VIEW_W / 2, 0, this.map.width * TILE - VIEW_W),
      y: clamp(fy - VIEW_H / 2, 0, this.map.height * TILE - VIEW_H)
    };
  }
  snapCamera() { const t = this.cameraTarget(); this.cam.x = t.x; this.cam.y = t.y; }
  updateCamera(dt) {
    const t = this.cameraTarget(), k = 1 - Math.exp(-10 * dt);
    this.cam.x += (t.x - this.cam.x) * k; this.cam.y += (t.y - this.cam.y) * k;
  }

  // ── 메인 업데이트
  update(dt) {
    let input = this.input;
    this.time += dt;
    if (this.locked) { input.remap = false; input.endStep(); return; } // 로그인 화면
    input.remap = !this.overlay && !this.cutscene && !this.transition && (this.mode === 'dungeon' || this.mode === 'lobby'); /* 조작키 변경은 직접 조작할 때만 (메뉴·대사에서는 원래 키) */
    if (this.coop && this.coop.guest) { this.coopGuestUpdate(dt, input); return; } // 멀티 참가자: 방장 화면을 받아 그림
    if (this.banner) this.banner.t += dt;
    if (input.wasPressed('KeyM') && !(this.overlay && this.overlay.type === 'gift')) this.toggleMute(); /* 선물 코드 입력 중에는 M도 글자 */
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    this.noEnergyFlash = Math.max(0, this.noEnergyFlash - dt);

    if (this.transition) {
      this.transition.t += dt;
      if (!this.transition.swapped && this.transition.t >= 0.45) { this.transition.swapped = true; this.transition.action(); }
      if (this.transition.t >= 0.9) this.transition = null;
      input.endStep(); return;
    }
    if (this.babylonFall && !this.cutscene && !this.overlay) { this.updateBabylonFall(dt); this.effects.update(dt); this.updateCamera(dt); input.endStep(); return; } /* 바빌로니아 지하로 떨어지는 중 */
    if (this.cutscene) { if (this.coop && this.coop.host) this.coopHostSend(dt); this.screenFlash = Math.max(0, this.screenFlash - dt); this.shake = Math.max(0, (this.shake || 0) - dt); this.updateCutscene(dt, input); this.effects.update(dt); this.updateCamera(dt); input.endStep(); return; } // 컷신이 먼저 (창이 함께 떠 있어도 컷신을 넘길 수 있게, 창은 컷신이 끝난 뒤) · 컷신 중에는 세계가 멈춤 (번쩍임·흔들림은 가라앉음)
    if (this.overlay) { this.updateOverlay(input); input.endStep(); if (!(this.coop && this.coop.host) || !this.overlay) return; input = NULL_INPUT; } // 멀티 방장: 창을 열어도 다른 사람 때문에 세계는 계속 돌아감 (내 캐릭터만 멈춤)
    if (input.wasPressed('Escape')) { this.overlay = { type: 'pause' }; input.endStep(); return; }
    if (this.mode === 'lobby' && (input.wasPressed('Equal') || input.wasPressed('NumpadAdd')) && this.save.babylon && this.save.babylon.visited) { this.overlay = { type: 'travel', sub: null, msg: null }; input.endStep(); return; } /* + 빠른 이동 */
    if (this.admin && input.wasPressed('Backquote')) { this.overlay = { type: 'admin', msg: null }; input.endStep(); return; }
    if (this.hitStopT > 0) { this.hitStopT -= dt; return; }
    this.screenFlash = Math.max(0, this.screenFlash - dt);
    if (this.cinematic) { this.updateCinematic(dt); if (this.coop && this.coop.host) this.coopHostSend(dt); this.effects.update(dt); this.updateCamera(dt); input.endStep(); return; }
    if (this.slowMo) dt = this.updateSlowMo(dt); // 보스 처치 슬로우모션: 시뮬레이션 시간이 느려짐

    const p = this.player;
    this.updateNet(dt);
    if (this.admin && this.admin.nocd) { p.skillCooldown = 0; p.treasureCd = 0; }
    const wasDash = p.state === 'DASH';
    p.update(dt, input, this.map, this.mouseWorld());
    if (!wasDash && p.state === 'DASH') SFX.play('dash');
    this.fxT = (this.fxT || 0) - dt;
    if (this.fxT <= 0 && p.state !== 'DEAD') {
      if (p.state === 'DASH') { // 잔상
        const spr = heroSprite(p.hero, 0), img = p.faceVis < 0 ? spr.f : spr.n;
        this.effects.afterimage(img, p.x - spr.w / 2, p.y + 7 - spr.h, spr.w, spr.h); this.fxT = 0.025;
      } else if (p.moving) { this.effects.dust(p.x, p.y + 6); this.fxT = 0.22; }
    }
    if (p.state !== 'DEAD' && p.hp < p.maxHp * 0.3) { this.heartT -= dt; if (this.heartT <= 0) { SFX.play('heart'); this.heartT = 0.9; } }
    if (input.wasPressed('Mouse0') && this.minimapClick(input.mouse)) input.mouse.down = false;
    if (this.mode === 'lobby' && input.wasPressed('Mouse0') && typeof NOTICE !== 'undefined' && NOTICE.lines && NOTICE.lines.length) { // 공지 접기/펼치기 (그 클릭은 공격하지 않음)
      const r = HUD.noticeBtn(), m = input.mouse; if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) { this.save.noticeFolded = !this.save.noticeFolded; writeSave(this.save); input.mouse.down = false; input.pressed.delete('Mouse0'); SFX.play('ui'); } } // 미니맵: 이미 간 방으로 이동 (그 클릭은 공격하지 않음)
    this.weaponSystem.update(p, dt, input);
    if (p.state !== 'DEAD' && (input.wasPressed('KeyF') || input.wasPressed('Mouse2'))) this.useSkill();
    if (p.state !== 'DEAD' && input.wasPressed('KeyR')) this.useTreasure();
    if (this.coop && this.coop.host) this.coopHostTickRemotes(dt); // 참가자들의 공격·스킬·보구
    this.updateSkillEffects(dt);
    this.updateFlow(dt);
    if (this.coop && this.coop.host) { for (const e of this.enemies) this.withPlayer(this.nearestPlayer(e.x, e.y), () => updateEnemy(e, dt, this)); } // 적은 가장 가까운 플레이어를 노림
    else for (const e of this.enemies) updateEnemy(e, dt, this);
    separateEnemies(this.enemies, this.map);
    for (const pr of this.projectiles) { if (this.coop && this.coop.host && pr.owner && pr.owner !== this.player) this.withPlayer(pr.owner, () => pr.update(dt, this)); else pr.update(dt, this); } // 멀티: 참가자의 탄은 그 사람 기준으로
    for (const b of this.enemyBullets) b.update(dt, this);
    for (const pk of this.pickups) pk.update(dt, this);
    for (const h of this.hazards) h.update(dt, this);
    const asOwner = (o) => { const P = o.owner; if (this.coop && this.coop.host && P instanceof Player && P !== this.player) this.withPlayer(P, () => o.update(dt, this)); else o.update(dt, this); }; // 멀티: 참가자의 포탑·드론·장판은 그 사람 기준 (처치 보상·흡혈 등)
    for (const a of this.allies) asOwner(a);
    for (const z of this.zones) asOwner(z);
    for (const po of this.portals) po.t += dt;
    this.projectiles = this.projectiles.filter((x) => x.alive);
    this.enemyBullets = this.enemyBullets.filter((x) => x.alive);
    this.pickups = this.pickups.filter((x) => x.alive);
    this.hazards = this.hazards.filter((x) => x.alive);
    this.allies = this.allies.filter((x) => x.alive);
    this.zones = this.zones.filter((x) => x.alive);
    this.enemies = this.enemies.filter((e) => !e.removed);
    this.effects.update(dt);
    this.shake = Math.max(0, this.shake - dt);
    if (this.shake === 0) this.shakeMag = 0;

    if (this.mode === 'dungeon' && (p.state !== 'DEAD' || (this.coop && this.coop.host))) this.updateRooms(); // 멀티: 방장이 쓰러져 있어도 방 진행은 계속
    if (this.coop && this.coop.host && !this.transition && !this.overlay && !this.cutscene) for (const R of this.remotes.values()) { // 창·컷신이 떠 있는 동안은 포탈이 다시 작동하지 않게 // 멀티: 참가자가 포탈을 밟아도 모두 함께 이동 (귀환 포탈은 방장만)
      if (R.p.state === 'DEAD' || this.transition) continue;
      for (const po of this.portals) if (!/귀환/.test(po.label || '') && Math.hypot(R.p.x - po.x, R.p.y - po.y) < 12) { this.transition = { t: 0, swapped: false, action: po.onEnter }; break; }
    }
    if (p.state !== 'DEAD') {
      this.updateInteraction(input);
      const grouped = this.mode === 'lobby' && Net.inRoom && Net.players.length > 1; // 멀티 방: 던전·심층 포탈은 단체 입장 (모두 모이면 출발)
      if (grouped) this.updateGather(dt, input);
      if (!this.overlay && !this.cutscene) for (const po of this.portals) // 멀티 방장은 창이 떠 있어도 세계가 돌아가므로, 그동안 포탈이 다시 작동하지 않게 (성역 장면이 계속 처음부터 반복되던 문제)
        if (!(grouped && po.group) && Math.hypot(p.x - po.x, p.y - po.y) < 12) {
          if (this.mode === 'lobby' && this.save.run) { this.overlay = { type: 'resume' }; p.y += 22; break; } // 진행 중인 탐험이 있으면 이어하기 물음
          this.transition = { t: 0, swapped: false, action: po.onEnter }; break;
        }
    } else if (this.coop && this.coop.host && this.allPlayers().some((q) => q.state !== 'DEAD')) { // 멀티: 동료가 살아 있으면 계속 (다음 스테이지에서 부활)
    } else if (p.deathTimer > 1 && !this.overlay) {
      SFX.stopMusic();
      if (this.mode === 'dungeon' && !this.trialW && !this.save.runReviveUsed) this.overlay = { type: 'revive', msg: null };
      else this.endRun(false);
    }
    this.updateCamera(dt);
    if (this.coop && this.coop.host) this.coopHostSend(dt);
    input.endStep();
  }
  updateOverlay(input) {
    const o = this.overlay;
    if (o.type === 'pause') {
      if (input.wasPressed('Escape')) this.overlay = null;
      else if (input.wasPressed('KeyI')) { this.overlay = { type: 'details', tab: 0 }; return; } // 상세 정보
      else if (input.wasPressed('KeyG')) { this.overlay = { type: 'gift', code: '', msg: null }; input.typed.length = 0; return; } // 선물 코드
      else if (input.wasPressed('KeyK')) { this.overlay = { type: 'skins', back: 'pause', msg: null }; return; } // 스킨 고르기 창
      else if (input.wasPressed('KeyO')) { this.overlay = { type: 'keys', wait: null, msg: null }; input.mouse.down = false; return; } // 조작키 설정
      else if (this.mode === 'lobby' && input.wasPressed('KeyL')) { this.logout(); return; }
      else if (this.mode === 'lobby' && input.wasPressed('KeyP')) { this.overlay = { type: 'story', lines: PROLOGUE_LINES, i: 0, t: 0, done: () => {} }; return; }
      else if (this.mode === 'dungeon' && input.wasPressed('KeyL')) { this.player.state = 'DEAD'; this.endRun(false); }
    } else if (o.type === 'keys') { /* [사용자 결정] 조작키 설정: 칸을 누르고 새 키(마우스 버튼 포함)를 누름 · Backspace 지우기 · Esc 취소 */
      const m = input.mouse, hit = (r) => m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h;
      if (o.wait) { if (o.wait.armed) { const c = input.raw[0];
          if (c === 'Escape') { o.wait = null; o.msg = { text: '취소했습니다', color: '#ccc', t: 1.5 }; }
          else if (c === 'Backspace' || c === 'Delete') { input.setBind(o.wait.id, o.wait.slot, null); o.wait = null; }
          else if (c) { const A = KEY_ACTIONS.find((a) => a.id === o.wait.id); input.setBind(o.wait.id, o.wait.slot, c); o.msg = { text: `${A.name}: ${keyLabel(c)}`, color: '#ffd84a', t: 1.5 }; o.wait = null; } }
        else o.wait.armed = true; /* 칸을 누른 클릭이 그대로 새 키가 되지 않게 한 프레임 쉼 */
        input.mouse.down = false; return; }
      if (input.wasPressed('Escape')) { this.overlay = { type: 'pause' }; return; }
      if (input.wasPressed('Mouse0')) {
        KEY_ACTIONS.forEach((A, i) => { for (const sl of [0, 1]) if (hit(keysRow(i, sl))) o.wait = { id: A.id, slot: sl, armed: false }; });
        if (hit(keysBtn(0))) { input.resetBinds(); o.msg = { text: '기본값으로 되돌렸습니다', color: '#9ad8ff', t: 1.5 }; }
        if (hit(keysBtn(1))) { this.overlay = { type: 'pause' }; return; } }
      if (o.msg) { o.msg.t -= 1 / 60; if (o.msg.t <= 0) o.msg = null; }
    } else if (o.type === 'codex' || o.type === 'armory' || o.type === 'trial_weapons') {
      const t0 = o.tab;
      ['Digit1', 'Digit2', 'Digit3', 'Digit4'].forEach((k, i) => { if (input.wasPressed(k)) o.tab = i; });
      if (input.wasPressed('Mouse0')) WEAPON_TABS.forEach((_, i) => { const r = tabRect(i), m = input.mouse; if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) o.tab = i; });
      if (o.tab !== t0) o.page = 0;
      const pages = gridPages(o.tab || 0); // 페이지 넘기기
      const m = input.mouse, onBtn = (i) => { const r = pageBtn(i); return input.wasPressed('Mouse0') && m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h; };
      if (input.wasPressed('KeyD') || input.wasPressed('ArrowRight') || input.wasPressed('WheelPageDown') || (pages > 1 && onBtn(1))) o.page = Math.min(pages - 1, (o.page || 0) + 1); // 끝에서 멈춤 (처음으로 되돌아가지 않음)
      if (input.wasPressed('KeyA') || input.wasPressed('ArrowLeft') || input.wasPressed('WheelPageUp') || (pages > 1 && onBtn(0))) o.page = Math.max(0, (o.page || 0) - 1);
    }
    if (o.type === 'trial_weapons') { // 시련 무기 고르기: 클릭으로 선택/해제 (최대 2개), Enter로 시작
      if (o.msg) o.msg.t -= STEP;
      if (input.wasPressed('Enter') && o.picked.length) { this.pickTrialWeapons(o.picked); return; }
      if (input.wasPressed('Escape')) { this.overlay = null; this.transition = { t: 0, swapped: false, action: () => this.enterLobby() }; return; } // 그만두고 로비로
      if (!input.wasPressed('Mouse0')) return;
      const m = input.mouse, c = weaponGrid(o.tab || 0, o.page || 0).find((c) => m.x >= c.x && m.x < c.x + c.w && m.y >= c.y && m.y < c.y + c.h);
      if (!c) return;
      const id = c.d.id, i = o.picked.indexOf(id);
      if (!this.save.discovered.includes(id)) o.msg = { text: '아직 발견하지 못한 무기입니다', color: '#ff9a9a', t: 2 };
      else if (i >= 0) o.picked.splice(i, 1);
      else if (o.picked.length >= 2) o.msg = { text: '무기는 2개까지 고를 수 있습니다 (고른 무기를 다시 누르면 해제)', color: '#ff9a9a', t: 2 };
      else o.picked.push(id);
      return;
    }
    if (o.type === 'codex') {
      if (input.wasPressed('Escape') || input.wasPressed('KeyE')) this.overlay = null;
    } else if (o.type === 'armory') {
      if (o.msg) o.msg.t -= STEP;
      if (input.wasPressed('Escape') || input.wasPressed('KeyE')) { this.overlay = null; return; }
      if (!input.wasPressed('Mouse0')) return;
      const m = input.mouse, c = weaponGrid(o.tab || 0, o.page || 0).find((c) => m.x >= c.x && m.x < c.x + c.w && m.y >= c.y && m.y < c.y + c.h);
      if (!c) return;
      const sv = this.save, d = c.d, say = (text, color) => { o.msg = { text, color, t: 2 }; };
      if (!sv.discovered.includes(d.id)) say('아직 발견하지 못한 무기입니다. 던전에서 먼저 찾아보세요.', '#ff9a9a');
      else if (d.rarity === 'unique' || d.questOnly) say('고유 무기는 무기고에 들일 수 없습니다 — 그 판에서만 쓸 수 있어요', '#9ae8d8');
      else if (!sv.armory.includes(d.id)) {
        const price = ARMORY_PRICE[d.rarity];
        if (sv.bank < price) say(`${CUR.name}이 부족합니다 (${price} 필요)`, '#ff9a9a');
        else { sv.bank -= price; sv.armory.push(d.id); sv.loadout = d.id; say(`${d.name} 해금 및 장착!`, '#ffd84a'); }
      } else if (sv.loadout === d.id) { sv.loadout = null; say('시작 보조 무기 장착 해제', '#ccc'); }
      else { sv.loadout = d.id; say(`${d.name} 장착`, '#9fe89f'); }
      writeSave(sv);
      const { x, y } = this.player; this.player = this.makePlayer(x, y);
      this.input.mouse.down = false;
    } else if (o.type === 'buff') {
      let choice = -1;
      ['Digit1', 'Digit2', 'Digit3'].forEach((k, i) => { if (input.wasPressed(k)) choice = i; });
      if (input.wasPressed('Mouse0')) {
        o.options.forEach((_, i) => {
          const r = HUD.buffRect(i), m = input.mouse;
          if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) choice = i;
        });
      }
      if (choice >= 0) {
        const b = o.options[choice];
        b.apply(this.player); this.player.buffs.push(b.id);
        this.overlay = null;
        this.input.mouse.down = false;
        this.showBanner(b.name, b.desc, '#ffd84a');
        if (o.after) o.after();
      }
    } else if (o.type === 'revive') {
      const click = input.wasPressed('Mouse0'), m = input.mouse;
      const hit = (r) => m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;
      const revive = input.wasPressed('Digit1') || (click && hit(HUD.reviveRect(0)));
      const giveUp = input.wasPressed('Digit2') || input.wasPressed('Enter') || input.wasPressed('Escape') || (click && hit(HUD.reviveRect(1)));
      if (revive) {
        if (!this.reviveRun()) { o.msg = `결정석이 부족합니다 (200개 필요 · 보유 ${this.save.bank}개)`; SFX.play('deny'); }
        this.input.mouse.down = false;
      } else if (giveUp) {
        this.overlay = null; this.input.mouse.down = false; this.endRun(false);
      }
    } else if (o.type === 'result') {
      if (input.wasPressed('Enter')) this.finishResult();
    } else if (o.type === 'variant') {
      let ch = -1; o.lines.forEach((_, i) => { if (input.wasPressed('Digit' + (i + 1))) ch = i; });
      if (input.wasPressed('Mouse0')) o.lines.forEach((_, i) => { const r = HUD.variantRect(i, o.lines.length), m = input.mouse; if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) ch = i; });
      if (o.branch && (input.wasPressed('Escape') || input.wasPressed('KeyE'))) { this.overlay = null; return; }
      if (ch >= 0 && o.onPick) { this.overlay = null; this.input.mouse.down = false; o.onPick(o.lines[ch]); }
      else if (ch >= 0) { this.overlay = null; this.input.mouse.down = false; this.applyVariant(o.lines[ch]); const L = o.lines[ch], R = o.trialRank != null ? o.trialRank : 0; this.showBanner(`${L.ranks[R]}`, `스킬: ${L.skills[R].name} — ${L.skills[R].desc}`, L.color); /* 시련은 최종 진화로 안내 */ if (o.after) o.after(); }
    } else if (o.type === 'evolve') {
      if (input.wasPressed('Escape') || input.wasPressed('KeyE')) { this.overlay = null; return; }
      if (input.wasPressed('Digit1')) { this.overlay = null; this.input.mouse.down = false; this.startTrial(o.npc); }
      else if (input.wasPressed('Digit2')) {
        const price = this.evolvePrice();
        if (this.gold < price) { o.msg = `골드가 부족합니다 (${price}골드 필요)`; SFX.play('deny'); }
        else { this.gold -= price; o.npc.gone = true; this.overlay = null; this.evolve(o.npc.hybrid, o.npc.branch); }
      }
    } else if (o.type === 'admin') { // 관리자 메뉴
      if (o.msg) o.msg.t -= STEP;
      if (input.wasPressed('Escape') || input.wasPressed('Backquote')) { this.overlay = null; return; }
      const acts = this.adminActions(), m = input.mouse; let k = -1;
      acts.forEach((_, i) => { const r = HUD.adminRow(i); if (input.wasPressed('Digit' + (i + 1)) || (input.wasPressed('Mouse0') && m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h)) k = i; });
      if (k < 0) return; const a = acts[k]; this.input.mouse.down = false;
      if ('ok' in a && !a.ok) { o.msg = { text: '지금은 쓸 수 없습니다', color: '#ff9a9a', t: 1.5 }; return; }
      const closes = /스테이지로|필드로|시련|진화/.test(a.name); a.run(); if (closes) this.overlay = null; else o.msg = { text: a.name.replace(/ \[.*\]/, '') + ' — 완료', color: '#ffd84a', t: 1.5 };
    } else if (o.type === 'travel') { // + 빠른 이동: 카멜롯(층 고르기) · 바빌로니아
      if (o.msg) o.msg.t -= STEP;
      if (input.wasPressed('Escape') || input.wasPressed('Equal') || input.wasPressed('NumpadAdd')) { if (o.sub) { o.sub = null; return; } this.overlay = null; return; }
      const items = o.sub === 'camelot' ? this.camelotFloors() : ['camelot', 'babylon'];
      let ch = -1; items.forEach((_, i) => { if (input.wasPressed('Digit' + (i + 1))) ch = i; });
      if (input.wasPressed('Mouse0')) { const m = input.mouse; items.forEach((_, i) => { const r = HUD.travelRect(i, items.length); if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) ch = i; }); this.input.mouse.down = false; }
      if (ch < 0) return;
      if (o.sub === 'camelot') { this.askTrial(items[ch]); return; }
      if (items[ch] === 'camelot') { if (this.camelotFloors().length) o.sub = 'camelot'; else o.msg = { text: '아직 카멜롯에 갈 수 없습니다 — 멀린의 시련을 진행하세요', color: '#ff9a9a', t: 2.5 }; }
      else { this.overlay = null; this.transition = { t: 0, swapped: false, action: () => this.startBabylonThrone(null) }; } /* 길가메시의 왕좌로 */
      return;
    } else if (o.type === 'skins') { // 스킨 고르기: 카드 클릭·번호 키로 장착/해제
      if (o.msg) o.msg.t -= STEP;
      if (input.wasPressed('Escape') || input.wasPressed('KeyK') || input.wasPressed('KeyE')) { this.overlay = o.back === 'hero_info' ? { type: 'hero_info', heroId: this.save.selected, branchIndex: o.backIndex || 0 } : o.back === 'pause' ? { type: 'pause' } : null; return; }
      if (input.wasPressed('KeyG')) { this.overlay = { type: 'gift', code: '', msg: null }; input.typed.length = 0; return; }
      let ch = -1; SKINS.forEach((_, i) => { if (input.wasPressed('Digit' + (i + 1))) ch = i; });
      if (input.wasPressed('Mouse0')) { const m = input.mouse; SKINS.forEach((_, i) => { const r = HUD.skinRect(i); if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) ch = i; }); this.input.mouse.down = false; }
      if (ch >= 0) { const K = SKINS[ch], sv = this.save; sv.skinOn = sv.skinOn || {};
        if (!(sv.skins || []).includes(K.id)) o.msg = { text: `아직 없는 스킨입니다 — 선물 코드로 얻을 수 있어요 (G)`, color: '#ff9a9a', t: 2.5 };
        else { const M = this.skinOnMap(), key = skinKey(K), on = M[key] === K.id; M[key] = on ? null : K.id; writeSave(sv); SFX.play('ui');
          const L = jobLines(K.hero).find((l) => l.id === K.line); o.msg = { text: on ? `'${K.name}' 해제 — 기본 외형` : `'${K.name}' 장착${L ? ` — ${this.data.heroes.get(K.hero).name} ${L.name} 계열일 때 보임` : ''}`, color: '#ffd84a', t: 2.5 }; } }
      return;
    } else if (o.type === 'gift') { // 선물 코드 입력 (영문·숫자 최대 16자)
      if (o.msg) o.msg.t -= STEP;
      for (const k of input.typed) { if (/^Key[A-Z]$/.test(k) && o.code.length < 16) o.code += k[3]; else if (/^Digit[0-9]$/.test(k) && o.code.length < 16) o.code += k[5]; else if (k === 'Backspace') o.code = o.code.slice(0, -1); }
      if (input.pasted) o.code = (o.code + input.pasted.toUpperCase().replace(/[^A-Z0-9]/g, '')).slice(0, 16); /* 붙여넣기 (영문·숫자만) */
      if (input.wasPressed('Escape')) { this.overlay = { type: 'pause' }; return; }
      if (input.wasPressed('Enter')) { const [text, color] = this.redeemGift(o.code); o.msg = { text, color, t: 4 }; if (color === '#ffd84a') o.code = ''; }
      return;
    } else if (o.type === 'multi') { // 멀티 방: 만들기 / 코드로 참가 / 나가기
      const name = this.netName(), hero = this.save.selected;
      if (o.mode === 'code') { // 방 코드 입력 (알파벳 4글자)
        for (const k of input.typed) { if (/^Key[A-Z]$/.test(k) && o.code.length < 4) o.code += k[3]; else if (k === 'Backspace') o.code = o.code.slice(0, -1); } // 누른 순서대로
        if (input.pasted) o.code = (o.code + input.pasted.toUpperCase().replace(/[^A-Z]/g, '')).slice(0, 4); /* 방 코드 붙여넣기 */
        if (input.wasPressed('Escape')) { o.mode = 'menu'; o.code = ''; return; }
        if ((input.wasPressed('Enter')) && o.code.length === 4) { Net.join(o.code, name, hero); o.mode = 'menu'; }
        return;
      }
      if (input.wasPressed('Escape') || input.wasPressed('KeyE')) { this.overlay = null; return; }
      const pickN = (n) => input.wasPressed('Digit' + n) || (input.wasPressed('Mouse0') && (() => { const r = HUD.adminRow(n - 1), m = input.mouse; return m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h; })());
      if (!Net.inRoom) { if (pickN(1)) Net.create(name, hero); else if (pickN(2)) { o.mode = 'code'; o.code = ''; Net.error = null; } }
      else if (pickN(1)) Net.leave();
    } else if (o.type === 'rank') { // 명예의 전당
      if (input.wasPressed('Escape') || input.wasPressed('KeyE')) { this.overlay = null; return; }
      ['Digit1', 'Digit2', 'Digit3', 'Digit4'].forEach((k, i) => { if (input.wasPressed(k)) o.tab = i; });
      if (input.wasPressed('Mouse0')) for (let i = 0; i < 4; i++) { const r = HUD.rankTab(i), m = input.mouse; if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) o.tab = i; }
    } else if (o.type === 'details') { // 상세 정보: 1~3 / 클릭 탭, Esc·I 뒤로
      if (input.wasPressed('Escape') || input.wasPressed('KeyI')) { this.overlay = { type: 'pause' }; return; }
      ['Digit1', 'Digit2', 'Digit3'].forEach((k, i) => { if (input.wasPressed(k)) o.tab = i; });
      if (input.wasPressed('Mouse0')) for (let i = 0; i < 3; i++) { const r = HUD.guildTab(i), m = input.mouse; if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) o.tab = i; }
    } else if (o.type === 'trial_confirm') { // 롱고미니아드의 시련: 도전 / 나중에
      const m = input.mouse, hit = (r) => m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h, click = input.wasPressed('Mouse0');
      let rk = input.wasPressed('Enter') ? 2 : -1; /* 1·2·3: 1진·2진·3진으로 도전, Enter는 3진 */
      for (let i = 0; i < 3; i++) if (input.wasPressed('Digit' + (i + 1)) || (click && hit(HUD.trialBtn(i)))) rk = i;
      if (rk >= 0) { this.overlay = null; this.input.mouse.down = false; const tid = o.id || 'rhongo'; this.transition = { t: 0, swapped: false, action: () => this.startQuestTrial(tid, rk) }; }
      else if (input.wasPressed('Escape') || input.wasPressed('Digit4') || input.wasPressed('KeyE') || (click && hit(HUD.trialBtn(3)))) { this.overlay = null; this.input.mouse.down = false; const mt = this.props.find((x) => x instanceof MerlinTable); if (mt) mt.bubble = { text: '「준비가 되면 다시 오게.」', t: 3 }; }
    } else if (o.type === 'resume') {
      if (input.wasPressed('Enter')) { this.overlay = null; this.transition = { t: 0, swapped: false, action: () => this.resumeRun() }; }
      else if (input.wasPressed('KeyN')) { this.overlay = null; this.save.run = null; writeSave(this.save); this.transition = { t: 0, swapped: false, action: () => this.startRun() }; }
      else if (input.wasPressed('Escape')) this.overlay = null;
    } else if (o.type === 'story') { // 한 줄씩: 클릭/Enter/Space 다음, Esc 건너뛰기
      o.t += STEP;
      const next = input.wasPressed('Enter') || input.wasPressed('Space') || input.wasPressed('Mouse0');
      if (input.wasPressed('Escape')) o.i = o.lines.length;
      else if (next && o.t > 0.35) { o.i++; o.t = 0; }
      if (o.i >= o.lines.length) { this.overlay = null; this.input.mouse.down = false; o.done(); }
    } else if (o.type === 'treasure_pick') {
      const all = treasurePickList(); // 시련으로만 얻는 보구·심층 보스에게서만 나오는 보구는 제외
      if (!all.length || this.save.treasures.length) { if (input.wasPressed('Enter') || input.wasPressed('Mouse0')) this.pickTreasure(null); return; } // 첫 보구는 한 번만
      const list = this.treasurePage(o, all, input); if (!list) return;
      if (input.wasPressed('Mouse0')) { const m = input.mouse, i = list.findIndex((_, i) => { const r = HUD.treasureRect(i, list.length); return m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h; }); if (i >= 0) this.pickTreasure(list[i]); }
    } else if (o.type === 'archive') { // 이야기 기록: 고른 장면을 다시 재생
      if (o.msg) o.msg.t -= STEP;
      if (input.wasPressed('Escape') || input.wasPressed('KeyE')) { this.overlay = null; return; }
      const m = input.mouse; let pickI = -1;
      STORY_ARCHIVE.forEach((s, i) => { const r = HUD.archiveRow(i); if (input.wasPressed('Digit' + (i < 9 ? i + 1 : i === 9 ? 0 : 'X')) || (input.wasPressed('Mouse0') && m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h)) pickI = i; });
      if (pickI < 0) return;
      const S = STORY_ARCHIVE[pickI]; this.input.mouse.down = false;
      if (!S.unlocked(this.save)) { o.msg = { text: '아직 보지 못한 이야기입니다', color: '#ff9a9a', t: 2 }; return; }
      const back = () => { this.overlay = { type: 'archive', msg: null }; };
      if (S.kind === 'cut') { this.overlay = null; this.playCutscene(S.lines(), { always: true, force: true, done: back }); }
      else this.overlay = { type: 'story', sanctum: S.kind === 'sanctum', lines: S.lines(), i: 0, t: 0, done: back };
    } else if (o.type === 'guild' || o.type === 'hunt' || o.type === 'trade' || o.type === 'gamble') { // 탐험가 길드 창들
      if (o.msg) o.msg.t -= STEP; if (o.roll > 0) { o.roll -= STEP; if (o.roll <= 0 && o.pending) { o.msg = { text: o.pending.text, color: o.pending.color, t: 2.5 }; o.result = o.pending; o.pending = null; } return; }
      if (input.wasPressed('Escape') || input.wasPressed('KeyE')) { // 도박: 고르는 중에 닫으면 무작위로 하나를 고름
        if (o.type === 'gamble' && this.save.gambleCards) { const r = this.gamblePick(randInt(0, 2)); this.showBanner('결정석 도박', r.text + ' (자동 선택)', r.color); }
        this.overlay = null; return; }
      const m = input.mouse, hit = (r) => m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h, say = (res) => { o.msg = { text: res[0], color: res[1], t: 2.2 }; this.input.mouse.down = false; };
      const G = this.guild(), click = input.wasPressed('Mouse0');
      if (o.type === 'guild') {
        ['Digit1', 'Digit2', 'Digit3'].forEach((k, i) => { if (input.wasPressed(k)) o.tab = i; });
        if (click) for (let i = 0; i < 3; i++) if (hit(HUD.guildTab(i))) { o.tab = i; return; }
        if (!click) return;
        if (o.tab < 2) { const list = o.tab ? G.weekly : G.daily; list.forEach((q, i) => { if (hit(HUD.guildRow(i))) say(this.claimQuest(q)); }); }
        else this.visibleTitles().forEach((T, i) => { if (hit(HUD.titleCell(i))) { if (!this.titleUnlocked(T)) say(['아직 얻지 못한 칭호입니다', '#ff9a9a']); else { this.save.title = this.save.title === T.id ? null : T.id; writeSave(this.save); if (this.profile && !this.admin) Net.postTitle(this.profile.name, this.myTitleId()); /* 랭킹 칭호도 바로 */ say([this.save.title ? `칭호 장착: ${T.name}` : '칭호 해제', '#ffd84a']); } } });
      } else if (o.type === 'hunt') {
        if (!click) return;
        G.offers.forEach((h, i) => { if (hit(HUD.guildRow(i))) say(this.acceptHunt(h)); });
        G.active.forEach((h, i) => { if (hit(HUD.guildRow(5 + i))) say(this.claimHunt(h)); });
      } else if (o.type === 'trade') {
        if (click) G.stock.forEach((id, i) => { if (hit(HUD.guildRow(i))) say(this.buySupply(id)); });
      } else if (o.type === 'gamble') {
        if (this.save.gambleCards) { // 결정석 고르기
          for (let i = 0; i < 3; i++) if (input.wasPressed('Digit' + (i + 1)) || (click && hit(HUD.gemRect(i)))) { o.pending = this.gamblePick(i); o.roll = 0.7; o.msg = null; this.input.mouse.down = false; return; }
        } else if (input.wasPressed('Digit1') || input.wasPressed('Space') || (click && hit(HUD.betRect()))) {
          if (this.save.bank < GUILD_GAMBLE.bet) say([`${CUR.name}이 부족합니다`, '#ff9a9a']); else if (this.gambleStart()) { o.result = null; o.msg = null; o.shuffle = 0.6; this.input.mouse.down = false; }
        }
        if (o.shuffle > 0) o.shuffle -= STEP;
      }
    } else if (o.type === 'hero_info') { // 캐릭터 상세: 패시브·직업 계열·진화 스킬
      if (input.wasPressed('Escape') || input.wasPressed('KeyE')) { this.overlay = null; return; }
      if (input.wasPressed('KeyS')) { this.overlay = { type: 'skins', back: 'hero_info', backIndex: o.branchIndex || 0, msg: null }; return; } // 스킨 고르기 창
      if (input.wasPressed('KeyJ')) {
        this.overlay = { type: 'joblevel', msg: null, returnToHeroInfo: true, branchIndex: o.branchIndex || 0 };
        return;
      }
      const lines = jobLines(o.heroId || this.save.selected); let picked = false;
      lines.forEach((_, i) => { if (input.wasPressed('Digit' + (i + 1))) { o.branchIndex = i; picked = true; } });
      if (input.wasPressed('Mouse0')) {
        const m = input.mouse;
        lines.forEach((_, i) => {
          const r = HUD.heroBranchRect(i, lines.length);
          if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) { o.branchIndex = i; picked = true; }
        });
        this.input.mouse.down = false;
      }
      if (picked && lines[o.branchIndex] && lines.length > 1) { const hid = o.heroId || this.save.selected, L = lines[o.branchIndex]; /* 고르면 진화 루트로 저장 */
        this.save.lineChoice = this.save.lineChoice || {}; this.save.lineChoice[hid] = L.id; writeSave(this.save); o.msg = { text: `진화 루트: ${L.name} (${L.ranks.join(' → ')})`, t: 2.5 }; SFX.play('ui'); }
      if (o.msg) o.msg.t -= STEP;
    } else if (o.type === 'joblevel') { // 직업 레벨 창: 숫자 키 / 클릭으로 레벨업
      if (o.msg) o.msg.t -= STEP;
      if (input.wasPressed('Escape') || input.wasPressed('KeyE')) {
        this.overlay = o.returnToHeroInfo
          ? { type: 'hero_info', heroId: this.save.selected, branchIndex: o.branchIndex ?? Math.max(0, jobLines(this.save.selected).indexOf(this.chosenLine(this.save.selected))) }
          : null;
        return;
      }
      let pickI = -1;
      DATA_HEROES.forEach((h, i) => { if (input.wasPressed('Digit' + (i + 1))) pickI = i; });
      if (input.wasPressed('Mouse0')) { const m = input.mouse; DATA_HEROES.forEach((h, i) => { const r = HUD.jobRowRect(i); if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) pickI = i; }); }
      if (pickI >= 0) { const [text, color] = this.levelUpJob(DATA_HEROES[pickI]); o.msg = { text, color, t: 2 }; this.input.mouse.down = false; }
    } else if (o.type === 'treasures') { // 로비 보구 보관대: 1개 장착
      if (input.wasPressed('Escape') || input.wasPressed('KeyE')) { this.overlay = null; return; }
      const own = this.treasurePage(o, DATA_TREASURES.filter((t) => this.save.treasures.includes(t.id)), input); if (!own) return;
      if (input.wasPressed('Mouse0')) { const m = input.mouse, i = own.findIndex((_, i) => { const r = HUD.treasureRect(i, own.length); return m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h; });
        if (i >= 0) { const id = own[i].id; this.save.treasureEquipped = this.save.treasureEquipped === id ? null : id; writeSave(this.save); } }
    }
  }

  // ── 보구 (R): 무기·스킬과 별개인 제3의 도구
  useTreasure() {
    const p = this.player, T = p.treasure;
    if (!T || this.mode !== 'dungeon') return;
    if (!this.zoneRight('treasure')) { this.effects.text(p.x, p.y - 18, '보구의 권리를 빼앗겼다', '#ffd84a'); return; } /* 귀환길: 보구 봉인 */
    if (p.treasureCd > 0) { this.effects.text(p.x, p.y - 18, `${T.name} ${Math.ceil(p.treasureCd)}초`, '#999'); return; }
    p.treasureCd = T.cooldown;
    this.effects.text(p.x, p.y - 24, T.name + '!', T.color, true); SFX.play(T.sfx || 'react', 0.3);
    this.cutin = { kind: 'treasure', name: T.name, sub: `${T.origin}의 보구`, color: T.color, T, start: performance.now() }; // 보구 컷인
    if (T.use !== 'beam' && T.use !== 'spear' && T.use !== 'thorn' && T.use !== 'invis') { this.effects.rays(p.x, p.y, T.color, 18, 100, 0.8); this.effects.rays(p.x, p.y, '#ffffff', 9, 60, 0.5); this.effects.goldBurst(p.x, p.y, 20); } // 엑스칼리버는 빛줄기 하나에 집중
    if (T.use === 'chains') { // 게이트 오브 바빌론: 조준 지점(최대 사거리)에 원형 범위 → 황금 사슬로 묶음
      const mw = this.mouseWorld(), dx = mw.x - p.x, dy = mw.y - p.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, T.range / d);
      const cx = p.x + dx * k, cy = p.y + dy * k;
      this.zones.push(new ChainCircle(cx, cy, T, p, this)); // 범위 안의 적을 묶고 큰 피해 (범위가 남아 있는 동안 들어오는 적도 묶음)
      this.effects.rays(cx, cy, '#ffd84a', 16, T.radius + 20, 0.7);
      this.effects.ring(cx, cy, T.radius, '#ffd84a'); this.effects.ring(cx, cy, T.radius * 0.6, '#fff4c0');
      this.addShake(0.25, 4); this.screenFlash = 0.08; this.flashColor = '255,216,74'; this.hitStop(0.05);
    } else if (T.use === 'heaven') { /* 하늘의 사슬: 가장 강한 적(보스 우선) 하나를 길게 묶고 주변에도 뻗음 */
      const cand = this.enemies.filter((e) => e.targetable && Math.hypot(e.x - p.x, e.y - p.y) < T.range);
      const tgt = cand.find((e) => e.def.boss) || cand.sort((a, b) => b.hp - a.hp)[0] || null;
      if (tgt) { this.zones.push(new HeavenChains(p, tgt, T, this)); this.effects.rays(tgt.x, tgt.y, T.color, 14, 60, 0.6); }
      else { this.effects.text(p.x, p.y - 34, '묶을 적이 없음', '#9ae8d8'); p.treasureCd = 3; }
    } else if (T.use === 'horn') { /* 하늘의 황소의 뿔: 조준 방향으로 무적 돌진 */
      const A = Math.atan2(p.aim.y, p.aim.x); p.hornT = T.dist / T.speed; this.zones.push(new BullHornCharge(p, A, T));
      this.addShake(0.2, 4); SFX.play('dash', 0.2);
    } else if (T.use === 'beam') { // 엑스칼리버: 검을 들어 빛기둥을 세우고(0.6초) → 조준 방향으로 내려찍음 → 끝에서 폭발
      this.zones.push(new ExcaliburRaise(p, T, () => this.excaliburStrike(p, T)));
      SFX.play('skill');
    } else if (T.use === 'spear') { // 롱고미니아드: 조준 지점(최대 사거리, 벽 무시)에 빛의 창을 던짐 → 빛의 탑
      const mw = this.mouseWorld(), dx = mw.x - p.x, dy = mw.y - p.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, T.range / d);
      this.zones.push(new RhongoTower(p, p.x + dx * k, p.y + dy * k, T));
      this.effects.rays(p.x, p.y, '#bfe6ff', 12, 60, 0.5); SFX.play('skill');
    } else if (T.use === 'reflect') { /* 아킬레우스의 방패: 피해 없음 + 닿는 적 탄 반사 */
      p.aegisT = T.duration;
      this.effects.ring(p.x, p.y, 18, T.color); this.effects.ring(p.x, p.y, 30, '#ffffff'); this.addShake(0.15, 3); this.screenFlash = 0.1; this.flashColor = '255,200,80';
    } else if (T.use === 'scabbard') { /* 성검의 칼집: 체력 전부 회복 + 무적 → 이어서 피해 감소 */
      const h = p.maxHp - p.hp; p.hp = p.maxHp; p.scabbardT = T.invuln; p.scabGuardT = T.guardDur; this.effects.heal(p.x, p.y);
      this.effects.text(p.x, p.y - 34, `+${Math.round(h)}  ·  무적 ${T.invuln}초`, T.color); this.effects.skyBeam(p.x, p.y, '#fff4c0', 0, 10);
      this.effects.ring(p.x, p.y, 30, '#ffffff'); this.effects.ring(p.x, p.y, 20, T.color); this.screenFlash = 0.15; this.flashColor = '255,240,190';
    } else if (T.use === 'fleece') { /* 황금 양털: 체력 회복 + 잠시 동안 버티기 */
      const h = Math.min(p.maxHp - p.hp, Math.round(p.maxHp * T.heal)); p.hp += h; p.fleeceT = T.guardDur; this.effects.heal(p.x, p.y);
      const left = T.endureMax - (p.fleeceUsed || 0);
      this.effects.text(p.x, p.y - 34, `+${h}  ·  ${left > 0 ? `버티기 ${T.guardDur}초 (남은 ${left}번)` : '버티기는 모두 썼음'}`, '#ffd870');
      this.effects.ring(p.x, p.y, 26, T.color); this.screenFlash = 0.1; this.flashColor = '255,216,112';
    } else if (T.use === 'invis') { // 하데스의 투구: 모습을 감춤
      p.hadesT = T.duration;
      for (let i = 0; i < 26; i++) { const a = Math.random() * TAU, s = 20 + Math.random() * 50; this.effects.part(p.x, p.y - 4, Math.cos(a) * s, Math.sin(a) * s * 0.6 - 10, { color: i % 2 ? '#3a3a4a' : '#9aa8c8', life: 0.7, size: 2.5, size2: 0, drag: 2 }); }
      this.effects.ring(p.x, p.y, 26, '#9aa8c8'); this.screenFlash = 0.12; this.flashColor = '60,60,80';
      for (const e of this.enemies) if (e.alive && (e.state === 'CHASE' || e.state === 'TELEGRAPH') && !e.def.boss) e.setState('IDLE'); // 하던 공격을 놓침
    } else if (T.use === 'thorn') { // 게이볼그: 가장 강한 적에게 절대 빗나가지 않는 창
      const cand = this.enemies.filter((e) => e.targetable && Math.hypot(e.x - p.x, e.y - p.y) < 420);
      const tgt = cand.find((e) => e.def.boss) || cand.sort((a, b) => b.hp - a.hp)[0] || null;
      this.zones.push(new GaeBolgThrow(p, tgt, T, this.mouseWorld())); SFX.play('skill');
    } else if (T.use === 'garden') { // 가든 오브 아발론: 방 한가운데 탑 + 방 전체 꽃밭
      const r = this.map.roomAtPoint(p.x, p.y), c = r ? this.map.tileCenter(r.cx, r.cy) : { x: p.x, y: p.y };
      this.zones = this.zones.filter((z) => !(z instanceof AvalonGarden));
      this.zones.push(new AvalonGarden(c.x, c.y, r, T, p));
      this.effects.skyBeam(c.x, c.y, '#ffd8ec', 0, 18); this.effects.rays(c.x, c.y, '#ffb0d8', 20, 140, 1); this.effects.ring(c.x, c.y, 80, '#ffffff');
      this.addShake(0.25, 4); this.screenFlash = 0.18; this.flashColor = '255,200,230';
    } else if (T.use === 'blessing') { // 솔로몬의 반지: 각종 버프
      p.solomon = T.duration; p.shield = p.maxShield; p.energy = p.maxEnergy; p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * T.heal)); p.skillCooldown = 0; this.effects.heal(p.x, p.y);
      this.effects.solomonSeal(p.x, p.y); this.effects.ring(p.x, p.y, 40, '#ffd84a'); this.effects.ring(p.x, p.y, 70, '#c8a0ff'); this.effects.solomonSeal(p.x, p.y, 1.8); this.addShake(0.2, 3);
      this.screenFlash = 0.12; this.flashColor = '210,180,255';
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; this.effects.skyBeam(p.x + Math.cos(a) * 46, p.y + Math.sin(a) * 34, i % 2 ? '#c8a0ff' : '#ffd84a', 0.1 + i * 0.05, 4); } // 육각형으로 내리는 빛기둥
      for (let i = 0; i < 30; i++) this.effects.part(p.x + randInt(-30, 30), p.y + randInt(-10, 14), randInt(-8, 8), -40 - Math.random() * 60, { color: i % 2 ? '#c8a0ff' : '#ffd84a', life: 1, size: 2, size2: 0, drag: 1, add: true });
    }
  }
  // 엑스칼리버 내려찍기 (ExcaliburRaise가 빛기둥을 세운 뒤 호출): 빛기둥 길이만큼 일직선 피해(벽 관통) → 끝에서 폭발. 스테이지가 깊을수록 피해도 커짐
  excaliburStrike(p, T) {
    if (p.state === 'DEAD') return;
    const sx = p.x + p.aim.x * 8, sy = p.y + p.aim.y * 8, len = T.range; // 빛기둥 길이 그대로 내려꽂힘 (벽에 막히지 않음)
    let ex = sx + p.aim.x * len, ey = sy + p.aim.y * len; const dmg = T.damage * this.scale.hp, xm = Object.assign({}, p.mods, { critChance: 0 }); // 치명타 없이 항상 같은 피해
    for (const e of this.enemies) if (e.targetable && segmentCircleHit(sx, sy, ex, ey, e.x, e.y, e.radius + T.width) >= 0) {
      this.damageEnemy(e, { damage: dmg, mods: xm, knockback: 10, treasure: true }, p.aim.x, p.aim.y);
      if (e.alive && T.stun) e.stunT = Math.max(e.stunT || 0, e.def.boss ? T.stun * 0.5 : T.stun); } // 빛에 맞은 적 경직 (보스는 절반)
    for (const b of this.enemyBullets) if (segmentCircleHit(sx, sy, ex, ey, b.x, b.y, T.width + 2) >= 0) b.alive = false; // 검기에 닿은 적 탄 소멸 (보구라서 길가메시의 칼날도 지움)
    this.effects.excalibur(sx, sy, ex, ey, T.width, p.x, p.y);
    this.addShake(0.5, 9); this.screenFlash = 0.4; this.flashColor = '255,240,200'; this.hitStop(0.12); SFX.play('excal');
    // 폭발은 마우스로 조준한 지점(검기 위, 사거리 안)에서: 금빛 대폭발 + 충격파 고리 + 빛살 + 빛기둥 (주변 적에게 추가 피해)
    { const mw = this.mouseWorld(), along = clamp((mw.x - sx) * p.aim.x + (mw.y - sy) * p.aim.y, 40, len); ex = sx + p.aim.x * along; ey = sy + p.aim.y * along; }
    this.explodeAt(ex, ey, T.blast, { color: '#ffe9a0', hurtEnemies: true, src: { damage: dmg * T.blastRatio, mods: xm, knockback: 14, treasure: true } });
    this.effects.rays(ex, ey, '#fff4c0', 22, T.blast * 2.2, 0.8); this.effects.ring(ex, ey, T.blast, '#ffffff'); this.effects.ring(ex, ey, T.blast * 1.6, '#ffd84a');
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; this.effects.explosion(ex + Math.cos(a) * T.blast * 0.55, ey + Math.sin(a) * T.blast * 0.4, 14 + (i % 3) * 4, '#ffd84a'); }
    this.effects.skyBeam(ex, ey, '#ffffff', 0, 16); this.effects.goldBurst(ex, ey, 30); SFX.play('explode');
  }
  // 게이볼그가 꿰뚫음 (GaeBolgThrow가 호출): 큰 피해 + 주변으로 가시 폭발 + 출혈
  treasureClear(x, y, r) { /* [사용자 결정] 보구 공격에 닿은 적 탄은 사라짐 (길가메시 보물고의 칼날 포함) */ for (const b of this.enemyBullets) if (b.alive && Math.hypot(b.x - x, b.y - y) < r) { b.alive = false; this.effects.spark(b.x, b.y, '#fff4c0'); } }
  gaeBolgHit(p, x, y, tgt, T) {
    this.treasureClear(x, y, T.thornR);
    const src = (d) => ({ damage: d * this.scale.hp, mods: Object.assign({}, p.mods, { critChance: 0 }), knockback: 6, treasure: true }), bled = [];
    if (tgt && tgt.targetable) { this.damageEnemy(tgt, src(T.damage), 0, 0); bled.push(tgt); }
    for (const e of this.enemies) if (e !== tgt && e.targetable && Math.hypot(e.x - x, e.y - y) < T.thornR + e.radius) { this.damageEnemy(e, src(T.thornDmg), e.x - x, e.y - y); bled.push(e); }
    this.zones.push(new ThornBurst(x, y, T)); this.zones.push(new BleedTicker(bled, T, this.scale.hp));
    this.effects.rays(x, y, '#ff4a5a', 24, T.thornR, 0.7); this.effects.ring(x, y, T.thornR, '#ff8a8a'); this.effects.burst(x, y, '#ff4a5a', 26);
    this.addShake(0.4, 7); this.screenFlash = 0.22; this.flashColor = '255,60,80'; this.hitStop(0.1); SFX.play('explode');
  }
  // ── 직업 계열·진화
  // 스킬 피해: 깊이 내려갈수록 조금씩 커짐 (스테이지 배율의 절반)
  //  [사용자 결정·@하요 정리] 시련(롱고미니아드·카멜롯)에서는 배율을 100% 받고, 든 무기의 등급·강화만큼 더 셈 — 무기 화력을 키우는 사수 스킬과의 차이를 줄임 (심층·일반 던전은 그대로)
  skillDmg(base) {
    const trial = this.mode === 'dungeon' && this.trialW;
    const p0 = this.player, SK = BALANCE.skillScale, lk = p0 && p0.line && p0.hero && SK.lines[p0.hero.id + '|' + p0.line.id]; /* [사용자 결정] 함정·드론 기술자: 깊이 내려갈수록 스킬이 덜 자라서 약해지던 것 → 스테이지 성장을 더 많이 받음 */
    const sh = this.scale.hp; let m = base * (1 + (sh - 1) * (trial ? 1 : SK.base) + (!trial && lk ? Math.max(0, sh - SK.from) * (lk - SK.base) : 0)); /* 갈래 예외는 후반(몬스터 체력 ×from 이상)부터만 더 자람 */
    if (p0 && p0.hero && SK.hero[p0.hero.id]) m *= SK.hero[p0.hero.id]; /* [사용자 결정] 드루이드 계열 살짝 강화 */
    if (trial) { const w = this.player && this.player.weapon; if (w) m *= 1 + (BALANCE.trialSkillRarity[w.def.rarity] || 0) + (w.lv || 0) * BALANCE.upgrade.perLevel * 0.25; }
    return m;
  }
  setJob(p, line, rank) {
    const sk = line.skills[rank], ratio = p.skillCdMax / (p.skillBaseCd || p.skillCdMax); // '집중' 같은 쿨타임 감소 유지
    if (line.look) p.hero = heroWithLook(this.data.heroes.get(p.hero.id) || p.hero, line.look); // 갈래별 옷색 (마도사 속성)
    p.line = line; p.rank = rank; p.skillId = sk.id; p.skillName = sk.name; p.skillDesc = sk.desc;
    p.skillBaseCd = sk.cd; p.skillCdMax = sk.cd * ratio; p.skillCooldown = Math.min(p.skillCooldown, p.skillCdMax);
  }
  askVariant(after, final = false) { // 갈래가 여럿인 직업은 판을 시작할 때 고름 (final: 롱고미니아드 시련 — 최종 진화로 보여 줌)
    const lines = jobLines(this.player.hero.id);
    const chosen = this.chosenLine(this.player.hero.id); this.player.lineChoice = chosen.id; /* 로비에서 고른 진화 루트 (진화 때 갈래를 고르는 직업은 진화의 방에서 이 갈래로) */
    if (lines.length === 1 || branchesAtEvolve(this.player.hero.id)) { this.setJob(this.player, lines[0], 0); if (after) after(); return; } // 갈래가 하나이거나 진화 때 고르는 직업
    if (window.__toolMode) { this.applyVariant(lines[0]); if (after) after(); return; } // 테스트 도구: 첫 갈래
    this.applyVariant(chosen); const R = final === true ? 2 : typeof final === 'number' ? final : 0; /* [사용자 결정] 판 시작 때 갈래 창 대신 로비에서 고른 진화 루트 */
    this.showBanner(`${chosen.ranks[R]}`, `스킬: ${chosen.skills[R].name} — 진화 루트는 로비의 캐릭터 정보에서 바꿀 수 있어요`, chosen.color); if (after) after();
  }
  applyVariant(line) {
    const p = this.player;
    this.setJob(p, line, 0);
    if (line.startWeapon && this.data.weapons.get(line.startWeapon)) { p.weapons[0] = new WeaponInstance(this.data.weapons.get(line.startWeapon)); this.discover(line.startWeapon); }
    if (line.moveSpeed) p.moveSpeed += line.moveSpeed;
  }
  evolve(hybrid, branch) {
    const p = this.player, next = p.rank + 1, line = branch || p.line; // branch: 첫 진화 때 고른 갈래 (암살자)
    if (!line || next > 2) return;
    p.maxHp += EVOLUTION.hp[next - 1]; p.hp = Math.min(p.maxHp, p.hp + EVOLUTION.hp[next - 1] + 20);
    p.maxEnergy += EVOLUTION.energy[next - 1]; p.energy = p.maxEnergy;
    this.setJob(p, line, next); p.skillCooldown = 0;
    if (hybrid) this.setHybrid(p, hybrid.H, hybrid.el);
    this.showBanner(`${p.hybrid ? p.hybrid.title : line.ranks[next]} (으)로 진화!`, `새 스킬: ${p.skillName} — ${p.skillDesc}`, p.hybrid ? p.hybrid.color : '#ffd84a');
    this.effects.ring(p.x, p.y, 30, '#ffd84a'); this.effects.ring(p.x, p.y, 50, line.color || '#ffd84a'); this.effects.burst(p.x, p.y, '#ffd84a', 30);
    this.screenFlash = 0.3; this.flashColor = '255,216,74'; this.addShake(0.2, 3); SFX.play('clear'); SFX.play('solomon', 0.5);
  }
  // 혼합 직업 적용: 스킬이 바뀌고 속성(상위자의 마도사 갈래)을 이어받음
  setHybrid(p, H, el) {
    const ratio = p.skillCdMax / (p.skillBaseCd || p.skillCdMax);
    p.hybrid = { id: Object.keys(HYBRID_JOBS).find((k) => HYBRID_JOBS[k] === H), el: el.id, title: `${el.name}의 ${H.name}`, color: el.color || '#ffd84a', status: ELEMENT_STATUS[el.id], passiveChance: H.passiveChance };
    p.skillId = H.skill.id; p.skillName = H.skill.name; p.skillDesc = H.skill.desc; p.skillBaseCd = H.skill.cd; p.skillCdMax = H.skill.cd * ratio; p.skillCooldown = 0;
  }
  hybridTitle(npc) { return npc.hybrid ? `${npc.hybrid.el.name}의 ${npc.hybrid.H.name}` : null; }
  evolvePrice() { return Math.round(EVOLUTION.price[this.player.rank] * (1 + BALANCE.shopInflate * this.stageIndex)); }
  startTrial(npc) { // 상위자와 1:1 대결 (미니 보스)
    const p = this.player, r = npc.room, next = p.rank + 1, hy = npc.hybrid, MH = hy ? hy.masterHero : p.hero;
    const TL = npc.branch || p.line, key = hy ? `master_${hy.H.master}_${hy.el.id}_hybrid` : `master_${p.hero.id}_${TL.id}_${next}`, trialName = hy ? this.hybridTitle(npc) : TL.ranks[next];
    if (!this.data.enemies.get(key)) {
      const look = MH.look.sprite, D = HERO_PROCS[look];
      const mkey = 'master_' + look + (hy ? '_' + hy.el.id : ''); // 혼합 전직 상위자는 속성 옷색
      if (!PIX[mkey]) PIX[mkey] = { tint: '#c8a050', w: HERO_W, h: HERO_H, proc: (P) => D.proc(P, 0),
        pal: Object.assign({ s: '#f0c8a0', m: '#fff0b0', w: '#ffffff', r: MH.look.accent, y: '#ffd84a', l: '#8a6a30', h: MH.look.accent, g: shade(MH.look.accent, 0.68), e: '#ffffff', n: '#6a4628', d: '#3a2a1a' }, D.pal, { m: '#fff0b0' }) };
      const col = (hy ? hy.el.color : TL.color) || '#ffd84a';
      this.data.enemies.set(key, { id: key, name: `${trialName}의 시련`, title: '상위자', sprite: mkey, color: '#c8a050', phaseColors: ['#c8a050', '#d8b060', '#ffd84a'],
        boss: true, master: true, aiType: 'boss', health: EVOLUTION.masterHp[next - 1], damage: 15 + next * 2, moveSpeed: 55, hitboxHalf: 9, knockbackResist: 0.9, attackCooldown: next === 1 ? 1.25 : 1.05, bulletSpeed: 135, rewardGold: 30,
        patterns: [{ type: 'aimed', volleys: 3, count: 5, spread: 0.15, color: col }, { type: 'radial', rings: 2, count: 18, color: col }, { type: 'charge', dashes: 2, speed: 340, color: '#ffffff' }],
        phase2Patterns: [{ type: 'spiral', duration: 2.2, arms: 3 + next, interval: 0.09, spin: 1.8, color: col }, { type: 'slam', radius: 46, chain: next, color: col }] });
    }
    npc.gone = true; r.trial = next; r.trialPlayer = p; r.hybrid = hy || null; r.branch = npc.branch || null; r.state = 'active'; this.activeRoom = r; r.wavesLeft = 0; // 시련을 시작한 사람이 진화 (멀티)
    this.map.setDoors(r, true); this.enemyBullets.length = 0; if (this.coop && this.coop.host) this.coopGather(r, p); // 멀티: 동료도 시련 방으로
    const c = this.map.tileCenter(r.cx, r.cy - 1), m = this.spawnEnemy(key, c.x, c.y, r); m.phase = 1;
    this.showBanner(`${trialName}의 시련`, hy ? `${hy.el.name}의 마도사 상위자를 쓰러뜨리면 ${trialName}(으)로 진화합니다` : '상위자를 쓰러뜨리면 진화합니다', '#ffd84a'); SFX.play('boss');
  }
  // ── 스킬
  useSkill() {
    const p = this.player;
    if (p.castLock > 0) return;
    const charged = p.skillId === 'deathsentry'; /* 망자의 파수기: 충전 칸이 있으면 쿨타임 중에도 사용 (칸마다 1개 설치) */
    if (charged ? (p.dsCharges == null ? BALANCE.TRAP.sentryCharges : p.dsCharges) <= 0 : p.skillCooldown > 0) return;
    if (p.denyT > 0) { this.effects.text(p.x, p.y - 20, '부정됨', '#d8f0ff'); return; }
    if (!this.zoneRight('job')) { this.effects.text(p.x, p.y - 20, '직업의 권리를 빼앗겼다', '#ffd84a'); return; } /* 귀환길: 첫 층 보스까지 스킬 봉인 */ /* 가레스의 부정 장판 안: 스킬 금지 */
    if (/^overdrive/.test(p.skillId || '') && p.odLockT > 0) return; /* 사수 과부하 계열: 효과가 끝나고 잠시 뒤까지 다시 못 씀 (쿨타임 감소가 쌓여도 효과가 끊기지 않고 계속 유지되던 버그) */
    if (charged) { if (p.dsCharges == null) p.dsCharges = BALANCE.TRAP.sentryCharges; p.dsCharges--; } /* 재사용 대기 없음 — 칸은 actors.js에서 sentryRecharge초마다 1칸씩 참 */
    else p.skillCooldown = p.skillCdMax;
    this.guildEvent('skills');
    SFX.play('skill');
    if (p.rank === 2) this.ultimateFx(p); // 최종 진화 스킬은 컷인과 함께
    const D = (b) => this.skillDmg(b), mw = this.mouseWorld(), A = Math.atan2(p.aim.y, p.aim.x);
    const at = (range) => { const dx = mw.x - p.x, dy = mw.y - p.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, range / d); return { x: p.x + dx * k, y: p.y + dy * k }; }; // 조준 지점 (사거리 제한)
    const nova = (r, dmg, o = {}) => { // 자기 주변 범위 피해
      for (const e of this.enemies) { if (!e.targetable || Math.hypot(e.x - p.x, e.y - p.y) > r + e.radius) continue;
        this.damageEnemy(e, { damage: D(dmg), mods: p.mods, knockback: o.kb ?? 6, feast: !!o.feast, status: (o.status && o.status.dps && this.trialW) ? Object.assign({}, o.status, { dps: D(o.status.dps) }) : o.status || null }, (e.x - p.x) / 50, (e.y - p.y) / 50); /* 시련: 범위 스킬의 중독·화상도 스킬 피해만큼 커짐 */
        if (o.root) e.chainT = Math.max(e.chainT || 0, o.root); }
      if (o.clear) for (const b of this.enemyBullets) if (!b.blade && Math.hypot(b.x - p.x, b.y - p.y) < r) b.alive = false;
      this.effects.ring(p.x, p.y, r, o.color || '#fff'); this.effects.ring(p.x, p.y, r * 0.6, '#ffffff'); this.effects.burst(p.x, p.y, o.color || '#fff', 16);
    };
    const shoot = (o) => { // 스킬 투사체
      const n = o.n || 1;
      for (let i = 0; i < n; i++) { const a = A + (n > 1 ? (i / (n - 1) - 0.5) * (o.fan || 0.3) : 0);
        this.projectiles.push(new Projectile(Object.assign({ x: p.x + Math.cos(a) * 8, y: p.y + Math.sin(a) * 8, dx: Math.cos(a), dy: Math.sin(a), speed: 320, range: 360, pierce: 0, knockback: 4, mods: p.mods, size: 3 }, o.p, { damage: D(o.p.damage) }))); }
      this.effects.muzzle(p.x + p.aim.x * 10, p.y + p.aim.y * 10, A, o.p.color);
    };
    const line = (ang, len, w, dmg) => { // 일직선 충격파
      const ex = p.x + Math.cos(ang) * len, ey = p.y + Math.sin(ang) * len, wt = sweepWall(p.x, p.y, ex, ey, this.map, 3), L = wt < 0 ? len : wt * len;
      const x1 = p.x + Math.cos(ang) * L, y1 = p.y + Math.sin(ang) * L;
      for (const e of this.enemies) if (e.targetable && segmentCircleHit(p.x, p.y, x1, y1, e.x, e.y, e.radius + w) >= 0) this.damageEnemy(e, { damage: D(dmg), mods: p.mods, knockback: 10 }, Math.cos(ang), Math.sin(ang));
      for (let d = 12; d < L; d += 14) this.effects.explosion(p.x + Math.cos(ang) * d, p.y + Math.sin(ang) * d, 8 + d / 20, '#c8a070');
      this.effects.beamline(p.x, p.y, x1, y1, w * 0.6, '#e0b070');
    };
    const strikeSky = (e, dmg) => { this.damageEnemy(e, { damage: D(dmg), mods: p.mods, knockback: 3, status: { type: 'shock', chance: 1, duration: 3 } }, 0, 1); this.effects.lightning(e.x + randInt(-8, 8), e.y - 100, e.x, e.y); };
    switch (p.skillId) {
      // 검사
      case 'whirlwind': p.whirl = 0.5; p.whirlTick = 0; p.whirlStatus = null; break;
      case 'spellblade': { // 마검사 '마력 검무': 속성이 실린 회오리 베기 + 속성 검기 8줄
        const st = p.hybrid ? p.hybrid.status : null, col = p.hybrid ? p.hybrid.color : '#d8e0e8';
        p.whirl = 0.5; p.whirlTick = 0; p.whirlStatus = st;
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; this.projectiles.push(new Projectile({ x: p.x, y: p.y, dx: Math.cos(a), dy: Math.sin(a), speed: 260, range: 170, damage: D(52), pierce: 99, knockback: 4, mods: p.mods, color: col, size: 3, wave: true, status: st })); }
        if (p.hybrid && p.hybrid.el === 'nature') for (const e of this.enemies) if (e.targetable && Math.hypot(e.x - p.x, e.y - p.y) < 90 + e.radius) e.stunT = Math.max(e.stunT || 0, 1.5); /* 자연: 주변 1.5초 속박 */
        if (p.hybrid && p.hybrid.el === 'light') { const n = this.enemies.filter((e) => e.targetable && Math.hypot(e.x - p.x, e.y - p.y) < 170).length; const h = Math.round(p.maxHp * Math.min(0.3, 0.04 * n)); if (h > 0) { p.hp = Math.min(p.maxHp, p.hp + h); this.effects.text(p.x, p.y - 26, '+' + h, '#7be36b'); this.effects.heal(p.x, p.y); } } /* 빛: 주변 적마다 체력 4% 회복 */
        this.effects.ring(p.x, p.y, 36, col); this.effects.ring(p.x, p.y, 22, '#ffffff'); this.effects.burst(p.x, p.y, col, 16); break; }
      case 'whirlwind2': p.whirl = 0.5; p.whirlTick = 0; p.whirlStatus = null;
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; this.projectiles.push(new Projectile({ x: p.x, y: p.y, dx: Math.cos(a), dy: Math.sin(a), speed: 260, range: 160, damage: D(45), pierce: 99, knockback: 4, mods: p.mods, color: '#d8e0e8', size: 3, wave: true })); }
        break;
      case 'swordrain': { const c = at(170); for (let i = 0; i < 14; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 52;
        this.zones.push(new Strike(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.7, 0.35 + i * 0.05, 20, { damage: D(30), mods: p.mods, knockback: 3 }, '#fff4c0', true)); } break; }
      case 'cleave': line(A, 130, 12, 45); this.addShake(0.2, 4); SFX.play('heavy'); break;
      case 'cleave3': for (const da of [-0.38, 0, 0.38]) line(A + da, 140, 12, 60); this.addShake(0.25, 5); SFX.play('heavy'); break;
      // 창술사
      case 'charge': { // 돌진 찌르기: 앞으로 돌진하며 지나간 적을 꿰뚫음
        const sx = p.x, sy = p.y; moveAndCollide(p, p.aim.x * 80, p.aim.y * 80, this.map); p.blinkInv = 0.3;
        for (const e of this.enemies) if (e.targetable && segmentCircleHit(sx, sy, p.x + p.aim.x * 20, p.y + p.aim.y * 20, e.x, e.y, e.radius + 8) >= 0) this.damageEnemy(e, { damage: D(55), mods: p.mods, knockback: 8 }, p.aim.x, p.aim.y);
        this.effects.beamline(sx, sy, p.x + p.aim.x * 20, p.y + p.aim.y * 20, 4, '#c8d8f0'); this.effects.dust(sx, sy + 4); SFX.play('melee'); break; }
      case 'triplethrust': for (let i = 0; i < 3; i++) { const da = (i - 1) * 0.12; // 세 번 찌르기 (약간씩 다른 각도)
          const a = A + da, L = 120, wt = sweepWall(p.x, p.y, p.x + Math.cos(a) * L, p.y + Math.sin(a) * L, this.map, 3), LL = wt < 0 ? L : wt * L, x1 = p.x + Math.cos(a) * LL, y1 = p.y + Math.sin(a) * LL;
          for (const e of this.enemies) if (e.targetable && segmentCircleHit(p.x, p.y, x1, y1, e.x, e.y, e.radius + 6) >= 0) this.damageEnemy(e, { damage: D(42), mods: p.mods, knockback: 5 }, Math.cos(a), Math.sin(a));
          this.effects.beamline(p.x, p.y, x1, y1, 3, i === 1 ? '#ffffff' : '#c8d8f0'); }
        p.swing = { t: 0, dur: 0.15, ang: A, arc: 0.3, thrust: true }; this.addShake(0.1, 2); SFX.play('melee'); break;
      case 'skyspear': { // 천공 투창: 거대한 창이 꿰뚫고 날아가 끝에서 폭발
        const a = A, L = 300, wt = sweepWall(p.x, p.y, p.x + Math.cos(a) * L, p.y + Math.sin(a) * L, this.map, 3), LL = wt < 0 ? L : wt * L, x1 = p.x + Math.cos(a) * LL, y1 = p.y + Math.sin(a) * LL;
        for (const e of this.enemies) if (e.targetable && segmentCircleHit(p.x, p.y, x1, y1, e.x, e.y, e.radius + 13) >= 0) this.damageEnemy(e, { damage: D(221), mods: p.mods, knockback: 10 }, Math.cos(a), Math.sin(a)); /* 상향: 피해 +30%, 판정 +30% */
        this.effects.beamline(p.x, p.y, x1, y1, 9, '#c8d8f0'); this.effects.beamline(p.x, p.y, x1, y1, 3, '#ffffff');
        this.zones.push(new Strike(x1, y1, 0.25, 70, { damage: D(156), mods: p.mods, knockback: 12 }, '#c8d8f0', false));
        this.addShake(0.3, 5); this.hitStop(0.05); SFX.play('heavy'); break; }
      case 'quake': this.zones.push(new SkillCast(p, p.x, p.y, { r: 140, time: 0.6, color: '#e0b070' }, () => {
        this.explodeAt(p.x, p.y, 140, { color: '#e0b070', hurtEnemies: true, src: { damage: D(250), mods: p.mods, knockback: 16 } });
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; this.effects.explosion(p.x + Math.cos(a) * 80, p.y + Math.sin(a) * 50, 16, '#c8a070'); }
        this.addShake(0.5, 9); this.hitStop(0.08); SFX.play('heavy'); })); break;
      // 불
      case 'fireball': shoot({ p: { damage: 40, explodeRadius: 30, color: '#ff8a3a', size: 5, speed: 280, status: { type: 'burn', chance: 1, duration: 3, dps: 10 } } }); SFX.play('fire_x' in SOUNDS ? 'fire_x' : 'flame'); break;
      case 'flamestorm': this.zones.push(new SkillAura(p, { r: 60, life: 5, tick: 0.25, dmg: 16, color: '#ff7a3a', kind: 'flame', status: { type: 'burn', chance: 0.5, duration: 2, dps: 8 } })); this.effects.ring(p.x, p.y, 54, '#ff7a3a'); break;
      case 'explosion': { const c = at(200); this.zones.push(new ExplosionSigil(p, c.x, c.y, { r: 90, time: 2 })); /* 공중 마법진 + 땅의 불기둥 (발동 때 기둥이 차례로 터짐) */
        this.zones.push(new SkillCast(p, c.x, c.y, { r: 90, time: 2, color: '#ff7a3a' }, () => {
        this.explodeAt(c.x, c.y, 90, { color: '#ff7a3a', hurtEnemies: true, src: { damage: D(506), mods: p.mods, knockback: 14, status: { type: 'burn', chance: 1, duration: 4, dps: 14 } } });
        this.screenFlash = 0.4; this.flashColor = '255,170,90'; this.addShake(0.6, 10); this.hitStop(0.1); SFX.play('excal'); })); break; }
      // 얼음
      case 'icelance': shoot({ n: 3, fan: 0.25, p: { damage: 28, pierce: 99, color: '#bfefff', size: 2, speed: 380, arrow: true, status: { type: 'freeze', chance: 0.7, duration: 1.6, slow: 0.4 } } }); break;
      case 'frost_nova': nova(100, 40, { color: '#9ad8ff', clear: true, status: { type: 'freeze', chance: 1, duration: 2.5, slow: 0.15 } }); break;
      case 'absolutezero': { /* 절대 영도: 내 주변을 얼려 멈춤 + 받는 피해 증가 → 3초 뒤 얼음이 깨지며 한 번 더 */
        const R = 120, list = [];
        for (const e of this.enemies) if (e.targetable && Math.hypot(e.x - p.x, e.y - p.y) < R + e.radius) { const t = e.def.boss ? 1.5 : 3; e.stunT = Math.max(e.stunT || 0, t); e.slow = Math.max(e.slow || 0, t); e.slowK = 0.2; e.iceVulnT = t;
          this.damageEnemy(e, { damage: D(104), mods: p.mods, knockback: 0 }, 0, 0); list.push(e); }
        this.zones.push(new DelayCall(3, (w) => { for (const e of list) if (e.alive) { w.damageEnemy(e, { damage: D(173), mods: p.mods, knockback: 6 }, e.x - p.x, e.y - p.y); w.effects.burst(e.x, e.y, '#bfefff', 10); } SFX.play('react', 0.1); }));
        this.effects.ring(p.x, p.y, R, '#ffffff'); this.effects.ring(p.x, p.y, R * 0.7, '#9ad8ff'); this.effects.rays(p.x, p.y, '#bfefff', 18, R, 0.6);
        for (let i = 0; i < 30; i++) { const a = Math.random() * TAU, s = 40 + Math.random() * 120; this.effects.part(p.x, p.y, Math.cos(a) * s, Math.sin(a) * s * 0.7, { color: i % 2 ? '#ffffff' : '#9ad8ff', life: 0.7, size: 2, size2: 0, drag: 3, add: true }); }
        this.screenFlash = 0.2; this.flashColor = '180,230,255'; this.addShake(0.2, 4); SFX.play('magic'); break; }
      case 'lightsat': { /* 성광 위성 */
        this.zones = this.zones.filter((z) => !(z instanceof LightSatellites && z.owner === p));
        this.zones.push(new LightSatellites(p, { n: 3, life: 8, r: 26, every: 0.55, range: 160, dmg: D(23), heal: 1 })); this.effects.ring(p.x, p.y, 30, '#fff4c0'); this.effects.rays(p.x, p.y, '#fff4c0', 14, 60, 0.5); SFX.play('magic'); break; }
      case 'huntmark': { /* 사냥꾼의 표적 */
        const cand = this.enemies.filter((e) => e.targetable && Math.hypot(e.x - p.x, e.y - p.y) < 420), tgt = cand.find((e) => e.def.boss) || cand.sort((a, b) => b.hp - a.hp)[0];
        if (!tgt) { this.effects.text(p.x, p.y - 20, '표적이 없습니다', '#aaa'); p.skillCooldown = 1; break; }
        for (const e of this.enemies) if (e.huntOwner === p) e.huntT = 0;
        tgt.huntT = 8; tgt.huntOwner = p; p.huntT = 8;
        { const a0 = Math.atan2(tgt.y - p.y, tgt.x - p.x); for (const da of [-0.08, 0, 0.08]) this.projectiles.push(new Projectile({ x: p.x, y: p.y - 1, dx: Math.cos(a0 + da), dy: Math.sin(a0 + da), speed: 620, range: 520, damage: D(110), pierce: 99, knockback: 6, mods: p.mods, color: '#ff8a6a', size: 3, arrow: true })); } /* 표적 사격: 꿰뚫는 강한 탄 3발 */ this.effects.ring(tgt.x, tgt.y, 22, '#ff4a3a'); this.effects.text(tgt.x, tgt.y - tgt.radius - 14, '표적', '#ff6a5a', true); SFX.play('crit', 0.05); break; }
      case 'blizzard': { const c = at(180); this.zones.push(new Puddle(c.x, c.y, { r: 64, life: 5, tick: 0.3, dmg: D(14), status: { type: 'freeze', chance: 0.6, duration: 1.2, slow: 0.35 }, color: '#bfefff' }, p.mods)); this.effects.ring(c.x, c.y, 64, '#ffffff'); break; }
      // 자연
      case 'thorns': nova(95, 20, { color: '#7adf4a', root: 1.8, kb: 0, status: { type: 'poison', chance: 1, duration: 4, dps: 10 } }); break;
      case 'bog': { const c = at(170); this.zones.push(new Puddle(c.x, c.y, { r: 56, life: 6, tick: 0.4, dmg: D(12), status: { type: 'poison', chance: 1, duration: 3, dps: 10 }, color: '#5aa03a' }, p.mods)); break; }
      case 'worldtree': this.zones.push(new SkillCast(p, p.x, p.y, { r: 150, time: 0.8, color: '#7adf4a' }, () => {
        nova(150, 300, { color: '#7adf4a', root: 4, kb: 0, status: { type: 'poison', chance: 1, duration: 6, dps: 46 } }); p.hp = Math.min(p.maxHp, p.hp + 30); this.effects.heal(p.x, p.y); this.addShake(0.3, 4); })); break;
      // 번개
      case 'shockorb': shoot({ p: { damage: 32, bounce: 3, color: '#bfe8ff', size: 4, speed: 260, range: 420, chain: { count: 3, range: 85, falloff: 0.8 }, status: { type: 'shock', chance: 1, duration: 3 } } }); break;
      case 'thunder': { const list = this.enemies.filter((e) => e.targetable && Math.hypot(e.x - p.x, e.y - p.y) < 180).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 6);
        for (const e of list) strikeSky(e, 55); SFX.play('react'); break; }
      case 'thundergod': this.zones.push(new SkillAura(p, { r: 170, life: 6, tick: 0.35, dmg: 30, color: '#bfe8ff', kind: 'thunder', status: { type: 'shock', chance: 1, duration: 3 } })); this.screenFlash = 0.1; this.flashColor = '200,230,255'; break;
      // 빛
      case 'lightarrow': shoot({ n: 5, fan: 0.6, p: { damage: 18, pierce: 2, homing: 4, color: '#fff4c0', size: 2, speed: 300, status: { type: 'blind', chance: 0.6, duration: 3 } } }); break;
      case 'radiance': p.hp = Math.min(p.maxHp, p.hp + 25); this.effects.heal(p.x, p.y); nova(110, 60, { color: '#fff4c0', clear: true, status: { type: 'blind', chance: 1, duration: 4 } }); break;
      case 'judgment': { const c = at(190); this.zones.push(new SkillCast(p, c.x, c.y, { r: 60, time: 1.5, color: '#fff4c0' }, () => {
        this.explodeAt(c.x, c.y, 60, { color: '#fff4c0', hurtEnemies: true, src: { damage: D(300), mods: p.mods, knockback: 8, status: { type: 'blind', chance: 1, duration: 5 } } });
        this.effects.beamline(c.x, c.y - 140, c.x, c.y, 16, '#fff4c0'); this.effects.beamline(c.x, c.y - 140, c.x, c.y, 6, '#ffffff');
        p.hp = Math.min(p.maxHp, p.hp + 20); this.effects.heal(p.x, p.y); this.screenFlash = 0.3; this.flashColor = '255,244,192'; this.addShake(0.4, 6); SFX.play('excal'); })); break; }
      // 어둠
      case 'curseshot': shoot({ p: { damage: 36, explodeRadius: 26, color: '#a070e0', size: 4, speed: 260, mark: { mult: 1.4, dur: 6 }, status: { type: 'curse', chance: 1, duration: 6 } } }); break;
      case 'abyss': { const c = at(170); this.zones.push(new DarkHole(c.x, c.y, p, { r: 62, life: 2.5, pull: 75, dmg: 8, status: { type: 'curse', chance: 1, duration: 5 } })); break; }
      case 'voidcollapse': { const c = at(180); this.zones.push(new DarkHole(c.x, c.y, p, { r: 90, life: 1, pull: 220, dmg: 14, hole: true, /* [사용자 결정] 시전 1초 (예전 2초) — 같은 거리를 빨아들이도록 끌어당김 2배, 빨아들이는 피해도 2배 (총량 그대로) */ status: { type: 'curse', chance: 1, duration: 6 } }));
        this.zones.push(new SkillCast(p, c.x, c.y, { r: 90, time: 1, color: '#a070e0' }, () => {
          this.explodeAt(c.x, c.y, 80, { color: '#a070e0', hurtEnemies: true, src: { damage: D(414), mods: p.mods, knockback: 10, status: { type: 'curse', chance: 1, duration: 6 } } });
          this.effects.ring(c.x, c.y, 90, '#ffffff'); this.screenFlash = 0.3; this.flashColor = '160,110,230'; this.addShake(0.5, 8); this.hitStop(0.08); SFX.play('excal'); })); break; }
      // 사수
      case 'overdrive': p.overdrive = 5; p.odLockT = 5 + BALANCE.overdriveGap; p.odDmg = 0; p.odRate = 0; p.odDouble = false; this.effects.text(p.x, p.y - 18, '과부하!', '#ffd84a'); break;
      case 'overdrive3': p.overdrive = 6; p.odLockT = 6 + BALANCE.overdriveGap; p.odDmg = 0.15; p.odRate = 0.5; p.odDouble = true; this.effects.text(p.x, p.y - 18, '탄환의 폭풍!', '#ffd84a'); this.effects.ring(p.x, p.y, 34, '#ffd84a'); this.effects.ring(p.x, p.y, 20, '#ffffff'); this.addShake(0.15, 3); break;
      case 'overdrive2': p.overdrive = 7; p.odLockT = 7 + BALANCE.overdriveGap; p.odDmg = 0.4; p.odRate = 0; p.odDouble = false; this.effects.text(p.x, p.y - 18, '탄막 폭주!', '#ffd84a'); this.effects.ring(p.x, p.y, 26, '#ffd84a'); break;
      // 사수 · 저격 갈래
      case 'snipe': case 'snipe2': { const two = p.skillId === 'snipe2';
        shoot({ n: two ? 3 : 1, fan: two ? 0.16 : 0, p: { damage: two ? 60 : 75, pierce: 99, color: '#ffe9a0', size: 2, speed: 720, range: 620, arrow: true, knockback: 6 } });
        this.effects.muzzle(p.x + p.aim.x * 12, p.y + 2 + p.aim.y * 9, A, '#ffe9a0'); this.addShake(0.1, 3); SFX.play('heavy'); break; }
      case 'railshot': this.zones.push(new SkillCast(p, p.x, p.y, { r: 20, time: 0.8, color: '#ffe9a0' }, () => {
        const a = Math.atan2(p.aim.y, p.aim.x), L = 700, x1 = p.x + Math.cos(a) * L, y1 = p.y + Math.sin(a) * L;
        for (const e of this.enemies) if (e.targetable && segmentCircleHit(p.x, p.y, x1, y1, e.x, e.y, e.radius + 8) >= 0) this.damageEnemy(e, { damage: D(320), mods: p.mods, knockback: 12 }, Math.cos(a), Math.sin(a));
        this.effects.beamline(p.x, p.y, x1, y1, 10, '#ffe9a0'); this.effects.beamline(p.x, p.y, x1, y1, 3, '#ffffff'); this.addShake(0.4, 7); this.hitStop(0.06); SFX.play('excal'); })); break;
      // 사수 · 폭파 갈래
      case 'grenade': { const c = at(180), bomb = { damage: D(60), mods: p.mods, knockback: 8, status: { type: 'burn', chance: 1, duration: 3, dps: 10 } };
        this.zones.push(new Strike(c.x, c.y, 0.45, 40, bomb, '#ff9a4a', false)); this.effects.text(c.x, c.y - 12, '!', '#ff9a4a'); SFX.play('crate'); break; }
      case 'cluster': { const c = at(180), big = { damage: D(70), mods: p.mods, knockback: 8, status: { type: 'burn', chance: 1, duration: 3, dps: 10 } };
        this.zones.push(new Strike(c.x, c.y, 0.45, 42, big, '#ff9a4a', false));
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.random() * 0.4, r = 38 + Math.random() * 14;
          this.zones.push(new Strike(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.75, 0.75 + i * 0.06, 24, { damage: D(34), mods: p.mods, knockback: 4 }, '#ffc070', false)); }
        SFX.play('crate'); break; }
      case 'carpet': { const a = A;
        for (let i = 0; i < 11; i++) { const d = 30 + i * 24; this.zones.push(new Strike(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 0.3 + i * 0.07, 34, { damage: D(100), mods: p.mods, knockback: 6, status: { type: 'burn', chance: 1, duration: 3, dps: 12 } }, '#ff7a3a', false)); }
        this.addShake(0.2, 4); SFX.play('heavy'); break; }
      case 'deadeye': this.zones.push(new SkillCast(p, p.x, p.y, { r: 22, time: 0.7, color: '#ffd84a' }, () => {
        for (const e of this.enemies) if (e.targetable && Math.hypot(e.x - p.x, e.y - p.y) < 320 && hasLineOfSight(p, e, this.map)) {
          this.damageEnemy(e, { damage: D(150), mods: Object.assign({}, p.mods, { critChance: 1 }), knockback: 8 }, (e.x - p.x) / 100, (e.y - p.y) / 100); this.effects.beamline(p.x, p.y, e.x, e.y, 2, '#ffd84a'); }
        this.addShake(0.3, 5); SFX.play('heavy'); })); break;
      // 기술자
      case 'trapfire': { /* 함정 기본: 화염 투척 — 조준 지점(사거리 안)으로 */
        const T = BALANCE.TRAP.firetoss, pt = this.trapPoint(p, T.range, true);
        this.zones.push(new FireBomb(p, pt.x, pt.y, { dmg: D(T.dmg), radius: T.radius, kb: T.kb, speed: T.speed })); SFX.play('swing'); break; }
      case 'trapgrid': { /* 함정 1차: 전류 격자 */
        const T = BALANCE.TRAP.grid, pt = this.trapPoint(p, T.range);
        if (!pt) { p.skillCooldown = 0.3; break; }
        this.zones.push(new ShockGrid(p, pt.x, pt.y, { r: T.r, life: T.life, stun: T.stun, dot: D(T.dot), tick: T.tick, lifesteal: T.lifesteal })); this.effects.ring(pt.x, pt.y, T.r, '#7ac8ff'); SFX.play('react', 0.1); break; }
      case 'deathsentry': { /* 함정 2차: 망자의 파수기 — 마우스 위치, 충전 칸 1개 소비, 최대 sentryMax개 (넘으면 가장 오래된 것이 사라짐), 덫 장비와 따로 셈 */
        const T = BALANCE.TRAP.death, pt = this.trapPoint(p, 220);
        if (!pt) { p.dsCharges = Math.min(BALANCE.TRAP.sentryCharges, p.dsCharges + 1); break; } /* 설치 못 하면 칸 되돌림 */
        const mine = this.zones.filter((z) => z instanceof TrapSentry && z.kind === 'death' && z.owner === p && z.alive);
        while (mine.length >= BALANCE.TRAP.sentryMax) { mine.shift().alive = false; }
        this.zones.push(new TrapSentry(p, pt.x, pt.y, 'death', { life: T.life, range: T.range, every: T.every, charge: 0.25 }, { dmg: D(T.dmg) }));
        this.effects.ring(pt.x, pt.y, 18, '#6a7aff'); this.effects.dust(pt.x, pt.y); SFX.play('crate'); break; }
      case 'turret': this.allies.push(new Turret(p.x, p.y, p, { damage: D(8) })); break;
      case 'turret2': for (const dx of [-14, 14]) this.allies.push(new Turret(p.x + dx, p.y, p, { damage: D(7), life: 15, rate: 0.3 })); break;
      case 'barrage': { const c = at(200); this.zones.push(new SkillCast(p, p.x, p.y, { r: 20, time: 1, color: '#f0c030' }, () => {
        for (let i = 0; i < 14; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 60;
          this.zones.push(new Strike(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.7, 0.3 + i * 0.1, 30, { damage: D(95), mods: p.mods, knockback: 8 }, '#ffb04a', false)); } })); break; }
      // 암살자
      case 'blink': case 'blink2': {
        const sx = p.x, sy = p.y, D2 = 90, ev = p.skillId === 'blink2';
        moveAndCollide(p, p.aim.x * D2, p.aim.y * D2, this.map);
        for (const e of this.enemies) if (e.targetable && segmentCircleHit(sx, sy, p.x, p.y, e.x, e.y, e.radius + 8) >= 0) this.damageEnemy(e, { damage: D(ev ? 42 : 45), mods: p.mods, knockback: 4 }, p.aim.x, p.aim.y);
        p.blinkInv = 0.4;
        this.effects.beamline(sx, sy, p.x, p.y, 3, '#b080ff'); this.effects.burst(sx, sy, '#3a3048', 10); this.effects.burst(p.x, p.y, '#b080ff', 10);
        if (ev) { p.blinkChain = p.blinkWindowT > 0 ? p.blinkChain + 1 : 1; p.blinkWindowT = 2.5; if (p.blinkChain < 3) p.skillCooldown = 0.3; else p.blinkChain = 0; } // 연달아 3번
        break; }
      // 기술자 · 드론 갈래 / 방벽 갈래
      case 'drones': case 'drones2': case 'droneswarm': {
        const n = { drones: 2, drones2: 3, droneswarm: 4 }[p.skillId], dmg = { drones: 7, drones2: 7, droneswarm: 8 }[p.skillId], life = p.skillId === 'drones' ? 12 : 14;
        this.allies = this.allies.filter((a) => !(a instanceof Turret && a.follow)); // 이전 드론은 교체
        for (let i = 0; i < n; i++) this.allies.push(new Turret(p.x, p.y - 10, p, { damage: D(dmg), life, rate: p.skillId === 'drones' ? 0.35 : 0.38, range: 210, follow: { slot: i / n * TAU } }));
        if (p.skillId === 'droneswarm') nova(80, 45, { color: '#7ad0ff', kb: 10 }); this.effects.ring(p.x, p.y, 30, '#7ad0ff'); SFX.play('skill'); break; }
      case 'barrier': this.zones.push(new Sanctuary(p.x, p.y, p, { r: 64, life: 8, heal: 0.001, dmg: 12 })); this.effects.ring(p.x, p.y, 64, '#9ac0e0'); break;
      case 'barrier2': this.zones.push(new Sanctuary(p.x, p.y, p, { r: 80, life: 9, heal: 0.001, dmg: 26 })); this.effects.ring(p.x, p.y, 80, '#9ac0e0'); break;
      case 'fortress': this.zones.push(new Sanctuary(p.x, p.y, p, { r: 86, life: 10, heal: 3, dmg: 22 }));
        for (const dx of [-18, 18]) this.allies.push(new Turret(p.x + dx, p.y, p, { damage: D(6), life: 10, rate: 0.25 }));
        p.buffT = 10; p.buffAtk = 0; p.buffGuard = 0.25; p.buffSpeed = 0; p.buffKillHeal = 0; this.effects.ring(p.x, p.y, 86, '#9ac0e0'); this.addShake(0.15, 3); break;
      // 사제 · 심판 갈래 / 축복 갈래
      case 'holybolt': shoot({ n: 3, fan: 0.22, p: { damage: 34, pierce: 99, color: '#fff4c0', size: 3, speed: 380, arrow: true, status: { type: 'blind', chance: 0.7, duration: 3 } } }); break;
      case 'holyrain': { const c = at(180); for (let i = 0; i < 12; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 56;
          this.zones.push(new Strike(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.7, 0.3 + i * 0.06, 22, { damage: D(32), mods: p.mods, knockback: 3, status: { type: 'blind', chance: 0.4, duration: 3 } }, '#fff4c0', false)); } break; }
      case 'heavensgate': { const c = at(190); this.zones.push(new SkillCast(p, c.x, c.y, { r: 82, time: 0.7, color: '#fff4c0' }, () => {
        this.explodeAt(c.x, c.y, 82, { color: '#fff4c0', hurtEnemies: true, src: { damage: D(330), mods: p.mods, knockback: 10, status: { type: 'blind', chance: 1, duration: 4 } } });
        p.hp = Math.min(p.maxHp, p.hp + 25); this.effects.heal(p.x, p.y); this.effects.skyBeam(c.x, c.y, '#ffffff', 0, 30); this.screenFlash = 0.25; this.flashColor = '255,244,192'; this.addShake(0.4, 6); SFX.play('excal'); })); break; }
      case 'bless': case 'bless2': { const big = p.skillId === 'bless2';
        p.buffT = big ? 10 : 8; p.buffAtk = big ? 0.55 : 0.4; p.buffSpeed = big ? 0.2 : 0.15; p.buffGuard = big ? 0.25 : 0; p.buffKillHeal = 0; p.hp = Math.min(p.maxHp, p.hp + (big ? 25 : 15));
        this.effects.heal(p.x, p.y); this.effects.ring(p.x, p.y, 30, '#ffd8a0'); this.effects.text(p.x, p.y - 18, big ? '큰 축복!' : '축복!', '#ffd8a0'); break; }
      case 'miracle': p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.5)); p.blinkInv = 3; p.buffT = 10; p.buffAtk = 1.0; p.buffSpeed = 0.2; p.buffGuard = 0.25; nova(110, 200, { color: '#fff4c0', clear: true }); /* 기적: 주변에 빛의 파동 */ p.buffKillHeal = 0;
        this.effects.heal(p.x, p.y); this.effects.solomonSeal(p.x, p.y, 1.4); this.effects.text(p.x, p.y - 20, '기적!', '#ffd8a0', true); SFX.play('solomon'); break;
      // 광전사 · 함성 갈래 / 피의 서약 갈래
      case 'shout': case 'shout2': { const big = p.skillId === 'shout2', R = big ? 110 : 90;
        nova(R, big ? 55 : 45, { color: '#e0b070', kb: 8 });
        for (const e of this.enemies) if (e.targetable && Math.hypot(e.x - p.x, e.y - p.y) < R + e.radius) { e.stunT = Math.max(e.stunT || 0, (big ? 1.6 : 1.4) * (e.def.boss ? 0.5 : 1)); if (big) e.curse = Math.max(e.curse || 0, 6); }
        this.addShake(0.2, 4); SFX.play('boss', 0.3); this.effects.text(p.x, p.y - 20, big ? '공포의 함성!' : '함성!', '#e0b070'); break; }
      case 'earthshatter': p.blinkInv = 0.7; this.zones.push(new SkillCast(p, p.x, p.y, { r: 140, time: 0.55, color: '#e0b070' }, () => {
        this.explodeAt(p.x, p.y, 140, { color: '#e0b070', hurtEnemies: true, src: { damage: D(280), mods: p.mods, knockback: 14 } });
        for (const e of this.enemies) if (e.targetable && Math.hypot(e.x - p.x, e.y - p.y) < 140 + e.radius) e.stunT = Math.max(e.stunT || 0, e.def.boss ? 1 : 2);
        this.addShake(0.5, 9); this.hitStop(0.08); SFX.play('heavy'); })); break;
      case 'bloodpact': case 'bloodpact2': case 'bloodmoon': { const C = { bloodpact: [0.1, 6, 0.9, 0], bloodpact2: [0.1, 8, 1.3, 8], bloodmoon: [0.15, 8, 1.2, 6] }[p.skillId];
        const cost = Math.round(p.maxHp * C[0]); p.hp = Math.max(1, p.hp - cost); this.effects.text(p.x, p.y - 12, '-' + cost, '#ff5a5a');
        p.buffT = C[1]; p.buffAtk = C[2]; p.buffSpeed = 0.1; p.buffGuard = 0; p.buffKillHeal = C[3];
        if (p.skillId === 'bloodmoon') this.zones.push(new SkillAura(p, { r: 60, life: 8, tick: 0.25, dmg: 12, color: '#c02a3a', kind: 'blood', lifesteal: 0.5 }));
        this.effects.burst(p.x, p.y, '#c02a3a', 14); this.effects.ring(p.x, p.y, 30, '#c02a3a'); this.addShake(0.15, 3); break; }
      // 드루이드 · 가시 갈래 / 변신 갈래
      case 'thornfield': { const c = at(170); this.zones.push(new Puddle(c.x, c.y, { r: 56, life: 6, tick: 0.35, dmg: D(9), status: { type: 'poison', chance: 1, duration: 3, dps: 10 }, color: '#5a9a3a' }, p.mods)); break; }
      case 'thornburst': for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; this.projectiles.push(new Projectile({ x: p.x, y: p.y, dx: Math.cos(a), dy: Math.sin(a), speed: 320, range: 200, damage: D(44), pierce: 2, knockback: 3, mods: p.mods, color: '#7adf4a', size: 2, arrow: true, status: { type: 'poison', chance: 1, duration: 3, dps: 10 } })); }
        this.effects.ring(p.x, p.y, 30, '#7adf4a'); break;
      case 'feast1': { const a0 = A; for (const e of this.enemies) if (e.targetable && Math.hypot(e.x - p.x, e.y - p.y) < 96 && Math.abs(((Math.atan2(e.y - p.y, e.x - p.x) - a0 + Math.PI * 3) % (2 * Math.PI)) - Math.PI) < 1.1) this.damageEnemy(e, { damage: D(70), mods: p.mods, knockback: 6, feast: true }, Math.cos(a0), Math.sin(a0)); this.effects.slash(p.x + Math.cos(a0) * 40, p.y + Math.sin(a0) * 40, a0, 90, 1.1, '#b8e05a'); this.effects.ring(p.x, p.y, 70, '#b8e05a'); break; } /* 혼을 거두는 낫: 앞쪽 부채꼴 */
      case 'feast2': for (const e of this.enemies) if (e.targetable && !e.def.boss && Math.hypot(e.x - p.x, e.y - p.y) < 150) { const d = Math.hypot(e.x - p.x, e.y - p.y) || 1, k = Math.min(1, 60 / d); e.x += (p.x - e.x) * k * 0.6; e.y += (p.y - e.y) * k * 0.6; }
        nova(120, 95, { color: '#b8e05a', kb: 0, feast: true }); this.effects.ring(p.x, p.y, 120, '#8ab03a'); this.effects.ring(p.x, p.y, 60, '#b8e05a'); break; /* 영혼 포식: 끌어당겨 벰 */
      case 'feast3': nova(150, 110, { color: '#b8e05a', kb: 6, feast: true }); this.zones.push(new SkillAura(p, { r: 150, life: 2.5, tick: 0.35, dmg: 42, color: '#b8e05a', kind: 'blood', feast: true })); this.addShake(0.3, 5); break;
      case 'ancientroot': nova(140, 170, { color: '#7adf4a', root: 3, kb: 0, status: { type: 'poison', chance: 1, duration: 5, dps: 36 } }); this.addShake(0.3, 5); break;
      case 'bearform': case 'bearform2': case 'primal': { const C = { bearform: [8, 0.4, 0.4, 0], bearform2: [10, 0.45, 0.4, 10], primal: [12, 0.75, 0.4, 16] }[p.skillId];
        p.buffT = C[0]; p.buffAtk = C[1]; p.buffGuard = C[2]; p.buffSpeed = 0; p.buffKillHeal = 0;
        if (C[3]) this.zones.push(new SkillAura(p, { r: p.skillId === 'primal' ? 60 : 44, life: C[0], tick: 0.3, dmg: C[3], color: '#c8a070', kind: 'blood', lifesteal: p.skillId === 'primal' ? 0.3 : 0 }));
        if (p.skillId === 'primal') p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.2));
        this.effects.burst(p.x, p.y, '#c8a070', 18); this.effects.ring(p.x, p.y, 34, '#c8a070'); this.effects.text(p.x, p.y - 20, '곰의 힘!', '#e0c090'); this.addShake(0.15, 3); break; }
      // 암살자 · 독 갈래
      case 'venomfan': shoot({ n: 7, fan: 0.9, p: { damage: 32, pierce: 1, color: '#9aff5a', size: 2, speed: 340, arrow: true, status: { type: 'poison', chance: 1, duration: 4, dps: 18 } } }); SFX.play('bow'); break;
      case 'plaguecloud': this.zones.push(new SkillAura(p, { r: 88, life: 7, tick: 0.3, dmg: 30, color: '#7adf4a', kind: 'flame', vuln: 0.2, status: { type: 'poison', chance: 1, duration: 3, dps: 18 } })); /* 상향: 범위 +25%, 안의 적 받는 피해 +20% */
        p.hasteT = 7; this.effects.ring(p.x, p.y, 70, '#7adf4a'); this.effects.text(p.x, p.y - 18, '맹독 안개!', '#9aff5a'); break;
      // 암살자 · 칼날 갈래
      case 'bladestorm': { /* [사용자 결정] 칼날 3진: 칼날을 사방으로 펼쳤다가 다시 나에게 모음 (나갈 때·돌아올 때 각각 피해) */
        this.zones = this.zones.filter((z) => !(z instanceof BladeRing && z.owner === p));
        this.zones.push(new BladeRing(p, { n: 16, R: 125, out: 0.3, hold: 0.9, back: 0.35, dmgOut: D(240), dmgBack: D(300) }));
        p.blinkInv = 0.45; this.effects.ring(p.x, p.y, 30, '#e8eef4'); this.effects.burst(p.x, p.y, '#e8eef4', 14); this.addShake(0.15, 3); SFX.play('melee'); break; }
      case 'bladeorbit': {
        const storm = false, n = 4, life = 8;
        this.projectiles = this.projectiles.filter((q) => !(q.orbit && q.srcId === 'skill_blade')); // 이전 칼날은 교체
        for (let i = 0; i < n; i++) this.projectiles.push(new Projectile({ x: p.x, y: p.y, dx: 1, dy: 0, speed: 0, range: 9999, damage: D(38), pierce: 99, knockback: 3, mods: p.mods,
          color: '#e8eef4', size: 3, rehit: 0.22, srcId: 'skill_blade', orbit: { owner: p, r: storm ? 44 : 40, speed: storm ? 6 : 5, life, ang: i / n * TAU } }));
        if (storm) { p.whirl = 0.5; p.whirlTick = 0; p.whirlStatus = null; p.blinkInv = 0.5; this.effects.ring(p.x, p.y, 40, '#e8eef4'); this.addShake(0.15, 3); }
        this.effects.burst(p.x, p.y, '#e8eef4', 12); SFX.play('melee'); break; }
      case 'execution': { // 그림자 분신 둘과 셋이서 연달아 습격 + 처형
        const list = this.enemies.filter((e) => e.targetable && Math.hypot(e.x - p.x, e.y - p.y) < 240).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 9);
        this.zones.push(new ShadowStrike(p, list, D(165))); p.blinkInv = 1.2; this.effects.burst(p.x, p.y, '#3a3048', 14); SFX.play('react'); break; }
      // 사제
      case 'sanctuary': this.zones.push(new Sanctuary(p.x, p.y, p, { r: 64, heal: 6, dmg: 14 })); this.effects.ring(p.x, p.y, 64, '#ffe9a0'); break;
      case 'sanctuary2': this.zones.push(new Sanctuary(p.x, p.y, p, { r: 90, life: 8, heal: 12, boost: true, dmg: 20 })); this.effects.ring(p.x, p.y, 90, '#ffe9a0'); break;
      case 'descent': this.zones.push(new SkillCast(p, p.x, p.y, { r: 110, time: 0.4, color: '#ffe9a0' }, () => {
        p.blinkInv = 2; p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.4)); this.effects.heal(p.x, p.y); nova(110, 360, { color: '#ffe9a0', clear: true });
        this.effects.solomonSeal(p.x, p.y); this.screenFlash = 0.3; this.flashColor = '255,233,160'; SFX.play('solomon'); })); break;
      // 광전사
      case 'rage': p.rage = 5; p.rageAtk = 0.7; p.rageVamp = 0; this.effects.text(p.x, p.y - 18, '분노!', '#ff5a3a'); this.effects.ring(p.x, p.y, 30, '#ff5a3a'); this.addShake(0.15, 3); break;
      case 'rage2': p.rage = 8; p.rageAtk = 1.0; p.rageVamp = 5; this.effects.text(p.x, p.y - 18, '광란!', '#ff5a3a'); this.effects.ring(p.x, p.y, 36, '#ff5a3a'); this.addShake(0.2, 4); break;
      case 'bloodstorm': p.rage = 6; p.rageAtk = 0.8; p.rageVamp = 4;
        this.zones.push(new SkillAura(p, { r: 60, life: 6, tick: 0.25, dmg: 24, color: '#ff3a3a', kind: 'blood', lifesteal: 0.5 })); this.effects.text(p.x, p.y - 18, '피의 폭풍!', '#ff3a3a'); this.addShake(0.25, 5); break;
      // 드루이드
      case 'wolves': for (let i = 0; i < 3; i++) this.allies.push(new SpiritWolf(p.x + (i - 1) * 12, p.y, p, { dmg: 5, life: 12 })); this.effects.sparkle(p.x, p.y, '#9ad8ff'); break;
      case 'wolves2': for (let i = 0; i < 4; i++) this.allies.push(new SpiritWolf(p.x + (i - 1.5) * 12, p.y, p, { dmg: 5, life: 16, slow: true })); this.effects.sparkle(p.x, p.y, '#9ad8ff'); this.effects.ring(p.x, p.y, 30, '#9ad8ff'); break;
      case 'guardian': this.allies.push(new SpiritWolf(p.x, p.y - 10, p, { big: true, dmg: 28, life: 18 })); /* 상향: 곰 공격력 +40%, 나타날 때 주변 기절 */
        for (const e of this.enemies) if (e.targetable && Math.hypot(e.x - p.x, e.y - p.y) < 80 + e.radius) e.stunT = Math.max(e.stunT || 0, 1);
        for (let i = 0; i < 3; i++) this.allies.push(new SpiritWolf(p.x + (i - 1) * 14, p.y, p, { dmg: 5, life: 18, slow: true })); this.effects.ring(p.x, p.y, 40, '#9ad8ff'); this.addShake(0.2, 3); break;
    }
    this.skillFx(p, at, A);
  }
  // ── 스킬 자체 연출 (주로 최종 진화 스킬): 피해 처리와 따로, 보이는 효과만 더함
  skillFx(p, at, A) {
    const E = this.effects, col = (p.hybrid && p.hybrid.color) || (p.line && p.line.color) || '#ffffff';
    const later = (t, fn) => { let done = false; this.zones.push(new FxEmitter(p.x, p.y, t + 0.05, (w, x, y, tt) => { if (!done && tt >= t) { done = true; fn(); } })); }; // t초 뒤 한 번
    const emit = (life, fn, follow) => this.zones.push(new FxEmitter(p.x, p.y, life, fn, follow)); // life초 동안 매 프레임
    const P = (x, y, vx, vy, color, life = 0.6, size = 2) => E.part(x, y, vx, vy, { color, life, size, size2: 0, drag: 1.5, add: true });
    const debris = (x, y, n, color) => { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 60 + Math.random() * 90; E.part(x, y, Math.cos(a) * s, Math.sin(a) * s * 0.7 - 40, { color, life: 0.7, size: 2, size2: 1, drag: 2, grav: 160 }); } };
    switch (p.skillId) {
      case 'swordrain': { const c = at(170); E.rays(c.x, c.y, '#fff4c0', 12, 60, 0.5);
        for (let i = 0; i < 14; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 52; E.skyBeam(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.7, i % 2 ? '#ffffff' : '#fff4c0', 0.3 + i * 0.05, 3); }
        later(1.1, () => { E.ring(c.x, c.y, 60, '#fff4c0'); E.burst(c.x, c.y, '#ffffff', 16); }); break; }
      case 'quake': later(1, () => { E.rays(p.x, p.y, '#e0b070', 20, 150, 0.7); for (let i = 0; i < 3; i++) later(1 + i * 0.1, () => E.ring(p.x, p.y, 60 + i * 40, i ? '#c8a070' : '#ffffff'));
        for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + Math.random() * 0.3, L = 70 + Math.random() * 60; E.beamline(p.x, p.y, p.x + Math.cos(a) * L, p.y + Math.sin(a) * L * 0.7, 2, '#ffd8a0'); } // 갈라지는 땅
        debris(p.x, p.y, 30, '#8a6a4a'); }); break;
      case 'skyspear': { const L = 300, x1 = p.x + Math.cos(A) * L, y1 = p.y + Math.sin(A) * L;
        for (let d = 20; d < L; d += 16) P(p.x + Math.cos(A) * d, p.y + Math.sin(A) * d, randInt(-20, 20), randInt(-30, 0), d % 32 ? '#c8d8f0' : '#ffffff', 0.5);
        later(0.25, () => { E.skyBeam(x1, y1, '#ffffff', 0, 8); E.rays(x1, y1, '#c8d8f0', 14, 70, 0.6); debris(x1, y1, 16, '#9aa8c0'); }); break; }
      case 'explosion': { const c = at(200); emit(2, (w, x, y, t) => { if (Math.random() < 0.5) { const a = Math.random() * TAU, d = 90 * (1 - (t % 0.5) * 2); P(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d * 0.6, -Math.cos(a) * 30, -Math.sin(a) * 20, '#ffb04a', 0.4); } }); // 모여드는 불씨
        later(2, () => { E.rays(c.x, c.y, '#ffd84a', 22, 140, 0.8); for (let i = 0; i < 3; i++) later(2 + i * 0.08, () => E.ring(c.x, c.y, 50 + i * 30, i === 1 ? '#ffffff' : '#ff7a3a'));
          for (let i = 0; i < 30; i++) P(c.x + randInt(-40, 40), c.y + randInt(-20, 20), randInt(-20, 20), -60 - Math.random() * 80, i % 3 ? '#ff9a3a' : '#ffe08a', 1); }); break; }
      case 'blizzard': { const c = at(180); emit(5, (w, x, y, t) => { for (let i = 0; i < 2; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 64; // 내리는 눈 + 휘도는 바람
          E.part(c.x + Math.cos(a) * r + 20, c.y + Math.sin(a) * r * 0.6 - 30, -30, 50, { color: '#ffffff', life: 0.6, size: 1.5, size2: 1, drag: 0, add: true, shape: 'plus' }); }
          if (Math.random() < 0.15) E.ring(c.x, c.y, 30 + Math.random() * 34, '#bfefff'); }); E.rays(c.x, c.y, '#bfefff', 12, 70, 0.5); break; }
      case 'worldtree': later(1.5, () => { E.rays(p.x, p.y, '#7adf4a', 18, 150, 0.8);
        for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, L = 110 + Math.random() * 40; E.beamline(p.x, p.y, p.x + Math.cos(a) * L, p.y + Math.sin(a) * L * 0.7, 2, i % 2 ? '#7adf4a' : '#c8e070'); } // 뻗어 나가는 덩굴
        for (let i = 0; i < 24; i++) P(p.x + randInt(-60, 60), p.y + randInt(-30, 30), randInt(-10, 10), -30 - Math.random() * 40, i % 2 ? '#9aff5a' : '#e0ff9a', 1.2); }); break;
      case 'thundergod': emit(6, (w, x, y, t) => { if (Math.random() < 0.12) { const a = Math.random() * TAU, d = 30 + Math.random() * 120; E.lightning(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6 - 100, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6); }
          if (Math.random() < 0.05) E.ring(x, y, 170, '#bfe8ff'); if (Math.random() < 0.3) P(x + randInt(-10, 10), y + randInt(-8, 4), randInt(-40, 40), randInt(-40, 10), '#ffffff', 0.25, 1.5); }, p);
        E.rays(p.x, p.y, '#bfe8ff', 16, 120, 0.6); break;
      case 'judgment': { const c = at(190); later(1.5, () => { E.skyBeam(c.x, c.y, '#ffffff', 0, 14); E.skyBeam(c.x, c.y, '#fff4c0', 0.05, 24); E.rays(c.x, c.y, '#fff4c0', 18, 90, 0.7); E.solomonSeal(c.x, c.y, 1.2); }); break; }
      case 'voidcollapse': { const c = at(180); emit(1, (w, x, y, t) => { for (let i = 0; i < 2; i++) { const a = Math.random() * TAU, d = 100; E.part(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d * 0.6, -Math.cos(a) * 160, -Math.sin(a) * 100, { color: i ? '#a070e0' : '#e0c8ff', life: 0.6, size: 2, size2: 0, drag: 0, add: true }); } }); // 빨려 드는 빛
        later(2, () => { E.rays(c.x, c.y, '#b070ff', 20, 120, 0.8); E.ring(c.x, c.y, 100, '#ffffff'); E.ring(c.x, c.y, 60, '#7040c0'); for (let i = 0; i < 20; i++) P(c.x, c.y, randInt(-120, 120), randInt(-80, 80), '#c8a0ff', 0.7); }); break; }
      case 'deadeye': later(0.7, () => { E.rays(p.x, p.y, '#ffd84a', 12, 50, 0.5);
        for (const e of this.enemies) if (e.targetable && Math.hypot(e.x - p.x, e.y - p.y) < 320) { E.ring(e.x, e.y, 12, '#ffd84a'); E.burst(e.x, e.y, '#ffe9a0', 6); } }); // 맞힌 자리마다 조준 고리
        emit(0.7, (w, x, y, t) => { for (const e of this.enemies) if (e.targetable && Math.random() < 0.15 && Math.hypot(e.x - x, e.y - y) < 320) { E.spark(e.x, e.y - 2, '#ff5a5a'); } }, p); break;
      case 'railshot': later(0.8, () => { const L = 700, x1 = p.x + Math.cos(A) * L, y1 = p.y + Math.sin(A) * L;
        for (let d = 16; d < 420; d += 12) P(p.x + Math.cos(A) * d, p.y + Math.sin(A) * d, -Math.sin(A) * randInt(-40, 40), Math.cos(A) * randInt(-40, 40), d % 24 ? '#ffe9a0' : '#ffffff', 0.5, 1.5);
        E.rays(p.x, p.y, '#ffe9a0', 12, 40, 0.4); E.ring(p.x, p.y, 26, '#ffffff'); }); break;
      case 'carpet': for (let i = 0; i < 11; i++) { const d = 30 + i * 24; E.skyBeam(p.x + Math.cos(A) * d, p.y + Math.sin(A) * d, '#ffb04a', 0.15 + i * 0.07, 3); }
        later(0.3 + 11 * 0.07, () => { const x1 = p.x + Math.cos(A) * 270, y1 = p.y + Math.sin(A) * 270; E.rays(x1, y1, '#ff7a3a', 14, 60, 0.6); }); break;
      case 'barrage': { const c = at(200); for (let i = 0; i < 14; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 60; E.skyBeam(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.7, '#ffd070', 1.15 + i * 0.1, 3); }
        later(1, () => E.rays(c.x, c.y, '#f0c030', 14, 80, 0.6)); break; }
      case 'execution': E.rays(p.x, p.y, '#b080ff', 16, 90, 0.6); E.ring(p.x, p.y, 40, '#3a2050'); E.ring(p.x, p.y, 70, '#b080ff');
        emit(1.2, (w, x, y, t) => { if (Math.random() < 0.6) E.part(x + randInt(-12, 12), y + randInt(-10, 6), randInt(-20, 20), -30, { color: '#3a2a50', life: 0.5, size: 3, size2: 0, drag: 1 }); }, p); break;
      case 'plaguecloud': emit(7, (w, x, y, t) => { if (Math.random() < 0.5) { const a = Math.random() * TAU, d = Math.random() * 70; E.part(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, 0, -18, { color: Math.random() < 0.5 ? '#9aff5a' : '#5aa03a', life: 0.8, size: 1.5, size2: 3.5, drag: 1, shape: 'ring' }); } }, p);
        E.rays(p.x, p.y, '#7adf4a', 14, 80, 0.6); break;
      case 'bladestorm': E.rays(p.x, p.y, '#e8eef4', 16, 70, 0.5); break; /* 칼날이 펼쳐지는 순간 빛살 (칼날 자체는 BladeRing이 그림) */
      case 'descent': later(0.4, () => { E.skyBeam(p.x, p.y, '#ffffff', 0, 18); E.skyBeam(p.x, p.y, '#ffe9a0', 0.05, 30); E.rays(p.x, p.y, '#ffe9a0', 20, 120, 0.8);
        for (let i = 0; i < 20; i++) P(p.x + randInt(-30, 30), p.y + randInt(-10, 10), randInt(-10, 10), -50 - Math.random() * 60, '#fff4c0', 1); }); break;
      case 'bloodstorm': emit(6, (w, x, y, t) => { if (Math.random() < 0.5) { const a = t * 5 + Math.random() * 1.5, d = 30 + Math.random() * 20; E.part(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, -Math.sin(a) * 60, Math.cos(a) * 40, { color: Math.random() < 0.5 ? '#ff3a3a' : '#8a0a0a', life: 0.5, size: 2.5, size2: 0, drag: 2 }); } }, p);
        E.rays(p.x, p.y, '#ff3a3a', 16, 70, 0.6); break;
      case 'guardian': E.rays(p.x, p.y, '#9ad8ff', 16, 80, 0.7); E.ring(p.x, p.y - 10, 30, '#c8a070'); debris(p.x, p.y - 4, 14, '#6a8a4a');
        for (let i = 0; i < 16; i++) P(p.x + randInt(-30, 30), p.y + randInt(-14, 10), randInt(-10, 10), -40 - Math.random() * 40, i % 2 ? '#9ad8ff' : '#9aff5a', 1); break;
      case 'spellblade': E.rays(p.x, p.y, col, 16, 70, 0.5); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; P(p.x + Math.cos(a) * 20, p.y + Math.sin(a) * 16, Math.cos(a) * 80, Math.sin(a) * 60, col, 0.5); } break;
    }
  }
  updateSkillEffects(dt) {
    const p = this.player;
    if (p.whirl > 0) {
      p.whirl -= dt; p.whirlTick -= dt;
      if (p.whirlTick <= 0) {
        p.whirlTick = 0.1;
        for (const e of this.enemies) {
          if (!e.targetable) continue;
          const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
          if (d - e.radius <= 36) this.damageEnemy(e, { damage: this.skillDmg(22), mods: p.mods, knockback: 4, status: p.whirlStatus || null }, dx / (d || 1), dy / (d || 1));
        }
        for (const b of this.enemyBullets) if (!b.blade && Math.hypot(b.x - p.x, b.y - p.y) < 40) { b.alive = false; this.effects.spark(b.x, b.y, '#fff'); }
      }
    }
  }

  // ── 플로우 필드 (플레이어 기준 BFS, 40타일까지)
  updateFlow(dt) {
    const map = this.map, W = map.width, p = this.player;
    const pt = Math.floor(p.y / TILE) * W + Math.floor(p.x / TILE);
    this.flowTimer -= dt;
    if (pt === this.flowTile && this.flowTimer > 0) return;
    this.flowTile = pt; this.flowTimer = 0.25;
    const flow = this.flow; flow.fill(-1);
    const q = new Int32Array(W * map.height); let h = 0, t = 0;
    flow[pt] = 0; q[t++] = pt;
    while (h < t) {
      const i = q[h++], d = flow[i];
      if (d >= 40) continue;
      const x = i % W, y = (i / W) | 0;
      if (x + 1 < W && flow[i + 1] < 0 && !map.isSolidTile(x + 1, y)) { flow[i + 1] = d + 1; q[t++] = i + 1; }
      if (x > 0 && flow[i - 1] < 0 && !map.isSolidTile(x - 1, y)) { flow[i - 1] = d + 1; q[t++] = i - 1; }
      if (flow[i + W] < 0 && !map.isSolidTile(x, y + 1)) { flow[i + W] = d + 1; q[t++] = i + W; }
      if (i - W >= 0 && flow[i - W] < 0 && !map.isSolidTile(x, y - 1)) { flow[i - W] = d + 1; q[t++] = i - W; }
    }
  }

  // ── 방 진행: 입장 → 문 잠금 → 웨이브 → 클리어
  updateRooms() {
    const map = this.map;
    for (const p of this.allPlayers()) { // 멀티: 누구든 먼저 들어가면 그 방 전투 시작 (쓰러진 사람 제외)
      if (p.state === 'DEAD') continue;
      const here = map.roomAtPoint(p.x, p.y);
      if (here && !here.visited) here.visited = true;
      if (!this.activeRoom && here && here.state === 'idle' && map.isFullyInside(p, here, 1)) { /* [버그 수정] 벽에 붙어 지나가면 방에 들어간 걸로만 표시되고 전투가 안 걸리던 것 (예전: 테두리에서 반 칸 안쪽까지 들어가야 시작) */ this.activateRoom(here, p); break; }
    }
    const r = this.activeRoom;
    if (r && !this.slowMo && !this.enemies.some((e) => e.alive)) {
      if (r.wavesLeft > 0) this.spawnWave(r);
      else this.clearRoom(r);
    }
  }
  activateRoom(r, leader = this.player) {
    r.state = 'active'; this.activeRoom = r;
    if (this.coop && this.coop.host) this.coopGather(r, leader); // 멀티: 방 밖에 있는 동료를 모두 이 방으로 모음 (문 밖에 갇히지 않게)
    this.map.setDoors(r, true);
    this.enemyBullets.length = 0;
    if (r.type === 'boss') {
      const id = this.W.boss, c = this.map.tileCenter(r.cx, r.cy - 3);
      const boss = this.spawnEnemy(id, c.x, c.y, r);
      boss.setState('INTRO'); boss.jumpH = 160; boss.phase = 1;
      this.cinematic = { t: 0, boss, landed: false, roared: false, grand: !!(this.W.sanctum || this.W.trial) };
      if (this.W.trial && this.W.rooms) for (const q of this.allPlayers()) if (q.state !== 'DEAD') { q.hp = q.maxHp; q.shield = q.maxShield; q.energy = q.maxEnergy; this.effects.heal(q.x, q.y); } /* 카멜롯: 성문 앞에서 체력·에너지 모두 회복 (보스전은 가득 찬 상태로) */
      if (this.W.zone && !this.W.finalField && BABYLON_BOSS_INTROS[id]) this.cinematic.intro = id; /* 귀환길 네임드 보스: 착지한 뒤 보스를 비추며 이야기 (처음 한 번) */
      if (this.W.sanctum && this.sanctumGate) this.playCutscene(GATEKEEPER_INTRO_LINES, { id: 'gatekeeper_intro', focus: { x: this.sanctumGate.x, y: this.sanctumGate.y - 20 } });
      this.banner = null; this.input.mouse.down = false;
      SFX.play('door');
    } else this.spawnWave(r);
  }
  spawnWave(r) {
    r.wavesLeft--;
    const pool = this.W.enemies;
    const W = BALANCE.waveSize, count = Math.min(W.max, W.base + this.worldIdx + Math.floor(this.levelIdx * W.perLevel) + randInt(0, W.rand)) + (r.challenge ? BALANCE.specialRooms.challenge.extra : 0);
    const party = this.partyCount(), cnt = party > 1 ? Math.min(Math.round(W.max * this.partyScale('mobCount')), Math.round(count * this.partyScale('mobCount'))) : count; // 멀티: 인원만큼 몬스터 증가
    for (let i = 0; i < cnt; i++) {
      const [id] = weightedPick(pool, (x) => x[1]);
      const pt = this.findSpawnPoint(r, 72);
      const e = this.spawnEnemy(id, pt.x, pt.y, r), E = BALANCE.elite;
      if (r.challenge || (this.worldIdx >= E.fromWorld && Math.random() < Math.min(0.45, E.base + E.perWorld * (this.worldIdx - E.fromWorld) + COOP.scale.elite * (party - 1)))) e.makeElite(E);
      if (r.challenge) { const C = BALANCE.specialRooms.challenge; e.maxHp = Math.round(e.maxHp * C.hp); e.hp = e.maxHp; e.damage = Math.round(e.damage * C.dmg); }
    }
  }
  spawnEnemy(id, x, y, room) {
    const def = this.data.enemies.get(id);
    if (!def) throw new Error('알 수 없는 적 ID: ' + id);
    const e = new Enemy(x, y, def, this.scale, room);
    if (!def.boss && !def.master && !def.dummy && this.areaId) { const M = BALANCE.babylonMob; e.maxHp = Math.round(e.maxHp * M.hp); e.hp = e.maxHp; e.damage = Math.round(e.damage * M.dmg); } /* 귀환길 잡몹 +10% */
    if (def.boss && !def.master && this.areaId) { const Z = BALANCE.babylonBoss, k = Math.min(1, (this.zoneField || 0) / 9); e.maxHp = Math.round(e.maxHp * (1 + (Z.hp - 1) * k)); e.hp = e.maxHp; e.damage = Math.round(e.damage * (1 + (Z.dmg - 1) * k)); e.cdMul = (e.cdMul || 1) * (1 - (1 - Z.cooldown) * k); } /* 바빌로니아 보스 강화는 위층으로 갈수록 서서히 (지하 4는 없음 · 지구라트 4 길가메시는 전부) */ /* [사용자 결정] 바빌로니아 귀환길 보스(길가메시 포함) 난이도 상향 */
    if (this.partyCount() > 1 && !def.dummy) { e.maxHp = Math.round(e.maxHp * this.partyScale(def.boss ? 'bossHp' : 'mobHp')); e.hp = e.maxHp; } // 멀티: 인원만큼 체력 증가
    this.enemies.push(e);
    return e;
  }
  findSpawnPoint(r, minDist, nearX, nearY, half = 9) {
    const p = this.player, map = this.map;
    for (let i = 0; i < 60; i++) {
      const tx = randInt(r.x0 + 1, r.x0 + r.w - 2), ty = randInt(r.y0 + 1, r.y0 + r.h - 2);
      const c = map.tileCenter(tx, ty);
      if (overlapsSolid(c.x, c.y, half + 1, map)) continue;
      if (Math.hypot(c.x - p.x, c.y - p.y) < minDist) continue;
      if (nearX !== undefined && Math.hypot(c.x - nearX, c.y - nearY) > 48 && i < 40) continue;
      return c;
    }
    return this.freeSpot(r, nearX ?? map.tileCenter(r.cx, r.cy).x, nearY ?? map.tileCenter(r.cx, r.cy).y, half);
  }
  // (x,y)에서 가장 가까운, 방 안의 비어 있는 타일 중심 (엄폐물 위에 물건이 생기지 않도록)
  // 미니맵에서 마우스가 가리키는, 이동 가능한 방 (전투 중이 아니고, 이미 가 봤고, 싸움이 끝났거나 전투가 없는 방)
  minimapTarget(m) {
    if (this.mode !== 'dungeon' || this.activeRoom || this.overlay || this.cinematic || !this.map || !this.player || this.player.state === 'DEAD') return null;
    const { cw, ch, ox, oy } = HUD.minimapLayout(), gx = Math.floor((m.x - ox) / cw), gy = Math.floor((m.y - oy) / ch);
    if (m.x < ox || m.y < oy || gx < 0 || gy < 0 || gx >= GRID_W || gy >= GRID_H) return null;
    const r = this.map.rooms.find((q) => q.gx === gx && q.gy === gy), cur = this.map.roomAtPoint(this.player.x, this.player.y);
    if (!r || r === cur || !r.visited || r.state === 'active') return null;
    if (r.state !== 'cleared' && ['combat', 'boss', 'challenge'].includes(r.type)) return null;
    return r;
  }
  minimapClick(m) {
    const r = this.minimapTarget(m); if (!r) return false;
    const p = this.player, c0 = this.map.tileCenter(r.cx, r.cy), c = this.freeSpot(r, c0.x, c0.y + 16, 6);
    this.effects.burst(p.x, p.y, '#7ad0ff', 14); this.effects.ring(p.x, p.y, 20, '#7ad0ff');
    p.x = c.x; p.y = c.y; this.snapCamera();
    this.effects.burst(p.x, p.y, '#7ad0ff', 16); this.effects.ring(p.x, p.y, 24, '#ffffff'); this.effects.rays(p.x, p.y, '#7ad0ff', 10, 34, 0.4); SFX.play('dash');
    return true;
  }
  // 최종 진화 스킬 연출: 컷인 + 빛살 + 고리
  ultimateFx(p) {
    const color = (p.hybrid && p.hybrid.color) || (p.line && p.line.color) || '#ffd84a';
    this.cutin = { kind: 'skill', name: p.skillName, sub: p.hybrid ? p.hybrid.title : p.line.ranks[2], color, hero: p.hero, start: performance.now() };
    this.effects.rays(p.x, p.y, color, 14, 70); this.effects.rays(p.x, p.y, '#ffffff', 7, 44, 0.4);
    this.effects.ring(p.x, p.y, 34, color); this.effects.ring(p.x, p.y, 56, '#ffffff'); this.effects.burst(p.x, p.y, color, 24);
    for (let i = 0; i < 18; i++) this.effects.part(p.x + randInt(-14, 14), p.y + randInt(-4, 8), randInt(-10, 10), -50 - Math.random() * 50, { color, life: 0.8, size: 2, size2: 0, drag: 1, add: true });
    this.screenFlash = Math.max(this.screenFlash || 0, 0.1); this.flashColor = hexToRgbStr(color); this.addShake(0.15, 3); this.hitStop(0.05);
  }
  freeSpot(r, x, y, half = 6) {
    const map = this.map, tx0 = Math.floor(x / TILE), ty0 = Math.floor(y / TILE);
    for (let rad = 0; rad < Math.max(r.w, r.h); rad++)
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
        const tx = tx0 + dx, ty = ty0 + dy;
        if (tx < r.x0 || ty < r.y0 || tx >= r.x0 + r.w || ty >= r.y0 + r.h) continue;
        const c = map.tileCenter(tx, ty);
        if (!overlapsSolid(c.x, c.y, half + 1, map)) return c;
      }
    return map.tileCenter(r.cx, r.cy);
  }
  clearRoom(r) {
    r.state = 'cleared'; this.activeRoom = null;
    const P = this.player;
    if (P.hero.roomHeal && P.state !== 'DEAD' && r.type === 'combat') { P.hp = Math.min(P.maxHp, P.hp + P.hero.roomHeal); this.effects.heal(P.x, P.y); this.effects.text(P.x, P.y - 20, '+' + P.hero.roomHeal, '#7aff7a'); }
    this.map.setDoors(r, false);
    const c0 = this.map.tileCenter(r.cx, r.cy), c = this.freeSpot(r, c0.x, c0.y, 8);
    if (r.type === 'boss' && this.trialW) { // 시련 승리: 인정을 받고 로비로
      this.playCutscene(this.trialDef.winLines(), { always: true, force: true, done: () => this.endTrial(true) }); return;
    }
    if (r.type === 'boss') {
      for (let i = 0; i < 12; i++) this.pickups.push(new Pickup('coin', c.x, c.y));
      for (let i = 0; i < 8; i++) this.pickups.push(new Pickup('energy', c.x, c.y, { value: 10 }));
      this.pickups.push(new Pickup('hp', c.x, c.y, { value: 30 }));
      const p = this.player; // 월드 보스 처치: 체력 회복
      if (p.state !== 'DEAD') { const heal = Math.round(p.maxHp * BALANCE.bossHealRatio); p.hp = Math.min(p.maxHp, p.hp + heal); this.effects.text(p.x, p.y - 20, '+' + heal, '#7be36b', true); }
      const W = this.W, next = worldDef(this.worldIdx + 1);
      this.portalSpot = c;
      const after = () => {
        if (W.sanctum) { // 문지기를 쓰러뜨림: 거대한 문이 열리고, 그 앞에 성역 깊은 곳으로 가는 포탈
          const G = this.sanctumGate, gx = G ? G.x : c.x, gy = G ? G.y + 22 : c.y + 24;
          if (G) { G.opening = true; this.effects.rays(G.x, G.y - 30, '#ffe9a0', 20, 120, 1.2); for (let i = 0; i < 6; i++) this.effects.skyBeam(G.x - 30 + i * 12, G.y - 4, '#fff4c0', 0.3 + i * 0.12, 4); SFX.play('solomon', 0.6); }
          this.playCutscene(GATEKEEPER_FALL_LINES, { id: 'gatekeeper_fall', focus: G ? { x: G.x, y: G.y - 10 } : null });
          this.portals.push(new Portal(gx, gy, () => this.enterSanctum(), '성역 깊은 곳으로', [255, 233, 160]));
        }
        else if (W.zone === 'babylon_under') this.babylonUnderBoss(c, W);
        else {
          this.props.push(new Chest(c.x, c.y - 24, 'weapon'));
          this.portals.push(new Portal(c.x + (W.deep ? 26 : 0), c.y + 24, () => this.advanceStage(), `${stageLabel(this.worldIdx + 1, 0)} ${next.name}`, next.deep ? [120, 200, 255] : undefined));
          if (W.deep) this.portals.push(new Portal(c.x - 26, c.y + 24, () => this.endRun(true), '귀환 (탐험 종료)', [255, 210, 90])); // 심층: 여기서 돌아가거나 더 내려감
          if (W.deep && W.depth === 10 && this.babylonOpen()) { this.portals.push(new Portal(c.x, c.y + 60, () => this.enterBabylon(), '금빛 포탈 — 바빌로니아', [255, 190, 40])); this.effects.rays(c.x, c.y + 60, '#ffd84a', 14, 50, 1); this.effects.skyBeam(c.x, c.y + 60, '#fff4c0', 0, 12); this.screenFlash = 0.2; this.flashColor = '255,216,74'; SFX.play('solomon', 0.5);
            this.playCutscene(BABYLON_APPEAR_LINES, { id: 'babylon_appear', focus: { x: c.x, y: c.y + 50 } }); } /* 금빛의 문이 처음 나타날 때 이야기 (한 번, 이야기 기록에서 다시 보기) */ /* [사용자 결정] 심층 10-4: 바빌로니아로 가는 금빛 포탈 */
        }
      };
      const owned = new Set(this.player.buffs);
      const options = shuffled(DATA_BUFFS.filter((b) => !owned.has(b.id) || b.id === 'buff_atk' || b.id === 'buff_hp')).slice(0, 3);
      if (this.coop && this.coop.host) for (const R of this.remotes.values()) { if (R.p.state !== 'DEAD') R.p.hp = Math.min(R.p.maxHp, R.p.hp + Math.round(R.p.maxHp * BALANCE.bossHealRatio)); const ow = new Set(R.p.buffs); R.overlay = { type: 'buff', options: shuffled(DATA_BUFFS.filter((b) => !ow.has(b.id) || b.id === 'buff_atk' || b.id === 'buff_hp')).slice(0, 3), after: null }; this.coopSendOverlay(R); } // 멀티: 동료도 각자 축복을 고름 + 회복
      this.overlay = { type: 'buff', options, after };
    } else {
      if (r.trial) { r.trial = 0; const tp = r.trialPlayer || this.player; this.withPlayer(tp, () => this.evolve(r.hybrid, r.branch)); this.coopNotifyEvolve(tp); r.hybrid = null; r.branch = null; r.trialPlayer = null; return; } // 상위자를 쓰러뜨림 → 진화 (혼합 전직 포함)
      if (r.challenge) { // 도전 성공: 희귀 이상 무기 + 골드
        r.challenge = false; this.props.push(new Chest(c.x, c.y - 10, 'challenge'));
        for (let i = 0; i < 8; i++) this.pickups.push(new Pickup('coin', c.x, c.y));
        this.showBanner('도전 성공!', '희귀 이상의 무기가 담긴 상자', '#ffd84a'); SFX.play('clear'); this.effects.ring(c.x, c.y, 40, '#ffd84a'); return;
      }
      const B = BALANCE, orbs = randInt(B.roomEnergyOrbs[0], B.roomEnergyOrbs[1]);
      for (let i = 0; i < orbs; i++) this.pickups.push(new Pickup('energy', c.x, c.y, { value: B.roomEnergyValue }));
      if (Math.random() < B.roomChestChance) this.props.push(new Chest(c.x, c.y, 'loot'));
      if (Math.random() < B.roomHpChance) this.pickups.push(new Pickup('hp', c.x, c.y, { value: B.roomHpValue }));
      this.showBanner('방 클리어!', null, '#9fe89f');
      SFX.play('clear');
    }
  }

  // ── 상호작용
  updateInteraction(input) {
    this.interactTarget = this.findInteractTarget();
    if (!this.interactTarget || !input.wasPressed('KeyE')) return;
    const t = this.interactTarget;
    if (t instanceof Pickup) this.pickWeapon(t);
    else t.interact(this);
  }
  findInteractTarget() {
    const p = this.player;
    let best = null, bestD = Infinity;
    for (const o of this.props) {
      if (!o.radius || !o.label(this)) continue;
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d < o.radius && d < bestD) { best = o; bestD = d; }
    }
    for (const pk of this.pickups) {
      if (pk.kind !== 'weapon') continue;
      const d = Math.hypot(pk.x - p.x, pk.y - p.y);
      if (d < 20 && d < bestD) { best = pk; bestD = d; }
    }
    return best;
  }
  randomWeaponDef(minRank = 0, exclude = [], shopBias = false) { // minRank: 0 고급 이상 / 2 희귀 이상 / 3 영웅 이상
    const owned = new Set(this.player.weapons.map((w) => w.def.id).concat(exclude)), RANK = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const eligible = DATA_WEAPONS.filter((d) => d.rarity !== 'common' && RANK.indexOf(d.rarity) >= minRank);
    let pool = eligible.filter((d) => !owned.has(d.id));
    if (!pool.length) pool = eligible; // 같은 등급 후보가 모두 보유 중이어도 등급 조건은 유지
    if (!pool.length) return null;
    // 상점 전용 보정: 고급 -0.35%p, 희귀 -0.25%p를 영웅 +0.5%p / 전설 +0.1%p로 이동
    const T = BALANCE.rarityByWorld, baseRow = T[Math.min(this.worldIdx, T.length - 1)], row = baseRow.slice();
    if (shopBias) { row[0] = Math.max(0, row[0] - 0.35); row[1] = Math.max(0, row[1] - 0.25); row[2] += 0.5; row[3] += 0.1; }
    const rars = ['uncommon', 'rare', 'epic', 'legendary'];
    const avail = rars.map((r, i) => ({ r, w: pool.some((d) => d.rarity === r) ? row[i] : 0 })).filter((x) => x.w > 0);
    const rar = avail.length ? weightedPick(avail, (x) => x.w).r : pool[0].rarity;
    return pick(pool.filter((d) => d.rarity === rar));
  }
  openChest(c) {
    this.effects.burst(c.x, c.y - 6, '#ffd84a', 10);
    if (this.areaId && this.mode === 'dungeon' && this.zoneRight('arms')) this.rollChainShard(c); /* 무기의 권리를 되찾은 뒤: 상자는 원래대로 (조각은 계속) */
    if (this.areaId && this.mode === 'dungeon' && !this.zoneRight('arms')) { /* [사용자 결정] 바빌로니아 귀환길: '무기의 권리'를 되찾기 전엔 상자에서 무기 대신 체력·에너지·골드만 */
      const big = c.content === 'challenge' || c.content === 'boss', coins = big ? randInt(12, 18) : randInt(6, 10);
      for (let i = 0; i < coins; i++) this.pickups.push(new Pickup('coin', c.x, c.y));
      for (let i = 0; i < (big ? 8 : 5); i++) this.pickups.push(new Pickup('energy', c.x, c.y, { value: 10 }));
      this.pickups.push(new Pickup('hp', c.x, c.y, { value: big ? 40 : 25 }));
      this.rollChainShard(c);
      return;
    }
    if (c.content === 'weapon' || c.content === 'challenge') this.pickups.push(new Pickup('weapon', c.x, c.y + 14, { def: this.randomWeaponDef(c.content === 'challenge' ? 2 : 0), still: true }));
    else {
      for (let i = 0; i < randInt(4, 8); i++) this.pickups.push(new Pickup('coin', c.x, c.y));
      for (let i = 0; i < 4; i++) this.pickups.push(new Pickup('energy', c.x, c.y, { value: 8 }));
      if (Math.random() < 0.4) this.pickups.push(new Pickup('hp', c.x, c.y, { value: 20 }));
    }
  }
  // 무기 강화: 성공하면 +1 (실패해도 단계 유지, 비용만 듦)
  upgradeCost(w, discount = 1) { const U = BALANCE.upgrade; return Math.round(U.base * (w.lv + 1) * U.rarityMult[w.def.rarity] * (1 + BALANCE.shopInflate * this.stageIndex) * discount * (1 - (this.player.hero.upgradeDiscount || 0))); }
  upgradeChance(w, bonus = 0) { return Math.min(1, BALANCE.upgrade.chance[w.lv] + bonus); }
  tryUpgrade(discount = 1, bonus = 0, at) {
    const p = this.player, w = p.weapon, U = BALANCE.upgrade;
    if (!w) return;
    if (w.lv >= U.maxLevel) { this.effects.text(p.x, p.y - 18, '최대 강화입니다', '#aaa'); SFX.play('deny'); return; }
    const cost = this.upgradeCost(w, discount);
    if (this.gold < cost) { this.effects.text(p.x, p.y - 18, '골드가 부족합니다', '#ff7070'); SFX.play('deny'); return; }
    this.gold -= cost;
    const fx = at || p;
    if (Math.random() < this.upgradeChance(w, bonus)) {
      w.lv++;
      if (w.lv >= BALANCE.upgrade.maxLevel && w.base && w.base.awaken) { this.showBanner(`각성! ${w.def.name}`, w.base.awaken.desc, '#ffd84a'); this.effects.rays(p.x, p.y, '#ffd84a', 18, 80, 1); this.screenFlash = 0.2; this.flashColor = '255,216,74'; SFX.play('solomon', 0.5); } /* [사용자 결정] 기본 무기 +10 각성 */
      this.effects.text(p.x, p.y - 24, `강화 성공! ${weaponTitle(w)}`, '#ffd84a', true); this.effects.burst(fx.x, fx.y - 6, '#ffd84a', 16); this.effects.ring(fx.x, fx.y, 18, '#ffd84a');
      SFX.play(w.lv >= 4 ? 'clear' : 'buy'); if (w.lv >= 4) this.addShake(0.12, 2);
    } else {
      this.effects.text(p.x, p.y - 24, '강화 실패…', '#9a9aa8', true); this.effects.burst(fx.x, fx.y - 6, '#666', 10); SFX.play('deny');
    }
  }
  giveWeapon(def, lv = 0) {
    const p = this.player, inst = new WeaponInstance(def, lv);
    if (p.weapons.length < this.data.base.weaponSlots) { p.weapons.push(inst); p.slot = p.weapons.length - 1; }
    else {
      this.pickups.push(new Pickup('weapon', p.x, p.y + 4, { def: p.weapon.def, still: true, lv: p.weapon.lv })); // 강화 단계는 바닥에 내려놔도 유지
      p.weapons[p.slot] = inst;
    }
    this.discover(def.id);
    this.effects.text(p.x, p.y - 18, def.name, RARITY_COLOR[def.rarity]); this.effects.text(p.x, p.y - 8, weaponTraits(def), '#e0d0a0');
  }
  pickWeapon(pk) {
    pk.alive = false; this.giveWeapon(pk.def, pk.lv || 0);
    if (pk.group) for (const o of this.pickups) if (o !== pk && o.group === pk.group && o.alive) { o.alive = false; this.effects.burst(o.x, o.y, '#aaa', 8); } // 진열대: 나머지는 사라짐
  }
  buy(item) {
    const p = this.player;
    if (this.gold < item.price) { this.effects.text(p.x, p.y - 18, '골드가 부족합니다', '#ff7070'); SFX.play('deny'); return; }
    this.gold -= item.price; item.sold = true; SFX.play('buy');
    if (item.kind === 'weapon') this.giveWeapon(item.def);
    else if (item.kind === 'hp') { p.hp = Math.min(p.maxHp, p.hp + 40); this.effects.text(p.x, p.y - 18, '+40', '#7be36b'); }
    else { p.energy = Math.min(p.maxEnergy, p.energy + 120); this.effects.text(p.x, p.y - 18, '+120', '#8ab8ff'); }
  }
  collect(pk) {
    const p = this.player;
    if (pk.kind === 'coin') { this.gold += pk.value; this.guildEvent('gold', pk.value); SFX.play('coin', 0.05); this.effects.sparkle(p.x, p.y - 4, '#ffd84a'); }
    else if (pk.kind === 'energy') { p.energy = Math.min(p.maxEnergy, p.energy + pk.value); SFX.play('energy', 0.05); this.effects.sparkle(p.x, p.y - 4, '#8ab8ff'); }
    else if (pk.kind === 'hp') { p.hp = Math.min(p.maxHp, p.hp + pk.value); this.effects.text(p.x, p.y - 16, '+' + pk.value, '#7be36b'); this.effects.heal(p.x, p.y); SFX.play('heal'); }
  }

  // ── 전투 처리
  enemyShoot(x, y, ang, speed, damage, color, r) {
    this.enemyBullets.push(new EnemyBullet(x, y, Math.cos(ang) * speed, Math.sin(ang) * speed, damage, color, r));
  }
  damageEnemy(enemy, src, kx, ky, opts = {}) {
    if (enemy.negateT > 0) { if (!(enemy.negMsgT > this.time)) { this.effects.text(enemy.x, enemy.y - enemy.radius - 8, enemy.fortress ? '막힘' : '부정', enemy.fortress ? '#e8ecff' : '#d8f0ff'); enemy.negMsgT = this.time + 0.35; } return; } /* 가레스의 부정: 모든 피해 무효 */
    let base = src.damage;
    { const wid = src.weaponId || (src.wdef && src.wdef.id) || (src.srcId && String(src.srcId).startsWith('weapon_') ? src.srcId : null); if (wid) enemy.lastWeapon = wid; } /* 마지막으로 때린 무기 (칭호 '근본' 집계) */
    if (src.trap) { if (enemy.preyT > 0 && !src.corpse && !src.pct) base *= 1 + BALANCE.TRAP.prey.bonus; if (enemy.def.boss) base *= src.equip ? BALANCE.TRAP.equipBossMult : BALANCE.TRAP.bossMult; } /* 덫 장비·망자의 파수기: 사냥터 각인 +20% · 보스에게는 배율 (보스전 최강 방지) */
    if (src.treasure) base *= this.treasureBossMult(enemy); /* 공격형 보구: 심층 보스는 절반 */
    { const wd = src.wdef || this.data.weapons.get(src.weaponId || src.srcId), K = wd && wd.kingSlayer; /* 벗의 맹약: 길가메시 사냥 특화 */
      if (K && /^boss_gilgamesh/.test(enemy.def.id)) { base *= K.mult;
        if (enemy.alive && !(enemy.kingSlayCd > this.time) && Math.random() < K.bindChance) { enemy.kingSlayCd = this.time + K.cd; enemy.chainT = Math.max(enemy.chainT || 0, K.bind); enemy.chainMax = enemy.chainT; enemy.trChain = true; this.effects.ring(enemy.x, enemy.y, enemy.radius + 10, '#9ae8d8'); this.effects.text(enemy.x, enemy.y - 30, '벗의 사슬!', '#9ae8d8'); } } }
    if (enemy.iceVulnT > 0) base *= 1.5; /* 절대 영도로 얼어 있음 */
    if (enemy.huntT > 0) base *= 1.8; /* 사냥꾼의 표적 */
    if (enemy.auraVulnT > 0) base *= 1 + enemy.auraVuln; /* 맹독 안개 안 */
    if (enemy.blind > 0 && this.player && this.player.hybrid && this.player.hybrid.el === 'light') base *= 1.25; /* 빛의 마검사: 실명된 적 */
    if (enemy.riposteT > 0) { enemy.riposteHit = true; base *= 0.5; } /* 랜슬롯 반격 자세: 맞으면 피해 절반 + 곧바로 반격 */
    if (enemy.def.wall && enemy.shieldAng != null && !(window.__noWall)) { /* 갤러해드 철벽: 공격한 사람이 방패 정면(원뿔 안)에 있으면 피해가 크게 줄어듦 */
      const A = src.from || this.player, da = Math.atan2(A.y - enemy.y, A.x - enemy.x) - enemy.shieldAng, df = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
      if (df < (enemy.wallCone || enemy.def.wall.cone)) { base *= enemy.wallMult ?? enemy.def.wall.mult; if (!(enemy.wallMsgT > this.time)) { this.effects.text(enemy.x, enemy.y - enemy.radius - 8, '막힘', '#c8c8d8'); enemy.wallMsgT = this.time + 0.5; } } }
    if (src.execute && enemy.hp < enemy.maxHp * 0.35) base *= 1 + src.execute; // 처형: 빈사 적 추가 피해
    if (enemy.markT > 0) base *= enemy.markMult;
    if (src.feast) enemy.feastHit = this.time; /* 포식 스킬에 맞음 (처치하면 중첩 더) */
    { const fp = this.player, F = BALANCE.feast; if (fp && fp.line && fp.line.id === 'feast' && fp.hero.id === 'hero_druid' && !src.trap) base *= enemy.def.boss ? F.bossMult : 1 + (fp.feast || 0) / 10 * F.dmgPer10; } /* [사용자 결정] 소울 이터: 일반 몬스터 피해는 상한 없이 (10스택당 +dmgPer10) · 보스에게는 약함 */
    if (enemy.kingWeakT > 0) base *= enemy.kingWeakMul || 1.6; /* 벗의 사슬에 약해진 길가메시 */                                 // 약점 표시된 적
    if (enemy.curse > 0) base *= 1.2;                                             // 저주: 받는 피해 +20%
    if (enemy.avalonUntil > this.time) base *= 1 + (enemy.avalonVuln || 0.2);        // 아발론의 꽃밭: 받는 피해 증가
    const { amount, crit } = rollDamage(base, src.mods);
    if (!enemy.takeHit(amount)) return;
    if (src.prey) enemy.preyT = BALANCE.TRAP.prey.dur; /* 사냥터 각인 (중첩 없이 시간만 갱신) */
    if (src.shockStack && enemy.alive) this.applyShock(enemy); /* 감전 누적 */
    if (!enemy.alive && enemy.huntT > 0 && enemy.huntOwner) { const o = enemy.huntOwner, left = enemy.huntT; o.skillCooldown *= 0.5; enemy.huntT = 0; /* 사냥꾼의 표적: 쓰러지면 쿨타임 절반 + 남은 시간만큼 가까운 다음 강한 적에게 옮겨 감 */
      const next = this.enemies.filter((e) => e.targetable && e !== enemy && Math.hypot(e.x - enemy.x, e.y - enemy.y) < 300).sort((a, b) => (b.def.boss ? 1e9 : b.hp) - (a.def.boss ? 1e9 : a.hp))[0];
      if (next) { next.huntT = Math.max(2, left); next.huntOwner = o; this.effects.beamline(enemy.x, enemy.y, next.x, next.y, 1, '#ff4a3a'); this.effects.text(next.x, next.y - next.radius - 14, '표적', '#ff6a5a'); } else o.huntT = 0;
      this.effects.text(o.x, o.y - 22, '표적 처치 — 쿨타임 절반', '#ff9a8a'); }
    let kb = (src.knockback || 0) * (1 - (enemy.def.knockbackResist || 0));
    if (kb < 0) kb = -Math.min(-kb, Math.max(0, Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y) - 14)); // 끌어당김: 플레이어 앞에서 멈춤
    if (enemy.alive && kb !== 0 && !(enemy.state === 'ATTACK' && (enemy.def.aiType === 'charger' || enemy.def.boss)))
      moveAndCollide(enemy, kx * kb, ky * kb, this.map);
    if (src.mark && enemy.alive) {
      if (!(enemy.markT > 0)) this.effects.text(enemy.x, enemy.y - 20, '약점', '#ff7a7a');
      enemy.markT = src.mark.dur; enemy.markMult = src.mark.mult;
    }
    if (src.killEnergy && !enemy.alive && !enemy.def.dummy) { const p = this.player; p.energy = Math.min(p.maxEnergy, p.energy + src.killEnergy); this.effects.text(p.x, p.y - 20, '+' + src.killEnergy, '#7fb0ff'); }
    if (src.status) { const SB = this.player.hero.statusBoost, st = SB ? Object.assign({}, src.status, { duration: src.status.duration * (1 + SB), dps: (src.status.dps || 0) * (1 + SB), chance: Math.min(1, (src.status.chance ?? 1) * (1 + SB / 2)) }) : src.status; const react = enemy.applyStatus(st, src.mods); if (react) this.triggerReaction(enemy, react, src.mods); }
    if (!opts.quiet || crit || Math.random() < 0.3) this.effects.text(enemy.x, enemy.y - 12, crit ? amount + '!' : String(amount), crit ? '#ffd84a' : '#ffffff', crit);
    if (!enemy.def.dummy || Math.random() < 0.5) SFX.play(crit ? 'crit' : 'hit', crit ? 0.05 : 0.045);
    if (enemy.def.dummy) this.dpsLog.push({ t: this.time, a: amount });
    if (src.chain && !opts.noChain) this.chainLightning(enemy, src);
    if (enemy.shock > 0 && !opts.noChain && Math.random() < 0.3) { // 전격: 옆 적에게 작은 번개
      let best = null, bd = 70; for (const o of this.enemies) { if (o === enemy || !o.targetable) continue; const d = Math.hypot(o.x - enemy.x, o.y - enemy.y); if (d < bd) { bd = d; best = o; } }
      if (best) { this.effects.lightning(enemy.x, enemy.y, best.x, best.y); this.damageEnemy(best, { damage: amount * 0.35, mods: { attackBonus: 0, critChance: 0, critMultiplier: 1 }, knockback: 0 }, 0, 0, { noChain: true, quiet: true }); }
    }
    if (!enemy.alive) this.onEnemyKilled(enemy);
  }
  // 보스 격노 전환 연출: 탄 정리 + 충격파 + 잠깐의 숨 돌릴 틈
  // 보스 페이즈 전환: 탄·장판 정리, 충격파, 근접한 플레이어 밀어냄 (보스는 1.3초 무적)
  onBossPhase(e, phase) {
    this.enemyBullets.length = 0; this.hazards.length = 0;
    this.addShake(0.6, 6); this.hitStop(0.15); this.screenFlash = 0.25; SFX.play('boss');
    const col = e.def.phaseColors ? e.def.phaseColors[phase - 1] : '#ff6a6a';
    this.effects.ring(e.x, e.y, 30, '#ffffff'); this.effects.ring(e.x, e.y, 60, col); this.effects.ring(e.x, e.y, 90, col); this.effects.burst(e.x, e.y, col, 24);
    this.showBanner(`${e.def.name} — ${phase}페이즈`, phase >= 3 ? '궁극기가 해금되었습니다!' : '분노하여 패턴이 빨라지고 새로운 공격이 추가됩니다', phase >= 3 ? '#ff4a5a' : '#ff9a6a');
    const p = this.player, dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    if (d < 80) moveAndCollide(p, dx / d * (80 - d), dy / d * (80 - d), this.map);
    // 버틴 보상: 에너지 오브와 회복 물약 (에너지 무기만 든 경우 공격 수단이 끊기지 않게)
    const c0 = this.map.tileCenter(e.room.cx, e.room.cy + 3), c = this.freeSpot(e.room, c0.x, c0.y, 4);
    for (let i = 0; i < 6; i++) this.pickups.push(new Pickup('energy', c.x, c.y, { value: 12 }));
    this.pickups.push(new Pickup('hp', c.x, c.y, { value: 15 }));
  }
  // 궁극기 이름 외치기
  // 보스 궁극기 시작: 붉은 기운 + 강한 흔들림 + 큰 이름 (화면 가장자리가 붉게 맥동, renderScreenFx)
  onBossUltimate(e, pat) {
    this.addShake(0.5, 6); this.screenFlash = 0.25; this.flashColor = '255,60,60'; SFX.play('boss');
    this.effects.ring(e.x, e.y, 50, '#ff3a3a'); this.effects.ring(e.x, e.y, 90, '#ffffff'); this.effects.rays(e.x, e.y, '#ff5a5a', 18, 110, 0.8);
  }
  announceBossSkill(e, name) {
    this.showBanner(name, null, '#ff4a5a'); this.banner.life = 1.4;
    this.effects.text(e.x, e.y - 34, name + '!', '#ff8a8a', true); SFX.play('react');
  }
  // 보스 등장 연출: 낙하 → 착지 충격파 → 포효 → 전투 시작
  updateCinematic(dt) {
    const c = this.cinematic, b = c.boss;
    c.t += dt;
    b.stateTime += dt;
    if (c.t < 0.8) b.jumpH = 160 * Math.pow(1 - c.t / 0.8, 2);
    else if (!c.landed) {
      c.landed = true; b.jumpH = 0;
      this.addShake(0.5, 7); SFX.play('explode'); this.screenFlash = 0.2;
      this.effects.ring(b.x, b.y, 40, '#ffffff'); this.effects.ring(b.x, b.y, 70, b.def.color); this.effects.burst(b.x, b.y, b.def.color, 26);
    }
    if (c.grand && c.landed && !c.grandFx) { c.grandFx = true; // 성역: 착지할 때 빛살·빛기둥
      this.effects.rays(b.x, b.y, '#ffe9a0', 22, 160, 1); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; this.effects.skyBeam(b.x + Math.cos(a) * 70, b.y + Math.sin(a) * 45, '#ffe9a0', 0.1 + i * 0.05, 4); }
      this.screenFlash = 0.35; this.flashColor = '255,233,160'; }
    if (c.intro && c.t >= 1.0 && !c.introDone) { c.introDone = true; this.playCutscene(BABYLON_BOSS_INTROS[c.intro].lines, { id: 'bab_boss_' + c.intro, focus: { x: b.x, y: b.y - 10 } }); }
    if (c.t >= 1.3 && !c.roared) { c.roared = true; SFX.play('boss'); this.addShake(0.6, 3); this.effects.ring(b.x, b.y, 100, '#ffffff'); if (c.grand) { this.effects.ring(b.x, b.y, 160, '#ffe9a0'); this.effects.rays(b.x, b.y, '#ffffff', 12, 120, 0.7); SFX.play('solomon', 0.5); } }
    if (c.t >= (c.grand ? 3.4 : 2.8)) { b.setState('CHASE'); this.cinematic = null; SFX.startMusic(c.grand ? 'sanctum' : null); }
  }
  // ── 컷신: 위아래 검은 띠 + 비추는 곳으로 카메라 이동 + 글자가 한 자씩 (Enter/Space/클릭: 다음 · Esc: 건너뛰기)
  playCutscene(lines, o = {}) {
    if (o.id && (this.save.scenesSeen || []).includes(o.id) && !o.always) { if (o.done) o.done(); return; } // 처음 한 번만
    if (window.__toolMode && !o.force) { if (o.done) o.done(); return; } // 테스트 도구는 건너뜀
    this.cutscene = { lines, i: 0, t: 0, lt: 0, focus: o.focus || null, id: o.id, done: o.done };
    if (this.coop && this.coop.host) Net.relay({ k: 'cut', lines, focus: o.focus ? { x: Math.round(o.focus.x), y: Math.round(o.focus.y) } : null }); // 멀티: 동료도 같은 컷신
    this.input.mouse.down = false;
  }
  updateCutscene(dt, input) {
    const c = this.cutscene; c.t += dt; c.lt += dt;
    const line = c.lines[c.i] || '', shown = Math.floor(c.lt * 28);
    const next = input.wasPressed('Enter') || input.wasPressed('Space') || input.wasPressed('Mouse0') || input.wasPressed('KeyE');
    if (input.wasPressed('Escape')) c.i = c.lines.length;
    else if (next) { if (shown < line.length) c.lt = 99; else { c.i++; c.lt = 0; } }
    if (c.i >= c.lines.length) {
      this.cutscene = null; this.input.mouse.down = false;
      if (c.id && !(this.save.scenesSeen || []).includes(c.id)) { this.save.scenesSeen = (this.save.scenesSeen || []).concat([c.id]); writeSave(this.save); }
      if (c.done) c.done();
    }
  }
  // 기원의 성역 장식: 보스방엔 거대한 문·화로·바닥 문양, 일반 방엔 빛기둥
  decorateThroneHall(room) { /* [사용자 결정] 길가메시의 방 다시 디자인: 왕좌 + 금 기둥 줄 + 보물 더미 + 공중의 보물고 문 + 화로 (융단·태양 원반은 바닥 그림) */
    const m = this.map, c = m.tileCenter(room.cx, room.cy), top = (room.y0 + 3) * TILE;
    this.props.push(new GoldThrone(c.x, top));
    const pd = room.w >= 27 ? 5 : 4; for (let ty = room.y0 + 4; ty < room.y0 + room.h - 1; ty += 3) for (const dx of [-pd, pd]) { const p = m.tileCenter(room.cx + dx, ty); this.props.push(new GoldPillar(p.x + (dx < 0 ? -8 : 8), p.y)); }
    this.props.push(new TreasureHeap(c.x - 46, top + 6, false), new TreasureHeap(c.x + 46, top + 6, true));
    for (let i = 0; i < 6; i++) { const tx = room.x0 + 2 + Math.round(i * (room.w - 5) / 5); if (Math.abs(tx - room.cx) < 3) continue; const p = m.tileCenter(tx, room.y0 + 1); this.props.push(new GateRipple(p.x, p.y + 10, i)); }
    for (const [dx, dy] of [[1, room.h - 2], [room.w - 2, room.h - 2], [1, 2], [room.w - 2, 2]]) { const b = m.tileCenter(room.x0 + dx, room.y0 + dy); this.props.push(new Brazier(b.x, b.y)); }
    return { x: c.x, y: top };
  }
  decorateSanctum(map) {
    this.sanctumGate = null;
    for (const r of map.rooms) {
      if (r.type === 'boss') {
        const c = map.tileCenter(r.cx, r.y0 + 1); this.sanctumGate = new SanctumGate(c.x, c.y + 10); this.props.push(this.sanctumGate);
        for (const [dx, dy] of [[2, 2], [r.w - 3, 2], [2, r.h - 3], [r.w - 3, r.h - 3]]) { const b = map.tileCenter(r.x0 + dx, r.y0 + dy); this.props.push(new Brazier(b.x, b.y)); }
      } else if (r.type === 'combat' || r.type === 'start') {
        for (let i = 0; i < 2; i++) { const p = map.tileCenter(r.x0 + 2 + Math.floor(Math.random() * Math.max(1, r.w - 4)), r.y0 + 2 + Math.floor(Math.random() * Math.max(1, r.h - 4))); this.props.push(new LightPillar(p.x, p.y)); }
      }
    }
  }
  // 보스 처치 슬로우모션: 연쇄 폭발 → 섬광 → 보상
  updateSlowMo(dt) {
    const s = this.slowMo;
    s.t += dt; s.next -= dt;
    if (s.next <= 0 && s.t < 1.7) {
      s.next = 0.13;
      const x = s.x + randInt(-18, 18), y = s.y + randInt(-18, 10);
      this.effects.explosion(x, y, randInt(10, 20), pick(['#ffffff', '#ffd84a', s.color]));
      SFX.play('explode', 0.08); this.addShake(0.1, 3);
    }
    if (s.t >= 1.9) {
      this.slowMo = null; this.screenFlash = 0.7; this.addShake(0.5, 8); SFX.play('victory');
      this.effects.explosion(s.x, s.y, 60, '#ffffff'); this.effects.burst(s.x, s.y, s.color, 40);
      return dt;
    }
    return dt * 0.25;
  }
  // 충전 광선포: 조준 방향 일직선(벽까지)의 모든 적에게 피해
  fireBeamShot(p, def, k) {
    const sx = p.x + p.aim.x * 10, sy = p.y + 1 + p.aim.y * 10, L = def.range;
    const wt = sweepWall(sx, sy, sx + p.aim.x * L, sy + p.aim.y * L, this.map, 3), len = wt < 0 ? L : wt * L;
    const ex = sx + p.aim.x * len, ey = sy + p.aim.y * len, w = def.beamShot.width * (0.5 + 0.5 * k);
    for (const e of this.enemies) if (e.targetable && segmentCircleHit(sx, sy, ex, ey, e.x, e.y, e.radius + w) >= 0)
      this.damageEnemy(e, { damage: def.damage * k, mods: p.mods, knockback: def.knockback }, p.aim.x, p.aim.y);
    this.hitTile(ex + p.aim.x * 3, ey + p.aim.y * 3);
    this.effects.beamline(sx, sy, ex, ey, w, def.bulletColor); this.effects.impact(ex, ey, def.bulletColor, Math.atan2(p.aim.y, p.aim.x));
    this.addShake(0.15, 3 * k); p.recoil = 1; SFX.play('heavy');
  }
  // ── 부서지는 상자
  breakCrate(tx, ty) {
    if (this.map.get(tx, ty) !== T_CRATE) return false;
    this.map.set(tx, ty, T_FLOOR); this.map.redrawTile(tx, ty); this.flowTile = -1;
    const c = this.map.tileCenter(tx, ty), st = this.map.palette.style;
    const col = st === 'ice' ? '#8a9aaa' : st === 'basalt' ? '#c87a50' : st === 'void' ? '#b080ff' : '#b88450';
    this.effects.burst(c.x, c.y, col, 10); SFX.play('crate', 0.03);
    if (this.mode === 'dungeon') {
      if (Math.random() < 0.25) this.pickups.push(new Pickup('coin', c.x, c.y));
      if (Math.random() < 0.15) this.pickups.push(new Pickup('energy', c.x, c.y, { value: 6 }));
      if (Math.random() < 0.04) this.pickups.push(new Pickup('hp', c.x, c.y, { value: 10 }));
    }
    return true;
  }
  hitTile(x, y) { return this.breakCrate(Math.floor(x / TILE), Math.floor(y / TILE)); }
  breakCratesInRadius(x, y, r) {
    for (let ty = Math.floor((y - r) / TILE); ty <= Math.floor((y + r) / TILE); ty++)
      for (let tx = Math.floor((x - r) / TILE); tx <= Math.floor((x + r) / TILE); tx++)
        if (Math.hypot(tx * TILE + 8 - x, ty * TILE + 8 - y) <= r + 6) this.breakCrate(tx, ty);
  }
  breakCratesInArc(x, y, ang, arc, range) {
    for (let ty = Math.floor((y - range) / TILE); ty <= Math.floor((y + range) / TILE); ty++)
      for (let tx = Math.floor((x - range) / TILE); tx <= Math.floor((x + range) / TILE); tx++) {
        const cx = tx * TILE + 8, cy = ty * TILE + 8, d = Math.hypot(cx - x, cy - y);
        if (d <= range + 6 && (d < 10 || angleDiff(Math.atan2(cy - y, cx - x), ang) <= arc / 2 + 0.3)) this.breakCrate(tx, ty);
      }
  }
  // 원소 반응
  triggerReaction(e, type, mods) { this.guildEvent('reactions'); // 반응 피해는 적 체력과 같은 비율로 깊이에 따라 커짐 → 어느 층에서든 비슷한 몫
    const atk = (1 + (mods ? mods.attackBonus : 0)) * this.scale.hp * 0.8 * (1 + 0.09 * this.worldIdx), quiet = { damage: 0, mods: { attackBonus: 0, critChance: 0, critMultiplier: 1 }, knockback: 0 };
    if (type === 'thermal') { // 열충격: 큰 단일 피해, 빙결·화상 해제
      e.slow = 0; e.burn = 0;
      this.effects.ring(e.x, e.y, 18, '#9ad8ff'); this.effects.ring(e.x, e.y, 12, '#ff9a4a'); this.effects.burst(e.x, e.y, '#dff4ff', 10);
      this.effects.reaction(e.x, e.y, 'thermal', '열충격', '#bfe8ff'); SFX.play('react');
      this.damageEnemy(e, Object.assign({}, quiet, { damage: 44 * atk, knockback: 4 }), 0, 0, { noChain: true });
      this.hitStop(0.05);
    } else if (type === 'toxic') { // 독 연소: 주변 폭발, 중독 소모
      e.poison = 0;
      this.effects.reaction(e.x, e.y, 'toxic', '독 연소', '#c8ff70'); SFX.play('react');
      this.explodeAt(e.x, e.y, 36, { color: '#9aff5a', hurtEnemies: true, src: Object.assign({}, quiet, { damage: 9 * atk, knockback: 3 }) });
    } else if (type === 'electro') { // 감전: 피해 + 주변 3명에게 번개
      e.shock = 0; this.effects.reaction(e.x, e.y, 'electro', '감전', '#dff4ff'); SFX.play('react');
      this.damageEnemy(e, Object.assign({}, quiet, { damage: 16 * atk }), 0, 0, { noChain: true });
      this.enemies.filter((o) => o !== e && o.targetable && Math.hypot(o.x - e.x, o.y - e.y) < 80).slice(0, 3).forEach((o) => { this.effects.lightning(e.x, e.y, o.x, o.y); this.damageEnemy(o, Object.assign({}, quiet, { damage: 8 * atk }), 0, 0, { noChain: true }); });
    } else if (type === 'overload') { // 과부하: 큰 폭발로 밀쳐냄, 화상·전격 소모
      e.burn = 0; e.shock = 0; this.effects.reaction(e.x, e.y, 'overload', '과부하', '#ffb04a'); SFX.play('react');
      this.explodeAt(e.x, e.y, 42, { color: '#ffb04a', hurtEnemies: true, src: Object.assign({}, quiet, { damage: 9 * atk, knockback: 12 }) }); this.addShake(0.12, 3);
    } else if (type === 'paralyze') { // 마비: 잠깐 완전히 멈춤 (보스는 크게 느려짐)
      e.shock = 0; e.slow = Math.max(e.slow, e.def.boss ? 1 : 1.4); e.slowK = e.def.boss ? 0.6 : 0.02;
      this.effects.reaction(e.x, e.y, 'paralyze', '마비', '#e8ff7a'); SFX.play('react'); this.effects.burst(e.x, e.y, '#e8ff7a', 10);
      this.damageEnemy(e, Object.assign({}, quiet, { damage: 14 * atk }), 0, 0, { noChain: true });
    } else if (type === 'eclipse') { // 일식: 빛과 어둠이 부딪혀 큰 단일 피해, 실명·저주 소모
      e.blind = 0; e.curse = 0; this.effects.reaction(e.x, e.y, 'eclipse', '일식', '#e0d0ff'); SFX.play('react');
      this.effects.ring(e.x, e.y, 22, '#fff8d8'); this.effects.ring(e.x, e.y, 14, '#7040c0'); this.effects.burst(e.x, e.y, '#b070ff', 12);
      this.damageEnemy(e, Object.assign({}, quiet, { damage: 44 * atk, knockback: 4 }), 0, 0, { noChain: true }); this.hitStop(0.05);
    } else if (type === 'plague') { // 역병: 주변 적에게 중독이 번짐
      e.curse = 0; this.effects.reaction(e.x, e.y, 'plague', '역병', '#a0e070'); SFX.play('react'); this.effects.ring(e.x, e.y, 70, '#7ac04a');
      for (const o of this.enemies) if (o !== e && o.targetable && Math.hypot(o.x - e.x, o.y - e.y) < 70) { o.poison = Math.max(o.poison, 4); o.poisonDps = Math.max(o.poisonDps, Math.max(e.poisonDps || 0, 7 * atk)); }
    } else if (type === 'hellfire') { // 지옥불: 검은 불꽃 폭발, 주변에 화상, 저주 소모
      e.curse = 0; this.effects.reaction(e.x, e.y, 'hellfire', '지옥불', '#c060ff'); SFX.play('react');
      this.explodeAt(e.x, e.y, 36, { color: '#a040e0', hurtEnemies: true, src: Object.assign({}, quiet, { damage: 7 * atk, knockback: 4, status: { type: 'burn', chance: 1, duration: 2.5, dps: 4 * atk } }) });
    } else if (type === 'judgment') { // 심판: 하늘에서 번개 기둥, 전격 소모
      e.shock = 0; this.effects.reaction(e.x, e.y, 'judgment', '심판', '#fff4c0'); SFX.play('react');
      this.effects.lightning(e.x, e.y - 110, e.x, e.y); this.effects.beamline(e.x, e.y - 110, e.x, e.y, 5, '#fff4c0');
      this.damageEnemy(e, Object.assign({}, quiet, { damage: 40 * atk, knockback: 3 }), 0, 0, { noChain: true });
    }
  }
  chainLightning(first, src) {
    const C = src.chain, hit = new Set([first.id]);
    let cur = first, dmg = src.damage;
    for (let i = 0; i < C.count; i++) {
      let best = null, bestD = C.range;
      for (const e of this.enemies) {
        if (!e.targetable || hit.has(e.id)) continue;
        const d = Math.hypot(e.x - cur.x, e.y - cur.y);
        if (d < bestD) { best = e; bestD = d; }
      }
      if (!best) break;
      dmg *= C.falloff; hit.add(best.id);
      this.effects.lightning(cur.x, cur.y, best.x, best.y);
      const shocked = best.slow > 0; // 감전: 얼어 있는 적은 연쇄 피해 1.5배
      if (shocked) this.effects.text(best.x, best.y - 22, '감전!', '#dff4ff');
      this.damageEnemy(best, { damage: dmg * (shocked ? 1.5 : 1), mods: src.mods, knockback: 0 }, 0, 0, { noChain: true });
      cur = best;
    }
  }
  dotDamage(e, amount, color) {
    if (!e.targetable) return;
    const a = Math.max(1, Math.round(amount));
    e.takeHit(a);
    this.effects.text(e.x, e.y - 12, String(a), color);
    if (e.def.dummy) this.dpsLog.push({ t: this.time, a });
    if (!e.alive) this.onEnemyKilled(e);
  }
  explodeAt(x, y, r, o) {
    this.effects.explosion(x, y, r, o.color || '#ff8a3a');
    this.addShake(0.12, 3);
    this.breakCratesInRadius(x, y, r);
    SFX.play('explode', 0.06);
    if (o.hurtEnemies) {
      for (const e of this.enemies) {
        if (!e.targetable) continue;
        const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy);
        if (d > r + e.radius) continue;
        this.damageEnemy(e, o.src, d > 0.01 ? dx / d : 1, d > 0.01 ? dy / d : 0);
      }
    }
    if (o.hurtPlayer) {
      this.eachTarget((p) => { if (Math.hypot(p.x - x, p.y - y) < r + p.half) this.damagePlayer(o.damage); }); // 멀티: 폭발 범위 안의 모두
    }
  }
  enemyExplode(e) {
    if (e.exploded) return;
    e.exploded = true;
    this.explodeAt(e.x, e.y, e.def.explodeRadius, { color: '#ff6a2a', hurtPlayer: true, damage: e.damage,
      hurtEnemies: true, src: { damage: 20, mods: { attackBonus: 0, critChance: 0, critMultiplier: 1 }, knockback: 6 } });
  }
  coopGuestMerlinBoss(id) { /* 협동 동료: 방장이 보낸 보스 처치 기록으로 멀린의 1번 시련 집계 (방장·혼자는 onEnemyKilled에서) */
    const M = this.save.merlin; if (!M || !id) return; merlinGateToDeep(M); if (M.quest !== 1) return;
    const deepBoss = DEEP_WORLDS.some((w) => w.boss === id) || !!(this.W && (this.W.deep || this.worldIdx >= DEEP_START));
    if (!deepBoss) return; const d = Math.max(0, Number(M.deep) || 0), nd = Math.min(MERLIN_TRIAL.deep, d + 1); if (nd === d) return;
    M.deep = nd; writeSave(this.save); this.showBanner('멀린의 시련 진행', `심층 보스 처치 (${nd}/${MERLIN_TRIAL.deep})`, '#ffb0d8');
  }
  treasureBossMult(e) { return e && e.def.boss && this.W && this.W.deep && !this.trialW ? BALANCE.deepBossTreasureMult : 1; } /* [사용자 결정] 심층 보스는 공격형 보구(바빌론·엑스칼리버·롱고미니아드·게이볼그) 피해를 절반만 받음 */
  onEnemyKilled(enemy) {
    if (enemy.rewardGiven) return;
    enemy.rewardGiven = true;
    if (!enemy.def.boss && !enemy.def.dummy && !enemy.def.master) { const C = this.corpses || (this.corpses = []); C.push({ x: enemy.x, y: enemy.y, t: this.time, used: false, maxHp: enemy.maxHp }); if (C.length > 40) C.shift(); } /* 시체 (망자의 파수기용, BALANCE.TRAP.corpseLife초) */
    this.kills++;
    { const fp = this.player, F = BALANCE.feast; if (fp && fp.line && fp.line.id === 'feast' && fp.hero.id === 'hero_druid' && this.mode === 'dungeon' && !enemy.def.dummy && !enemy.def.boss) { /* 소울 이터: 혼 포식 (처치 수와 따로) */
      const before = fp.feast || 0, gain = enemy.feastHit && this.time - enemy.feastHit < 0.6 ? F.perSkillKill : F.perKill; fp.feast = before + gain;
      if (gain > 1) this.effects.text(enemy.x, enemy.y - 12, `혼 +${gain}`, '#b8e05a');
      if (fp.feast >= F.healAt && fp.state !== 'DEAD') fp.hp = Math.min(fp.maxHp, fp.hp + F.heal);
      const ev = F.evolve || []; for (let r = fp.rank; r < ev.length; r++) if (before < ev[r] && fp.feast >= ev[r]) { this.evolve(null, fp.line); break; } /* [사용자 결정] 포식 스택 진화: 750 → 1진, 2000 → 2진 */
      if (Math.floor(fp.feast / F.bannerEvery) > Math.floor(before / F.bannerEvery)) this.showBanner(`포식 ${Math.floor(fp.feast / F.bannerEvery) * F.bannerEvery}`, `일반 몬스터 피해 +${Math.round(fp.feast / 10 * F.dmgPer10 * 100)}% · 이동 +${Math.round(Math.min(F.speedCap, fp.feast / 10 * F.speedPer10) * 100)}% · 받는 피해 -${Math.round(Math.min(F.guardCap, fp.feast / 10 * F.guardPer10) * 100)}%${fp.rank < ev.length ? ` · 다음 진화 ${ev[fp.rank]}` : ''}`, '#b8e05a'); } }
    if (this.mode === 'dungeon' && !enemy.def.dummy && !enemy.def.master) {
      this.guildEvent('kills', 1, enemy.def.id);
      if (enemy.elite) this.guildEvent('elites');
      { const p = this.player; if (enemy.lastWeapon && p && (enemy.lastWeapon === p.hero.startWeapon || (p.line && enemy.lastWeapon === p.line.startWeapon))) this.guildEvent('startKills'); } /* 기본 시작 무기로 처치 (칭호 '근본') */
      if (enemy.def.boss) this.guildEvent('bosses', 1, enemy.def.id);

      // 멀린의 1번 시련: 심층 필드의 보스 처치 진행도를 즉시 저장한다.
      const M = this.save.merlin;
      if (M) {
        const oldDeep = Number(M.deep) || 0, oldGate = Number(M.gate) || 0, oldGateMoved = !!M.gateMoved;
        merlinGateToDeep(M, this.save);
        let changed = (Number(M.deep) || 0) !== oldDeep || (Number(M.gate) || 0) !== oldGate || !!M.gateMoved !== oldGateMoved;

        if (M.quest === 1 && enemy.def.boss) {
          if (enemy.def.id === 'boss_nameless_gatekeeper') {
            const gate = Math.max(0, Number(M.gate) || 0);
            const nextGate = Math.min(MERLIN_TRIAL.gate, gate + 1);
            if (nextGate !== gate) { M.gate = nextGate; changed = true; }
          }

          // deep 플래그가 누락된 월드 데이터에서도 심층 번호로 판별한다.
          const isDeepBoss = !this.trialW && !!(this.W && (this.W.deep || this.worldIdx >= DEEP_START));
          if (isDeepBoss) {
            const deep = Math.max(0, Number(M.deep) || 0);
            const nextDeep = Math.min(MERLIN_TRIAL.deep, deep + 1);
            if (nextDeep !== deep) { M.deep = nextDeep; changed = true; }
          }
        }

        if (changed) {
          writeSave(this.save);
          if (M.quest === 1 && enemy.def.boss && !this.trialW && this.W && (this.W.deep || this.worldIdx >= DEEP_START)) {
            this.showBanner('멀린의 시련 진행', `심층 보스 처치 (${M.deep || 0}/${MERLIN_TRIAL.deep})`, '#ffb0d8');
          }
        }
      }
    } // 길드 퀘스트·토벌·칭호 집계
    const p = this.player;
    if (p.vampire > 0 && p.state !== 'DEAD') p.hp = Math.min(p.maxHp, p.hp + p.vampire);
    if (p.rage > 0 && p.rageVamp && p.state !== 'DEAD') p.hp = Math.min(p.maxHp, p.hp + p.rageVamp);
    if (p.buffT > 0 && p.buffKillHeal && p.state !== 'DEAD') p.hp = Math.min(p.maxHp, p.hp + p.buffKillHeal); // 피의 광기·붉은 달
    this.effects.death(enemy.x, enemy.y, enemy.def.phaseColors ? enemy.def.phaseColors[(enemy.phase || 1) - 1] : (enemy.def.color || '#c0c0c0'), enemy.def.boss ? 30 : enemy.def.hitboxHalf * 2);
    SFX.play(enemy.def.boss ? 'explode' : 'kill', 0.04);
    if (enemy.def.boss) this.hitStop(0.3); else if (Math.random() < 0.35) this.hitStop(0.025);
    if (enemy.def.aiType === 'exploder') this.enemyExplode(enemy);
    if (enemy.def.traits && !enemy.def.boss) traitOn(enemy, 'death', this); // 심층 잡몹 특성 (단말마·분열)
    const dropP = heroDropChance(this.W.depth);
    if (enemy.def.boss && this.mode === 'dungeon' && this.W.deep && !this.trialW && !enemy.def.master && this.coop && this.coop.host) Net.relay({ k: 'herodrop', p: dropP }); // 멀티: 동료도 각자 확률로
    if (enemy.def.boss && this.mode === 'dungeon' && this.W.deep && !this.trialW && !enemy.def.master && Math.random() < dropP) { // 심층 보스: 낮은 확률로 영웅의 보구
      const left = DATA_TREASURES.filter((t) => t.heroDrop && !this.save.treasures.includes(t.id));
      if (left.length) { const T = pick(left); this.save.treasures.push(T.id); writeSave(this.save); this.treasureToast = { T, start: performance.now() }; }
    }
    if (enemy.def.boss) {
      this.addShake(0.4, 6); this.enemyBullets.length = 0; this.hazards.length = 0;
      enemy.laser = null; SFX.stopMusic();
      this.slowMo = { t: 0, next: 0, x: enemy.x, y: enemy.y, color: enemy.def.phaseColors ? enemy.def.phaseColors[2] : enemy.def.color };
      for (const e of this.enemies) if (e.alive && e !== enemy) { e.alive = false; e.rewardGiven = true; e.setState('DEAD'); }
      return;
    }
    const B = BALANCE, coins = Math.max(1, Math.round(enemy.def.rewardGold * B.killGoldMult * (enemy.elite ? B.elite.gold : 1) + (Math.random() < 0.5 ? 0.4 : -0.4)));
    for (let i = 0; i < coins; i++) this.pickups.push(new Pickup('coin', enemy.x, enemy.y));
    if (Math.random() < B.killEnergyChance) this.pickups.push(new Pickup('energy', enemy.x, enemy.y, { value: B.killEnergyValue }));
    if (Math.random() < B.killHpChance) this.pickups.push(new Pickup('hp', enemy.x, enemy.y, { value: B.killHpValue }));
  }
  // 함정 계열·덫 장비 설치 지점: 마우스(월드 좌표)를 사거리 안으로 줄임. 벽·맵 밖이면 null (설치 안 함) — clampWall이면 벽 앞에 떨어뜨림(던지는 화염 투척)
  trapPoint(p, range, clampWall) {
    const mw = this.mouseWorld(), dx = mw.x - p.x, dy = mw.y - p.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, range / d); let tx = p.x + dx * k, ty = p.y + dy * k;
    const st = sweepWall(p.x, p.y, tx, ty, this.map);
    if (st >= 0) { if (!clampWall) { this.effects.text(p.x, p.y - 22, '설치할 수 없는 곳입니다', '#ff9a9a'); return null; } tx = p.x + (tx - p.x) * Math.max(0, st - 0.05); ty = p.y + (ty - p.y) * Math.max(0, st - 0.05); }
    if (this.map.isSolidAt(tx, ty) || tx < 0 || ty < 0 || tx > this.map.width * TILE || ty > this.map.height * TILE) { if (!clampWall) { this.effects.text(p.x, p.y - 22, '설치할 수 없는 곳입니다', '#ff9a9a'); return null; } tx = p.x; ty = p.y; }
    return { x: tx, y: ty };
  }
  // 감전 누적 (함정 계열·덫 장비의 번개): 맞을 때마다 1중첩(같은 프레임에 한 번만), keep초 동안 안 맞으면 초기화 → need회면 마비(보스는 bossNeed회·짧은 경직), 마비 뒤 재마비 방지
  applyShock(e) {
    const S = BALANCE.TRAP.shock; if (e.shockAt === this.time) return; e.shockAt = this.time;
    e.shockStacks = (e.shockStacks || 0) + 1; e.shockStackT = S.keep;
    const boss = e.def.boss, need = boss ? S.bossNeed : S.need;
    if (e.shockStacks < need) return;
    if (e.paraImmT > 0 || e.def.ccImmune) { e.shockStacks = need - 1; return; } /* 면역 중에도 피해·누적은 들어가지만 마비는 안 걸림 */
    e.shockStacks = 0; const st = boss ? S.bossStun : S.stun; e.stunT = Math.max(e.stunT || 0, st); e.paraT = st; e.paraImmT = st + (boss ? S.bossImmune : S.immune);
    this.effects.ring(e.x, e.y - 4, 16, '#ffffff'); this.effects.ring(e.x, e.y - 4, 26, '#7ac8ff'); for (let i = 0; i < 3; i++) this.effects.lightning(e.x + randInt(-12, 12), e.y - 18, e.x + randInt(-8, 8), e.y + 2);
    this.effects.text(e.x, e.y - e.radius - 10, boss ? '경직' : '마비', '#bfe8ff'); SFX.play('react', 0.05);
  }
  trapRoot(e, dur) { /* 덫에 묶임: 보스는 3번 묶이면 그 뒤로 덫에 면역 (피해는 그대로) */
    if (e.def.ccImmune) { if (!(e.trapMsgT > this.time)) { this.effects.text(e.x, e.y - e.radius - 10, '면역', '#ffe9a0'); e.trapMsgT = this.time + 1.5; } return; } /* 아서 왕: 덫에 아예 묶이지 않음 */
    if (!e.def.boss) { e.stunT = Math.max(e.stunT || 0, dur); return; }
    e.trapN = e.trapN || 0;
    if (e.trapN >= 3) { if (!(e.trapMsgT > this.time)) { this.effects.text(e.x, e.y - e.radius - 10, '덫 면역', '#aaaaaa'); e.trapMsgT = this.time + 1.5; } return; }
    e.trapN++; e.stunT = Math.max(e.stunT || 0, dur);
    if (e.trapN >= 3) this.effects.text(e.x, e.y - e.radius - 14, '이제 덫에 걸리지 않음', '#ffd84a', true);
  }
  reflectBullet(b, p) { /* 아킬레우스의 방패: 적 탄을 쏜 쪽으로 그대로 되돌림 (내 탄이 되어 적을 맞힘) */
    const T = p.treasure || {}; let dx = -b.vx, dy = -b.vy; if (Math.hypot(dx, dy) < 1) { dx = b.x - p.x; dy = b.y - p.y; }
    const d = Math.hypot(dx, dy) || 1, sp = Math.max(180, Math.hypot(b.vx, b.vy) * 1.3); b.alive = false;
    this.projectiles.push(new Projectile({ x: b.x, y: b.y, dx: dx / d, dy: dy / d, speed: sp, range: 420, damage: (T.damage || 45) + b.damage * (T.mult || 2),
      pierce: 0, knockback: 2, mods: p.mods, color: T.color || '#ffc850', size: 2, owner: p }));
    this.effects.spark(b.x, b.y, '#fff4d0'); SFX.play('shield', 0.04);
  }
  damagePlayer(amount) {
    const p = this.player, hp0 = p.hp;
    if (this.admin && this.admin.god) return false; // 관리자 무적
    if (p.feast && p.line && p.line.id === 'feast') { const F = BALANCE.feast; amount = Math.round(amount * (1 - Math.min(F.guardCap, p.feast / 10 * F.guardPer10))); } /* 소울 이터 포식: 받는 피해 감소 (상한) */
    if (p.takeDamage(amount)) {
      if (p.endured) { p.endured = false; this.effects.text(p.x, p.y - 26, '황금 양털이 버텨 냈다!', '#ffd870', true); this.effects.ring(p.x, p.y, 30, '#ffd870'); this.effects.heal(p.x, p.y); this.screenFlash = 0.15; this.flashColor = '255,216,112'; SFX.play('solomon', 0.2); return true; }
      this.addShake(0.15, 3);
      this.effects.text(p.x, p.y - 16, '-' + amount, '#ff6b6b', true);
      if (p.hp < hp0) { SFX.play('hurt'); this.hurtFlash = 0.35; } else SFX.play('shield');
      this.hitStop(0.05);
      return true;
    }
    return false;
  }

  // 화면 효과: 피격/저체력 비네트, 화면 밖 적 방향 표시
  renderScreenFx(ctx, cx, cy) {
    const p = this.player;
    const ultBoss = this.enemies.find((e) => e.ult && e.alive);
    if (ultBoss) { const a = 0.22 + 0.12 * Math.sin(this.time * 9); // 보스 궁극기 중: 가장자리가 붉게 맥동
      const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.3, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.65); g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(200,0,20,${a})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    if (this.mode === 'dungeon' && this.W && this.W.sanctum) { // 기원의 성역: 비스듬히 내려오는 빛줄기 + 떠다니는 금빛 알갱이 (화면 기준)
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) { const x = ((i * 157 + this.time * 6 - cx * 0.3) % (VIEW_W + 200)) - 100, a = 0.05 + 0.03 * Math.sin(this.time * 0.7 + i * 2);
        const g = ctx.createLinearGradient(x, 0, x + 80, VIEW_H); g.addColorStop(0, `rgba(255,233,160,${a})`); g.addColorStop(1, 'rgba(255,233,160,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 34, 0); ctx.lineTo(x + 34 + 90, VIEW_H); ctx.lineTo(x + 90, VIEW_H); ctx.fill(); }
      for (let i = 0; i < 26; i++) { const sx = ((i * 97.3 - cx * 0.6 + Math.sin(this.time * 0.5 + i) * 12) % VIEW_W + VIEW_W) % VIEW_W, sy = ((i * 61.7 - cy * 0.6 - this.time * (6 + i % 5)) % VIEW_H + VIEW_H) % VIEW_H;
        ctx.globalAlpha = 0.3 + 0.3 * Math.sin(this.time * 2 + i); ctx.fillStyle = i % 3 ? '#ffe9a0' : '#ffffff'; ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1); }
      ctx.restore();
    }
    if (this.mode === 'dungeon' && this.activeRoom && p.state !== 'DEAD') {
      for (const e of this.enemies) {
        if (!e.targetable) continue;
        const sx = e.x - cx, sy = e.y - cy;
        if (sx >= 0 && sx <= VIEW_W && sy >= 0 && sy <= VIEW_H) continue;
        const ang = Math.atan2(sy - VIEW_H / 2, sx - VIEW_W / 2);
        const ex = clamp(sx, 10, VIEW_W - 10), ey = clamp(sy, 50, VIEW_H - 42);
        ctx.save(); ctx.translate(Math.round(ex), Math.round(ey)); ctx.rotate(ang);
        ctx.fillStyle = e.def.boss ? '#ff70d0' : 'rgba(255,90,90,0.85)';
        ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-3, -4); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
    const amb = (THEME[this.map.palette.style] || THEME.stone).ambient; // 월드별 조명 분위기
    if (amb) { const v = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.3, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.65);
      v.addColorStop(0, `rgba(${amb[0]},${amb[1]},${amb[2]},0)`); v.addColorStop(1, `rgba(${amb[0]},${amb[1]},${amb[2]},${amb[3]})`); ctx.fillStyle = v; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    if (this.screenFlash > 0) { ctx.fillStyle = `rgba(${this.flashColor || '255,255,255'},${Math.min(0.8, this.screenFlash * 1.2)})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H); } else this.flashColor = null;
    const low = p.state !== 'DEAD' && p.hp < p.maxHp * 0.3 ? 0.18 + 0.12 * Math.sin(this.time * 7) : 0;
    const a = Math.max(low, this.hurtFlash * 1.4);
    if (a > 0.01) {
      const grd = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.62);
      grd.addColorStop(0, 'rgba(200,0,0,0)'); grd.addColorStop(1, `rgba(200,0,0,${Math.min(0.55, a)})`);
      ctx.fillStyle = grd; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  // ── 렌더
  render() {
    const ctx = this.ctx; resetCtx(ctx); // 지난 프레임에 오류로 남은 그리기 상태 정리
    const R = this.R || 1;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(R, 0, 0, R, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (this.coop && this.coop.guest && (this.coop.loading || !this.map)) { // 멀티 참가자: 방장의 던전을 받는 중
      hudText(ctx, '방장의 던전을 불러오는 중…', VIEW_W / 2, VIEW_H / 2 - 6, '#7affc0', 'center', 11);
      if (this.overlay) this.hud.overlay(ctx, this); return; }
    const cx = Math.round(this.cam.x), cy = Math.round(this.cam.y);
    let sx = 0, sy = 0;
    if (this.shake > 0) { sx = Math.round((Math.random() - 0.5) * 2 * this.shakeMag); sy = Math.round((Math.random() - 0.5) * 2 * this.shakeMag); }
    ctx.translate(-cx + sx, -cy + sy);

    this.map.render(ctx, { x: cx, y: cy });
    this.map.renderDoors(ctx, this.time);
    this.map.renderAnim(ctx, this.time, { x: cx, y: cy });
    for (const po of this.portals) po.render(ctx);
    this.renderGather(ctx); // 멀티 단체 입장 안내
    for (const h of this.hazards) h.render(ctx);
    for (const z of this.zones) z.render(ctx);
    for (const o of this.props) o.render(ctx, this);
    for (const pk of this.pickups) pk.render(ctx);
    for (const e of this.enemies) e.renderTelegraph(ctx);
    const actors = [...(this.cutscene ? this.enemies.filter((e) => e.state !== 'INTRO' || (this.cinematic && this.cinematic.landed && this.cinematic.boss === e)) : this.enemies), ...this.allies, this.player, ...this.peerActors(), ...this.coopActors()].sort((a, b) => a.y - b.y); // 등장 전 보스는 컷신 동안 숨김
    for (const a of actors) a.render(ctx);
    for (const pr of this.projectiles) pr.render(ctx);
    for (const z of this.zones) if (z.renderTop) z.renderTop(ctx);
    for (const o of this.props) if (o.renderTop) o.renderTop(ctx, this); // 말풍선 등
    const w = this.player.weapon;
    if (w && w.beamActive && w.beamEnd) {
      const b = w.beamEnd;
      ctx.strokeStyle = w.def.bulletColor; ctx.globalAlpha = 0.45 + 0.2 * Math.sin(this.time * 40); ctx.lineWidth = 5 + (w.focusK || 0) * 4;
      ctx.beginPath(); ctx.moveTo(b.sx, b.sy); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.globalAlpha = 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(b.sx, b.sy); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = w.def.bulletColor; ctx.fillRect(Math.round(b.x) - 2, Math.round(b.y) - 2, 4, 4);
    }
    for (const b of this.enemyBullets) b.render(ctx);
    this.effects.render(ctx);

    if (this.mode === 'lobby') {
      const dummy = this.enemies.find((e) => e.def.dummy);
      this.dpsLog = this.dpsLog.filter((d) => this.time - d.t < 3);
      if (dummy) {
        const dps = this.dpsLog.reduce((s, d) => s + d.a, 0) / 3;
        hudText(ctx, `DPS ${dps.toFixed(0)}`, Math.round(dummy.x), Math.round(dummy.y) - 26, '#ffd84a', 'center', 8);
      }
    }

    const t = this.interactTarget;
    if (t && this.player.state !== 'DEAD' && !this.overlay) {
      const label = t instanceof Pickup ? `[E] ${t.def.name}${t.lv ? ' +' + t.lv : ''} (${RARITY_NAME[t.def.rarity]})` : t.label(this);
      const color = t instanceof Pickup ? RARITY_COLOR[t.def.rarity] : t.labelColor;
      if (label) {
        ctx.font = "bold 9px 'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";
        const tw = Math.ceil(ctx.measureText(label).width), lx = Math.round(t.x), ly = Math.round(t.y) - 38;
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(lx - tw / 2 - 4, ly - 2, tw + 8, 14);
        ctx.strokeStyle = color; ctx.globalAlpha = 0.5; ctx.strokeRect(lx - tw / 2 - 3.5, ly - 1.5, tw + 7, 13); ctx.globalAlpha = 1;
        hudText(ctx, label, lx, ly, color, 'center', 9);
        if (t instanceof Pickup) { const tr = weaponTraits(t.def), w2 = Math.ceil(ctx.measureText(tr).width * 0.85);
          ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(lx - w2 / 2 - 4, ly + 12, w2 + 8, 11); hudText(ctx, tr, lx, ly + 13, '#e0d0a0', 'center', 8); }
      }
    }

    ctx.setTransform(R, 0, 0, R, 0, 0);
    this.renderScreenFx(ctx, cx, cy);
    if (this.cutscene) HUD.cutscene(ctx, this); else this.hud.render(ctx, this); // 컷신 중에는 HUD 대신 검은 띠와 대사
    if (this.coop) this.coopStatusDraw(ctx); // 멀티 연결 상태 (끊김·다시 연결·방장 기다림)
    if (this.cutin && !this.overlay) HUD.cutin(ctx, this); else if (this.overlay) this.cutin = null; // 최종 스킬·보구 컷인
    if (this.treasureToast) HUD.treasureToast(ctx, this); // 보구 획득 알림 (결과 화면 위에도 보임)

    /* 조준선은 진짜 마우스 커서로 그림 (InputManager.setupCursor) — 늦게 따라오지 않게 */

    if (this.transition) {
      const k = this.transition.t < 0.45 ? this.transition.t / 0.45 : 1 - (this.transition.t - 0.45) / 0.45;
      ctx.fillStyle = `rgba(0,0,0,${clamp(k, 0, 1)})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }
}
