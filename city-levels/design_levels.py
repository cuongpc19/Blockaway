# -*- coding: utf-8 -*-
"""Sinh 30 màn chơi từ 30 mô hình thành phố.

Ý tưởng: mỗi vật thể bị một lớp áo khối nhỏ bọc kín; người chơi gỡ hết áo thì
vật thể lộ ra sạch sẽ. Ba quyết định thiết kế nằm ở đây:

1. **Chính vật thể là chướng ngại.** Ô nào thuộc thân vật thể thì chặn đường
   bay, y như một khối cố định — chỉ khác là không vẽ ra. Nhờ vậy không bao giờ
   có khối xuyên qua tường nhà, và "mặt khuất" của vật thể tự nhiên khó hơn.

2. **Giải được là điều kiện dựng, không phải điều kiện kiểm.** Level dựng bằng
   cách *bóc ngược*: chọn thứ tự gỡ trước, rồi mới gán mũi tên sao cho đúng lúc
   tới lượt nó thì đường bay trống. Sinh xong là chắc chắn phá đảo được, không
   cần dò lại bằng vét cạn.

3. **Độ khó nằm ở chỗ gán hướng, không nằm ở số khối.** Cho một khối hướng
   *đang trống ngay từ đầu* thì nó bấm được luôn — dễ. Cho nó hướng *đang bị
   khối khác chặn* thì nó phải chờ — thành chuỗi phụ thuộc. Cùng một đống khối,
   hai cách gán cho ra hai độ khó khác hẳn nhau.

Chạy lại được bất cứ lúc nào: mô hình do session khác dựng và vẫn đang sửa, nên
script đọc thẳng manifest + GLB mỗi lần chạy.
"""
import io
import json
import os
import random
import sys
from collections import deque

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glb  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(os.path.join(HERE, '..', 'city-assets'))

DIRS = [(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)]
DIR_ID = {d: i + 1 for i, d in enumerate(DIRS)}       # 1..6 như engine chính

# Bảng màu lấy từ tiny-blocks/design-spec.json của session dựng mô hình
PALETTE = ['#41BD79', '#31A9D4', '#F1C748', '#A67BE0', '#F0795F']

# Camera mặc định của game: yaw -45°, pitch 35.26°. Khối có mũi tên quay về phía
# này thì nhìn phát thấy ngay; quay ra sau lưng thì phải xoay bàn mới thấy.
VIEW = np.array([-np.sin(np.pi / 4) * np.cos(0.6155), np.sin(0.6155),
                 np.cos(np.pi / 4) * np.cos(0.6155)])

# ─────────────────────────── đường cong độ khó ───────────────────────────
# 15 màn một thành phố. `chain` là tỉ lệ khối được gán hướng ĐANG BỊ CHẶN lúc
# bắt đầu — đây là cần gạt độ khó chính. `hidden` là tỉ lệ ưu tiên mũi tên quay
# ra sau lưng camera. Màn 10-15 là màn khó, và chúng rơi đúng vào vật thể lớn
# vì bộ mô hình đã xếp từ nhỏ tới lớn.
CURVE = [
    # lv, số khối, lớp áo, chain, hidden, màu, chặn cố định
    (1,   14, 1, 0.00, 0.00, 2, 0.00),
    (2,   18, 1, 0.00, 0.00, 2, 0.00),
    (3,   23, 1, 0.06, 0.05, 3, 0.00),
    (4,   29, 1, 0.12, 0.08, 3, 0.00),
    (5,   36, 1, 0.18, 0.12, 3, 0.00),
    (6,   44, 1, 0.26, 0.16, 3, 0.00),
    (7,   54, 1, 0.34, 0.20, 4, 0.00),
    (8,   66, 1, 0.42, 0.25, 4, 0.02),
    (9,   80, 1, 0.50, 0.30, 4, 0.03),
    (10,  95, 2, 0.62, 0.36, 4, 0.04),
    (11, 110, 2, 0.68, 0.40, 5, 0.05),
    (12, 125, 2, 0.74, 0.44, 5, 0.05),
    (13, 140, 2, 0.80, 0.48, 5, 0.06),
    (14, 155, 2, 0.86, 0.52, 5, 0.06),
    (15, 170, 2, 0.92, 0.56, 5, 0.07),
]
CURVE = {c[0]: c for c in CURVE}
HARD_FROM = 10

