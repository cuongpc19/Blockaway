# -*- coding: utf-8 -*-
"""Sinh LEVEL_DESIGN.md từ chính city-levels.json.

Bảng số trong tài liệu phải lấy từ dữ liệu thật, không chép tay: chép tay thì
sau vài lượt chỉnh là tài liệu nói một đằng, file nói một nẻo.
"""
import io
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(io.open(os.path.join(HERE, 'city-levels.json'), encoding='utf-8'))

HEAD = """# Thiết kế 30 màn — hai thành phố

Mỗi màn là **một vật thể của thành phố bị áo khối bọc kín**. Gỡ hết khối thì vật
thể lộ ra sạch sẽ; hết 15 màn là xong một thành phố. Bộ 30 mô hình do session
dựng asset làm, đã xếp sẵn từ ghế công viên tới cầu dây văng — nên **màn khó
(10-15) rơi đúng vào vật thể lớn**, không phải ép.

Xem trực tiếp: **http://localhost:8080/city-levels/preview.html** — chọn màn ở
cột trái, bật/tắt áo khối để xem vật thể bên dưới, bấm *Chạy thử lời giải* để
xem máy gỡ hết màn bằng đúng luật của game.

## Ba quyết định thiết kế

**1. Chính vật thể là chướng ngại.** Ô lưới nào thuộc thân vật thể thì chặn
đường bay y như một khối cố định, chỉ khác là không vẽ ra. Nhờ vậy không bao giờ
có khối xuyên qua tường nhà, và mặt khuất của vật thể tự nhiên khó hơn mặt ngoài
— độ khó đến từ chính hình dáng của cái mình đang giải cứu.

**2. Giải được là điều kiện DỰNG, không phải điều kiện kiểm.** Level dựng bằng
cách *bóc ngược*: máy chọn thứ tự gỡ trước, rồi mới gán mũi tên sao cho đúng lúc
tới lượt nó thì đường bay trống. Sinh xong là chắc chắn phá đảo được. (Vẫn kiểm
lại bằng một bộ giải độc lập viết bằng JS, đúng luật engine: 30/30 màn sạch.)

**3. Độ khó KHÔNG nằm ở số khối.** Cái khó của thể loại này là *tìm ra ô đang
thoát được* giữa một đống ô. Nên thước đo là **bề rộng mặt trận**: trung bình
mỗi lúc có bao nhiêu phần trăm số khối đang bấm được. Màn 1 là 54% (nhìn đâu
cũng bấm được), màn 15 là 8% (phải soi, phải xoay).

Cần gạt để đạt con số đó là `chain`: xác suất gán cho một khối cái hướng **đang
bị khối khác chặn ở trạng thái đầu màn** — khối ấy phải chờ. Cùng một đống khối,
gạt cần này là ra hai độ khó khác hẳn nhau.

Và cần gạt ấy **tự chỉnh theo từng vật thể**: cùng mức `chain`, cái chung cư
(hộp trơn) cho mặt trận rộng gấp đôi cái nhà kính (nhiều hốc). Bộ sinh dựng thử,
đo, gạt lại, tối đa 6 lượt — nên màn 12 của hai thành phố khó ngang nhau chứ
không phải "tuỳ hình".

## Ba thứ tăng dần khác

| | màn 1 | màn 15 |
|---|---|---|
| Số khối (độ dài màn) | 14 | 158 |
| Lớp áo khối | 1 | 2 |
| Khối chặn cố định (xám, không gỡ được) | 0 | 7% |
| Số màu | 2 | 5 |
| Mũi tên quay ra sau lưng camera | ~14% | ~56% |

Màu cũng là một cần gạt: màn 1-5 tô theo tầng cho gọn mắt, từ màn 6 tô loạn để
phải nhìn kỹ từng ô.

## Cỡ khối

Ô khối bị ghim trong khoảng **0.45–2.0 m** để giữ đúng cảm giác "tiny block" của
`city-assets/tiny-blocks/design-spec.json`. Vật thể lớn mà cứ phóng to ô cho đủ
số thì tòa nhà 15 m bị bọc bằng bốn cái hộp 4 m — vẫn đúng số khối nhưng hỏng
hình. Nên với vật thể lớn, bộ sinh **tỉa thưa áo khối theo từng mảng 2×2×2** thay
vì phóng to ô: áo bong từng mảng, vật thể ló ra vài khoảng đủ để đoán nó là gì.

"""

TAIL = """
## Chạy lại

```bash
cd web/city-levels
python design_levels.py      # đọc ../city-assets/manifest.json + models/*.glb
python make_doc.py           # dựng lại đúng tài liệu này từ dữ liệu vừa sinh
node verify.mjs              # bộ giải độc lập, đúng luật engine
```

Bộ mô hình vẫn đang được session khác sửa, nên **mỗi lần mô hình đổi là chạy lại
`design_levels.py`**: cỡ ô, số khối và hướng mũi tên đều suy ra từ hình học thật,
không có gì chép tay. Kết quả nằm ở `city-levels.json`.

### Dữ liệu ra

```
levels[] = {
  id, city, level, title, kind, model, preview,
  cell,        // mét trên một ô lưới
  origin,      // toạ độ thế giới của góc ô (0,0,0) — để đặt GLB vào đúng chỗ
  size,        // [ex, ey, ez] kích thước lưới
  hard,        // true từ màn 10
  blocks[],    // [x, y, z, dir(1..6), type(1=khối, 2=chặn), màu]
  solid[],     // ô thân vật thể: chặn đường bay, không vẽ
  metrics{}    // số liệu độ khó của màn
}
```

`dir` đánh số y hệt engine chính (`main.js`): 1..6 = +X, −X, +Y, −Y, +Z, −Z.
"""


def table(city):
    rows = [L for L in D['levels'] if L['city'] == city]
    out = ['| Màn | Vật thể | Khối | Ô (m) | Lưới | Chặn | Bấm được lúc đầu | Mặt trận TB | Mũi tên khuất | |',
           '|---|---|---|---|---|---|---|---|---|---|']
    for L in rows:
        q = L['metrics']
        out.append('| %d | %s | %d | %.2f | %s | %d | %d | **%.0f%%** | %d%% | %s |' % (
            L['level'], L['title'], q['cubes'], L['cell'], '×'.join(map(str, L['size'])),
            q['blockers'], q['startFree'], q['frontierPct'], q['hiddenPct'],
            '**KHÓ**' if L['hard'] else ''))
    return '\n'.join(out)


parts = [HEAD]
for c in D['cities']:
    n = sum(1 for L in D['levels'] if L['city'] == c['id'])
    taps = sum(L['metrics']['cubes'] for L in D['levels'] if L['city'] == c['id'])
    parts.append('## %s — %s\n\n%d màn · %d lượt bấm tổng cộng\n\n%s\n'
                 % (c['name'], c.get('subtitle', ''), n, taps, table(c['id'])))
parts.append(TAIL)
io.open(os.path.join(HERE, 'LEVEL_DESIGN.md'), 'w', encoding='utf-8').write('\n'.join(parts))
print('da ghi LEVEL_DESIGN.md')
