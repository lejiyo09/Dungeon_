/* ── Legendary skin pixel procedures (16×20) ──
   각 스킨은 기본 직업색을 물려받지 않고 독립 팔레트를 사용한다.
   P 좌표는 16×20 도트 그리드 기준. */
Object.assign(HERO_PROCS, {
  abyssKnight: {
    pal: {
      a:'#294653', b:'#142832', c:'#547783', m:'#b4cbd0',
      l:'#243c49', d:'#101c27', h:'#34d9c8', g:'#14535d',
      r:'#b2fff0', y:'#c49b62', s:'#dbc8b9', e:'#83fff0'
    },
    proc:(P,f)=>{
      P.tri(2,13,14,13,8,19,'g'); P.rect(3,11,10,4,'g');
      heroLegs(P,f,'l','d');
      P.ell(3.5,9.5,2.5,2,'m'); P.ell(12.5,9.5,2.5,2,'m');
      P.rect(2,11,2,3,'c'); P.rect(12,11,2,3,'c');
      P.rect(4,8,8,8,'m'); P.rect(5,9,6,6,'a');
      P.rect(6,10,4,1,'c'); P.rect(6,12,4,3,'b');
      P.rect(7,11,2,5,'h'); P.px(6,12,'r'); P.px(9,14,'r');
      P.rect(5,15,6,1,'y');
      P.rect(5,2,6,6,'m'); P.rect(6,3,4,4,'b');
      P.tri(5,4,6,4,2,0,'c'); P.tri(10,4,11,4,14,0,'c');
      P.rect(6,5,4,1,'k'); P.px(6,6,'h'); P.px(9,6,'h');
      P.rect(7,1,2,2,'h'); P.px(8,0,'r');
      if(f){ P.px(3,18,'h'); P.px(12,17,'h'); }
    }
  },
  starPaladin: {
    pal: {
      a:'#e9e5d8', b:'#a9b1c2', c:'#fff8e9', m:'#c5d2e1',
      l:'#8c9ab1', d:'#495a78', h:'#f6d675', g:'#9c7434',
      r:'#9bb7d8', y:'#ffe9a0', s:'#f0c9ad', e:'#6da9e2'
    },
    proc:(P,f)=>{
      P.tri(2,12,14,12,8,19,'r'); P.rect(4,11,8,4,'g');
      heroLegs(P,f,'l','d');
      P.ell(3.5,9.5,2.5,2,'y'); P.ell(12.5,9.5,2.5,2,'y');
      P.px(3,9,'c'); P.px(12,9,'c');
      P.rect(4,8,8,8,'m'); P.rect(5,9,6,6,'a');
      P.rect(6,10,4,5,'c'); P.rect(7,10,2,5,'y');
      P.rect(6,12,4,1,'r'); P.px(8,11,'y');
      P.rect(4,15,8,1,'g');
      P.rect(5,2,6,6,'m'); P.rect(6,4,4,4,'s');
      P.rect(5,2,6,2,'c'); P.rect(6,5,1,1,'e'); P.rect(9,5,1,1,'e');
      P.rect(5,1,6,1,'y'); P.px(8,0,'y');
      P.tri(5,3,6,3,4,0,'y'); P.tri(10,3,11,3,12,0,'y');
      P.tri(1,9,4,9,2,6,'c'); P.tri(12,9,15,9,14,6,'c');
      if(f){ P.px(4,18,'y'); P.px(11,17,'y'); }
    }
  },
  voidEmpress: {
    pal: {
      a:'#34213f', b:'#1b1027', c:'#604573', m:'#a996bd',
      l:'#34203e', d:'#1b1224', h:'#d16bff', g:'#63358a',
      r:'#f4d8ff', y:'#c89be8', s:'#edc6b9', e:'#ff9cff'
    },
    proc:(P,f)=>{
      P.tri(1,13,15,13,8,19,'g'); P.tri(2,14,7,14,5,19,'h'); P.tri(9,14,14,14,11,19,'h');
      P.rect(2,10,3,5,'b'); P.rect(11,10,3,5,'b');
      heroLegs(P,f,'l','d');
      P.rect(4,9,8,7,'a'); P.rect(5,10,6,5,'b');
      P.tri(4,14,12,14,8,19,'a');
      P.rect(3,10,2,4,'g'); P.rect(11,10,2,4,'g');
      P.rect(7,10,2,4,'h'); P.px(8,11,'r'); P.px(8,13,'y');
      P.rect(5,15,6,1,'y');
      P.rect(4,3,2,8,'g'); P.rect(10,3,2,8,'g');
      P.rect(5,3,6,5,'m'); P.rect(6,4,4,4,'s');
      P.px(6,6,'e'); P.px(9,6,'e'); P.rect(6,7,4,1,'b');
      P.rect(5,2,6,1,'h'); P.tri(5,3,6,3,4,0,'h'); P.tri(10,3,11,3,12,0,'h');
      P.px(8,0,'r'); P.px(7,1,'y'); P.px(9,1,'y');
      if(f){ P.px(3,17,'h'); P.px(12,18,'r'); }
    }
  },
  crimsonLotus: {
    pal: {
      a:'#3a1b2c', b:'#1d1020', c:'#714057', m:'#d5b8ad',
      l:'#422138', d:'#21131f', h:'#ff5c83', g:'#98264b',
      r:'#ffd0dd', y:'#e9bd70', s:'#f1cdb9', e:'#ff9db7'
    },
    proc:(P,f)=>{
      P.tri(3,12,8,14,2,19,'g'); P.tri(8,14,13,12,15,19,'h');
      heroLegs(P,f,'l','d');
      P.rect(5,9,6,7,'a'); P.rect(6,10,4,5,'b');
      P.tri(3,13,8,14,5,19,'g'); P.tri(8,14,13,13,11,19,'h');
      P.rect(2,10,3,4,'g'); P.rect(11,10,3,4,'g');
      P.rect(6,12,4,1,'y'); P.px(8,11,'r');
      P.rect(6,15,4,1,'m');
      P.rect(5,4,6,5,'m'); P.rect(6,5,4,3,'s');
      P.px(6,6,'e'); P.px(9,6,'e'); P.rect(6,8,4,1,'g');
      P.rect(4,3,2,7,'b'); P.rect(10,3,2,7,'b');
      P.rect(5,2,6,2,'b'); P.tri(5,3,10,3,8,0,'b');
      P.px(4,4,'h'); P.px(11,4,'h');
      P.px(8,1,'y'); P.px(7,1,'h'); P.px(9,1,'h'); P.px(8,0,'r');
      P.px(1,13,'r'); P.px(14,13,'r');
      if(f){ P.px(3,18,'h'); P.px(12,17,'r'); }
    }
  },
  moonShrine:{pal:{a:'#d6e8ef',b:'#9aafc4',c:'#f6fbff',m:'#c9e7f5',l:'#8da7c4',d:'#58728c',h:'#55c9eb',g:'#277ba8',r:'#fff0bd'},proc:(P,f)=>{
    robeHem(P,f,'g');P.rect(4,10,8,9,'a');P.tri(2,19,14,19,8,11,'a');P.rect(3,18,10,1,'r');P.rect(1,11,3,4,'a');P.rect(12,11,3,4,'a');P.rect(6,8,4,2,'s');P.px(6,8,'k');P.px(9,8,'k');P.rect(5,6,6,2,'m');P.rect(6,4,4,3,'s');P.px(6,5,'h');P.px(9,5,'h');P.tri(3,7,13,7,8,0,'h');P.px(8,1,'r');P.rect(6,12,4,1,'r');
  }},
  arcaneIdol:{pal:{a:'#bd9ad9',b:'#795c98',c:'#ead4fb',m:'#d9b8f2',l:'#b49acb',d:'#795c98',h:'#c77dff',g:'#7542aa',r:'#fff6ff'},proc:(P,f)=>{
    heroLegs(P,f,'l','d');P.rect(4,9,8,7,'a');P.tri(3,14,13,14,8,19,'a');P.rect(2,10,3,4,'r');P.rect(11,10,3,4,'r');P.rect(5,5,6,4,'s');P.px(6,6,'h');P.px(9,6,'h');P.rect(5,2,6,3,'m');P.px(4,3,'h');P.px(11,3,'h');P.rect(6,10,4,1,'r');P.px(3,9,'h');P.px(12,9,'h');P.rect(12,12,1,5,'m');P.px(13,11,'r');
  }},
  dragonRonin:{pal:{a:'#70302c',b:'#2b1117',c:'#bc6454',m:'#c8b0a0',l:'#3c1c20',d:'#2b1117',h:'#ef6042',g:'#89302b',r:'#ffb34f'},proc:(P,f)=>{
    heroLegs(P,f,'l','d');P.rect(4,9,8,7,'a');P.rect(3,10,2,5,'g');P.rect(11,10,2,5,'g');P.rect(4,3,8,5,'m');P.tri(4,4,7,4,1,0,'h');P.tri(9,4,12,4,15,0,'h');P.rect(6,5,4,2,'k');P.px(6,6,'r');P.px(9,6,'r');P.rect(5,9,6,5,'g');P.rect(7,10,2,4,'r');P.px(6,11,'h');P.px(9,12,'h');P.tri(2,15,14,15,8,19,'k');
  }},
  clockworkFox:{pal:{a:'#ad884d',b:'#67431f',c:'#e0bd7a',m:'#c8a15e',l:'#835323',d:'#67431f',h:'#78dbed',g:'#377b98',r:'#ffdf9a'},proc:(P,f)=>{
    heroLegs(P,f,'l','d');P.rect(4,9,8,7,'a');P.tri(3,14,13,14,8,18,'a');P.ell(4,4,2,3,'m');P.ell(12,4,2,3,'m');P.tri(4,5,7,5,3,0,'h');P.tri(9,5,12,5,13,0,'h');P.rect(5,4,6,4,'s');P.px(6,6,'h');P.px(9,6,'h');P.rect(5,9,6,2,'m');P.rect(7,9,2,4,'r');P.rect(2,12,2,3,'g');P.rect(12,12,2,3,'g');P.px(1,15,'h');P.px(14,15,'h');
  }}
});