# Đích thật của độ khó: **bao nhiêu phần khối đang bấm được** ở mỗi thời điểm.
# Số khối chỉ nói màn dài hay ngắn; con số này mới nói màn khó hay dễ, vì cái
# khó của thể loại này là *tìm ra ô thoát được* giữa một đống ô.
# Phải chỉnh tự động theo từng vật thể: cùng một mức `chain`, cái chung cư (hộp
# trơn) cho mặt trận rộng gấp đôi cái nhà kính (nhiều hốc). Ghim theo tỉ lệ thì
# màn 12 của hai thành phố mới khó ngang nhau.
FRONTIER = {1: .52, 2: .48, 3: .44, 4: .38, 5: .33, 6: .29, 7: .25, 8: .21,
            9: .18, 10: .14, 11: .12, 12: .11, 13: .10, 14: .09, 15: .08}


# ─────────────────────────── voxel hoá ───────────────────────────
def voxelize(tris, cell, origin):
    """Ô nào bị tam giác quét qua thì coi là thân vật thể.

    Rải điểm trên mặt tam giác thay vì cắt hình học: bộ mô hình có nhiều tấm
    mỏng (kính nhà chờ, biển báo), cắt kiểu khác là mất hẳn mấy tấm đó.
    """
    cells = set()
    step = cell * 0.34
    for a, b, c in tris:
        e = max(np.linalg.norm(b - a), np.linalg.norm(c - a), np.linalg.norm(c - b))
        n = max(1, int(np.ceil(e / step)))
        n = min(n, 48)
        u = np.arange(n + 1) / n
        U, V = np.meshgrid(u, u)
        m = (U + V) <= 1.0 + 1e-9
        U, V = U[m], V[m]
        P = a + np.outer(U, b - a) + np.outer(V, c - a)
        idx = np.floor((P - origin) / cell).astype(np.int64)
        cells.update(map(tuple, idx))
    return cells


def fill_interior(solid, shape):
    """Ruột kín cũng là thân vật thể: không thì khối chui lọt vào trong nhà."""
    nx, ny, nz = shape
    out = np.zeros(shape, dtype=bool)
    q = deque()
    for x in range(nx):
        for y in range(ny):
            for z in (0, nz - 1):
                if (x, y, z) not in solid and not out[x, y, z]:
                    out[x, y, z] = True; q.append((x, y, z))
    for x in range(nx):
        for z in range(nz):
            for y in (0, ny - 1):
                if (x, y, z) not in solid and not out[x, y, z]:
                    out[x, y, z] = True; q.append((x, y, z))
    for y in range(ny):
        for z in range(nz):
            for x in (0, nx - 1):
                if (x, y, z) not in solid and not out[x, y, z]:
                    out[x, y, z] = True; q.append((x, y, z))
    while q:
        x, y, z = q.popleft()
        for dx, dy, dz in DIRS:
            a, b, c = x + dx, y + dy, z + dz
            if 0 <= a < nx and 0 <= b < ny and 0 <= c < nz \
                    and not out[a, b, c] and (a, b, c) not in solid:
                out[a, b, c] = True
                q.append((a, b, c))
    inner = set()
    for x in range(nx):
        for y in range(ny):
            for z in range(nz):
                if not out[x, y, z] and (x, y, z) not in solid:
                    inner.add((x, y, z))
    return solid | inner


