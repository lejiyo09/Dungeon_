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

function drawLegendarySkinWeave(ctx,id,x,y,time,front){
  const s=SKIN_VFX[id];
  if(!s||!['skin_abyss_knight','skin_star_paladin','skin_void_empress','skin_crimson_lotus'].includes(id))return;
  ctx.save();ctx.translate(x,y-4);ctx.globalAlpha=0.62+0.16*Math.sin(time*3.2);ctx.lineWidth=1;ctx.lineCap='round';ctx.strokeStyle=s.main;ctx.fillStyle=s.soft;
  const phase=time*1.45;
  if(id==='skin_abyss_knight'){
    ctx.beginPath();if(front){ctx.moveTo(-10,5);ctx.quadraticCurveTo(-2,11,5,4);ctx.quadraticCurveTo(11,-1,7,-8);}else{ctx.moveTo(-8,-8);ctx.quadraticCurveTo(-12,-1,-6,4);ctx.quadraticCurveTo(0,10,9,5);}ctx.stroke();
    ctx.beginPath();ctx.moveTo(-8,-4);ctx.lineTo(-4,-7);ctx.lineTo(0,-4);ctx.stroke();ctx.fillRect(front?6:-9,front?3:-8,2,2);
  }else if(id==='skin_star_paladin'){
    ctx.beginPath();if(front){ctx.moveTo(-10,4);ctx.quadraticCurveTo(-2,0,0,-7);ctx.quadraticCurveTo(4,-12,10,-5);}else{ctx.moveTo(-9,-7);ctx.quadraticCurveTo(-3,-11,1,-5);ctx.quadraticCurveTo(4,2,10,5);}ctx.stroke();
    const sx=Math.round(Math.cos(phase)*8),sy=Math.round(Math.sin(phase*1.3)*5)-3;ctx.fillRect(sx,sy,2,2);ctx.fillRect(sx+1,sy-2,1,1);
  }else if(id==='skin_void_empress'){
    ctx.beginPath();if(front){ctx.moveTo(-10,5);ctx.bezierCurveTo(-4,-1,4,10,10,1);}else{ctx.moveTo(-9,-7);ctx.bezierCurveTo(-3,-12,4,-2,9,-6);}ctx.stroke();
    ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(-5,-3);ctx.lineTo(-2,0);ctx.stroke();ctx.fillRect(front?7:-8,front?-7:5,2,2);
  }else if(id==='skin_crimson_lotus'){
    ctx.beginPath();if(front){ctx.moveTo(-10,-2);ctx.quadraticCurveTo(-1,8,4,2);ctx.quadraticCurveTo(8,-2,10,-7);}else{ctx.moveTo(-9,6);ctx.quadraticCurveTo(-4,-3,1,-6);ctx.quadraticCurveTo(5,-8,9,-2);}ctx.stroke();
    const a=phase+(front?0:Math.PI);ctx.save();ctx.translate(Math.cos(a)*9,Math.sin(a)*7-3);ctx.rotate(a);ctx.beginPath();ctx.ellipse(0,0,2,1,0,0,Math.PI*2);ctx.fill();ctx.restore();
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
