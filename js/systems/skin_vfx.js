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

function drawLegendarySkinWeave(ctx,id,x,y,time){
  const c=SKIN_VFX[id];
  if(!c||!['skin_abyss_knight','skin_star_paladin','skin_void_empress','skin_crimson_lotus'].includes(id))return;
  const t=time*0.9+(id==='skin_star_paladin'?0.7:id==='skin_void_empress'?1.6:id==='skin_crimson_lotus'?2.3:0);
  ctx.save();
  // 캐릭터 발밑의 바닥에 눕힌 원형 마법진. 몸이나 화면을 감싸는 궤도는 그리지 않는다.
  ctx.translate(Math.round(x),Math.round(y)+9);
  ctx.globalCompositeOperation='lighter';
  ctx.lineCap='round';
  ctx.lineJoin='round';

  const pulse=0.88+0.12*Math.sin(time*3.4);
  ctx.globalAlpha=0.11*pulse;
  ctx.fillStyle=c.main;
  ctx.beginPath();ctx.ellipse(0,0,14.5,4.3,0,0,Math.PI*2);ctx.fill();

  // 바닥에 고정된 두 겹의 얇은 원과 끊어진 외곽 고리
  ctx.globalAlpha=0.78*pulse;ctx.strokeStyle=c.main;ctx.lineWidth=1.15;
  ctx.beginPath();ctx.ellipse(0,0,15.5,4.8,0,0,Math.PI*2);ctx.stroke();
  ctx.globalAlpha=0.48*pulse;ctx.strokeStyle=c.soft;ctx.lineWidth=0.8;
  ctx.beginPath();ctx.ellipse(0,0,10.5,3.05,0,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<4;i++){
    const a=t*0.42+i*Math.PI/2;
    ctx.globalAlpha=0.72;ctx.strokeStyle=c.soft;ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(0,0,17.2,5.35,0,a,a+0.38);ctx.stroke();
  }

  // 원 둘레를 따라 흐르는 빛점. 경로는 항상 바닥 원형으로 유지된다.
  for(let i=0;i<3;i++){
    const a=-t*0.9+i*Math.PI*2/3;
    const px=Math.cos(a)*15.5,py=Math.sin(a)*4.8;
    ctx.fillStyle=i===0?c.soft:c.main;ctx.globalAlpha=i===0?0.98:0.68;
    ctx.fillRect(Math.round(px)-1,Math.round(py)-1,2,2);
  }

  if(id==='skin_abyss_knight'){
    // 심연: 네 방향의 봉인 못과 짧은 균열선
    ctx.strokeStyle=c.soft;ctx.globalAlpha=0.78;ctx.lineWidth=1;
    for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
      const px=Math.cos(a)*12.2,py=Math.sin(a)*3.7;
      ctx.beginPath();ctx.moveTo(px-1.5,py);ctx.lineTo(px+1.5,py);ctx.stroke();
      ctx.fillStyle=c.main;ctx.fillRect(Math.round(px),Math.round(py)-1,1,2);
    }
  }else if(id==='skin_star_paladin'){
    // 성좌: 원 안쪽의 네 별빛 표식
    ctx.fillStyle=c.soft;ctx.globalAlpha=0.9;
    for(let i=0;i<4;i++){
      const a=t*0.18+i*Math.PI/2,px=Math.cos(a)*8.5,py=Math.sin(a)*2.4;
      ctx.fillRect(Math.round(px)-1,Math.round(py),3,1);
      ctx.fillRect(Math.round(px),Math.round(py)-1,1,3);
    }
  }else if(id==='skin_void_empress'){
    // 공허: 중심을 향해 열린 두 개의 초승달 호
    ctx.strokeStyle=c.soft;ctx.lineWidth=1.1;ctx.globalAlpha=0.82;
    ctx.beginPath();ctx.ellipse(0,0,7.2,2.05,0,t*0.22,t*0.22+Math.PI*1.15);ctx.stroke();
    ctx.beginPath();ctx.ellipse(0,0,7.2,2.05,0,t*0.22+Math.PI,t*0.22+Math.PI*2.15);ctx.stroke();
  }else if(id==='skin_crimson_lotus'){
    // 홍련: 원 둘레에 고정된 세 꽃잎 문장
    for(let i=0;i<3;i++){
      const a=t*0.12+i*Math.PI*2/3,px=Math.cos(a)*11,py=Math.sin(a)*3.35;
      ctx.save();ctx.translate(Math.round(px),Math.round(py));ctx.rotate(a+Math.PI/2);
      ctx.fillStyle=i===1?c.soft:c.main;ctx.globalAlpha=0.86;
      ctx.beginPath();ctx.ellipse(0,0,2.1,1.05,0,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
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