def coat(solid, layers):
    """Áo khối: nở solid ra `layers` lớp theo 6 hướng, trừ đi chính thân."""
    cur, out = set(solid), set()
    for _ in range(layers):
        ring = set()
        for (x, y, z) in cur:
            for dx, dy, dz in DIRS:
                c = (x + dx, y + dy, z + dz)
                if c not in solid and c not in out:
                    ring.add(c)
        out |= ring
        cur = ring
    return out


def build_field(tris, cell, layers, ground=True):
    """Dựng lưới cho một cỡ ô: trả về (áo khối, thân, kích thước, gốc lưới)."""
    lo = tris.reshape(-1, 3).min(0)
    hi = tris.reshape(-1, 3).max(0)
    pad = cell * (layers + 1)
    origin = lo - pad
    solid = voxelize(tris, cell, origin)
    if not solid:
        return set(), set(), (0, 0, 0), origin
    shape = tuple(int(np.ceil((hi[i] - lo[i] + 2 * pad) / cell)) + 1 for i in range(3))
    solid = {c for c in solid if all(0 <= c[i] < shape[i] for i in range(3))}
    solid = fill_interior(solid, shape)
    field = coat(solid, layers)
    if ground:
        # không đắp khối xuống dưới mặt đất: vật thể nào cũng đứng trên Y=0
        y0 = int(np.floor((0 - origin[1]) / cell))
        field = {c for c in field if c[1] >= y0}
    field = {c for c in field if all(0 <= c[i] < shape[i] for i in range(3))}
    return field, solid, shape, origin


# ─────────────────────────── luật đường bay ───────────────────────────
def ray_clear(cell, d, blocked, size):
    """Đường bay trống tới hết biên hộp — đúng luật của game gốc."""
    x, y, z = cell
    dx, dy, dz = d
    x += dx; y += dy; z += dz
    while 0 <= x < size[0] and 0 <= y < size[1] and 0 <= z < size[2]:
        if (x, y, z) in blocked:
            return False
        x += dx; y += dy; z += dz
    return True


def line_cells(cell, size):
    """Mọi ô mà đường bay của nó có thể đi qua `cell` — dùng để xoá cache."""
    x, y, z = cell
    out = set()
    for i in range(size[0]):
        out.add((i, y, z))
    for i in range(size[1]):
        out.add((x, i, z))
    for i in range(size[2]):
        out.add((x, y, i))
    out.discard(cell)
    return out


