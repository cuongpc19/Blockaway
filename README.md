# Block Away — Tap Out Puzzle · bản HTML5 / Three.js

Bản làm lại chạy trên web, **dùng đúng level design của bản gốc** (APK `com.zm.blockaway` 2.8.6),
không phải level tự nghĩ ra.

## Chạy

```
web\start.cmd
```

hoặc thủ công:

```
cd C:\CuongPC\Game\Blockaway\web
python -m http.server 8080 --bind 127.0.0.1
```

Rồi mở **http://localhost:8080/**

> Phải chạy qua `http://`, không mở `index.html` bằng `file://` — `levels.bin`
> được tải bằng `fetch()` nên sẽ bị CORS chặn.

## Khung hình

Bốn con số trong `main.js` quyết định khối trông to hay nhỏ, đo từ chính video
bản gốc (384×848 — một ô chiếm 128px bề ngang, 130px chiều cao):

| | | |
|---|---|---|
| `CELL_W` | 0.33 | trần bề ngang của **một ô**, theo bề ngang khung |
| `CELL_H` | 0.175 | trần chiều cao của **một ô**, theo chiều cao khung |
| `FIT_W` | 0.80 | khung tối đa cho **cả cụm** theo bề ngang |
| `FIT_H` | 0.68 | khung tối đa cho cả cụm theo chiều cao (chừa chỗ cho HUD) |

`CELL_*` là **sàn** (cụm nhỏ thì zoom đứng yên), `FIT_*` là **trần** (cụm to thì
lùi ra). Phải có đủ cả hai trục: lấy một mốc theo "cạnh ngắn" thì trên desktop
cạnh ngắn là chiều cao, và một ô nở ra gấp đôi bản gốc.

## Cách chơi

| Thao tác | Kết quả |
|---|---|
| **Tap** vào một khối | Khối bay ra theo hướng mũi tên, nếu đường đi trống |
| **Kéo (swipe)** | Quay cả khối 3D tự do (trackball) — như bản gốc |
| **Lăn chuột / chụm 2 ngón** | Phóng to / thu nhỏ |
| Nút 🔍− góc dưới trái · 🔍+ góc dưới phải | Phóng to / thu nhỏ từng nấc (×0.82) |
| Nút ↻ góc trên trái | Chơi lại màn |
| Nút ⊕ góc dưới trái | Đưa góc nhìn về mặc định |

Lăn chuột và chụm hai ngón thì nhanh hơn nhiều, nhưng không ai đoán ra nếu game
không nói — nên **lần đầu** người chơi bấm một trong hai nút thu phóng, game mở
một popup nhỏ chỉ đúng đường tắt của thiết bị đang dùng
(`matchMedia('(pointer:coarse)')` → chụm hai ngón; còn lại → lăn chuột), kèm
hình động. Đúng một lần; cờ nằm trong `seenTut.zoom` và bị xoá cùng tiến độ khi
`?reset`.
| Nút ⚙ góc trên phải | Bật/tắt tiếng, xoay tự do 3D, nhảy tới màn, chơi lại từ màn 1 |

### Booster

Đúng ba booster của bản gốc — tên lớp moi ra từ APK: `LampBooster`,
`MagnetBooster`, `RocketBooster` (namespace `ZM.Modules.Gameplay.Boosters.*`).
Tác dụng lấy từ bảng dịch tiếng Anh trong APK, không phải tự nghĩ:

| | Chuỗi gốc trong APK | Làm gì |
|---|---|---|
| 💡 **Gợi ý** | *"Highlights all cubes you can release!"* | làm sáng **mọi** khối đang thả được |
| 🧲 **Nam châm** | *"Attracts all tappable cubes at once!"* | hút **mọi** khối thả được ra cùng lúc |
| 🚀 **Tên lửa** | *"Blows up some cubes!"* · *"No cubes to release? Use Rocket!"* | nổ một mảng khối, **phá được cả khối chặn cố định** |

#### Hiệu ứng

Cả ba booster dùng chung một hệ hiệu ứng nhỏ trong `main.js` (`Fx`): hạt lửa
(`THREE.Points`, vòng đệm 700 hạt), vòng xung kích và quầng sáng (hồ `Sprite`).
Tất cả nằm **trong nhóm đang xoay**, nên hiệu ứng bám đúng chỗ khối vừa vỡ kể cả
khi người chơi quay bàn giữa chừng.

