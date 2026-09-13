/* Ví, tiến độ và kho booster.
 *
 * Cùng mô hình với Tube Tangle (src/save.js): mỗi booster là một **số lượng
 * người chơi đang có**, nằm trên một **suất miễn phí nhỏ được cấp lại mỗi
 * màn**. Chạy hết cả hai thì nút thôi hiện số và chuyển thành hiện giá.
 *
 * Không có quảng cáo, nên xu là đường nạp duy nhất — đó là lý do mấy con số
 * dưới đây có trọng lượng. Đọc chúng cùng với WIN_COINS: một lần thắng mua
 * được một lần Gợi ý, năm lần thắng mua được một Nam châm.
 */

export const ECON = {
  /* coin_level_reward=5 từ coin_reward_start=10 (default_config.android.json) */
  WIN_COINS: 5,
  COIN_REWARD_FROM: 10,
  DAILY_COINS: 100,

  /* Lấy nguyên từ `boosters_economy_v2` trong assets/Config/default_config.android.json
     (bản mặc định của remote config, nằm sẵn trong APK):
       Rockets  unlocked_at 7   initial_uses 2   price_in_coins 400
       Lamp     unlocked_at 9   initial_uses 1   price_in_coins 150
       Magnet   unlocked_at 12  initial_uses 1   price_in_coins 300  */
  UNLOCK:         { rocket: 7, hint: 9, magnet: 12 },
  START_BAG:      { rocket: 2, hint: 1, magnet: 1 },
  FREE_PER_LEVEL: { rocket: 0, hint: 0, magnet: 0 },
  PRICE:          { rocket: 400, hint: 150, magnet: 300 },
};

/* Mô tả dịch từ đúng chuỗi bản gốc dùng:
     Hint   — "Highlights all cubes you can release!"
     Magnet — "Attracts all tappable cubes at once!"
     Rocket — "Blows up some cubes!" / "No cubes to release? Use Rocket!" */
export const BOOSTERS = [
  { id: 'rocket', name: 'Tên lửa',  desc: 'Nổ tung một mảng khối, phá được cả khối chặn',
    tip: 'Chạm để kích hoạt khi bạn bị bí.' },        // "Tap to activate it when you're blocked."
  { id: 'hint',   name: 'Gợi ý',    desc: 'Làm sáng mọi khối có thể thả',
    tip: 'Chạm để làm sáng mọi khối bạn có thể thả.' }, // "Tap to highlight all cubes you can release."
  { id: 'magnet', name: 'Nam châm', desc: 'Hút mọi khối có thể thả ra cùng lúc',
    tip: 'Chạm để hút mọi khối thả được ra cùng lúc.' }, // "Tap to attract all tappable cubes at once."
];

const KEY = 'ba_save_v1';
const IDS = BOOSTERS.map((b) => b.id);

function blank() {
  return {
    coins: 120,
    slot: 0,
    best: 0,
    seenTut: {},           // tutorial nào đã xem rồi
    bag: { ...ECON.START_BAG },
    freeUsed: {},          // theo màn đang chơi, không lưu xuống đĩa
    lastDaily: '',         // 'YYYY-MM-DD'
    snd: true,
    free3d: false,
  };
}

let S = blank();
const listeners = new Set();

/* localStorage có thể ném lỗi (cửa sổ ẩn danh, chặn site data), và một ván
   chơi không được phép chết vì không ghi được điểm. */
function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const o = JSON.parse(raw);
    if (o && typeof o === 'object') {
      S = { ...blank(), ...o, bag: { ...ECON.START_BAG, ...(o.bag || {}) } };
      S.freeUsed = {};
    }
  } catch (_) { /* giữ nguyên mặc định */ }
}
function write() {
  try {
    const { freeUsed, ...keep } = S;
    localStorage.setItem(KEY, JSON.stringify(keep));
  } catch (_) { /* chơi tiếp, chỉ là không lưu được */ }
}
function emit() { listeners.forEach((f) => { try { f(S); } catch (_) {} }); }

read();

export const save = {
  get state() { return S; },
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  /* ---------------- ví ---------------- */
  get coins() { return S.coins | 0; },
  addCoins(n) { S.coins = Math.max(0, (S.coins | 0) + (n | 0)); write(); emit(); },
  spend(n) {
    if ((S.coins | 0) < n) return false;
    S.coins -= n; write(); emit(); return true;
  },

  /* ---------------- tiến độ ---------------- */
  get slot() { return S.slot | 0; },
  setSlot(i) {
    S.slot = i | 0;
    if (S.slot > (S.best | 0)) S.best = S.slot;
    write(); emit();
  },
  get best() { return S.best | 0; },

  /* ---------------- booster ----------------
   * Một nút chỉ có ba trạng thái, và thứ tự tiêu là cố định: suất miễn phí của
   * màn trước, rồi tới kho, cuối cùng mới tới ví. */
  offer(id) {
    const free = Math.max(0,
      (ECON.FREE_PER_LEVEL[id] | 0) - (S.freeUsed[id] | 0));
    if (free > 0) return { kind: 'free', n: free, price: 0 };
    const owned = S.bag[id] | 0;
    if (owned > 0) return { kind: 'bag', n: owned, price: 0 };
    return { kind: 'buy', n: 0, price: ECON.PRICE[id] | 0 };
  },
  /** true nếu đã trừ được; false nếu không đủ xu (nút phải mờ từ trước) */
  use(id) {
    const o = this.offer(id);
    if (o.kind === 'free') { S.freeUsed[id] = (S.freeUsed[id] | 0) + 1; emit(); return true; }
    if (o.kind === 'bag')  { S.bag[id] = (S.bag[id] | 0) - 1; write(); emit(); return true; }
    if (!this.spend(o.price)) return false;
    return true;
  },
  grant(id, n) { S.bag[id] = (S.bag[id] | 0) + (n | 0); write(); emit(); },
  /** gọi khi vào màn mới: suất miễn phí nạp lại */
  newLevel() { S.freeUsed = {}; emit(); },

  /* ---------------- mở khoá + tutorial ---------------- */
  unlocked(id, levelNum) { return (levelNum | 0) >= (ECON.UNLOCK[id] | 0); },
  /** true đúng một lần: lần đầu người chơi đặt chân tới màn mở khoá */
  tutPending(id, levelNum) {
    return this.unlocked(id, levelNum) && !S.seenTut[id];
  },
  markTut(id) { S.seenTut[id] = 1; write(); emit(); },

  /* ---------------- quà hằng ngày ---------------- */
  today() { return new Date().toISOString().slice(0, 10); },
  dailyReady() { return S.lastDaily !== this.today(); },
  claimDaily() {
    if (!this.dailyReady()) return 0;
    S.lastDaily = this.today();
    this.addCoins(ECON.DAILY_COINS);
    return ECON.DAILY_COINS;
  },

  /* ---------------- tuỳ chọn ---------------- */
  get snd() { return S.snd !== false; },
  setSnd(v) { S.snd = !!v; write(); emit(); },
  get free3d() { return !!S.free3d; },
  setFree3d(v) { S.free3d = !!v; write(); emit(); },

  /* ---------------- reset ----------------
   * Xoá tiến độ và ví, **giữ** tuỳ chọn: người đang test tắt tiếng vì đã nghe
   * tiếng đó hai trăm lần, reset mà bật lại là phạt người dùng công cụ. */
  wipeProgress() {
    const { snd, free3d } = S;
    S = blank();
    S.snd = snd; S.free3d = free3d;
    write(); emit();
  },
};
