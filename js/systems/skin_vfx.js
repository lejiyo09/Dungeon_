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
  const colors=SKIN_VFX[id];
  if(!colors||!['skin_abyss_knight','skin_star_paladin','skin_void_empress','skin_crimson_lotus'].includes(id))return;
  // 뒤쪽 반쪽은 무기/몸 아래, 앞쪽 반쪽은 몸 위에 그린다.
  // 시간에 따라 위상과 곡률을 크게 바꿔 16x20 도트 크기에서도 움직임이 읽히게 한다.
  const phase=time*2.8;
  const line=(path,color,width,alpha)=>{
    ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();
    for(let i=0;i<=24;i++){
      const u=i/24,pt=path(u);
      if(i===0)ctx.moveTo(pt.x,pt.y);else ctx.lineTo(pt.x,pt.y);
    }
    ctx.stroke();ctx.restore();
  };
  const strand=(u,offset,rate,dir)=>{
    const a=u*Math.PI*3+phase*dir+offset;
    return {
      x:Math.sin(a)*(9+1.7*Math.sin(time*1.9+u*7+offset)),
      y:-12+u*19+Math.cos(a*0.72+time*1.4)*1.8
    };
  };
  ctx.save();ctx.translate(x,y-4);
  ctx.globalCompositeOperation='lighter';
  ctx.globalAlpha=0.94;

  // 전면/후면 분리: 캐릭터 실루엣을 감싸되 한쪽은 몸 뒤로 숨긴다.
  const isFront=(u,offset,dir)=>{
    const a=u*Math.PI*3+phase*dir+offset;
    return Math.cos(a)>0;
  };
  const drawSegmented=(offset,dir,color,soft,width,alpha)=>{
    let drawing=false;
    ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;
    ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
    for(let i=0;i<=48;i++){
      const u=i/48,pt=strand(u,offset,0,dir),visible=isFront(u,offset,dir);
      if(visible===front){
        if(!drawing){ctx.moveTo(pt.x,pt.y);drawing=true;}else ctx.lineTo(pt.x,pt.y);
      }else if(drawing){ctx.stroke();ctx.beginPath();drawing=false;}
    }
    if(drawing)ctx.stroke();
    ctx.restore();

    // 밝은 점이 같은 궤적을 따라 이동
    const beadU=((time*0.48+offset/Math.PI/2)%1+1)%1;
    const p=strand(beadU,offset,0,dir);
    if(isFront(beadU,offset,dir)===front){
      ctx.save();ctx.globalAlpha*=0.98;ctx.fillStyle=soft;
      ctx.fillRect(Math.round(p.x)-1,Math.round(p.y)-1,3,3);
      ctx.fillStyle=color;ctx.fillRect(Math.round(p.x)+1,Math.round(p.y)+1,2,1);
      ctx.restore();
    }
  };

  if(id==='skin_abyss_knight'){
    // 깨진 청록 균열이 갑옷 주위를 타고 흐르며 짧게 번쩍인다.
    drawSegmented(0,1,colors.main,colors.soft,2,0.94);
    drawSegmented(1.3,-1,colors.soft,colors.main,1.1,0.52);
    const flash=Math.sin(time*7.5);
    if(flash>0.35){ctx.globalAlpha=0.95;ctx.fillStyle=colors.soft;ctx.fillRect(Math.round(Math.sin(phase*1.4)*10)-1,Math.round(Math.cos(phase)*7)-2,3,3);}
  }else if(id==='skin_star_paladin'){
    // 금빛 성좌의 실이 몸을 감싸고, 별빛 조각이 궤도를 따라 이동한다.
    drawSegmented(0.2,1,colors.main,colors.soft,1.8,0.9);
    drawSegmented(2.5,-1,colors.soft,colors.main,1,0.55);
    const a=phase*0.9,sx=Math.round(Math.cos(a)*9),sy=Math.round(Math.sin(a*1.3)*8)-3;
    if((front&&Math.cos(a)>0)||(!front&&Math.cos(a)<=0)){
      ctx.fillStyle=colors.soft;ctx.fillRect(sx,sy,3,1);ctx.fillRect(sx+1,sy-1,1,3);
    }
  }else if(id==='skin_void_empress'){
    // 보랏빛 두 가닥이 반대 방향으로 교차하는 이중 나선.
    drawSegmented(0,1,colors.main,colors.soft,1.9,0.88);
    drawSegmented(Math.PI,-1,colors.soft,colors.main,1.6,0.82);
    const a=-phase*1.1;
    if((front&&Math.cos(a)>0)||(!front&&Math.cos(a)<=0)){
      ctx.fillStyle=colors.soft;ctx.fillRect(Math.round(Math.sin(a)*9)-1,Math.round(Math.cos(a)*7)-4,3,3);
    }
  }else if(id==='skin_crimson_lotus'){
    // 홍련의 붉은 비단끈과 꽃잎 세 장이 몸을 따라 흐른다.
    drawSegmented(0.8,1,colors.main,colors.soft,2,0.88);
    drawSegmented(2.9,-1,colors.soft,colors.main,1,0.5);
    for(let i=0;i<3;i++){
      const u=((time*0.38+i/3)%1+1)%1,p=strand(u,0.8,0,1);
      if(isFront(u,0.8,1)===front){
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(phase+u*3);
        ctx.fillStyle=i===1?colors.soft:colors.main;ctx.globalAlpha=0.9;
        ctx.beginPath();ctx.ellipse(0,0,2.8,1.4,0,0,Math.PI*2);ctx.fill();ctx.restore();
      }
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