# ─────────────────────────── gán hướng ───────────────────────────
def assign(field, solid, size, chain, hidden, rng):
    """Bóc ngược: mỗi vòng chọn một khối đang thoát được rồi chốt hướng cho nó.

    Vì khối chỉ được chốt khi đường bay của nó đang trống, và sau đó nó biến
    mất, nên gỡ theo đúng thứ tự ngược lại là chắc chắn phá đảo được.

    Cần gạt độ khó là `chain`: xác suất chọn một khối **có hướng đang bị chặn ở
    trạng thái ban đầu** rồi chốt đúng hướng ấy. Khối đó phải chờ khối khác đi
    trước mới bấm được. Gạt hết cỡ thì mỗi lúc chỉ vài khối bấm được giữa hàng
    trăm khối — người chơi phải tìm, đó mới là cái khó thật của thể loại này,
    chứ không phải "nhiều khối hơn".

    `hidden`: xác suất ưu tiên mũi tên quay ra sau lưng camera mặc định, tức là
    phải xoay bàn mới thấy.
    """
    remaining = set(field)
    blocked = set(field) | set(solid)          # trạng thái hiện tại
    initial = set(field) | set(solid)          # trạng thái ban đầu, giữ nguyên
    assigned, order, free_hist = {}, [], []
    cache = {}
    just = None                                 # ô vừa gỡ, để nối chuỗi cho dài

    def free_dirs(c):
        if c not in cache:
            cache[c] = [d for d in DIRS if ray_clear(c, d, blocked, size)]
        return cache[c]

    def passes(c, d, through):
        """đường bay của c theo d có đi qua ô `through` không"""
        x, y, z = c
        for _ in range(max(size)):
            x += d[0]; y += d[1]; z += d[2]
            if not (0 <= x < size[0] and 0 <= y < size[1] and 0 <= z < size[2]):
                return False
            if (x, y, z) == through:
                return True
        return False

    while remaining:
        free = sorted(c for c in remaining if free_dirs(c))
        if not free:
            break
        free_hist.append(len(free))

        # khối nào có hướng "giờ trống, ban đầu bị chặn" thì gán được chuỗi
        chained = {}
        for c in free:
            opts = [d for d in free_dirs(c) if not ray_clear(c, d, initial, size)]
            if opts:
                chained[c] = opts

        if chained and rng.random() < chain:
            # nối tiếp ngay sau khối vừa gỡ thì chuỗi dài ra, mặt trận hẹp lại
            nxt = [c for c, ds in chained.items()
                   if just and any(passes(c, d, just) for d in ds)]
            c = rng.choice(sorted(nxt)) if nxt else rng.choice(sorted(chained))
            pool = chained[c]
        else:
            c = rng.choice(free)
            opts = free_dirs(c)
            plain = [d for d in opts if ray_clear(c, d, initial, size)]
            pool = plain or opts

        if len(pool) > 1:
            # Ngửa mặt về camera hay giấu ra sau lưng là một cần gạt hai đầu.
            # Không chỉnh đầu "ngửa" thì màn 1 cũng có 70% mũi tên khuất — người
            # mới chơi phải xoay bàn ngay từ màn dạy, vô lý.
            face = sorted(pool, key=lambda d: -float(np.dot(np.array(d, float), VIEW)))
            pool = face[-2:] if rng.random() < hidden else face[:2]
        d = rng.choice(pool)

        assigned[c] = d
        order.append(c)
        remaining.discard(c)
        blocked.discard(c)
        for n in line_cells(c, size):
            cache.pop(n, None)
        cache.pop(c, None)
        just = c
    return assigned, order, free_hist, remaining


