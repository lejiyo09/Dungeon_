/* Legendary skin movement cosmetics: subtle steps + one dash signature. */
const LEGENDARY_SKIN_VFX = {
  skin_abyss_knight: { main:'#36d8c9', soft:'#8ff6e9', step:'#49cabc', dark:'#1c686a' },
  skin_star_paladin: { main:'#e8c96b', soft:'#fff1bd', step:'#d9bd78', dark:'#9b7b3c' },
  skin_void_empress: { main:'#b77ae5', soft:'#e3b9ff', step:'#ab78cc', dark:'#633b82' },
  skin_crimson_lotus: { main:'#eb557e', soft:'#ffc0d0', step:'#d75a79', dark:'#84304f' }
};

Effects.prototype.skinFootstep = function(id, x, y, dx, dy) {
  const s = LEGENDARY_SKIN_VFX[id];
  if (!s) return;
  const side = (Math.random() < 0.5 ? -1 : 1);
  const sx = -dy * side * 1.6, sy = dx * side * 1.1;
  this.part(x + sx, y + sy, -dx * 5 + sx * 2, -dy * 5 + sy * 2 + 5,
    { color:s.step, life:0.24, size:1.35, size2:0.15, drag:5, grav:8, shape:'circle' });
  this.part(x - sx, y - sy, -dx * 3 - sx, -dy * 3 - sy + 4,
    { color:s.dark, life:0.18, size:1, size2:0, drag:6, grav:7 });
  if (Math.random() < 0.35) {
    this.part(x - dx * 2, y - dy * 2, -dx * 9, -dy * 9 - 4,
      { color:s.soft, life:0.16, size:1, size2:0, drag:7, add:true });
  }
};

Effects.prototype.skinDash = function(id, x, y, dx=1, dy=0) {
  const s = LEGENDARY_SKIN_VFX[id];
  if (!s) return;
  this.push({
    kind:'skinDash', id, x, y, angle:Math.atan2(dy, dx),
    color:s.main, accent:s.soft, t:0, life:0.28, opacity:0.32
  });
  for (let i=0;i<4;i++) {
    const back = 4 + i * 3, spread = (Math.random() - 0.5) * 5;
    this.part(x - dx * back - dy * spread, y - dy * back + dx * spread,
      -dx * (18 + i * 3) + dy * spread * 2,
      -dy * (18 + i * 3) - dx * spread * 2,
      { color:i % 2 ? s.main : s.soft, life:0.16 + i * 0.025,
        size:1.5, size2:0, drag:5, add:i===0 });
  }
};
