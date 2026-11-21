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

function skinWeaveCubic(p0,p1,p2,p3,u){
  const v=1-u;
  return {
    x:v*v*v*p0.x+3*v*v*u*p1.x+3*v*u*u*p2.x+u*u*u*p3.x,
    y:v*v*v*p0.y+3*v*v*u*p1.y+3*v*u*u*p2.y+u*u*u*p3.y
  };
}
function drawSkinWeaveRibbon(ctx,points,time,phase,color,soft){
  const [p0,p1,p2,p3]=points;
  ctx.save();
  ctx.lineCap='round';ctx.lineJoin='round';
  ctx.strokeStyle=color;ctx.lineWidth=1.15;ctx.globalAlpha*=0.9;
  ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.bezierCurveTo(p1.x,p1.y,p2.x,p2.y,p3.x,p3.y);ctx.stroke();

  // 선을 따라 움직이는 빛의 흐름. 후광이 아니라 선 위를 짧은 광맥이 지나간다.
  ctx.strokeStyle=soft;ctx.lineWidth=1.35;ctx.globalAlpha*=0.78;
  ctx.setLineDash([2.4,5.2]);ctx.lineDashOffset=-(time*7.5+phase*5);
  ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.bezierCurveTo(p1.x,p1.y,p2.x,p2.y,p3.x,p3.y);ctx.stroke();
  ctx.setLineDash([]);

  const u=((time*0.42+phase)%1+1)%1, bead=skinWeaveCubic(p0,p1,p2,p3,u);
  ctx.globalAlpha=0.95;ctx.fillStyle=soft;
  ctx.fillRect(Math.round(bead.x)-1,Math.round(bead.y)-1,2,2);
  ctx.fillStyle=color;
  ctx.fillRect(Math.round(bead.x)+1,Math.round(bead.y),1,1);
  ctx.restore();
}
function drawLegendarySkinWeave(ctx,id,x,y,time,front){
  const s=SKIN_VFX[id];
  if(!s||!['skin_abyss_knight','skin_star_paladin','skin_void_empress','skin_crimson_lotus'].includes(id))return;
  const phase=time*1.65+(front?1.7:0);
  const w=Math.sin(time*1.6+(front?0.9:0));
  const q=Math.cos(time*1.15+(front?1.1:0));
  ctx.save();ctx.translate(x,y-4);
  ctx.globalAlpha=0.64+0.09*Math.sin(time*2.6);
  ctx.lineWidth=1;ctx.strokeStyle=s.main;ctx.fillStyle=s.soft;

  if(id==='skin_abyss_knight'){
    // 심연: 균열이 갑옷의 어깨에서 허리를 향해 꿈틀거리며 이어진다.
    const pts=front
      ? [{x:-10,y:5},{x:-8+w*1.4,y:-3},{x:5+q,y:10+w*1.2},{x:10,y:-5+q*1.5}]
      : [{x:-9,y:-7},{x:-13+w,y:0+q},{x:0+q,y:9-w},{x:9,y:4+w}];
    drawSkinWeaveRibbon(ctx,pts,time,0.1,s.main,s.soft);
    ctx.globalAlpha*=0.8;ctx.beginPath();
    ctx.moveTo(-8+w,-4+q);ctx.lineTo(-4, -7+w);ctx.lineTo(0+q,-4);ctx.stroke();
    ctx.fillRect(Math.round(Math.sin(phase)*8)-8,Math.round(Math.cos(phase*0.8)*4)-5,2,2);
  }else if(id==='skin_star_paladin'){
    // 성좌: 별빛 실이 어깨와 가슴을 감고, 작은 성흔이 선을 따라 순환한다.
    const pts=front
      ? [{x:-10,y:4+w},{x:-6,y:-2+q*2},{x:3+w,y:-10},{x:10,y:-4+q}]
      : [{x:-9,y:-7},{x:-4-w,y:-11+q},{x:3,y:1+w},{x:10,y:5+q}];
    drawSkinWeaveRibbon(ctx,pts,time,0.34,s.main,s.soft);
    const a=phase*0.85+(front?0:Math.PI);
    const sx=Math.round(Math.cos(a)*8),sy=Math.round(Math.sin(a)*5)-3;
    ctx.fillRect(sx,sy,2,2);ctx.fillRect(sx+1,sy-2,1,1);
    ctx.globalAlpha*=0.72;ctx.beginPath();ctx.moveTo(sx-3,sy+3);ctx.lineTo(sx,sy-2);ctx.lineTo(sx+3,sy+3);ctx.stroke();
  }else if(id==='skin_void_empress'){
    // 공허: 두 겹의 보랏빛 실이 서로 엇갈리며 허리와 어깨를 천천히 휘감는다.
    const pts=front
      ? [{x:-10,y:5+q},{x:-5,y:-2+w*2},{x:3,y:10-q*2},{x:10,y:1+w}]
      : [{x:-9,y:-7+w},{x:-3,y:-12+q*2},{x:4,y:-1-w*2},{x:9,y:-6+q}];
    drawSkinWeaveRibbon(ctx,pts,time,0.56,s.main,s.soft);
    const pts2=front
      ? [{x:-8,y:-5-w},{x:-2,y:1+q*2},{x:5,y:-8-w},{x:9,y:-5+q}]
      : [{x:-8,y:5+q},{x:-3,y:-3-w*2},{x:4,y:9+q*2},{x:8,y:2-w}];
    ctx.globalAlpha*=0.7;drawSkinWeaveRibbon(ctx,pts2,time,0.82,s.soft,s.main);
  }else if(id==='skin_crimson_lotus'){
    // 홍련: 비단 리본처럼 흔들리는 선을 따라 꽃잎 세 장이 차례로 흘러간다.
    const pts=front
      ? [{x:-10,y:-2+w},{x:-3,y:8+q*2},{x:4,y:1-w*2},{x:10,y:-7+q}]
      : [{x:-9,y:6+q},{x:-4,y:-4-w*2},{x:3,y:-8+q*2},{x:9,y:-2+w}];
    drawSkinWeaveRibbon(ctx,pts,time,0.18,s.main,s.soft);
    for(let i=0;i<3;i++){
      const u=((time*0.34+i/3+(front?0.12:0.55))%1+1)%1;
      const p=skinWeaveCubic(...pts,u),angle=time*1.1+i*2.1+(front?0:Math.PI);
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);
      ctx.globalAlpha=0.74;ctx.fillStyle=i===1?s.soft:s.main;
      ctx.beginPath();ctx.ellipse(0,0,2.5,1.2,0,0,Math.PI*2);ctx.fill();
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
Effects.prototype.skinSkill=function(id,x,y,angle=0){
  if(!['skin_abyss_knight','skin_star_paladin','skin_void_empress','skin_crimson_lotus'].includes(id))return;
  const s=SKIN_VFX[id];this.push({kind:'skinSkill',id,x,y,angle,color:s.main,accent:s.soft,t:0,life:0.52,opacity:0.9});
};