def simulate(blocks, solid, size):
    """Chơi lại màn vừa sinh bằng đúng luật của game, bằng hướng ĐÃ gán.

    Bước dựng chỉ bảo đảm *tồn tại* thứ tự gỡ; hàm này kiểm lại độc lập và đo
    luôn **bề rộng mặt trận**: mỗi lúc có bao nhiêu khối bấm được. Ít lựa chọn
    = phải dò = khó. Đây là con số nói lên độ khó, không phải số khối.
    """
    live = {c: d for c, d, t in blocks if t == 1}
    fixed = set(solid) | {c for c, d, t in blocks if t != 1}
    hist = []
    while live:
        blocked = set(live) | fixed
        free = [c for c, d in live.items() if ray_clear(c, d, blocked, size)]
        if not free:
            return hist, set(live)
        hist.append(len(free))
        del live[free[len(free) // 2]]
    return hist, set()


# Trần cỡ ô. Bỏ trần này thì tòa nhà 15m bị bọc bằng bốn cái hộp 3.9m — vẫn
# đúng số khối nhưng hết là "tiny block", mà spec của bộ mô hình ghi rõ 1m/ô.
# Vật thể lớn thì thay vì phóng to ô, ta **tỉa thưa áo khối** theo từng mảng.
MAX_CELL = 2.0
MIN_CELL = 0.45


def thin(field, keep, rng):
    """Tỉa áo khối xuống còn `keep` phần, tỉa theo MẢNG chứ không rắc muối tiêu.

    Bỏ ngẫu nhiên từng ô cho ra một tấm lưới lỗ chỗ, nhìn như lỗi. Bỏ theo cụm
    2x2x2 thì ra mảng vỡ — đọc được là "áo khối đã bong một mảng", và vật thể
    ló ra từng khoảng đủ để đoán nó là cái gì.
    """
    if keep >= 0.999:
        return set(field)
    groups = {}
    for c in field:
        groups.setdefault((c[0] // 2, c[1] // 2, c[2] // 2), []).append(c)
    gs = sorted(groups)
    rng.shuffle(gs)
    out, want = set(), int(round(len(field) * keep))
    for g in gs:
        if len(out) >= want:
            break
        out.update(groups[g])
    # gọt cho đúng số, ưu tiên bỏ ô thấp nhất (ít ảnh hưởng dáng nhất)
    extra = sorted(out, key=lambda c: (c[1], c[0], c[2]))
    while len(out) > want and extra:
        out.discard(extra.pop(0))
    return out


def pick_cell(tris, target, layers):
    """Dò cỡ ô để số khối rơi trúng chỉ tiêu của màn.

    Cỡ ô là thứ quyết định cả số khối lẫn dáng: ô to thì áo khối thô và ít,
    ô nhỏ thì mịn và nhiều. Nên chốt số khối trước rồi suy ngược ra cỡ ô,
    chứ không chọn cỡ ô rồi chịu số khối trời cho.
    """
    span = float(max(tris.reshape(-1, 3).max(0) - tris.reshape(-1, 3).min(0)))
    lo, hi = max(MIN_CELL, span / 42.0), min(MAX_CELL, max(MIN_CELL * 2, span / 1.6))
    best = None
    for _ in range(16):
        mid = (lo * hi) ** 0.5
        field, solid, size, origin = build_field(tris, mid, layers)
        n = len(field)
        if max(size) > 34:                      # lưới quá to thì lùi lại
            lo = mid
            continue
        cand = (abs(n - target), mid, field, solid, size, origin, n)
        if best is None or cand[0] < best[0]:
            best = cand
        if n > target:
            lo = mid
        else:
            hi = mid
        if abs(n - target) <= max(2, target * 0.04):
            break
    return best


def make_level(m, rng, chain_override=None):
    lv = m['level']
    _, target, layers, chain, hidden, ncol, blockpct = CURVE[lv]
    if chain_override is not None:
        chain = chain_override
    tris = glb.triangles(os.path.join(ASSETS, m['model']))
    if not len(tris):
        return None
    _, cell, field, solid, size, origin, n = pick_cell(tris, target, layers)
    # vật thể lớn: cỡ ô đã kịch trần mà vẫn thừa khối thì tỉa thưa áo, giữ ô nhỏ
    if len(field) > target * 1.08:
        field = thin(field, target / len(field), rng)

    # khối chặn cố định: đặt trước khi gán hướng, vì chúng không bao giờ biến mất
    field = sorted(field)
    rng.shuffle(field)
    nblock = int(round(len(field) * blockpct))
    blockers = set(field[:nblock])
    cubes = set(field[nblock:])
    solid_all = set(solid) | blockers

    assigned, order, _, stuck = assign(cubes, solid_all, size, chain, hidden, rng)
    # khối nào không có đường ra (bị chính vật thể hoặc khối chặn nhốt) thì bỏ
    cubes = set(assigned)

    # màu: màn dễ tô theo tầng cho gọn mắt, màn khó tô loạn để phải nhìn kỹ
    cols = PALETTE[:ncol]
    ys = [c[1] for c in cubes] or [0]
    span_y = max(1, max(ys) - min(ys))
    color_of = {}
    for c in cubes:
        if lv <= 5:
            color_of[c] = cols[int((c[1] - min(ys)) / (span_y + 1e-9) * (ncol - 1) + 0.5)]
        else:
            color_of[c] = cols[rng.randrange(ncol)]

    blocks = [(c, assigned[c], 1) for c in sorted(cubes)]
    blocks += [(c, (0, 1, 0), 2) for c in sorted(blockers)]
    hist, left = simulate(blocks, solid, size)

    # mũi tên quay ra sau lưng camera mặc định = phải xoay bàn mới thấy
    hid = sum(1 for c in cubes if np.dot(np.array(assigned[c], float), VIEW) < -0.1)
    return {
        'id': m['id'], 'city': m['city'], 'level': lv, 'title': m['title'],
        'kind': m.get('kind', ''), 'description': m.get('description', ''),
        'model': 'city-assets/' + m['model'],
        'preview': 'city-assets/' + m.get('preview', ''),
        'cell': round(cell, 4),
        'origin': [round(float(v), 4) for v in origin],
        'size': [int(v) for v in size],
        'hard': lv >= HARD_FROM,
        'blocks': [[int(c[0]), int(c[1]), int(c[2]), DIR_ID[d], t,
                    color_of.get(c, PALETTE[0])] for c, d, t in blocks],
        'solid': sorted([int(c[0]), int(c[1]), int(c[2])] for c in solid),
        'metrics': {
            'cubes': len(cubes), 'blockers': len(blockers), 'target': target,
            'layers': layers, 'colors': ncol,
            'startFree': hist[0] if hist else 0,
            'chainPct': round((1 - (hist[0] if hist else 0) / max(1, len(cubes))) * 100),
            'freeAvg': round(sum(hist) / len(hist), 1) if hist else 0,
            'freeP10': int(np.percentile(hist, 10)) if hist else 0,
            'hiddenPct': round(hid / max(1, len(cubes)) * 100),
            'dropped': len(stuck), 'unsolved': len(left),
            'cellMeters': round(cell, 2), 'chain': round(chain, 2),
            'frontierPct': round(sum(hist) / len(hist) / max(1, len(cubes)) * 100, 1)
            if hist else 0,
        },
    }


def main():
    rng = random.Random(20260913)
    man = json.load(io.open(os.path.join(ASSETS, 'manifest.json'), encoding='utf-8'))
    out = {'format': 'BlockAwayCityLevels/1.0',
           'cities': man['cities'], 'palette': PALETTE, 'levels': []}
    print('%-6s %-3s %-20s %-9s %5s %5s %5s %5s %5s %5s %s' % (
        'id', 'lv', 'title', 'luoi', 'o(m)', 'khoi', 'chan', 'dau', 'TB', 'mt%', 'khuat'))
    for m in man['missions']:
        # Vòng tự chỉnh: sinh thử, đo bề rộng mặt trận, gạt `chain` rồi sinh lại
        # cho tới khi trúng đích của màn đó. Năm lượt là đủ cho mọi vật thể
        # trong bộ này; quá năm thì lấy lượt gần đích nhất.
        want = FRONTIER[m['level']]
        chain = CURVE[m['level']][3]
        L = best = None
        for _ in range(6):
            L = make_level(m, rng, chain)
            if not L:
                break
            got = L['metrics']['frontierPct'] / 100
            if best is None or abs(got - want) < abs(best[0] - want):
                best = (got, L)
            if abs(got - want) <= want * 0.18:
                break
            chain = min(0.97, chain + 0.07) if got > want else max(0.0, chain - 0.07)
        L = best[1] if best else None
        if not L:
            print('%-6s KHONG DOC DUOC MO HINH' % m['id'])
            continue
        out['levels'].append(L)
        q = L['metrics']
        print('%-6s %-3d %-20s %-9s %5.2f %5d %5d %5d %5.1f %4.0f%% %4d%%%s' % (
            L['id'], L['level'], L['title'][:20], 'x'.join(map(str, L['size'])),
            L['cell'], q['cubes'], q['blockers'], q['startFree'], q['freeAvg'],
            q['frontierPct'], q['hiddenPct'],
            '  !! CON KET %d' % q['unsolved'] if q['unsolved'] else ''))
    with io.open(os.path.join(HERE, 'city-levels.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print('\nda ghi city-levels.json:', len(out['levels']), 'man,',
          sum(len(L['blocks']) for L in out['levels']), 'khoi')


if __name__ == '__main__':
    main()
