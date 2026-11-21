/* Skin VFX: floor footsteps, readable dash signatures, and subtle legendary magic threads. */
const SKIN_VFX={
  skin_abyss_knight:{main:'#43e5d4',soft:'#b2fff6',step:'#42cfc1'},
  skin_star_paladin:{main:'#ffdc75',soft:'#fff5c8',step:'#e9c86a'},
  skin_void_empress:{main:'#ca8aff',soft:'#f0d2ff',step:'#b77ae5'},
  skin_crimson_lotus:{main:'#ff648d',soft:'#ffc1d3',step:'#e75b83'},
  skin_moon_shrine:{main:'#67d8f4',soft:'#d5f7ff',step:'#88d8ef'},
  skin_arcane_idol:{main:'#d69bff',soft:'#ffe0ff',step:'#bd91e8'},
  skin_dragon_samurai:{main:'#ff7058',soft:'#ffd08a',step:'#d95a48'},
  skin_clockwork_fox:{main:'#70e4ee',soft:'#fff0b0',step:'#d8b66b'}
};

function legendaryOrbitPoint(id,t){
  const a=t*Math.PI*2;
  if(id==='skin_abyss_knight'){
    // 각진 파편 궤도: 고정된 불완전한 육각형 타원
    const r=1+0.08*Math.cos(a*6);
    return {x:11.8*Math.cos(a)*r,y:-4.2+5.4*Math.sin(a)*r};
  }
  if(id==='skin_star_paladin'){
    // 성좌 궤도: 네 개의 별 꼭짓점이 있는 기울어진 타원
    const r=1+0.18*Math.cos(a*4);
    const px=12.2*Math.cos(a)*r,py=5.2*Math.sin(a)*r,rot=-0.42;
    return {x:px*Math.cos(rot)-py*Math.sin(rot),y:-4.2+px*Math.sin(rot)+py*Math.cos(rot)};
  }
  if(id==='skin_void_empress'){
    // 공허 궤도: 세로로 긴 초승달형 타원
    const r=1+0.06*Math.sin(a*2);
    const px=7.7*Math.cos(a)*r,py=9.5*Math.sin(a)*r,rot=0.3;
    return {x:px*Math.cos(rot)-py*Math.sin(rot),y:-4.2+px*Math.sin(rot)+py*Math.cos(rot)};
  }
  // 홍련 궤도: 세 잎 연꽃을 닮은 일정한 꽃잎 곡선
  const r=1+0.2*Math.cos(a*3);
  return {x:11.3*Math.cos(a)*r,y:-4.1+5.7*Math.sin(a)*r};
}
function drawLegendarySkinWeave(ctx,id,x,y,time){
  const c=SKIN_VFX[id];
  if(!c||!['skin_abyss_knight','skin_star_paladin','skin_void_empress','skin_crimson_lotus'].includes(id))return;
  const speed=id==='skin_abyss_knight'?0.78:id==='skin_star_paladin'?0.52:id==='skin_void_empress'?0.4:0.65;
  const phase=((time*speed)%1+1)%1;
  const path=id==='skin_abyss_knight'?'broken-hex':id==='skin_star_paladin'?'star-orbit':id==='skin_void_empress'?'crescent-ellipse':'lotus-orbit';
  ctx.save();ctx.translate(x,y-4);ctx.globalCompositeOperation='lighter';
  // 고정 궤도 본선: 형태는 바뀌지 않고 은은하게 남아 경로가 읽힌다.
  ctx.beginPath();
  for(let i=0;i<=96;i++){const p=legendaryOrbitPoint(id,i/96);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}
  ctx.closePath();ctx.strokeStyle=c.main;ctx.lineWidth=1;ctx.globalAlpha=0.24;ctx.stroke();
  // 고정 궤도 위를 따라 이동하는 짧은 마력선. 몸을 나선으로 감거나 궤도를 변형하지 않는다.
  const drawMover=(offset,alpha,width,accent)=>{
    const count=15,span=0.16;
    ctx.beginPath();
    for(let i=0;i<=count;i++){
      const u=(phase+offset-i/count*span+1)%1,p=legendaryOrbitPoint(id,u);
      if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
    }
    ctx.strokeStyle=accent;ctx.lineWidth=width;ctx.lineCap='round';ctx.globalAlpha=alpha;ctx.stroke();
    const head=legendaryOrbitPoint(id,(phase+offset+1)%1);
    ctx.fillStyle=c.soft;ctx.globalAlpha=0.98;ctx.fillRect(Math.round(head.x)-1,Math.round(head.y)-1,3,3);
    const tail=legendaryOrbitPoint(id,(phase+offset-0.045+1)%1);
    ctx.fillStyle=c.main;ctx.globalAlpha=0.85;ctx.fillRect(Math.round(tail.x),Math.round(tail.y),2,2);
  };
  if(id==='skin_abyss_knight'){
    drawMover(0,0.98,2.1,c.soft);
    drawMover(0.49,0.55,1.2,c.main);
    // 궤도에 고정된 세 균열 표식은 움직이지 않고 빛만 맥동
    ctx.fillStyle=c.soft;ctx.globalAlpha=0.5+0.4*Math.sin(time*5);
    for(const u of [0.08,0.42,0.72]){const p=legendaryOrbitPoint(id,u);ctx.fillRect(Math.round(p.x)-1,Math.round(p.y)-1,2,2);}
  }else if(id==='skin_star_paladin'){
    drawMover(0,0.95,2,c.soft);
    const star=legendaryOrbitPoint(id,(phase+0.5)%1);
    ctx.fillStyle=c.soft;ctx.globalAlpha=0.95;ctx.fillRect(Math.round(star.x)-1,Math.round(star.y)-2,3,1);ctx.fillRect(Math.round(star.x),Math.round(star.y)-3,1,3);
  }else if(id==='skin_void_empress'){
    drawMover(0,0.92,2,c.soft);
    drawMover(0.5,0.6,1.1,c.main);
    // 공허의 작은 위성 두 개는 서로 반대 방향으로 같은 타원 궤도를 돈다.
    for(const off of [0.25,0.75]){const p=legendaryOrbitPoint(id,(phase+off)%1);ctx.fillStyle=c.soft;ctx.globalAlpha=0.9;ctx.fillRect(Math.round(p.x)-1,Math.round(p.y)-1,2,2);}
  }else if(id==='skin_crimson_lotus'){
    drawMover(0,0.96,2,c.soft);
    // 꽃잎 세 장은 같은 고정 꽃잎 궤도를 일정한 간격으로 공전한다.
    for(let i=0;i<3;i++){const p=legendaryOrbitPoint(id,(phase+i/3)%1),a=time*2+i*2.1;ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.rotate(a);ctx.fillStyle=i===1?c.soft:c.main;ctx.globalAlpha=0.9;ctx.beginPath();ctx.ellipse(0,0,2,1,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  }
  ctx.restore();
}

Effects.prototype.skinFootstep=function(id,x,y,dx,dy,side=1){
  const s=SKIN_VFX[id];if(!s)return;
  const ox=-dy*side*3.1,oy=dx*side*2.1;
  this.pushFloor({kind:'skinStep',id,x:x+ox,y:y+oy,angle:Math.atan2(dy,dx),color:s.step,accent:s.soft,t:0,life:0.72});
  this.part(x+ox,y+oy,-dx*7,-dy*7+5,{color:s.step,life:0.22,size:1.7,size2:0,drag:7,grav:9});
  if(Math.random()<0.55)this.part(x+ox,y+oy,-dx*12+dy*4,-dy*12-dx*4,{color:s.soft,life:0.18,size:1.1,size2:0,drag:8,add:true});
};
Effects.prototype.skinDash=function(id,x,y,dx=1,dy=0){
  const s=SKIN_VFX[id];if(!s)return;
  this.push({kind:'skinDash',id,x,y,angle:Math.atan2(dy,dx),color:s.main,accent:s.soft,t:0,life:0.24,opacity:0.92});
  for(let i=0;i<3;i++){const back=3+i*4,spread=(Math.random()-0.5)*5;
    this.part(x-dx*back-dy*spread,y-dy*back+dx*spread,-dx*(24+i*5)+dy*spread*2,-dy*(24+i*5)-dx*spread*2,
      {color:i===1?s.soft:s.main,life:0.2+i*0.025,size:2.1,size2:0,drag:5,add:i===1});}
};
Effects.prototype.skinWeapon=function(id,x,y,angle=0,kind='weapon'){
  const s=SKIN_VFX[id];if(!s||!['skin_abyss_knight','skin_star_paladin','skin_void_empress','skin_crimson_lotus'].includes(id))return;
  this.push({kind:'skinWeapon',id,x,y,angle,color:s.main,accent:s.soft,t:0,life:0.28,opacity:1,weaponType:kind});
  for(let i=0;i<5;i++){
    const a=angle+(Math.random()-0.5)*1.6,spd=32+Math.random()*42;
    this.part(x,y,Math.cos(a)*spd,Math.sin(a)*spd,{color:i%2?s.main:s.soft,life:0.16+Math.random()*0.12,size:1.6,size2:0,drag:6,add:true});
  }
};
Effects.prototype.skinSkill=function(id,x,y,angle=0){
  if(!['skin_abyss_knight','skin_star_paladin','skin_void_empress','skin_crimson_lotus'].includes(id))return;
  const s=SKIN_VFX[id];this.push({kind:'skinSkill',id,x,y,angle,color:s.main,accent:s.soft,t:0,life:0.72,opacity:1.15});
  for(let i=0;i<10;i++){const a=i*TAU/10+angle,r=7+(i%3)*2;
    this.part(x+Math.cos(a)*r,y+Math.sin(a)*r,Math.cos(a)*48,Math.sin(a)*48,
      {color:i%2?s.main:s.soft,life:0.26+Math.random()*0.12,size:2.2,size2:0,drag:5,add:true});}
};
