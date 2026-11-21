/* ── Legendary skin pixel procedures (16×20) ── */
Object.assign(HERO_PROCS, {
  abyssKnight:{pal:{m:'#a9c8ce',l:'#233d49',d:'#0a1824',h:'#26e6ce',g:'#126c72',r:'#a5f8ed'},proc:(P,f)=>{
    P.rect(2,9,12,8,'g');heroLegs(P,f,'l','d');P.rect(4,8,8,8,'m');P.rect(5,9,6,6,'a');P.rect(7,10,2,5,'h');P.rect(6,11,4,1,'r');P.ell(3,9,2,2,'m');P.ell(13,9,2,2,'m');P.rect(2,11,2,4,'g');P.rect(12,11,2,4,'g');P.rect(5,2,6,6,'m');P.tri(4,3,7,3,2,0,'m');P.tri(9,3,12,3,14,0,'m');P.rect(6,5,4,2,'k');P.px(6,6,'h');P.px(9,6,'h');P.rect(7,0,2,2,'r');if(f){P.px(3,18,'h');P.px(13,17,'h');}
  }},
  starPaladin:{pal:{m:'#dce7f5',l:'#8fa0bf',d:'#657a9e',h:'#eac85d',g:'#a77c28',r:'#fff1a6'},proc:(P,f)=>{
    P.rect(3,9,10,8,'g');heroLegs(P,f,'l','d');P.rect(4,8,8,8,'m');P.rect(5,9,6,6,'a');P.tri(3,15,13,15,8,19,'a');P.rect(7,10,2,5,'h');P.rect(6,11,4,1,'r');P.ell(3,9,2,2,'m');P.ell(13,9,2,2,'m');P.rect(5,2,6,6,'m');P.rect(6,3,4,4,'r');P.px(7,5,'h');P.px(9,5,'h');P.rect(4,1,8,1,'h');P.px(8,0,'r');P.px(2,12,'h');P.px(13,12,'h');
  }},
  voidEmpress:{pal:{m:'#b9a4d8',l:'#2b1b3c',d:'#21132c',h:'#c35cff',g:'#6c2f9b',r:'#f4b7ff'},proc:(P,f)=>{
    P.rect(3,9,10,9,'g');P.tri(1,16,15,16,8,19,'a');P.rect(4,9,8,7,'a');P.rect(2,11,3,5,'a');P.rect(11,11,3,5,'a');P.rect(5,2,6,6,'k');P.tri(5,3,11,3,8,0,'h');P.rect(6,5,4,3,'m');P.px(6,6,'h');P.px(9,6,'h');P.rect(7,11,2,5,'h');P.tri(1,11,4,9,3,15,'g');P.tri(12,9,15,11,13,16,'g');P.rect(7,0,2,2,'r');if(f){P.px(2,18,'h');P.px(14,17,'h');}
  }},
  crimsonLotus:{pal:{m:'#e7b5c3',l:'#4c1d2d',d:'#3a1424',h:'#ff527f',g:'#a51c45',r:'#ffd5e1'},proc:(P,f)=>{
    heroLegs(P,f,'l','d');P.rect(4,9,8,7,'a');P.tri(3,14,13,14,8,19,'a');P.px(4,16,'h');P.px(12,16,'h');P.rect(2,10,2,5,'g');P.rect(12,10,2,5,'g');P.rect(5,5,6,4,'m');P.rect(6,6,4,2,'s');P.rect(5,2,6,3,'k');P.tri(4,3,12,3,8,0,'h');P.px(7,6,'h');P.px(9,6,'h');P.rect(4,9,8,1,'r');P.px(8,10,'r');P.line(2,9,0,12,'h');P.line(13,9,15,12,'h');
  }},
  moonShrine:{pal:{m:'#c9e7f5',l:'#8da7c4',d:'#58728c',h:'#55c9eb',g:'#277ba8',r:'#fff0bd'},proc:(P,f)=>{
    robeHem(P,f,'g');P.rect(4,10,8,9,'a');P.tri(2,19,14,19,8,11,'a');P.rect(3,18,10,1,'r');P.rect(1,11,3,4,'a');P.rect(12,11,3,4,'a');P.rect(6,8,4,2,'s');P.px(6,8,'k');P.px(9,8,'k');P.rect(5,6,6,2,'m');P.rect(6,4,4,3,'s');P.px(6,5,'h');P.px(9,5,'h');P.tri(3,7,13,7,8,0,'h');P.px(8,1,'r');P.rect(6,12,4,1,'r');
  }},
  arcaneIdol:{pal:{m:'#d9b8f2',l:'#b49acb',d:'#795c98',h:'#c77dff',g:'#7542aa',r:'#fff6ff'},proc:(P,f)=>{
    heroLegs(P,f,'l','d');P.rect(4,9,8,7,'a');P.tri(3,14,13,14,8,19,'a');P.rect(2,10,3,4,'r');P.rect(11,10,3,4,'r');P.rect(5,5,6,4,'s');P.px(6,6,'h');P.px(9,6,'h');P.rect(5,2,6,3,'m');P.px(4,3,'h');P.px(11,3,'h');P.rect(6,10,4,1,'r');P.px(3,9,'h');P.px(12,9,'h');P.rect(12,12,1,5,'m');P.px(13,11,'r');
  }},
  dragonRonin:{pal:{m:'#c8b0a0',l:'#3c1c20',d:'#2b1117',h:'#ef6042',g:'#89302b',r:'#ffb34f'},proc:(P,f)=>{
    heroLegs(P,f,'l','d');P.rect(4,9,8,7,'a');P.rect(3,10,2,5,'g');P.rect(11,10,2,5,'g');P.rect(4,3,8,5,'m');P.tri(4,4,7,4,1,0,'h');P.tri(9,4,12,4,15,0,'h');P.rect(6,5,4,2,'k');P.px(6,6,'r');P.px(9,6,'r');P.rect(5,9,6,5,'g');P.rect(7,10,2,4,'r');P.px(6,11,'h');P.px(9,12,'h');P.tri(2,15,14,15,8,19,'k');
  }},
  clockworkFox:{pal:{m:'#c8a15e',l:'#835323',d:'#67431f',h:'#78dbed',g:'#377b98',r:'#ffdf9a'},proc:(P,f)=>{
    heroLegs(P,f,'l','d');P.rect(4,9,8,7,'a');P.tri(3,14,13,14,8,18,'a');P.ell(4,4,2,3,'m');P.ell(12,4,2,3,'m');P.tri(4,5,7,5,3,0,'h');P.tri(9,5,12,5,13,0,'h');P.rect(5,4,6,4,'s');P.px(6,6,'h');P.px(9,6,'h');P.rect(5,9,6,2,'m');P.rect(7,9,2,4,'r');P.rect(2,12,2,3,'g');P.rect(12,12,2,3,'g');P.px(1,15,'h');P.px(14,15,'h');
  }}
});
