"""Regenerates the placeholder PNG art in public/. Optional: you can instead just replace the PNG files by hand.
Run: pip install pillow && python3 tools/make-assets.py"""
import random
from PIL import Image, ImageDraw

A = 'public/assets/'
WOOL, OUT, DARK = (247, 243, 232), (170, 160, 140), (59, 59, 59)
img = lambda w, h, bg=(0, 0, 0, 0): Image.new('RGBA', (w, h), bg)

def sheep(w, h, s):  # s = scale factor vs 32px design
    im = img(w, h); d = ImageDraw.Draw(im); k = lambda *v: [round(x * s) for x in v]
    for x in (9, 21): d.rectangle(k(x, 25, x + 2, 30), fill=DARK)
    d.ellipse(k(3, 8, 26, 27), fill=WOOL, outline=OUT)
    for cx, cy in ((9, 9), (15, 7), (21, 9)): d.ellipse(k(cx - 4, cy - 4, cx + 4, cy + 4), fill=WOOL, outline=OUT)
    d.ellipse(k(3, 8, 26, 27), fill=WOOL)
    d.ellipse(k(21, 10, 31, 20), fill=DARK); d.rectangle(k(25, 12, 26, 13), fill=(255, 255, 255))
    d.polygon(k(22, 11, 19, 14, 22, 15), fill=DARK)
    return im

pad = img(48, 48); pad.alpha_composite(sheep(32, 32, 1), (8, 8)); pad.save(A + 'sheep.png')  # 8px margin so gear can stick out
sheep(20, 20, 0.62).save(A + 'lamb.png')

def tile(base, speck, seed):
    im = img(32, 32, base + (255,)); d = ImageDraw.Draw(im); r = random.Random(seed)
    for _ in range(26): x, y = r.randrange(32), r.randrange(32); d.point((x, y), fill=speck)
    return im
tile((126, 200, 80), (96, 170, 60), 1).save(A + 'grass.png')
tile((232, 217, 168), (210, 194, 144), 2).save(A + 'path.png')

def building(name, draw):
    im = img(128, 128); d = ImageDraw.Draw(im); draw(d); im.save(A + name + '.png')
roof, line = (139, 90, 43), (85, 85, 85)
def church(d):
    d.rectangle((24, 52, 104, 112), fill=(216, 200, 168), outline=line); d.polygon([(16, 52), (112, 52), (64, 18)], fill=roof, outline=line)
    d.rectangle((62, 0, 66, 16), fill=(240, 190, 60)); d.rectangle((56, 5, 72, 9), fill=(240, 190, 60))
    d.rectangle((54, 80, 74, 112), fill=(110, 70, 40)); d.rectangle((34, 66, 44, 80), fill=(150, 190, 235)); d.rectangle((84, 66, 94, 80), fill=(150, 190, 235))
def barn(d):
    d.rectangle((20, 56, 108, 112), fill=(180, 60, 50), outline=line); d.polygon([(12, 56), (116, 56), (64, 20)], fill=(120, 40, 35), outline=line)
    d.rectangle((46, 74, 82, 112), fill=(240, 235, 220), outline=line); d.line((46, 74, 82, 112), fill=(180, 60, 50), width=3); d.line((82, 74, 46, 112), fill=(180, 60, 50), width=3)
def chapel(d):
    d.rectangle((36, 60, 92, 112), fill=(169, 192, 234), outline=line); d.polygon([(28, 60), (100, 60), (64, 28)], fill=(90, 100, 140), outline=line)
    d.rectangle((62, 8, 66, 28), fill=(240, 190, 60)); d.rectangle((57, 13, 71, 17), fill=(240, 190, 60))
    d.rectangle((56, 84, 72, 112), fill=(80, 60, 110)); d.ellipse((56, 76, 72, 92), fill=(80, 60, 110))
def gallery(d):
    d.rectangle((20, 56, 108, 112), fill=(242, 193, 78), outline=line); d.polygon([(12, 56), (116, 56), (64, 26)], fill=(150, 150, 160), outline=line)
    for x in (30, 52, 74, 96): d.rectangle((x, 66, x + 6, 112), fill=(255, 235, 170), outline=line)
    d.ellipse((56, 40, 72, 54), fill=(255, 255, 255), outline=line)
def board(d):
    d.rectangle((30, 60, 36, 116), fill=roof); d.rectangle((92, 60, 98, 116), fill=roof)
    d.rectangle((16, 18, 112, 82), fill=(196, 150, 96), outline=line, width=3)
    for (x, y, c) in ((26, 26, (255, 255, 255)), (62, 28, (255, 240, 150)), (88, 34, (255, 255, 255)), (34, 52, (255, 240, 150)), (70, 54, (255, 255, 255))):
        d.rectangle((x, y, x + 20, y + 18), fill=c, outline=line); d.ellipse((x + 8, y + 1, x + 12, y + 5), fill=(200, 40, 40))
