# Thiết kế 30 màn — hai thành phố

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


## Greenbay — Thành phố bên vịnh

15 màn · 1107 lượt bấm tổng cộng

| Màn | Vật thể | Khối | Ô (m) | Lưới | Chặn | Bấm được lúc đầu | Mặt trận TB | Mũi tên khuất | |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Ghế công viên | 14 | 0.88 | 7×7×6 | 0 | 14 | **54%** | 14% |  |
| 2 | Thùng rác | 18 | 0.64 | 7×7×7 | 0 | 18 | **53%** | 33% |  |
| 3 | Giá để xe đạp | 21 | 0.56 | 9×7×6 | 0 | 18 | **45%** | 19% |  |
| 4 | Đèn đường | 29 | 0.90 | 7×10×6 | 0 | 21 | **38%** | 24% |  |
| 5 | Cây non | 38 | 1.04 | 7×10×7 | 0 | 28 | **37%** | 47% |  |
| 6 | Trạm xe buýt | 45 | 1.28 | 11×8×7 | 0 | 28 | **31%** | 51% |  |
| 7 | Ô tô gia đình | 52 | 0.79 | 10×8×8 | 0 | 26 | **24%** | 54% |  |
| 8 | Đài phun nước | 63 | 0.75 | 10×8×10 | 1 | 29 | **24%** | 35% |  |
| 9 | Cầu trượt | 76 | 0.72 | 11×8×9 | 2 | 31 | **16%** | 61% |  |
| 10 | Quầy cà phê | 90 | 1.25 | 10×10×9 | 4 | 28 | **14%** | 58% | **KHÓ** |
| 11 | Nhà ven phố | 104 | 1.91 | 10×10×10 | 6 | 27 | **13%** | 34% | **KHÓ** |
| 12 | Quán cà phê | 120 | 1.99 | 10×10×10 | 6 | 33 | **13%** | 37% | **KHÓ** |
| 13 | Nhà kính | 133 | 1.82 | 12×10×10 | 8 | 29 | **11%** | 43% | **KHÓ** |
| 14 | Tòa văn phòng | 146 | 1.99 | 11×13×11 | 9 | 24 | **10%** | 61% | **KHÓ** |
| 15 | Cầu vòm | 158 | 2.00 | 15×10×10 | 12 | 25 | **8%** | 59% | **KHÓ** |

## Metrovale — Đô thị trung tâm

15 màn · 1104 lượt bấm tổng cộng

| Màn | Vật thể | Khối | Ô (m) | Lưới | Chặn | Bấm được lúc đầu | Mặt trận TB | Mũi tên khuất | |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Trụ chắn xe | 14 | 0.69 | 7×7×7 | 0 | 14 | **54%** | 14% |  |
| 2 | Vòi cứu hỏa | 16 | 0.80 | 7×7×6 | 0 | 16 | **53%** | 19% |  |
| 3 | Đèn giao thông | 22 | 1.25 | 7×9×6 | 0 | 20 | **47%** | 50% |  |
| 4 | Xe scooter | 27 | 0.48 | 9×8×6 | 0 | 21 | **39%** | 30% |  |
| 5 | Tủ bán vé | 36 | 0.57 | 7×9×7 | 0 | 22 | **36%** | 33% |  |
| 6 | Tượng nghệ thuật | 43 | 0.95 | 8×10×8 | 0 | 26 | **27%** | 23% |  |
| 7 | Taxi | 55 | 0.79 | 10×8×8 | 0 | 30 | **29%** | 35% |  |
| 8 | Xe giao hàng | 66 | 0.86 | 11×8×8 | 1 | 27 | **21%** | 47% |  |
| 9 | Xe buýt điện | 75 | 1.23 | 12×8×8 | 2 | 32 | **19%** | 32% |  |
| 10 | Xe điện tram | 91 | 1.99 | 12×9×9 | 4 | 26 | **16%** | 37% | **KHÓ** |
| 11 | Thư viện | 104 | 1.99 | 12×11×11 | 6 | 26 | **13%** | 41% | **KHÓ** |
| 12 | Chung cư | 119 | 1.99 | 11×15×11 | 6 | 32 | **12%** | 44% | **KHÓ** |
| 13 | Bệnh viện | 132 | 1.99 | 13×14×12 | 8 | 23 | **10%** | 55% | **KHÓ** |
| 14 | Nhà ga trên cao | 146 | 1.91 | 15×11×11 | 9 | 24 | **8%** | 56% | **KHÓ** |
| 15 | Cầu dây văng | 158 | 2.00 | 20×13×12 | 12 | 29 | **9%** | 56% | **KHÓ** |


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