Nền của game là **kem sáng**, nên gần như mọi thứ vẽ đè bằng màu đặc
(`NormalBlending`); chỉ cái lõi nóng chớp 0.2s mới hoà cộng. Hoà cộng trên nền
sáng thì cộng vào gần-trắng vẫn ra trắng — dựng cả vụ nổ kiểu đó là mất trắng
(đã gặp, xem `UI_UX_RULES.md` §6.8).

- **Tên lửa** — lõi trắng chớp → cầu lửa vàng/cam/đỏ ba lớp → hai sóng xung kích
  → khói cuộn bốc lên (1.9s) → ba cụm lửa phụ lệch tâm nối nhau. Khối vỡ văng ra
  **đúng lúc sóng chạm tới nó** (`delay = 20 + d*46` ms), vừa bay vừa lộn nhào.
  Kèm rung máy (tịnh tiến, sau `lookAt`), loé sáng cả khung hình (`#flash`) và
  tiếng nổ dựng từ nhiễu trắng lọc thấp dần + một cú thịch trầm.
- **Nam châm** — hai vòng từ trường lệch pha quét từ tâm ra; mỗi khối sáng lên
  trước rồi mới bị hút, kèm vòng nhỏ và chùm hạt xanh tại chỗ.
- **Gợi ý** — sóng sáng hổ phách quét từ tâm, mỗi khối thả được nảy một chùm lấp
  lánh **khi sóng chạm tới nó**, nên mắt đọc ra chúng là cùng một nhóm.

Tên lửa là đường thoát khi bàn bí: khối chặn (type 2/3) có thể nhốt vĩnh viễn
một ô, và bản gốc có hẳn chuỗi *"Use Rocket to free the way!"* cho đúng lúc đó.
Vì vậy Gợi ý và Nam châm bị chặn trước khi trừ lượt nếu không còn khối nào thả
được, còn Tên lửa thì không — đó chính là lúc nó cần.

**Giá thì không có trong APK.** `BoostersEconomyConfig` nằm trong namespace
`ZM.Services.Iam.RemoteConfig`, tức là bản gốc kéo từ server về; quét hết 14.500
file content cũng không ra asset config nào. Mấy con số dưới đây là của mình,
cân theo `WIN_COINS`:

| | Kho đầu | Free mỗi màn | Giá |
|---|---|---|---|
| Gợi ý | 3 | 1 | 15 |
| Nam châm | 2 | 0 | 40 |
| Tên lửa | 2 | 0 | 50 |

Thứ tự tiêu cố định: **suất miễn phí của màn → kho → ví**. Badge trên nút nói
luôn đang ở bậc nào (xanh = số lượt còn, vàng = giá). Hết xu thì nút mờ hẳn chứ
không để bấm rồi mới báo.

Xu: thắng một màn +10, quà hằng ngày +100, bắt đầu có 120.

### Thứ bản gốc có mà bản này chưa có

Bảng dịch trong APK lộ ra cả một tầng live-ops mà bản làm lại chưa đụng tới:
**giới hạn lượt** (`MOVES {0}`, *"Not enough moves to complete the level!"*),
**mạng** (*"Out of lives!"*, *"Next life in"*), **giải đấu** (Wood → Ruby
League), **Piggy Bank**, **Jungle Quest**, gói xu và gói thuê bao. Số lượt mỗi
màn không nằm trong dữ liệu màn đã trích (trường `ii` không khớp), nên chắc cũng
từ remote config.

### Reset tiến độ

Tiến độ lưu trong `localStorage` của trình duyệt. Ba cách về màn 1:

| Cách | |
|---|---|
| **http://localhost:8080/?reset** | xoá tiến độ, vào thẳng màn 1 |
| **http://localhost:8080/?level=N** | nhảy tới màn N (vd `?level=250`) |
| Nút đỏ **"Chơi lại từ màn 1"** trong ⚙ | hỏi xác nhận rồi xoá |

Query string tự bị gỡ khỏi URL sau khi chạy, nên F5 không reset lại lần nữa.
Số màn nào bản gốc không có thì tự nhảy về màn gần nhất.

Ký hiệu trên mặt khối (giống bản gốc):

- **Hình bầu dục trắng sáng** — mũi tên chỉ thẳng ra khỏi mặt đó (nhìn trực diện đầu mũi tên)
- **Hình bầu dục xám** — mặt đối diện, tức đuôi mũi tên
- **Mũi tên trắng** — hình chiếu của hướng bay lên mặt đang nhìn

## Level