for n, f in (('church', church), ('pasture', barn), ('chapel', chapel), ('gallery', gallery), ('board', board)): building(n, f)

def item(name, draw):
    im = img(64, 64); d = ImageDraw.Draw(im); draw(d); im.save(A + 'items/' + name + '.png')
def halo(d): d.ellipse((8, 22, 56, 42), outline=(240, 190, 60), width=7); d.ellipse((10, 24, 54, 40), outline=(255, 235, 150), width=2)
def rosary(d):
    import math
    for i in range(10): a = i / 10 * 2 * math.pi; x, y = 32 + 20 * math.cos(a), 24 + 16 * math.sin(a); d.ellipse((x - 4, y - 4, x + 4, y + 4), fill=(150, 60, 90), outline=line)
    d.rectangle((30, 42, 34, 60), fill=(240, 190, 60)); d.rectangle((25, 47, 39, 51), fill=(240, 190, 60))
def medal(d):
    d.polygon([(20, 4), (32, 28), (44, 4)], fill=(200, 50, 50)); d.ellipse((14, 24, 50, 60), fill=(240, 190, 60), outline=(170, 120, 20), width=3); d.ellipse((24, 34, 40, 50), fill=(255, 235, 150))
def homework(d):
    d.rectangle((10, 12, 54, 54), fill=(90, 120, 190), outline=line, width=2); d.rectangle((16, 12, 54, 50), fill=(250, 245, 230), outline=line); d.line((32, 12, 32, 50), fill=line)
    for y in (22, 30, 38): d.line((36, y, 50, y), fill=(150, 150, 150)); d.line((18, y, 28, y), fill=(150, 150, 150))
for n, f in (('halo', halo), ('rosary', rosary), ('medal', medal), ('homework', homework)): item(n, f)

# App icons: the sheep on green
base = sheep(32, 32, 1).resize((384, 384), Image.NEAREST)
for name, size in (('icon-512', 512), ('icon-192', 192), ('apple-touch-icon', 180), ('favicon', 32)):
    bg = img(512, 512, (47, 93, 58, 255)); bg.alpha_composite(base, (64, 64)); bg.resize((size, size), Image.LANCZOS).save('public/' + name + '.png')
print('assets written')

# ---- Small UI icons (replace every emoji/symbol in the app) ----
import os
U = A + 'ui/'; os.makedirs(U, exist_ok=True)
sheep(32, 32, 1).save(U + 'sheep.png')
for n in ('church', 'chapel', 'gallery', 'board'): Image.open(A + n + '.png').resize((32, 32), Image.LANCZOS).save(U + n + '.png')
Image.open(A + 'items/homework.png').resize((32, 32), Image.LANCZOS).save(U + 'homework.png')
def ui(name, draw):
    im = img(32, 32); d = ImageDraw.Draw(im); draw(d); im.save(U + name + '.png')
def mail(d):
    d.rectangle((3, 7, 28, 25), fill=(255, 255, 255), outline=line); d.polygon([(3, 7), (15, 18), (16, 18), (28, 7)], fill=(225, 225, 235), outline=line)
def done(d):
    d.ellipse((2, 2, 29, 29), fill=(60, 160, 80), outline=(30, 100, 50)); d.line([(9, 16), (14, 21), (23, 10)], fill=(255, 255, 255), width=4)
def cloud(d):
    es = [(3, 14, 19, 27), (9, 7, 24, 22), (15, 13, 30, 27)]
    for e in es: d.ellipse((e[0] - 1, e[1] - 1, e[2] + 1, e[3] + 1), fill=(110, 140, 180))
    for e in es: d.ellipse(e, fill=(205, 228, 250))
    d.rectangle((10, 20, 24, 26), fill=(205, 228, 250))
def disk(d):
    d.rectangle((4, 4, 28, 28), fill=(70, 90, 150), outline=(30, 40, 80)); d.rectangle((9, 4, 23, 13), fill=(235, 235, 235)); d.rectangle((10, 19, 22, 28), fill=(190, 190, 200))
def plus(d):
    d.ellipse((2, 2, 29, 29), fill=(60, 160, 80), outline=(30, 100, 50)); d.rectangle((14, 8, 17, 23), fill=(255, 255, 255)); d.rectangle((8, 14, 23, 17), fill=(255, 255, 255))
