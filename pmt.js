/* pmt.js — 📝 ประเมินครูผู้ช่วย (การเตรียมความพร้อมและพัฒนาอย่างเข้ม ก่อนแต่งตั้งให้ดำรงตำแหน่งครู) · โรงเรียนวัดแสนเกษม
 * ข้อมูล: แผ่น "ประเมินครูผู้ช่วย" ในไฟล์ระบบตารางสอน (อ่าน/แก้ผ่านระบบแจ้งเตือน a=pmt / a=pmtset)
 * ครูทุกคนดูได้ · ผู้บริหาร (ตรวจรหัส) เพิ่ม/แก้/ย้ายออก/ติ๊กประเมินแล้ว
 * วันประเมิน = วันบรรจุ + 6, 12, 18, 24 เดือน − 1 วัน (แก้เองได้ถ้า ก.ก. กำหนดต่าง) */
(function () {
  var NT = 'https://script.google.com/macros/s/AKfycbwskmmW5YzzBnZCTi5q0TkuHEgW6DnIvkvWmw64Ee8xlawg9mJRQ6cdM5c2_0YK9x_MWg/exec';
  var MS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var MF = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  // สีพาสเทลประจำตัว (ไล่ต่อไปสำหรับคนใหม่): [ชื่อ, สีหลัก, พื้นอ่อน, สีเข้ม]
  var PAL = [['ส้มพีช', '#FFB48F', '#FFF2EA', '#D9622B'], ['เขียวมิ้นต์', '#86DDBB', '#EAFBF3', '#1E8C62'], ['ม่วงลาเวนเดอร์', '#BDA8F2', '#F4EFFE', '#6E4BC9'],
    ['ฟ้า', '#92CCF6', '#EBF6FE', '#2577BD'], ['ชมพู', '#F7A6C7', '#FEEFF5', '#C93D7C'], ['เหลืองเลมอน', '#F3D774', '#FFF9E2', '#9C7600'],
    ['ฟ้าอมเขียว', '#82DCDB', '#E9FAFA', '#16878A'], ['ชมพูพีช', '#F5AFA8', '#FEF0EE', '#C24A3E'], ['ม่วงไลแลค', '#D9A8EE', '#FAF0FE', '#9340B5'], ['เขียวมะนาว', '#BEE38A', '#F5FCEB', '#5C8A1E']];
  var HOT = 30; // วัน: ใกล้ถึงกำหนด → วิบวับ + เปิดดูทั้ง 4 ครั้ง
  var S = { L: [], pw: '', adm: false, names: [], open: {}, edit: null, busy: false, login: false, lerr: '', err: '', loading: false, showOut: false };
  var box, ovf = '';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lget(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function sget(k) { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function today() { return new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10); }
  function ok(d) { return /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')); }
  function dt(d) { return new Date(d + 'T00:00:00Z'); }
  function days(d) { return Math.round((dt(d) - dt(today())) / 864e5); }
  function dTh(d, full) { if (!ok(d)) return '—'; var x = dt(d); return x.getUTCDate() + ' ' + (full ? MF : MS)[x.getUTCMonth()] + ' ' + (full ? x.getUTCFullYear() + 543 : String(x.getUTCFullYear() + 543).slice(2)); }
  function fn(s) { return String(s || '').replace(/^(นางสาว|นาง|นาย|น\.ส\.|ว่าที่\s*ร\.?ต\.?\s*(หญิง)?)\s*/, '').trim().split(/\s+/)[0]; }
  function title(n) { return 'ครู' + String(n || '').replace(/^(นางสาว|นาง|นาย|น\.ส\.)\s*/, '').trim(); }
  function pal(i) { return PAL[(Number(i) || 0) % PAL.length]; }
  function post(o) { return fetch(NT, { method: 'POST', body: JSON.stringify(o) }).then(function (r) { return r.json(); }); }
  function toast(m) { var t = document.getElementById('pmToast'); if (!t) return; t.textContent = m; t.style.display = 'block'; clearTimeout(toast.h); toast.h = setTimeout(function () { t.style.display = 'none'; }, 3500); }
  function val(id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; }

  /** วันประเมิน: วันบรรจุ + m เดือน − 1 วัน (ถ้าวันที่ไม่มีในเดือนนั้น เช่น 31 → ใช้วันสุดท้ายของเดือน) */
  function addM(s, m) {
    var p = s.split('-').map(Number), d = new Date(Date.UTC(p[0], p[1] - 1 + m, p[2]));
    if (d.getUTCDate() !== p[2]) d = new Date(Date.UTC(p[0], p[1] + m, 1));
    return new Date(d.getTime() - 864e5).toISOString().slice(0, 10);
  }
  function calc(s) { return ok(s) ? [6, 12, 18, 24].map(function (m) { return addM(s, m); }) : ['', '', '', '']; }

  // ---------- สถานะของแต่ละคน ----------
  function info(x) {
    var o = { pend: !ok(x.s), done: x.ok.length, all: false, next: -1, hot: false, late: -1 };
    if (o.pend) return o;
    for (var k = 0; k < 4; k++) {
      if (x.ok.indexOf(k + 1) >= 0 || !ok(x.d[k])) continue;
      var dd = days(x.d[k]);
      if (dd < 0) { if (o.late < 0 && dd >= -HOT) o.late = k; continue; }
      if (o.next < 0) o.next = k;
    }
    o.all = x.ok.length >= 4;
    o.hot = o.late >= 0 || (o.next >= 0 && days(x.d[o.next]) <= HOT);
    return o;
  }
  function sortKey(x) {
    var i = info(x);
    if (x.st === 'ย้ายออก') return '9';
    if (i.pend) return '8';
    if (i.all) return '7';
    var k = i.late >= 0 ? i.late : i.next;
    return (i.hot ? '0' : '1') + (k >= 0 ? x.d[k] : '9999');
  }

  // ---------- หน้าตา ----------
  var CSS = '#pmBox{position:fixed;inset:0;z-index:200;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;background:linear-gradient(180deg,#FFF6F1 0,#F6F2FF 45%,#EEF7FF 100%);color:#2B2440;color-scheme:light;font-family:Sarabun,"Noto Sans Thai",sans-serif;font-size:15px}' +
    '#pmBox *{box-sizing:border-box}#pmBox .pm-in{max-width:560px;margin:0 auto;padding-bottom:48px}' +
    '#pmBox .pm-top{position:relative;overflow:hidden;background:linear-gradient(120deg,#FFC9B0,#F9B7D3 38%,#C9B6F6 70%,#A9D6F8);color:#3A2350;padding:16px 16px 18px;padding-top:calc(16px + env(safe-area-inset-top,0px));display:flex;gap:10px;align-items:flex-start;border-radius:0 0 22px 22px;box-shadow:0 6px 18px rgba(201,150,220,.35)}' +
    '#pmBox .pm-top b{display:block;font-size:18px;color:#3A2350;line-height:1.35}#pmBox .pm-top small{display:block;font-size:12.5px;color:#4E3866;margin-top:3px;line-height:1.45}' +
    '#pmBox .pm-top .tw{position:absolute;font-size:14px;opacity:.85;animation:pmTw 2.6s ease-in-out infinite;pointer-events:none}' +
    '#pmBox .pm-x{position:relative;z-index:1;margin-left:auto;flex:none;background:rgba(255,255,255,.55);color:#3A2350;border:0;border-radius:12px;font-size:15px;padding:7px 11px;cursor:pointer}' +
    '#pmBox .pm-w{padding:12px}' +
    '#pmBox .pm-sum{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 12px}#pmBox .pm-sum span{background:#fff;border-radius:99px;padding:4px 11px;font-size:13px;font-weight:700;color:#5B4A75;box-shadow:0 1px 4px rgba(120,90,160,.12)}' +
    '#pmBox .pm-card{position:relative;overflow:hidden;background:var(--s);border:2px solid var(--b);border-radius:20px;margin-bottom:12px;box-shadow:0 3px 10px rgba(120,90,160,.10);color:#2B2440}' +
    '#pmBox .pm-card.hot{animation:pmGlow 2.4s ease-in-out infinite}' +
    '#pmBox .pm-card.hot::after{content:"";position:absolute;top:0;bottom:0;left:0;width:60%;background:linear-gradient(105deg,transparent 0,rgba(255,255,255,.85) 50%,transparent 100%);transform:translateX(-120%) skewX(-18deg);animation:pmSweep 3.2s ease-in-out infinite;pointer-events:none}' +
    '#pmBox .pm-card .sp{position:absolute;pointer-events:none;font-size:15px;animation:pmTw 1.8s ease-in-out infinite;z-index:2}' +
    '#pmBox .pm-card.pend{background:#F4F4F6;border:2px dashed #B5B5BE;box-shadow:none;color:#5C5C66}' +
    '#pmBox .pm-card.out{opacity:.7;filter:grayscale(.6)}' +
    '#pmBox .pm-hd{display:flex;gap:11px;align-items:center;padding:12px 12px;cursor:pointer;width:100%;background:none;border:0;text-align:left;font:inherit;color:inherit}' +
    '#pmBox .pm-av{flex:none;width:50px;height:50px;border-radius:50%;background:#fff;border:3px solid var(--b);display:flex;align-items:center;justify-content:center;font-size:27px;box-shadow:0 2px 6px rgba(0,0,0,.08)}' +
    '#pmBox .pend .pm-av{border:2px dashed #B5B5BE;filter:grayscale(1);opacity:.7}' +
    '#pmBox .pm-nm{flex:1;min-width:0}#pmBox .pm-nm b{display:block;font-size:16.5px;color:var(--d);line-height:1.3;overflow-wrap:anywhere}#pmBox .pend .pm-nm b{color:#6B6B75}' +
    '#pmBox .pm-nm small{display:block;font-size:12.5px;color:#5E566E;margin-top:1px}' +
    '#pmBox .pm-nx{display:inline-block;margin-top:4px;background:#fff;color:var(--d);border-radius:99px;padding:2px 10px;font-size:12.5px;font-weight:800;max-width:100%}' +
    '#pmBox .hot .pm-nx{background:var(--d);color:#fff}#pmBox .pm-nx.late{background:#E0457B!important;color:#fff!important}' +
    '#pmBox .pm-dots{display:flex;gap:4px;margin-top:6px}#pmBox .pm-dots i{width:22px;height:7px;border-radius:9px;background:#fff;border:1.5px solid var(--b)}#pmBox .pm-dots i.on{background:var(--d);border-color:var(--d)}' +
    '#pmBox .pm-cv{flex:none;font-size:13px;color:var(--d);transition:transform .2s}#pmBox .open .pm-cv{transform:rotate(180deg)}' +
    '#pmBox .pm-bd{padding:0 12px 12px}' +
    '#pmBox .pm-r{display:flex;gap:10px;align-items:center;background:#fff;border-radius:14px;padding:9px 10px;margin-top:6px;box-shadow:0 1px 3px rgba(0,0,0,.05)}' +
    '#pmBox .pm-r.nx{outline:2.5px solid var(--d)}#pmBox .pm-r.dn{opacity:.75}' +
    '#pmBox .pm-k{flex:none;width:30px;height:30px;border-radius:50%;background:var(--b);color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center;font-size:15px;text-shadow:0 1px 2px rgba(0,0,0,.18)}' +
    '#pmBox .pm-r.dn .pm-k{background:#3DB37A}' +
    '#pmBox .pm-rt{flex:1;min-width:0;line-height:1.35}#pmBox .pm-rt b{display:block;font-size:14.5px}#pmBox .pm-rt small{display:block;font-size:12.5px;color:#6A6378}' +
    '#pmBox .pm-st{flex:none;font-size:12px;font-weight:800;border-radius:99px;padding:3px 9px;white-space:nowrap}' +
    '#pmBox .st-ok{background:#DDF6E8;color:#17794A}#pmBox .st-nx{background:var(--d);color:#fff}#pmBox .st-ft{background:#F1EEF6;color:#6A6378}#pmBox .st-lt{background:#FFE1EC;color:#B3245A}' +
    '#pmBox .pm-tk{flex:none;display:flex;align-items:center;gap:4px;font-size:12px;font-weight:700;color:#3B6B50;cursor:pointer}#pmBox .pm-tk input{width:22px;height:22px;accent-color:#2FA56B;margin:0}' +
    '#pmBox .pm-note{font-size:12.5px;color:#5E566E;background:rgba(255,255,255,.7);border-radius:10px;padding:6px 10px;margin-top:8px;overflow-wrap:anywhere}' +
    '#pmBox .pm-btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}' +
    '#pmBox .pm-b{border:0;border-radius:11px;padding:8px 13px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;background:#fff;color:var(--d,#6E4BC9);box-shadow:0 1px 3px rgba(0,0,0,.08)}' +
    '#pmBox .pm-b.pri{background:var(--d,#6E4BC9);color:#fff}#pmBox .pm-b.red{color:#B3245A}#pmBox .pm-b:disabled{opacity:.6}' +
    '#pmBox .pm-add{display:block;width:100%;border:2px dashed #C9B6F6;background:rgba(255,255,255,.7);color:#6E4BC9;border-radius:18px;padding:11px;font:inherit;font-weight:800;font-size:15px;cursor:pointer;margin-bottom:12px}' +
    '#pmBox .pm-f{background:#fff;border-radius:16px;padding:12px;margin-top:8px}#pmBox .pm-f label{display:block;font-size:12.5px;color:#5E566E;margin:8px 0 3px;font-weight:700}' +
    '#pmBox .pm-f input,#pmBox .pm-f select,#pmBox .pm-f textarea{font:inherit;font-size:16px;color:#2B2440;background:#fff;border:1.5px solid #D6CFE3;border-radius:10px;padding:7px 9px;width:100%;max-width:100%;min-width:0;-webkit-appearance:none;appearance:none}' +
    '#pmBox .pm-f input[type=date]{min-height:40px}#pmBox .pm-g{display:grid;grid-template-columns:1fr 1fr;gap:6px 8px}#pmBox .pm-g>div{min-width:0}' +
    '#pmBox .pm-f .th{display:block;font-size:12px;color:var(--d,#6E4BC9);margin-top:2px;font-weight:700}#pmBox .pm-f .hint{font-size:12px;color:#7A7288;margin-top:4px;line-height:1.45}' +
    '#pmBox .pm-sw{display:flex;flex-wrap:wrap;gap:7px}#pmBox .pm-sw button{width:32px;height:32px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1.5px #D6CFE3;cursor:pointer;padding:0}#pmBox .pm-sw button.on{box-shadow:0 0 0 3px #2B2440}' +
    '#pmBox .pm-sec{margin:16px 2px 8px;font-size:13.5px;font-weight:800;color:#6A6378;cursor:pointer;background:none;border:0;font-family:inherit;padding:0}' +
    '#pmBox .pm-foot{font-size:12.5px;color:#6A6378;line-height:1.6;background:rgba(255,255,255,.75);border-radius:14px;padding:10px 12px;margin-top:14px}' +
    '#pmBox .pm-adm{display:flex;gap:8px;align-items:center;justify-content:center;margin-top:14px;flex-wrap:wrap}#pmBox .pm-lnk{background:none;border:0;color:#6E4BC9;font:inherit;font-size:13.5px;font-weight:700;text-decoration:underline;cursor:pointer;padding:4px}' +
    '#pmBox .pm-login{background:#fff;border-radius:16px;padding:12px;margin-top:10px}#pmBox .pm-login input{font:inherit;font-size:16px;width:100%;border:1.5px solid #D6CFE3;border-radius:10px;padding:8px 10px;margin:6px 0}' +
    '#pmBox .pm-err{color:#B3245A;font-size:13px;margin-top:4px}#pmBox .pm-empty{text-align:center;padding:30px 10px;color:#6A6378}' +
    '#pmToast{position:fixed;left:50%;bottom:calc(22px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:210;background:#3A2350;color:#fff;border-radius:14px;padding:10px 16px;font-size:14px;max-width:90vw;display:none;font-family:Sarabun,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25)}' +
    '@keyframes pmSweep{0%,35%{transform:translateX(-120%) skewX(-18deg)}75%,100%{transform:translateX(260%) skewX(-18deg)}}' +
    '@keyframes pmTw{0%,100%{transform:scale(.6) rotate(0);opacity:.35}50%{transform:scale(1.25) rotate(20deg);opacity:1}}' +
    '@keyframes pmGlow{0%,100%{box-shadow:0 3px 10px rgba(120,90,160,.12),0 0 0 0 var(--b)}50%{box-shadow:0 6px 22px rgba(120,90,160,.22),0 0 18px 2px var(--b)}}' +
    '@media (prefers-reduced-motion:reduce){#pmBox .pm-card.hot,#pmBox .pm-card.hot::after,#pmBox .sp,#pmBox .tw{animation:none!important}}';

  function ensure() {
    if (!document.getElementById('pmCss')) { var st = document.createElement('style'); st.id = 'pmCss'; st.textContent = CSS; document.head.appendChild(st); }
    if (!document.getElementById('pmToast')) { var t = document.createElement('div'); t.id = 'pmToast'; document.body.appendChild(t); }
    box = document.getElementById('pmBox');
    if (!box) { box = document.createElement('div'); box.id = 'pmBox'; document.body.appendChild(box); box.addEventListener('click', onClick); box.addEventListener('change', onChange); box.addEventListener('input', onInput); }
  }
  function open() {
    ensure(); box.style.display = '';
    ovf = document.body.style.overflow; document.body.style.overflow = 'hidden';
    if (!S.pw && sget('asg_pw')) S.pw = sget('asg_pw');
    render(); load();
    try { post({ a: 'log', n: lget('asg_me') || '', m: 'ประเมินครูผู้ช่วย', dv: /iPad|Tablet/i.test(navigator.userAgent) ? 'แท็บเล็ต' : /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'มือถือ' : 'คอมพิวเตอร์' }); } catch (e) {}
  }
  function close() { if (box) { box.style.display = 'none'; box.innerHTML = ''; } document.body.style.overflow = ovf; S.edit = null; }
  function load() {
    S.loading = true;
    return post(S.pw ? { a: 'pmt', pw: S.pw } : { a: 'pmt' }).then(function (j) {
      S.loading = false;
      if (!j || !j.ok) { S.err = 'โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง'; return render(); }
      take(j); render();
    }, function () { S.loading = false; S.err = 'เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'; render(); });
  }
  function take(j) {
    S.err = ''; S.L = (j.L || []).map(function (x) { x.ok = String(x.ok || '').split(',').map(Number).filter(Boolean); x.d = (x.d || []).concat(['', '', '', '']).slice(0, 4); return x; });
    if (S.pw) { S.adm = !!j.adm; if (j.adm) S.names = j.names || []; else if (j.adm === false) S.pw = ''; }
  }

  function vars(x, pend) { var p = pend ? ['', '#C9C9D1', '#F4F4F6', '#6B6B75'] : pal(x.c); return '--b:' + p[1] + ';--s:' + p[2] + ';--d:' + p[3]; }
  function avatar(x) { return /^นาย/.test(x.n) ? '👨‍🏫' : '👩‍🏫'; }
  function sparkles() {
    return '<span class="sp" style="top:7px;right:38px">✨</span><span class="sp" style="top:30px;right:14px;animation-delay:.5s;font-size:12px">⭐</span>' +
      '<span class="sp" style="bottom:10px;right:28px;animation-delay:1s;font-size:13px">✨</span><span class="sp" style="top:6px;left:44px;animation-delay:1.3s;font-size:11px">💫</span>';
  }
  function roundRow(x, k, I) {
    var d = x.d[k], done = x.ok.indexOf(k + 1) >= 0, dd = ok(d) ? days(d) : null, st, cls = '';
    if (done) { st = '<span class="pm-st st-ok">✅ ประเมินแล้ว</span>'; cls = ' dn'; }
    else if (dd === null) st = '<span class="pm-st st-ft">ยังไม่กำหนด</span>';
    else if (dd < 0) st = '<span class="pm-st st-lt">' + (dd >= -HOT ? '⏰ ถึงกำหนดแล้ว' : 'รอบันทึกผล') + '</span>';
    else if (dd === 0) { st = '<span class="pm-st st-nx">🌟 วันนี้!</span>'; cls = ' nx'; }
    else if (k === I.next) { st = '<span class="pm-st st-nx">อีก ' + dd + ' วัน</span>'; cls = ' nx'; }
    else st = '<span class="pm-st st-ft">อีก ' + dd + ' วัน</span>';
    var tk = S.adm && ok(d) ? '<label class="pm-tk"><input type="checkbox" data-pm-tk="' + esc(x.id) + ':' + (k + 1) + '"' + (done ? ' checked' : '') + (S.busy ? ' disabled' : '') + '>ประเมินแล้ว</label>' : '';
    return '<div class="pm-r' + cls + '"><span class="pm-k">' + (done ? '✓' : k + 1) + '</span><span class="pm-rt"><b>ประเมินครั้งที่ ' + (k + 1) + '</b><small>📅 ' + esc(dTh(d, true)) + (S.adm && !done && dd !== null ? ' · ' + (dd > 0 ? 'อีก ' + dd + ' วัน' : dd === 0 ? 'วันนี้' : 'เลยมา ' + (-dd) + ' วัน') : '') + '</small></span>' + (S.adm ? tk || st : st) + '</div>';
  }
  function nextBadge(x, I) {
    if (I.pend) return '<span class="pm-nx">⏳ รอระบุวันบรรจุ</span>';
    if (I.all) return '<span class="pm-nx">🎉 ประเมินครบ 4 ครั้งแล้ว</span>';
    if (I.late >= 0) return '<span class="pm-nx late">⏰ ครั้งที่ ' + (I.late + 1) + ' ถึงกำหนดแล้ว · ' + esc(dTh(x.d[I.late])) + '</span>';
    if (I.next >= 0) { var dd = days(x.d[I.next]); return '<span class="pm-nx">ครั้งที่ ' + (I.next + 1) + ' · ' + (dd === 0 ? 'วันนี้! ✨' : 'อีก ' + dd + ' วัน') + ' · ' + esc(dTh(x.d[I.next])) + '</span>'; }
    return '<span class="pm-nx">รอบันทึกผลการประเมิน</span>';
  }
  function card(x) {
    var I = info(x), out = x.st === 'ย้ายออก', isOpen = S.open[x.id] != null ? S.open[x.id] : (I.hot && !out);
    var me = fn(lget('asg_me')) && fn(lget('asg_me')) === fn(x.n);
    var h = '<div class="pm-card' + (I.pend ? ' pend' : '') + (I.hot && !out ? ' hot' : '') + (out ? ' out' : '') + (isOpen ? ' open' : '') + '" style="' + vars(x, I.pend || out) + '">' + (I.hot && !out ? sparkles() : '') +
      '<button class="pm-hd" data-pm="tg:' + esc(x.id) + '"><span class="pm-av">' + avatar(x) + '</span><span class="pm-nm"><b>' + esc(title(x.n)) + (me ? ' ⭐' : '') + '</b>' +
      '<small>' + (I.pend ? 'ตำแหน่ง ครูผู้ช่วย' : 'บรรจุ ' + esc(dTh(x.s, true))) + (out ? ' · ย้ายออกแล้ว' : '') + '</small>' + (out ? '' : nextBadge(x, I)) +
      (I.pend || out ? '' : '<span class="pm-dots">' + [0, 1, 2, 3].map(function (k) { return '<i' + (x.ok.indexOf(k + 1) >= 0 ? ' class="on"' : '') + '></i>'; }).join('') + '</span>') +
      '</span><span class="pm-cv">▼</span></button>';
    if (isOpen) {
      h += '<div class="pm-bd">';
      if (S.edit === x.id) h += form(x);
      else {
        if (I.pend) h += '<div class="pm-note">⏳ ยังไม่ได้ระบุวันบรรจุ — เมื่อผู้บริหารใส่วันบรรจุ ระบบจะคำนวณวันประเมิน 4 ครั้งให้อัตโนมัติ</div>';
        else h += [0, 1, 2, 3].map(function (k) { return roundRow(x, k, I); }).join('');
        if (x.nt && x.nt !== 'รอระบุวันบรรจุ') h += '<div class="pm-note">📝 ' + esc(x.nt) + '</div>';
        if (S.adm) h += '<div class="pm-btns">' + (out ? '<button class="pm-b pri" data-pm="back:' + esc(x.id) + '"' + (S.busy ? ' disabled' : '') + '>↩️ คืนสถานะ</button>' :
          '<button class="pm-b pri" data-pm="ed:' + esc(x.id) + '">' + (I.pend ? '📅 ระบุวันบรรจุ' : '✏️ แก้ไข') + '</button>') + '</div>';
      }
      h += '</div>';
    }
    return h + '</div>';
  }
  function form(x) {
    var nw = !x, f = x || { id: '', n: '', s: '', d: ['', '', '', ''], c: nextColor(), nt: '' }, fnt = f.nt === 'รอระบุวันบรรจุ' ? '' : f.nt, c = Number(S.fc != null ? S.fc : f.c) || 0;
    var opts = S.names.slice(); if (f.n && opts.indexOf(f.n) < 0) opts.unshift(f.n);
    var h = '<div class="pm-f" style="' + vars({ c: c }) + '"><b style="font-size:15px">' + (nw ? '➕ เพิ่มครูผู้ช่วย' : '✏️ แก้ไขข้อมูล') + '</b>' +
      '<label>ชื่อ-สกุล (ตามข้อมูลบุคลากร)</label><select id="pmN"><option value="">— เลือกชื่อ —</option>' + opts.map(function (n) { return '<option' + (n === f.n ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select>' +
      '<label>วันบรรจุ</label><input type="date" id="pmS" value="' + esc(f.s) + '"><span class="th" id="pmSth">' + (ok(f.s) ? esc(dTh(f.s, true)) : 'ยังไม่ระบุ (เว้นว่างได้ = รอระบุวันบรรจุ)') + '</span>' +
      '<div class="hint">เลือกวันบรรจุแล้ว ระบบคำนวณวันประเมินให้ (+6 เดือน −1 วัน) · ถ้า ก.ก. กำหนดต่าง แก้วันที่แต่ละครั้งได้เลย</div>' +
      '<div class="pm-g">' + [0, 1, 2, 3].map(function (k) { return '<div><label>ครั้งที่ ' + (k + 1) + '</label><input type="date" id="pmD' + k + '" value="' + esc(f.d[k]) + '"><span class="th" id="pmD' + k + 'th">' + (ok(f.d[k]) ? esc(dTh(f.d[k])) : '') + '</span></div>'; }).join('') + '</div>' +
      '<label>สีประจำตัว</label><div class="pm-sw">' + PAL.map(function (p, i) { return '<button type="button" title="' + p[0] + '" data-pm="col:' + i + '" style="background:' + p[1] + '"' + (i === c ? ' class="on"' : '') + '></button>'; }).join('') + '</div>' +
      '<label>หมายเหตุ (ถ้ามี)</label><textarea id="pmNt" rows="2" maxlength="300" placeholder="เช่น ก.ก. เลื่อนวันประเมินครั้งที่ 2">' + esc(fnt) + '</textarea>' +
      '<div class="pm-btns"><button class="pm-b pri" data-pm="save:' + esc(f.id) + '"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'กำลังบันทึก…' : '💾 บันทึก') + '</button><button class="pm-b" data-pm="cancel">ยกเลิก</button>' +
      (nw ? '' : '<button class="pm-b red" data-pm="out:' + esc(f.id) + '"' + (S.busy ? ' disabled' : '') + '>🚪 ย้ายออก</button>') + '</div></div>';
    return h;
  }
  function nextColor() { var used = S.L.filter(function (x) { return x.st !== 'ย้ายออก'; }).map(function (x) { return Number(x.c) || 0; }); var mx = S.L.reduce(function (m, x) { return Math.max(m, Number(x.c) || 0); }, -1); for (var i = 0; i < PAL.length; i++) { var c = (mx + 1 + i) % PAL.length; if (used.indexOf(c) < 0) return c; } return (mx + 1) % PAL.length; }

  function render() {
    if (!box || box.style.display === 'none') return;
    var y = box.scrollTop;
    var h = '<div class="pm-in"><div class="pm-top"><span class="tw" style="left:58%;top:10px">✨</span><span class="tw" style="left:78%;bottom:8px;animation-delay:.7s">⭐</span><span class="tw" style="left:40%;bottom:6px;animation-delay:1.3s">💫</span>' +
      '<div style="position:relative;z-index:1"><b>📝 ประเมินครูผู้ช่วย</b><small>การประเมินการเตรียมความพร้อมและพัฒนาอย่างเข้ม<br>ก่อนแต่งตั้งให้ดำรงตำแหน่งครู · 4 ครั้ง ทุก 6 เดือน</small></div><button class="pm-x" data-pm="close" aria-label="ปิด">✕</button></div><div class="pm-w">';
    if (S.err) h += '<div class="pm-empty">' + esc(S.err) + '<br><button class="pm-lnk" data-pm="reload">ลองใหม่</button></div>';
    else if (!S.L.length && S.loading) h += '<div class="pm-empty">✨ กำลังโหลด…</div>';
    else {
      var act = S.L.filter(function (x) { return x.st !== 'ย้ายออก'; }).sort(function (a, b) { var p = sortKey(a), q = sortKey(b); return p < q ? -1 : p > q ? 1 : 0; });
      var outs = S.L.filter(function (x) { return x.st === 'ย้ายออก'; });
      var nHot = act.filter(function (x) { return info(x).hot; }).length, nPend = act.filter(function (x) { return info(x).pend; }).length;
      h += '<div class="pm-sum"><span>👥 ครูผู้ช่วย ' + act.length + ' คน</span>' + (nHot ? '<span>✨ ใกล้/ถึงกำหนด ' + nHot + ' คน</span>' : '') + (nPend ? '<span>⏳ รอวันบรรจุ ' + nPend + ' คน</span>' : '') + '</div>';
      if (S.adm) h += S.edit === 'new' ? '<div class="pm-card" style="' + vars({ c: S.fc != null ? S.fc : nextColor() }) + ';padding:0 12px 12px">' + form(null) + '</div>' : '<button class="pm-add" data-pm="new">➕ เพิ่มครูผู้ช่วย</button>';
      h += act.length ? act.map(card).join('') : '<div class="pm-empty">ยังไม่มีรายชื่อครูผู้ช่วย</div>';
      if (S.adm && outs.length) h += '<button class="pm-sec" data-pm="outs">🚪 ย้ายออกแล้ว ' + outs.length + ' คน ' + (S.showOut ? '▲' : '▼') + '</button>' + (S.showOut ? outs.map(card).join('') : '');
      h += '<div class="pm-foot">📅 วันประเมิน = วันบรรจุ + 6 เดือน − 1 วัน (ครั้งละ 6 เดือน รวม 2 ปี) · วันประเมินขึ้นในปฏิทินงานโรงเรียนอัตโนมัติ · ครูผู้ช่วยได้รับแจ้งเตือนล่วงหน้า 30 วันและ 7 วัน<br>หมายเหตุ: การประเมินแต่ละครั้งให้ดำเนินการตามหลักเกณฑ์และวิธีการที่สำนักงาน ก.ก. กรุงเทพมหานครกำหนด ระยะเวลาอาจเปลี่ยนแปลงได้ตามความเหมาะสม</div>';
      h += '<div class="pm-adm">' + (S.adm ? '<span style="font-size:13px;color:#17794A;font-weight:700">🔓 โหมดผู้บริหาร</span><button class="pm-lnk" data-pm="logout">ออก</button>' : '<button class="pm-lnk" data-pm="adm">🔐 ผู้บริหาร (เพิ่ม/แก้ไข)</button>') + '</div>';
      if (S.login && !S.adm) h += '<div class="pm-login"><b style="font-size:14px">🔐 เข้าสู่ระบบผู้บริหาร</b><input id="pmPw" type="password" autocomplete="off" placeholder="รหัสผู้บริหาร (รหัสเดียวกับระบบติดตาม)"><button class="pm-b pri" style="--d:#6E4BC9;width:100%" data-pm="login"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'กำลังตรวจรหัส…' : 'เข้าสู่ระบบ') + '</button>' + (S.lerr ? '<div class="pm-err">' + esc(S.lerr) + '</div>' : '') + '</div>';
    }
    box.innerHTML = h + '</div></div>';
    box.scrollTop = y;
  }

  // ---------- การกด ----------
  function curForm() { return S.edit === 'new' ? null : S.L.filter(function (x) { return x.id === S.edit; })[0]; }
  function keepForm(fnc) { // เก็บค่าที่พิมพ์ไว้ก่อน render ใหม่
    var v = { n: val('pmN'), s: val('pmS'), d: [0, 1, 2, 3].map(function (k) { return val('pmD' + k); }), nt: val('pmNt') };
    fnc(); ['pmN', 'pmS', 'pmNt'].forEach(function (id, i) { var e = document.getElementById(id); if (e) e.value = [v.n, v.s, v.nt][i]; });
    v.d.forEach(function (d, k) { var e = document.getElementById('pmD' + k); if (e) e.value = d; });
  }
  function onInput(ev) {
    var id = ev.target.id || '';
    if (id === 'pmS') {
      var s = ev.target.value, C = calc(s), t = document.getElementById('pmSth');
      if (t) t.textContent = ok(s) ? dTh(s, true) : 'ยังไม่ระบุ (เว้นว่างได้ = รอระบุวันบรรจุ)';
      C.forEach(function (d, k) { var e = document.getElementById('pmD' + k), th = document.getElementById('pmD' + k + 'th'); if (e) e.value = d; if (th) th.textContent = d ? dTh(d) : ''; });
    } else if (/^pmD\d$/.test(id)) { var th = document.getElementById(id + 'th'); if (th) th.textContent = ok(ev.target.value) ? dTh(ev.target.value) : ''; }
  }
  function onChange(ev) {
    if (ev.target.id === 'pmS') return onInput(ev);
    var tk = ev.target.getAttribute && ev.target.getAttribute('data-pm-tk'); if (!tk || S.busy) return;
    var p = tk.split(':'), on = ev.target.checked, x = S.L.filter(function (y) { return y.id === p[0]; })[0];
    if (!x) return;
    S.busy = true;
    post({ a: 'pmtset', pw: S.pw, act: 'tick', id: p[0], k: Number(p[1]), v: on }).then(function (j) {
      S.busy = false; if (!j || !j.ok) { toast((j && j.err) || 'บันทึกไม่สำเร็จ'); return render(); }
      take(j); render(); toast(on ? '✅ บันทึกว่าประเมินครั้งที่ ' + p[1] + ' แล้ว' : 'ยกเลิกเครื่องหมายครั้งที่ ' + p[1] + ' แล้ว');
    }, function () { S.busy = false; render(); toast('เชื่อมต่อไม่ได้ ลองใหม่'); });
  }
  function onClick(ev) {
    var el = ev.target.closest && ev.target.closest('[data-pm]'); if (!el) return;
    ev.preventDefault();
    var k = el.getAttribute('data-pm'), p = k.split(':'), id = p.slice(1).join(':');
    if (k === 'close') return close();
    if (k === 'reload') { S.err = ''; render(); return load(); }
    if (p[0] === 'tg') { if (S.edit === id) return; var x0 = S.L.filter(function (y) { return y.id === id; })[0]; var cur = S.open[id] != null ? S.open[id] : (x0 && info(x0).hot && x0.st !== 'ย้ายออก'); S.open[id] = !cur; return render(); }
    if (k === 'adm') { S.login = !S.login; S.lerr = ''; render(); var i = document.getElementById('pmPw'); if (i) i.focus(); return; }
    if (k === 'logout') { S.adm = false; S.pw = ''; S.edit = null; S.login = false; return render(); }
    if (k === 'outs') { S.showOut = !S.showOut; return render(); }
    if (k === 'login') {
      var pw = val('pmPw'); if (!pw) { S.lerr = 'กรุณาพิมพ์รหัส'; return render(); }
      S.busy = true; S.lerr = ''; render();
      return post({ a: 'pmt', pw: pw }).then(function (j) {
        S.busy = false;
        if (j && j.ok && j.adm) { S.pw = pw; S.login = false; take(j); toast('เข้าสู่ระบบผู้บริหารแล้ว'); } else S.lerr = 'รหัสไม่ถูกต้อง';
        render();
      }, function () { S.busy = false; S.lerr = 'เชื่อมต่อไม่ได้ ลองใหม่'; render(); });
    }
    if (k === 'new') { S.edit = 'new'; S.fc = nextColor(); return render(); }
    if (p[0] === 'ed') { S.edit = id; S.open[id] = true; S.fc = null; return render(); }
    if (k === 'cancel') { S.edit = null; S.fc = null; return render(); }
    if (p[0] === 'col') { var c = Number(p[1]); return keepForm(function () { S.fc = c; render(); }); }
    if (p[0] === 'save') {
      if (S.busy) return;
      var x = curForm(), o = { a: 'pmtset', pw: S.pw, act: 'save', id: x ? x.id : '', n: val('pmN'), s: val('pmS'), d: [0, 1, 2, 3].map(function (q) { return val('pmD' + q); }), c: S.fc != null ? S.fc : (x ? x.c : nextColor()), nt: val('pmNt') };
      if (!o.n) return toast('กรุณาเลือกชื่อ');
      if (ok(o.s) && o.d.some(function (d) { return !ok(d); })) return toast('กรุณาใส่วันประเมินให้ครบ 4 ครั้ง');
      if (!ok(o.s)) o.d = ['', '', '', ''];
      for (var q = 1; q < 4; q++) if (ok(o.d[q]) && o.d[q] <= o.d[q - 1]) return toast('วันประเมินครั้งที่ ' + (q + 1) + ' ต้องหลังครั้งที่ ' + q);
      return keepForm(function () {
        S.busy = true; render();
        post(o).then(function (j) {
          S.busy = false; if (!j || !j.ok) { toast((j && j.err) || 'บันทึกไม่สำเร็จ'); return keepForm(render); }
          take(j); S.edit = null; S.fc = null; render(); toast('💾 บันทึกแล้ว · ปฏิทินอัปเดตภายใน 1–2 นาที');
        }, function () { S.busy = false; keepForm(render); toast('เชื่อมต่อไม่ได้ ลองใหม่'); });
      });
    }
    if (p[0] === 'out' || p[0] === 'back') {
      if (S.busy) return;
      var y = S.L.filter(function (z) { return z.id === id; })[0]; if (!y) return;
      if (p[0] === 'out' && !window.confirm('ย้าย ' + title(y.n) + ' ออกจากรายชื่อประเมินครูผู้ช่วย?\n(ข้อมูลยังเก็บไว้ คืนสถานะได้ภายหลัง · วันประเมินจะไม่ขึ้นในปฏิทินและไม่แจ้งเตือนอีก)')) return;
      S.busy = true; render();
      return post({ a: 'pmtset', pw: S.pw, act: p[0], id: id }).then(function (j) {
        S.busy = false; if (!j || !j.ok) { toast((j && j.err) || 'บันทึกไม่สำเร็จ'); return render(); }
        take(j); S.edit = null; render(); toast(p[0] === 'out' ? '🚪 ย้ายออกแล้ว' : '↩️ คืนสถานะแล้ว');
      }, function () { S.busy = false; render(); toast('เชื่อมต่อไม่ได้ ลองใหม่'); });
    }
  }

  window.SKPmt = { open: open, close: close, calc: calc, _S: S, _take: take, _render: render };
})();