- **2138 màn**, trích trực tiếp từ asset Unity của bản gốc → `levels.bin` (3,1 MB).
- Màn 1–10 là chuỗi hướng dẫn gốc (1, 2, 4, 9, 8, 12, 18, 16, 27, 27 khối), khớp từng khối với video gameplay.
- Đã kiểm tra: **cả 2138 màn giải sạch được** (606.876 khối, không sót khối nào)
  bằng chính luật `isFree()` mà game đang dùng.

Bản gốc ship nhiều biến thể cho mỗi số màn (9.702 blob khác nhau cho 2.191 tên).
Ở đây mỗi số màn chọn một biến thể giải được, cố định theo hash nên thứ tự luôn ổn định.
53 số màn không có biến thể nào giải được đã bị bỏ, nên dãy số màn có chỗ nhảy.

## Mô hình dữ liệu đã giải mã

File Unity (`assets/bin/Data/*`, Unity 6000.3.16f1) chứa MonoBehaviour tên `level_<n>`:

```
string  name                 "level_1"
string  hash                 64 hex
int3    size                 (sx, sy, sz)
float3  euler                chỉ level_5 khác 0 (là dữ liệu editor, không dùng)
float   scale, int, int, float
int3    size (lặp lại), int3 (0,0,0)
int     cellCount            = sx*sy*sz
int3[]  cells                (type, dir, color) cho từng ô
```

- ô thứ `i` → `cx = i % sx`, `cy = (i / sx) % sy`, `cz = i / (sx*sy)`
- `type`: 0 = trống, 1 = khối có mũi tên, 2 / 3 = khối chặn cố định (không có hướng)
- `dir` 1..6 → `+Z −Z +Y −Y +X −X` (trong hệ toạ độ của file)
- `color` 1..15

Để khớp hướng hiển thị của bản gốc, game đổi trục: `world(x,y,z) = file(cz, cy, cx)`,
khi đó `dir` 1..6 thành `+X −X +Y −Y +Z −Z`, camera isometric đặt ở yaw −45°, pitch 35,264°.

Cách xác minh: thử toàn bộ 6 thứ tự duyệt × 720 cách gán hướng, chỉ **một** tổ hợp
cho ra 0 màn bí trên tập màn không đối xứng — đúng tổ hợp trên. Sau đó đối chiếu
lại với video: vị trí từng bầu dục trắng/xám và từng mũi tên của màn 3 và 4 trùng khớp.

**Luật:** một khối bay ra được khi mọi ô trên tia theo hướng của nó, tới hết
bounding box của màn, đều trống. Vì gỡ một khối chỉ có thể *mở* đường cho khối khác,
tập khối gỡ được chỉ tăng → không có nước đi sai, không bí giữa màn.

## Màu

Màu 1 (vàng), 5 (tím nhạt), 6 (tím), 7 (xanh dương), 8 (xanh lá) lấy mẫu trực tiếp
từ video gameplay. 10 màu còn lại video không xuất hiện nên được chọn cho hợp bộ —
đây là phần **không** chắc khớp 100% với bản gốc.

## Kỹ thuật

- Một `InstancedMesh` duy nhất cho toàn bộ khối → **1 draw call** mỗi frame.
- Hình khối bo góc tự sinh, mỗi vertex mang thêm `aFaceN/aFaceT/aFaceB/aFaceUV`
  để shader biết mình đang ở mặt nào; decal (bầu dục / mũi tên) tính trong fragment shader
  từ hình chiếu của hướng lên mặt đó → không cần texture atlas.
- 60 fps ở màn lớn nhất (1053 khối, 202k tam giác) trên Intel UHD Graphics.
- Không có dependency ngoài: `three` để sẵn trong `vendor/`.

## File

```
web/
  index.html        Home, HUD, hàng booster, các overlay, nền trời/núi
  main.js           engine 3D: parse levels.bin, shader, luật, xoay, booster API
  ui.js             toàn bộ DOM — Home, HUD, booster, tutorial, overlay, combo
  econ.js           ví, tiến độ, kho booster (cùng mô hình với Tube Tangle)
  levels.bin        2138 màn (header BAWY + directory + 5 byte/khối)
  vendor/           three.js r180
  start.cmd         chạy server localhost
```

`main.js` không chạm thẻ DOM nào ngoài canvas; hai bên nói chuyện qua sự kiện
(`game.on('win'…)`) và vài phương thức booster (`findHint`, `armMagnet`, `sweep`).
Đổi giao diện thì không phải mở file game ra.

UI/UX theo `C:\CuongPC\Game\UI_UX_RULES.md`.