def back(d):
    d.polygon([(3, 16), (16, 3), (16, 10), (29, 10), (29, 22), (16, 22), (16, 29)], fill=(255, 255, 255), outline=(50, 50, 50))
for n, f in (('mail', mail), ('done', done), ('cloud', cloud), ('disk', disk), ('plus', plus), ('back', back)): ui(n, f)
print('ui icons written')

# ---- Sheep gear: 48x48 overlays on the same canvas as sheep.png (sheep sits in the middle 32x32, faces right) ----
# Coordinates below are in the sheep's 32x32 space; OD shifts them by the 8px margin, so -8..39 is drawable.
class OD:
    def __init__(s, d, o=8): s.d, s.o = d, o
    def _p(s, c):
        if isinstance(c[0], (tuple, list)): return [(x + s.o, y + s.o) for x, y in c]
        return [v + s.o for v in c]
    def rectangle(s, c, **k): s.d.rectangle(s._p(c), **k)
    def ellipse(s, c, **k): s.d.ellipse(s._p(c), **k)
    def polygon(s, c, **k): s.d.polygon(s._p(c), **k)
    def line(s, c, **k): s.d.line(s._p(c), **k)
    def arc(s, c, a, b, **k): s.d.arc(s._p(c), a, b, **k)
    def point(s, c, **k): s.d.point(s._p([c])[0], **k)
G = A + 'gear/'; os.makedirs(G, exist_ok=True)
GOLD, RED, BROWN, OUT2, WHITE = (255, 200, 40), (215, 45, 45), (120, 80, 40), (60, 40, 20), (255, 255, 255)
def poly(d, pts, fill, outline, w=2): d.polygon(pts, fill=fill); d.line(pts + [pts[0]], fill=outline, width=w)
def gear(name, draw):
    im = img(48, 48); draw(OD(ImageDraw.Draw(im))); im.save(G + name + '.png')
def straw(d):
    d.ellipse((15, 2, 39, 11), fill=(240, 205, 110), outline=OUT2, width=2); d.rectangle((21, -6, 33, 6), fill=(240, 205, 110), outline=OUT2, width=2); d.rectangle((22, 1, 32, 4), fill=RED)
def flowers(d):
    d.line([(16, 11), (21, 7), (27, 6), (33, 8), (36, 12)], fill=(40, 140, 50), width=3)
    for x, y, c in ((18, 9, (255, 90, 150)), (23, 5, WHITE), (28, 4, (255, 220, 40)), (33, 6, (255, 130, 30)), (36, 10, (255, 90, 150))):
        d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=c, outline=(120, 60, 60)); d.point((x, y), fill=(120, 60, 20))
def halo_g(d):
    d.ellipse((16, -8, 36, 2), outline=(255, 245, 160), width=6); d.ellipse((17, -7, 35, 1), outline=(255, 190, 30), width=3)
def mitre(d):
    poly(d, [(18, 11), (26, -8), (34, 11)], (252, 252, 245), (200, 140, 20), 3); d.rectangle((18, 6, 34, 11), fill=GOLD, outline=(200, 140, 20))
    d.rectangle((25, -2, 27, 5), fill=RED); d.rectangle((22, 0, 30, 2), fill=RED)
def scarf(d):
    d.rectangle((14, 16, 24, 25), fill=RED, outline=OUT2, width=2); d.rectangle((14, 19, 24, 21), fill=WHITE)
    poly(d, [(14, 23), (22, 23), (20, 37), (13, 37)], RED, OUT2); d.rectangle((14, 29, 21, 31), fill=WHITE)
def bell(d):
    d.rectangle((14, 16, 24, 19), fill=RED, outline=OUT2); d.ellipse((15, 18, 25, 30), fill=GOLD, outline=(150, 100, 10), width=2)
    d.rectangle((14, 27, 26, 30), fill=GOLD, outline=(150, 100, 10)); d.ellipse((18, 29, 22, 33), fill=(80, 50, 20))
def rosary_g(d):
    pts = [(16, 17), (14, 20), (13, 23), (13, 26), (14, 29)]
    d.line(pts, fill=(200, 200, 210), width=1)
    for i, (x, y) in enumerate(pts): d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=(200, 40, 110) if i % 2 else (255, 120, 170), outline=(90, 20, 50))
    d.rectangle((14, 31, 17, 39), fill=GOLD, outline=(150, 100, 10)); d.rectangle((10, 33, 21, 36), fill=GOLD, outline=(150, 100, 10))
def medal_g(d):
    poly(d, [(14, 15), (25, 15), (22, 27), (17, 27)], RED, OUT2); d.line((19, 16, 19, 26), fill=WHITE, width=2)
    d.ellipse((12, 25, 26, 39), fill=GOLD, outline=(150, 100, 10), width=2); d.ellipse((16, 29, 22, 35), fill=(255, 245, 170), outline=(150, 100, 10))
