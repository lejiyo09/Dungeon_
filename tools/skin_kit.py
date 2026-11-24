from PIL import Image, ImageDraw, ImageFont
import json
FONT='/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'
F=lambda s: ImageFont.truetype(FONT,s)
OUT='/home/user/dungeon_/skin_kit/'
Z=4  # 게임 1픽셀 = 4×4
BG=(27,27,34,255); CELLBG=(0,0,0,255); GRID=(30,30,38,255)
A='/home/user/dungeon_/assets/'
def sheet(cols, rows, cw, ch, title, rowlabels, collabels, notes, sample=None, hand=None, pad=26, top=70):
  W=max(pad+len(cols)*(cw*Z+pad)+150, pad*2+int(max([F(13).getlength(n) for n in notes]+[0]))); H=top+len(rows)*(ch*Z+pad+18)+20+18*len(notes)
  im=Image.new('RGBA',(W,H),BG); d=ImageDraw.Draw(im)
  d.text((pad,14),title,font=F(20),fill=(255,216,74,255))
  d.text((pad,42),f'칸 1개 = 게임 {cw}×{ch}px  ·  이 그림에서는 {cw*Z}×{ch*Z}px (격자 1칸 = 게임 1픽셀)',font=F(13),fill=(200,200,210,255))
  boxes={}
  for r,rl in enumerate(rows):
    y=top+r*(ch*Z+pad+18)
    d.text((pad+len(cols)*(cw*Z+pad)+4,y+ch*Z//2-8),rl,font=F(14),fill=(160,220,255,255))
    for c,cl in enumerate(cols):
      x=pad+c*(cw*Z+pad)
      d.text((x,y-2),cl if r==0 or collabels=='all' else '',font=F(13),fill=(255,255,255,255))
      cy=y+18
      d.rectangle([x,cy,x+cw*Z-1,cy+ch*Z-1],fill=CELLBG)
      for gx in range(1,cw): d.line([(x+gx*Z,cy),(x+gx*Z,cy+ch*Z-1)],fill=GRID)
      for gy in range(1,ch): d.line([(x,cy+gy*Z),(x+cw*Z-1,cy+gy*Z)],fill=GRID)
      # 가운데 세로선 (점선)
      mx=x+cw*Z//2
      for yy in range(cy,cy+ch*Z,8): d.line([(mx,yy),(mx,yy+3)],fill=(60,160,200,255))
      # 발 기준선 (맨 아랫줄)
      d.rectangle([x,cy+ch*Z-Z,x+cw*Z-1,cy+ch*Z-1],outline=(220,70,70,255))
      if hand:
        hy=cy+ch*Z-Z*(hand[r] if isinstance(hand,list) else hand)
        d.line([(x-6,hy),(x+2,hy)],fill=(255,216,74,255),width=2); d.line([(x+cw*Z-3,hy),(x+cw*Z+5,hy)],fill=(255,216,74,255),width=2)
      d.rectangle([x-1,cy-1,x+cw*Z,cy+ch*Z],outline=(90,90,110,255))
      boxes[(r,c)]=(x,cy)
      if sample and (r,c) in sample:
        sp=sample[(r,c)]
        if sp is not None:
          s=sp.resize((sp.width*Z,sp.height*Z),Image.NEAREST)
          im.alpha_composite(s,(x+(cw*Z-s.width)//2, cy+ch*Z-s.height))
  ny=top+len(rows)*(ch*Z+pad+18)+4
  for i,n in enumerate(notes): d.text((pad,ny+i*18),n,font=F(13),fill=(210,200,170,255))
  return im
COMMON_NOTES=['빨간 띠 = 발 닿는 줄(맨 아래)  ·  파란 점선 = 몸 가운데  ·  노란 표시 = 무기를 쥘 손 높이(게임이 무기를 그려 줌)',
  '앞모습 1장이면 됩니다 — 왼쪽/오른쪽은 게임이 좌우 반전, 걸을 땐 1픽셀 들썩임']
# ── 1) 일반 스킨: 1포즈, 22px 높이 (폭 최대 26)
cs=Image.open(A+'commonskins.png').convert('RGBA')
from re import findall
src=open('/home/user/dungeon_/js/data/heroes.js').read()
import re
CS=dict((k,[int(v) for v in vs.split(',')]) for k,vs in re.findall(r"(c_\w+): \[([\d, ]+)\]",src))
def crop(img,c): x,y,w,h=c; return img.crop((x,y,x+w,y+h))
heroes=['swordsman','gunner','mage','engineer']
blank=sheet(['일반 스킨 (앞모습)'],[''],26,22,'일반 스킨 템플릿',[''],None,COMMON_NOTES,hand=11)
blank.save(OUT+'01_common_template.png')
ex=sheet([f'예시: {n}' for n in ['검사','사수','마도사','기술자']],[''],26,22,'일반 스킨 예시 (게임 실제 크기 ×4)',[''],None,COMMON_NOTES,
  sample={(0,i):crop(cs,CS[f'c_{h}_1']) for i,h in enumerate(heroes)},hand=11)
ex.save(OUT+'01_common_example.png')
# ── 2) 전설 스킨: 3방향 × 3프레임(+정지), 22×27
ls=Image.open(A+'legskins.png').convert('RGBA')
LEG_NOTES=['열: 걷기1 → 중간 → 걷기2 순서로 반복 재생(초당 9장)  ·  정지 칸은 비워 두면 다리를 모아 자동 생성',
  '옆모습은 반드시 왼쪽을 보게 — 오른쪽은 게임이 뒤집어서 씀  ·  세 프레임 모두 머리·몸통 위치는 고정, 다리만 움직이기',
  '노란 표시 = 무기 손 높이 (앞·뒤는 가슴, 옆은 손)  ·  무기는 그리지 마세요(게임이 그려 줌)']
cols=['걷기 1','중간(걷기)','걷기 2','정지 (선택)']; rows=['앞 (아래로 갈 때)','뒤 (위로 갈 때)','옆 (왼쪽 보기)']
hand=[16,16,12]
sheet(cols,rows,22,27,'전설 스킨 템플릿 (방향 애니메이션)',rows,None,LEG_NOTES,hand=hand).save(OUT+'02_legendary_template.png')
smp={(r,c):ls.crop((c*22,(0*3+r)*27,c*22+22,(0*3+r)*27+27)) for r in range(3) for c in range(4)}
sheet(cols,rows,22,27,'전설 스킨 예시: 심연의 기사 (게임 실제 크기 ×4)',rows,None,LEG_NOTES,sample=smp,hand=hand).save(OUT+'02_legendary_example.png')
# ── 3) 변신 스킨: 평소 모습(27px) + 변신 모습(최대 75×48)
ds=Image.open(A+'druidskin.png').convert('RGBA')
DS=dict((k,[int(v) for v in vs.split(',')]) for k,vs in re.findall(r"(\w+): \[(\d+, \d+, \d+, \d+)\]",src[src.index('const DRUID_SKIN'):src.index('const BANDI_WALK')]))
BW=json.loads(re.search(r"const BANDI_WALK = (\{.*?\});",src).group(1).replace('bandi_','"bandi_').replace(': [[','": [['))
TN1=['평소 모습: 가로 3칸 = 서기 · 걷기1 · 걷기2 (앞·뒤는 한 발씩 위로 드는 걷기)','옆모습은 왼쪽 보기 · 서기 칸은 다리를 모아서']
cols1=['서기','걷기 1','걷기 2']; rows1=['앞','뒤','옆 (왼쪽 보기)']
sheet(cols1,rows1,32,28,'변신 스킨 템플릿 ① 평소 모습',rows1,None,TN1).save(OUT+'03_transform_normal_template.png')
smp1={}
for r,k in enumerate(['bandi_down','bandi_up','bandi_side']):
  smp1[(r,0)]=crop(ds,DS[k]); smp1[(r,1)]=crop(ds,BW[k][0]); smp1[(r,2)]=crop(ds,BW[k][1])
sheet(cols1,rows1,32,28,'변신 스킨 예시 ① 반디 (게임 실제 크기 ×4)',rows1,None,TN1,sample=smp1).save(OUT+'03_transform_normal_example.png')
TN2=['변신 모습: 옆 대기 · 옆 공격(옆모습은 오른쪽을 보게 — 샘 기준) · 정면 · 후면','정면·후면 공격 동작(치켜듦 → 휘두름 → 베기)은 정면·후면 그림만 주면 만들어 드림',
  '날개·이펙트는 칸을 넘지 않게 · 바깥 빛(글로우)은 넓게 퍼지지 않게']
cols2=['옆 대기','옆 공격','정면','후면']
sheet(cols2,[''],76,48,'변신 스킨 템플릿 ② 변신 모습',[''],None,TN2,pad=20).save(OUT+'03_transform_beast_template.png')
smp2={(0,0):crop(ds,DS['sam_idle']),(0,1):crop(ds,DS['sam_atk']),(0,2):crop(ds,DS['sam_down']),(0,3):crop(ds,DS['sam_up'])}
sheet(cols2,[''],76,48,'변신 스킨 예시 ② 샘 (게임 실제 크기 ×4)',[''],None,TN2,sample=smp2,pad=20).save(OUT+'03_transform_beast_example.png')
print('ok')
