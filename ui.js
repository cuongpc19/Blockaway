/* Home, HUD, booster và overlay.
 *
 * Toàn bộ DOM nằm ở đây; main.js không chạm vào thẻ nào ngoài canvas. Hai bên
 * nói chuyện qua sự kiện (game.on) và vài phương thức booster (lamp,
 * magnetAll, rocket) — đổi giao diện thì không phải mở file game ra.
 *
 * Luật áp dụng: C:\CuongPC\Game\UI_UX_RULES.md
 */

import { save, ECON, BOOSTERS } from './econ.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

/* ───────────────────────── vặt ───────────────────────── */

let toastT = 0;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('on'), 1900);
}

function openOv(id) { $(id).classList.add('on'); }
function closeOv(id) { $(id).classList.remove('on'); }

/* ───────────────────────── main ───────────────────────── */

export function startUI(game, boot) {
  let screen = 'home';

  /* ══════════ điều hướng màn hình ══════════ */
  function show(name) {
    screen = name;
    $('#screenHome').classList.toggle('on', name === 'home');
    $('#screenGame').classList.toggle('on', name === 'game');
    // Home không cần khối 3D; tắt hẳn canvas để đỡ tốn pin khi đứng ở đó
    $('#gl').style.visibility = name === 'game' ? 'visible' : 'hidden';
    game.paused = name !== 'game';
    if (name === 'home') { endTut(false); refreshHome(); }
    else maybeTut();      // load() đã chạy trước khi màn chơi hiện ra
  }

  function play(slot) {
    save.setSlot(slot);
    save.newLevel();          // suất booster miễn phí nạp lại mỗi màn
    game.load(slot);
    show('game');
  }

  /* ══════════ ví ══════════ */
  function refreshWallet() {
    $$('[data-coins]').forEach((el) => { el.textContent = save.coins; });
  }
  save.onChange(() => { refreshWallet(); refreshTools(); });

  /* ══════════ HOME ══════════ */
  function refreshHome() {
    const n = game.levels.index[save.slot]?.num ?? 1;
    $('#homeLevel').textContent = n;
    refreshWallet();
    // Chấm đỏ chỉ bật khi thật sự có thứ để nhận.
    $('#dailyDot').hidden = !save.dailyReady();
  }

  $('#btnPlay').onclick = () => play(save.slot);
  $('#btnHomeSet').onclick = openSettings;
  $('#btnDaily').onclick = () => {
    $('#dailyAmt').textContent = ECON.DAILY_COINS;
    const ready = save.dailyReady();
    $('#dailyClaim').disabled = !ready;
    $('#dailyClaim').textContent = ready ? 'Nhận' : 'Mai quay lại nhé';
    openOv('#dailyOverlay');
  };
  $('#dailyClaim').onclick = () => {
    const got = save.claimDaily();
    closeOv('#dailyOverlay');
    if (got) { toast(`+${got} xu`); refreshHome(); }
  };

  /* ══════════ HUD ══════════ */
  $('#btnGameSet').onclick = openSettings;
  const retries = {};
  $('#btnRestart').onclick = () => {
    retries[game.num] = (retries[game.num] | 0) + 1;
    save.newLevel();
    game.load(game.slot);
  };
  $('#btnRecenter').onclick = () => {
    game.anim = true;
    game.setDist(game.fitDist);
  };

  /* ══════════ thu phóng ══════════
   * Hai nút ở hai góc dưới là đường *nhìn thấy được*; con lăn và chụm hai ngón
   * nhanh hơn nhiều nhưng không ai đoán ra nếu game không nói. Nên lần đầu
   * người chơi dùng nút, game chỉ luôn cho họ đường tắt — đúng một lần, có cờ
   * lưu lại, và cờ ấy bị xoá cùng tiến độ khi reset. */
  const ZOOM_STEP = 0.82;
  function syncZoom(st) {
    st = st || game.zoomState();
    $('#btnZoomIn').disabled = st.atMin;
    $('#btnZoomOut').disabled = st.atMax;
  }
  const TOUCH = matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints > 0;
  function zoomHint() {
    if (!save.tutPending('zoom', 1)) return;
    save.markTut('zoom');
    const demo = $('#zoomDemo');
    demo.classList.toggle('touch', TOUCH);
    demo.classList.toggle('mouse', !TOUCH);
    $('#zoomText').textContent = TOUCH
      ? 'Nhanh hơn: chụm hoặc xoè hai ngón ngay trên khối để thu nhỏ / phóng to.'
      : 'Nhanh hơn: lăn chuột lên xuống ngay trên khối để phóng to / thu nhỏ.';
    // để người chơi kịp thấy nút vừa bấm đã làm gì rồi mới chen lời mách nước
    setTimeout(() => openOv('#zoomOverlay'), 520);
  }
  $('#btnZoomIn').onclick = () => { game.zoomBy(ZOOM_STEP); zoomHint(); };
  $('#btnZoomOut').onclick = () => { game.zoomBy(1 / ZOOM_STEP); zoomHint(); };
  game.on('zoom', syncZoom);

  /* ══════════ booster ══════════
   * Một nút có ba trạng thái, và badge nói luôn trạng thái đó: số lượt còn
   * (xanh) hoặc giá (vàng). Không bắt người chơi bấm rồi mới biết mình hụt. */
  const TOOL = {
    hint:   { btn: '#tHint',   price: '#pHint' },
    magnet: { btn: '#tMagnet', price: '#pMagnet' },
    rocket: { btn: '#tRocket', price: '#pRocket' },
  };

  function refreshTools() {
    for (const b of BOOSTERS) {
      const t = TOOL[b.id];
      const btn = $(t.btn), badge = $(t.price);
      // 2.4 — chưa tới màn mở khoá thì dựng sẵn nhưng ẩn, không xoá code
      btn.hidden = !save.unlocked(b.id, game.num);
      if (btn.hidden) continue;
      const o = save.offer(b.id);
      if (o.kind === 'buy') {
        badge.textContent = o.price;
        badge.classList.add('buy');
        // Không dùng được thì mờ đi, đừng để bấm rồi báo lỗi.
        btn.disabled = save.coins < o.price;
      } else {
        badge.textContent = o.n;
        badge.classList.remove('buy');
        btn.disabled = false;
      }
    }
  }

  /** true nếu tiêu được một lượt (miễn phí → kho → ví) */
  function spend(id) {
    const o = save.offer(id);
    if (o.kind === 'buy' && save.coins < o.price) {
      toast('Chưa đủ xu');
      return false;
    }
    if (o.kind === 'buy') { openShop(id); return false; }   // mua thì phải xác nhận
    save.use(id);
    refreshTools();
    return true;
  }

  function runBooster(id) {
    if (id === 'hint')   { toast(`Có ${game.lamp(3)} khối thả được`); return true; }
    if (id === 'magnet') { game.magnetAll(); return true; }
    if (id === 'rocket') { toast(`Nổ ${game.rocket()} khối`); return true; }
    return false;
  }

  /* Gợi ý và Nam châm vô dụng khi không còn khối nào thoát được, nên chặn
     TRƯỚC khi trừ lượt. Tên lửa thì ngược lại — đó chính là lúc nó cần. */
  function needsFree(id) { return id === 'hint' || id === 'magnet'; }

  for (const bo of BOOSTERS) {
    $(TOOL[bo.id].btn).onclick = () => {
      const teaching = tutId === bo.id;
      if (needsFree(bo.id) && !game.freeCubes().length) {
        toast('Không còn khối nào thoát được — thử Tên lửa');
        return;
      }
      if (spend(bo.id)) { runBooster(bo.id); if (teaching) endTut(); }
    };
  }

  /* ══════════ tutorial booster ══════════
   * Khoét một lỗ quanh đúng nút, tối hết phần còn lại, chặn mọi chạm khác và
   * chỉ để lọt đúng nút đó — người chơi phải *làm* việc ấy mới đi tiếp được,
   * chứ không phải đọc rồi tự đi tìm nút (luật 3.4). */
  let tutId = null, tutTimer = 0;
  const HAND_H = 66;                 // chiều cao svg bàn tay ở bề ngang 54px
  function placeTut(id) {
    const btn = $(TOOL[id].btn);
    const r = btn.getBoundingClientRect();
    const pad = 9;
    const hole = $('#tutHole');
    hole.style.left = (r.left - pad) + 'px';
    hole.style.top = (r.top - pad) + 'px';
    hole.style.width = (r.width + pad * 2) + 'px';
    hole.style.height = (r.height + pad * 2) + 'px';

    /* Bàn tay chỉ vào nút bằng ĐẦU NGÓN, và đầu ngón nằm ở ~40% bề ngang,
       ~8% chiều cao của svg. Hàng booster ngồi sát đáy màn hình, nên chỗ bên
       dưới nút thường không đủ cho cả bàn tay — lúc ấy lật tay lên nằm trên,
       ngón chỉ xuống, thay vì để nó thò ra ngoài màn hình. */
    const hand = $('#tutHand');
    const below = r.bottom + HAND_H + 10 <= window.innerHeight;
    const tipX = r.left + r.width * (below ? 0.60 : 0.44);
    const tipY = below ? r.top + r.height * 0.58 : r.top + r.height * 0.30;
    hand.classList.toggle('up', !below);
    hand.style.left = (tipX - 21) + 'px';
    hand.style.top = (tipY - 6) + 'px';

    /* Thẻ hướng dẫn luôn nằm TRÊN cả lỗ khoét lẫn bàn tay, và mũi nhọn của nó
       chỉ xuống đúng nút. */
    const stackTop = below ? r.top - pad : tipY - HAND_H;
    const tip = $('#tutTip');
    tip.style.left = '50%';
    tip.style.transform = 'translateX(-50%)';
    tip.style.bottom = Math.min(
      window.innerHeight - stackTop + 22,
      window.innerHeight - tip.offsetHeight - 76) + 'px';

    // chặn mọi nơi TRỪ ô của nút, để cú chạm rơi thẳng xuống nút
    const W = window.innerWidth, H = window.innerHeight;
    const x0 = r.left - pad, y0 = r.top - pad;
    const x1 = r.right + pad, y1 = r.bottom + pad;
    const put = (sel, l, t, w, h) => {
      const e = $('#tutBlock ' + sel);
      e.style.cssText = `left:${l}px;top:${t}px;width:${Math.max(0, w)}px;height:${Math.max(0, h)}px`;
    };
    put('[data-t]', 0, 0, W, y0);
    put('[data-b]', 0, y1, W, H - y1);
    put('[data-l]', 0, y0, x0, y1 - y0);
    put('[data-r]', x1, y0, W - x1, y1 - y0);
  }
  function showTut(id) {
    const btn = $(TOOL[id].btn);
    /* Chỉ dạy khi cái nút đang thật sự nằm trên màn chơi. Ở Home thì
       #screenGame là display:none nên rect trả về toàn số 0 — lỗ khoét rơi về
       góc trên trái và bốn tấm chặn phủ kín, thành ra tối đen cả Home. */
    if (screen !== 'game' || btn.hidden || btn.getBoundingClientRect().width < 1) return;
    const b = BOOSTERS.find((x) => x.id === id);
    tutId = id;
    /* Cùng artwork với nút thật (luật 3.4): người chơi phải nhận ra đúng cái
       nút mình sắp bấm, chứ không phải học một icon thứ hai. */
    $('#tutIcon').innerHTML = btn.querySelector('svg').outerHTML;
    $('#tutName').textContent = b.name;
    $('#tutText').textContent = b.desc;
    $('#tutCta').innerHTML = 'Chạm vào nút đang sáng <em>↓</em>';
    $('#tut').hidden = false;
    placeTut(id);
  }
  /** mark=false khi người chơi rời màn giữa chừng: chưa dạy xong thì chưa tính */
  function endTut(mark = true) {
    clearTimeout(tutTimer);
    if (!tutId) return;
    $('#tut').hidden = true;
    if (mark) save.markTut(tutId);
    tutId = null;
  }
  window.addEventListener('resize', () => { if (tutId) placeTut(tutId); });
  /* Lối ra: người đã biết booster này rồi thì không bị nhốt trong bài dạy.
     Bỏ qua vẫn tính là đã dạy — bật lại ở màn sau là làm phiền. */
  $('#tutSkip').onclick = () => endTut();

  /** gọi mỗi khi vào màn: booster nào vừa mở khoá mà chưa dạy thì dạy */
  function maybeTut() {
    clearTimeout(tutTimer);
    if (tutId) endTut(false);
    if (screen !== 'game') return;
    const due = BOOSTERS.find((b) => save.tutPending(b.id, game.num));
    if (due) tutTimer = setTimeout(() => showTut(due.id), 620);
  }

  /* ══════════ cửa hàng một món ══════════ */
  let shopId = null;
  function openShop(id) {
    const b = BOOSTERS.find((x) => x.id === id);
    shopId = id;
    $('#shopName').textContent = b.name;
    $('#shopDesc').textContent = b.desc;
    $('#shopPrice').textContent = ECON.PRICE[id];
    $('#shopIcon').innerHTML = $(TOOL[id].btn).querySelector('svg').outerHTML;
    $('#shopBuy').disabled = save.coins < ECON.PRICE[id];
    openOv('#shopOverlay');
  }
  $('#shopBuy').onclick = () => {
    if (!shopId) return;
    if (!save.use(shopId)) { toast('Chưa đủ xu'); return; }
    closeOv('#shopOverlay');
    refreshTools();
    runBooster(shopId);
  };

  /* ══════════ cài đặt ══════════ */
  function openSettings() {
    $('#jump').value = String(game.num || 1);
    $('#sndSw').classList.toggle('on', save.snd);
    $('#freeSw').classList.toggle('on', save.free3d);
    $('#setHint').textContent =
      `${game.levels.count} màn lấy trực tiếp từ bản gốc 2.8.6 · màn hiện tại #${game.num}`;
    openOv('#setOverlay');
  }
  $('#sndSw').onclick = () => {
    save.setSnd(!save.snd);
    game.sfx.on = save.snd;
    $('#sndSw').classList.toggle('on', save.snd);
  };
  $('#freeSw').onclick = () => {
    save.setFree3d(!save.free3d);
    $('#freeSw').classList.toggle('on', save.free3d);
    game.freeSpin = save.free3d;
    game.yaw = game.pitch = 0; game.q.identity();
    game.vYaw = game.vPitch = game.spinVel = 0; game.anim = false;
    game.applyRot();
  };
  $('#jumpGo').onclick = () => {
    const n = parseInt($('#jump').value, 10);
    if (!Number.isFinite(n)) return;
    const slot = game.levels.byNum.get(n) ?? game.nearestSlot(n);
    closeOv('#setOverlay');
    play(slot);
  };
  $('#resetAll').onclick = () => {
    if (!confirm('Xoá tiến độ và ví, chơi lại từ màn 1?')) return;
    save.wipeProgress();
    closeOv('#setOverlay');
    refreshWallet(); refreshTools();
    play(0);
  };

  /* ══════════ thắng màn ══════════ */
  const FACE_COLS = ['#7bd33f', '#ffc80d', '#f2552f'];
  const FACE_SIZE = [56, 84, 68];
  const MOUTHS = [
    'M9 17 Q16 11 23 17',    // lo lắng
    'M9 15 Q16 23 23 15',    // cười toe
    'M10 16 Q16 21 22 16',   // cười mỉm
  ];
  function winScreen() {
    game.sfx.win();
    const coins = ECON.WIN_COINS;
    save.addCoins(coins);
    $('#winCoins').textContent = '+' + coins;

    const box = $('#faces');
    box.innerHTML = '';
    FACE_COLS.forEach((col, i) => {
      const d = document.createElement('div');
      d.className = 'face';
      d.style.cssText = `width:${FACE_SIZE[i]}px;height:${FACE_SIZE[i]}px;background:${col};
        animation:pop .5s cubic-bezier(.2,1.7,.4,1) ${i * 0.07}s both`;
      d.innerHTML =
        `<svg viewBox="0 0 32 32" style="position:absolute;inset:0;width:100%;height:100%">
           <ellipse cx="11" cy="11" rx="2.7" ry="3.4" fill="#3a2a1a"/>
           <ellipse cx="21" cy="11" rx="2.7" ry="3.4" fill="#3a2a1a"/>
           <ellipse cx="11.9" cy="9.8" rx="1" ry="1.2" fill="#fff"/>
           <ellipse cx="21.9" cy="9.8" rx="1" ry="1.2" fill="#fff"/>
           <path d="${MOUTHS[i]}" stroke="#3a2a1a" stroke-width="2.1" fill="none" stroke-linecap="round"/>
         </svg>`;
      box.appendChild(d);
    });

    const nxt = Math.min(game.slot + 1, game.levels.count - 1);
    $('#winNext').textContent = 'Level ' + game.levels.index[nxt].num;
    openOv('#winOverlay');
  }
  $('#winNext').onclick = () => {
    closeOv('#winOverlay');
    play(Math.min(game.slot + 1, game.levels.count - 1));
  };
  $('#winReplay').onclick = () => { closeOv('#winOverlay'); play(game.slot); };
  $('#winHome').onclick = () => { closeOv('#winOverlay'); show('home'); };

  /* ══════════ combo + hướng dẫn ══════════ */
  const HUES = ['#ff5d8f', '#7ee8ff', '#ffd84d', '#a6ff7a', '#ff9de0', '#9ec6ff'];
  function showCombo() {
    const el = $('#combo');
    el.style.color = HUES[(game.combo - 1) % HUES.length];
    el.querySelector('b').textContent = 'X' + game.combo;
    el.classList.remove('on');
    void el.offsetWidth;
    el.classList.add('on');
  }

  const TIPS = {
    1: 'Chạm để thả khối',
    2: 'Chạm để thả các khối',
    3: 'Khối bị chặn thì chưa ra được',
    5: 'Vuốt để xoay khối',
  };
  let tipT = 0;
  function showTip() {
    const el = $('#tip');
    const t = TIPS[game.num];
    if (!t) { el.classList.remove('on'); return; }
    el.textContent = t;
    el.classList.add('on');
    clearTimeout(tipT);
    tipT = setTimeout(() => el.classList.remove('on'), 6000);
  }

  /* ══════════ nối dây game → UI ══════════ */
  game.on('levelStart', () => {
    $('#levelNum').textContent = game.num;
    /* 2.9 — nhãn chỉ bật khi màn này khó: cờ `ih` của bản gốc, hoặc khi chính
       người chơi đã phải chơi lại màn này từ 2 lần trở lên. Dán lên mọi màn
       thì nó thôi là thông tin. */
    const retried = (retries[game.num] | 0) >= 2;
    const tag = game.hard || retried;
    $('#levelTag').hidden = !tag;
    $('#levelTag').textContent = retried && !game.hard ? 'CỐ LÊN' : 'KHÓ';
    $('#levelPill').classList.toggle('tagged', tag);
    $('#combo').classList.remove('on');
    closeOv('#winOverlay');
    refreshTools();
    syncZoom();
    showTip();
    if (screen === 'game') maybeTut();
  });
  game.on('release', () => showCombo());
  game.on('win', () => winScreen());
  /* Cú nổ phải chạm tới cả khung hình, không chỉ tới mấy khối quanh nó. */
  game.on('boom', () => {
    const f = $('#flash');
    f.classList.remove('on');
    void f.offsetWidth;
    f.classList.add('on');
  });

  /* đóng overlay bằng nền mờ hoặc nút Đóng */
  $$('[data-close]').forEach((el) => {
    el.addEventListener('click', () => el.closest('.overlay').classList.remove('on'));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = $$('.overlay.on');
    if (open.length) open[open.length - 1].classList.remove('on');
    else if (screen === 'game') show('home');
  });

  /* ══════════ vào game ══════════ */
  game.freeSpin = save.free3d;
  refreshWallet();
  refreshTools();
  /* Link dev (?level=, ?reset) là để nhảy thẳng vào chơi — dừng ở Home thì
     mất đúng cái tiện mà nó sinh ra. Vào bình thường thì mở Home. */
  if (boot.forced) play(boot.slot);
  else { game.load(boot.slot); show('home'); }
}