def staff(d):
    d.line((0, -3, 0, 38), fill=BROWN, width=4); d.arc((0, -8, 12, 4), 180, 360, fill=BROWN, width=4); d.line((12, -2, 12, 2), fill=BROWN, width=4); d.ellipse((-3, 34, 3, 39), fill=GOLD, outline=(150, 100, 10))
def wings(d):
    pts = [(10, 14), (-2, -4), (-8, 0), (-4, 3), (-8, 8), (-3, 10), (-7, 16), (3, 17)]
    poly(d, pts, WHITE, (90, 130, 210), 2); d.line((8, 13, -3, 1), fill=(150, 180, 230), width=1); d.line((7, 14, -4, 8), fill=(150, 180, 230), width=1)
for n, f in (('straw-hat', straw), ('flower-crown', flowers), ('halo', halo_g), ('mitre', mitre), ('scarf', scarf), ('bell', bell), ('rosary', rosary_g), ('medal', medal_g), ('staff', staff), ('wings', wings)): gear(n, f)

def wardrobe(d):
    d.rectangle((22, 56, 106, 112), fill=(190, 150, 210), outline=line); d.polygon([(14, 56), (114, 56), (64, 24)], fill=(110, 70, 140), outline=line)
    for i, x in enumerate(range(26, 102, 12)): d.rectangle((x, 62, x + 11, 72), fill=(255, 255, 255) if i % 2 else (140, 90, 170))
    d.rectangle((30, 80, 58, 104), fill=(170, 210, 245), outline=line); d.rectangle((72, 78, 94, 112), fill=(110, 70, 40), outline=line)
    d.rectangle((60, 36, 68, 44), fill=GOLD, outline=line)
building('wardrobe', wardrobe)
Image.open(A + 'wardrobe.png').resize((32, 32), Image.LANCZOS).save(U + 'wardrobe.png')
print('gear written')

# ---- Rosary Run art ----
def sprite(path, size, draw):
    im = img(size, size); draw(ImageDraw.Draw(im)); im.save(path)
def bead(d):
    d.ellipse((3, 3, 28, 28), fill=(214, 60, 130), outline=(110, 20, 60), width=2); d.ellipse((9, 8, 15, 14), fill=(255, 190, 220))
def bead_big(d):
    d.ellipse((2, 2, 29, 29), fill=GOLD, outline=(150, 100, 10), width=2); d.rectangle((14, 7, 17, 24), fill=(150, 100, 10)); d.rectangle((9, 12, 22, 15), fill=(150, 100, 10)); d.ellipse((7, 6, 11, 10), fill=(255, 245, 170))
def stone(d):
    d.polygon([(4, 24), (2, 14), (9, 5), (21, 4), (29, 12), (28, 25), (16, 28)], fill=(140, 140, 150), outline=(70, 70, 80)); d.line((9, 12, 20, 10), fill=(180, 180, 190), width=2)
sprite(A + 'bead.png', 32, bead); sprite(A + 'bead-big.png', 32, bead_big); sprite(A + 'stone.png', 32, stone)
def beads_item(d):
    pts = [(12, 10), (8, 20), (9, 32), (16, 42), (28, 46), (40, 42), (47, 32), (48, 20), (44, 10)]
    for x, y in pts: d.ellipse((x - 5, y - 5, x + 5, y + 5), fill=GOLD, outline=(150, 100, 10))
    d.rectangle((30, 50, 34, 62), fill=GOLD, outline=(150, 100, 10)); d.rectangle((26, 54, 38, 57), fill=GOLD, outline=(150, 100, 10))
sprite(A + 'items/beads.png', 64, beads_item)
def garden(d):
    d.rectangle((14, 50, 114, 112), fill=(70, 150, 70), outline=line); d.ellipse((38, 34, 90, 90), fill=(120, 200, 110), outline=line); d.rectangle((50, 70, 78, 112), fill=(110, 70, 40), outline=line)
    for x, y in ((24, 60), (34, 90), (100, 62), (92, 96), (46, 44), (82, 44), (64, 38)): d.ellipse((x - 4, y - 4, x + 4, y + 4), fill=(240, 90, 140), outline=(130, 30, 70))
    d.ellipse((52, 14, 76, 38), outline=(214, 60, 130), width=4); d.rectangle((62, 36, 66, 46), fill=GOLD)
building('garden', garden)
Image.open(A + 'garden.png').resize((32, 32), Image.LANCZOS).save(U + 'garden.png')
print('rosary art written')
