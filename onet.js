/* onet.js — 🎯 ติวเข้ม O-NET ป.6 ปีการศึกษา 2569 · โรงเรียนวัดแสนเกษม
 * ข้อมูล: แผ่น "ติวO-NET ป.6" ในไฟล์ระบบตารางสอน (อ่าน/แก้ผ่านระบบแจ้งเตือน a=onet / a=onetset)
 * ครูทุกคนดูได้ · ผู้บริหาร (ตรวจรหัส) เปลี่ยน/สลับ/เลื่อน/ยกเลิก + เหตุผล + บันทึกประวัติ + แจ้งครูที่เกี่ยวข้อง */
(function () {
  var NT = 'https://script.google.com/macros/s/AKfycbwskmmW5YzzBnZCTi5q0TkuHEgW6DnIvkvWmw64Ee8xlawg9mJRQ6cdM5c2_0YK9x_MWg/exec';
  var WD = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'], WS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  var MF = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  var MS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var TAG = { 'ภาษาไทย': ['ไทย', 'th'], 'วิทยาศาสตร์': ['วิทย์', 'sc'], 'ภาษาอังกฤษ': ['อังกฤษ', 'en'], 'คณิตศาสตร์': ['คณิต', 'ma'] };
  var ACT = [['chg', 'เปลี่ยนครู'], ['swap', 'สลับวัน'], ['move', 'เลื่อน'], ['cancel', 'ยกเลิก']];
  var S = { L: [], me: '', mine: false, pw: '', adm: false, names: [], H: [], edit: null, act: 'chg', busy: false, login: false, err: '' };
  var box, ovf = '';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lget(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lset(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function sget(k) { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function fn(s) { return String(s || '').replace(/^\s*(ครู|นางสาว|นาง|นาย|น\.ส\.|รองฯ|ผอ\.)\s*/, '').replace(/^(นางสาว|นาง|นาย)\s*/, '').trim().split(/\s+/)[0]; }
  function split(t) { return String(t || '').split('/').map(function (s) { return s.trim(); }).filter(String); }
  function dt(d) { return new Date(d + 'T00:00:00Z'); }
  function today() { return new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10); }
  function hourNow() { return new Date(Date.now() + 7 * 36e5).getUTCHours(); }
  function dLong(d) { var x = dt(d); return WD[x.getUTCDay()] + ' ' + x.getUTCDate() + ' ' + MF[x.getUTCMonth()] + ' ' + (x.getUTCFullYear() + 543); }
  function dShort(d) { var x = dt(d); return WS[x.getUTCDay()] + ' ' + x.getUTCDate() + ' ' + MS[x.getUTCMonth()]; }
  function active(x) { return x.st === 'ปกติ' || x.st === 'เลื่อน'; }
  function isMine(x) { if (!S.me) return false; var f = fn(S.me); return split(x.t).some(function (n) { return fn(n) === f; }); }
  function people() { var M = {}; S.L.forEach(function (x) { split(x.t).forEach(function (n) { M[n] = 1; }); }); return Object.keys(M).sort(); }
  function post(o) { return fetch(NT, { method: 'POST', body: JSON.stringify(o) }).then(function (r) { return r.json(); }); }
  function toast(m) {
    var t = document.getElementById('onToast'); if (!t) return;
    t.textContent = m; t.style.display = 'block'; clearTimeout(toast.h); toast.h = setTimeout(function () { t.style.display = 'none'; }, 3500);
  }

  var CSS = '#onBox{position:fixed;inset:0;z-index:200;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;background:#eef1f6;color:#1d2433;color-scheme:light;font-family:Sarabun,"Noto Sans Thai",sans-serif;font-size:15px}' +
    '#onBox *{box-sizing:border-box}#onBox .on-in{max-width:560px;margin:0 auto;padding-bottom:40px}' +
    '#onBox .on-top{background:linear-gradient(135deg,#1e5aa8,#2f7fd6);color:#fff;padding:14px 16px 16px;padding-top:calc(14px + env(safe-area-inset-top,0px));display:flex;gap:10px;align-items:flex-start}' +
    '#onBox .on-top b{display:block;font-size:17px;color:#fff}#onBox .on-top small{display:block;font-size:12.5px;opacity:.92;margin-top:3px;color:#fff}' +
    '#onBox .on-x{margin-left:auto;flex:none;background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:10px;font-size:15px;padding:7px 11px;cursor:pointer}' +
    '#onBox .on-w{padding:12px}' +
    '#onBox .on-me{background:#fff;border-radius:12px;padding:8px 12px;font-size:13.5px;display:flex;gap:8px;align-items:center;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,.07);color:#1d2433}' +
    '#onBox select,#onBox input,#onBox textarea{font:inherit;font-size:16px;color:#1d2433;background:#fff;border:1.5px solid #c9d1de;border-radius:9px;padding:7px 9px;max-width:100%;width:100%}' +
    '#onBox .on-me select{flex:1;min-width:0;border:0;padding:4px 0;color:#1e5aa8;font-weight:bold}' +
    '#onBox .on-next{background:#fff7e0;border:2px solid #f2b705;border-radius:14px;padding:12px 14px;margin-bottom:10px;color:#1d2433}' +
    '#onBox .on-next .lb{font-size:12.5px;color:#9a6b00;font-weight:bold}#onBox .on-next .d{font-size:17px;font-weight:bold;margin:4px 0 2px}#onBox .on-next .x{font-size:14px;line-height:1.5}' +
    '#onBox .on-pill{display:inline-block;background:#1e5aa8;color:#fff;font-size:12px;border-radius:20px;padding:2px 10px;margin-top:6px}' +
    '#onBox .on-btns{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-bottom:10px}' +
    '#onBox .on-b{background:#fff;color:#1e5aa8;border:1.5px solid #1e5aa8;border-radius:10px;padding:9px 2px;text-align:center;font:inherit;font-size:13px;font-weight:bold;cursor:pointer}' +
    '#onBox .on-b.on{background:#1e5aa8;color:#fff}#onBox .on-b.adm{color:#6a3fb5;border-color:#6a3fb5}#onBox .on-b.adm.on{background:#6a3fb5;color:#fff}' +
    '#onBox .on-card{background:#fff;border-radius:14px;padding:6px 10px;box-shadow:0 1px 3px rgba(0,0,0,.07);margin-bottom:10px;color:#1d2433}' +
    '#onBox table{width:100%;border-collapse:collapse;table-layout:fixed}' +
    '#onBox table,#onBox tr{border:0;background:none;margin:0}#onBox .on-card,#onBox .on-ed,#onBox label{text-align:left}' +
    '#onBox td{padding:7px 4px;font-size:13.5px;border:0;border-bottom:1px solid #e3e7ee;vertical-align:middle;color:#1d2433;word-break:break-word;text-align:left;background:none}' +
    '#onBox td.d{width:80px;font-weight:bold;white-space:nowrap;font-size:13px}#onBox td.s{width:62px;text-align:right}#onBox td.on-empty{text-align:center}' +
    '#onBox tr.hd td{font-size:12px;color:#667;font-weight:bold}' +
    '#onBox tr.mine td{background:#f1f6ff}#onBox tr.mine td.d{box-shadow:inset 4px 0 #1e5aa8;padding-left:8px}' +
    '#onBox tr.off td{color:#8a93a3}#onBox tr.cx .nm{text-decoration:line-through;color:#8a93a3}' +
    '#onBox tr.tap{cursor:pointer}#onBox tr.sel td{background:#f3edff}' +
    '#onBox .nt{display:block;font-size:12px;color:#7a5800;margin-top:2px}' +
    '#onBox .tag{display:inline-block;font-size:11.5px;border-radius:6px;padding:1px 6px;font-weight:bold}' +
    '#onBox .th{background:#fde2e2;color:#a3262b}#onBox .sc{background:#dff3e4;color:#1d7a3a}#onBox .en{background:#e5e9fd;color:#2c3f9e}#onBox .ma{background:#fff0d6;color:#9a5a00}' +
    '#onBox .cxl{background:#fde2e2;color:#a3262b}#onBox .mv{background:#fff4cc;color:#7a5800}' +
    '#onBox .on-h{font-size:13.5px;font-weight:bold;color:#445;margin:14px 2px 6px}' +
    '#onBox .on-ed{background:#faf7ff;border:1.5px solid #6a3fb5;border-radius:12px;padding:10px;margin:4px 0 8px}' +
    '#onBox .on-ed label{display:block;font-size:12.5px;color:#556;margin:8px 0 3px}' +
    '#onBox .seg{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}' +
    '#onBox .seg button{border:1.5px solid #c9d1de;background:#fff;color:#1d2433;border-radius:9px;padding:7px 0;font:inherit;font-size:13px;cursor:pointer}' +
    '#onBox .seg button.on{border-color:#6a3fb5;background:#6a3fb5;color:#fff;font-weight:bold}' +
    '#onBox .on-save{display:block;width:100%;background:#1d7a3a;color:#fff;border:0;border-radius:10px;padding:11px;font:inherit;font-weight:bold;font-size:15px;margin-top:10px;cursor:pointer}' +
    '#onBox .on-save:disabled{opacity:.6}#onBox .on-lnk{background:none;border:0;color:#6a3fb5;font:inherit;font-size:13px;text-decoration:underline;cursor:pointer;padding:6px 0}' +
    '#onBox .on-log{font-size:12.5px;border-left:3px solid #c9d1de;padding:2px 0 6px 9px;margin:6px 0;color:#334;line-height:1.5}#onBox .on-log b{color:#1d2433}' +
    '#onBox .on-ok{font-size:12.5px;background:#e8f5ec;color:#1d7a3a;border-radius:8px;padding:6px 10px;margin-bottom:10px}' +
    '#onBox .on-err{color:#a3262b;font-size:13px;margin-top:6px}#onBox .on-empty{text-align:center;color:#667;padding:30px 10px}' +
    '#onToast{display:none;position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:210;background:#1d2433;color:#fff;border-radius:10px;padding:10px 16px;font-size:14px;max-width:90vw;text-align:center}' +
    '#onPrint{display:none}' +
    '@media print{@page{size:A4;margin:14mm 14mm 12mm}html,body{overflow:visible!important;background:#fff!important}body>*:not(#onBox){display:none!important}' +
    '#onBox{position:static!important;overflow:visible!important;background:#fff!important}#onBox .on-in{display:none!important}#onToast{display:none!important}' +
    '#onPrint{display:block!important;color:#000;font-family:"TH Sarabun New",Sarabun,"Noto Sans Thai",sans-serif;font-size:15px}' +
    '#onPrint h1{font-size:18px;text-align:center;margin:0 0 2px}#onPrint .tm{text-align:center;font-weight:bold;margin-bottom:10px}' +
    '#onPrint table{width:100%;border-collapse:collapse;table-layout:auto}#onPrint th,#onPrint td{border:1px solid #000;padding:2px 6px;font-size:13.5px;line-height:1.35;color:#000;background:#fff;vertical-align:top}' +
    '#onPrint th{background:#eee!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}#onPrint tr.hol td{font-weight:bold}' +
    '#onPrint .note{font-size:13px;margin-top:8px}#onPrint .sg{display:flex;justify-content:space-around;margin-top:18px;break-inside:avoid;text-align:center;font-size:14px;line-height:1.7}}';

  function ensure() {
    if (!document.getElementById('onCss')) { var st = document.createElement('style'); st.id = 'onCss'; st.textContent = CSS; document.head.appendChild(st); }
    if (!document.getElementById('onToast')) { var t = document.createElement('div'); t.id = 'onToast'; document.body.appendChild(t); }
    box = document.getElementById('onBox');
    if (!box) { box = document.createElement('div'); box.id = 'onBox'; document.body.appendChild(box); box.addEventListener('click', onClick); box.addEventListener('change', onChange); }
  }

  function open() {
    ensure(); box.style.display = '';
    ovf = document.body.style.overflow; document.body.style.overflow = 'hidden';
    if (!S.me) {
      S.me = lget('on_me');
      if (!S.me) { var a = fn(lget('asg_me') || lget('push_nm')); if (a) S.me = people().filter(function (n) { return fn(n) === a; })[0] || ''; }
    }
    if (!S.pw && sget('asg_pw')) S.pw = sget('asg_pw');
    render();
    load();
    try { post({ a: 'log', n: lget('asg_me') || S.me || '', m: 'ติวเข้ม O-NET', dv: /iPad|Tablet/i.test(navigator.userAgent) ? 'แท็บเล็ต' : /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'มือถือ' : 'คอมพิวเตอร์' }); } catch (e) {}
  }
  function close() { if (box) { box.style.display = 'none'; box.innerHTML = ''; } document.body.style.overflow = ovf; S.edit = null; }

  function load() {
    S.loading = true;
    return post(S.pw ? { a: 'onet', pw: S.pw } : { a: 'onet' }).then(function (j) {
      S.loading = false;
      if (!j || !j.ok) { S.err = 'โหลดตารางไม่สำเร็จ ลองใหม่อีกครั้ง'; return render(); }
      take(j);
      if (!S.me) { var a = fn(lget('asg_me') || lget('push_nm')); if (a) S.me = people().filter(function (n) { return fn(n) === a; })[0] || ''; }
      render();
    }, function () { S.loading = false; S.err = 'เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'; render(); });
  }
  function take(j) {
    S.err = ''; S.L = j.L || [];
    if (S.pw) { S.adm = !!j.adm; if (j.adm) { S.names = j.names || []; S.H = j.H || []; } else if (j.adm === false) { S.pw = ''; } }
  }

  function nextOne() {
    var td = today(), h = hourNow();
    return S.L.filter(function (x) { return active(x) && (x.d > td || (x.d === td && h < 9)); })[0];
  }
  function tagOf(s) { var t = TAG[s] || [s, 'ma']; return '<span class="tag ' + t[1] + '">' + esc(t[0]) + '</span>'; }
  function namesHtml(t) { return split(t).map(esc).join('<br>'); }

  function render() {
    if (!box || box.style.display === 'none') return;
    var h = '<div class="on-in"><div class="on-top"><div><b>🎯 ติวเข้ม O-NET ป.6 ปีการศึกษา 2569</b><small>เวลา 07.30–08.30 น. · 4–29 มกราคม 2570 · รวม 20 ชั่วโมง</small></div><button class="on-x" data-on="close" aria-label="ปิด">✕</button></div><div class="on-w">';
    if (S.err) h += '<div class="on-card on-empty">' + esc(S.err) + '<br><button class="on-lnk" data-on="reload">ลองใหม่</button></div>';
    if (!S.L.length) { h += S.err ? '' : '<div class="on-card on-empty">กำลังโหลดตารางติว…</div>'; box.innerHTML = h + '</div></div>'; return; }
    // ฉันคือ
    var P = people();
    h += '<div class="on-me"><span>ฉันคือ:</span><select data-on="me"><option value="">— เลือกชื่อ —</option>' + P.map(function (n) { return '<option' + (n === S.me ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select></div>';
    // ครั้งถัดไป
    var nx = nextOne();
    if (nx) {
      var days = Math.round((dt(nx.d) - dt(today())) / 864e5);
      h += '<div class="on-next"><div class="lb">⏰ ครั้งถัดไป · ' + (days <= 0 ? 'วันนี้' : days === 1 ? 'พรุ่งนี้' : 'อีก ' + days + ' วัน') + '</div><div class="d">' + esc(dLong(nx.d)) + '</div><div class="x">' + esc(nx.s) + '</div><div class="x">' + split(nx.t).map(esc).join(' / ') + '</div>' +
        (nx.st === 'เลื่อน' ? '<span class="nt">' + esc(nx.n) + '</span>' : '') + (isMine(nx) ? '<span class="on-pill">⭐ คาบของฉัน</span>' : '') + '</div>';
    } else h += '<div class="on-next"><div class="lb">✅ ติวครบทุกคาบแล้ว</div></div>';
    h += '<div class="on-btns"><button class="on-b' + (S.mine ? ' on' : '') + '" data-on="mine">⭐ ของฉัน</button><button class="on-b" data-on="print">🖨️ พิมพ์ A4</button><button class="on-b adm' + (S.adm ? ' on' : '') + '" data-on="adm">' + (S.adm ? '✅ ผู้บริหาร' : '🔐 ผู้บริหาร') + '</button></div>';
    if (S.login && !S.adm) h += '<div class="on-card" style="padding:12px"><b style="font-size:14px">🔐 เข้าสู่ระบบผู้บริหาร</b><label style="display:block;font-size:12.5px;color:#556;margin:8px 0 3px">รหัสผู้บริหาร (รหัสเดียวกับระบบติดตาม)</label><input id="onPw" type="password" autocomplete="off"><button class="on-save" data-on="login" style="background:#6a3fb5"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'กำลังตรวจรหัส…' : 'เข้าสู่ระบบ') + '</button>' + (S.lerr ? '<div class="on-err">' + esc(S.lerr) + '</div>' : '') + '</div>';
    if (S.adm) h += '<div class="on-ok">✅ ผู้บริหาร · แตะแถวในตารางเพื่อเปลี่ยน/สลับ/เลื่อน/ยกเลิก <button class="on-lnk" data-on="logout" style="float:right;padding:0">ออก</button></div>';
    // ตารางรายวัน
    var rows = S.L.filter(function (x) { return !S.mine || isMine(x); });
    h += '<div class="on-card"><table><tr class="hd"><td class="d">วันที่</td><td>ครูผู้ติว</td><td class="s">วิชา</td></tr>';
    if (S.mine && !S.me) h += '<tr><td colspan="3" class="on-empty">เลือกชื่อของท่านที่ช่อง "ฉันคือ" ก่อนนะคะ</td></tr>';
    else if (!rows.length) h += '<tr><td colspan="3" class="on-empty">ไม่มีคาบติวของท่าน</td></tr>';
    rows.forEach(function (x) {
      var cls = [], tap = S.adm && x.st !== 'หยุด';
      if (isMine(x)) cls.push('mine'); if (x.st === 'หยุด') cls.push('off'); if (x.st === 'ยกเลิก') cls.push('cx'); if (tap) cls.push('tap'); if (S.edit === x.id) cls.push('sel');
      h += '<tr class="' + cls.join(' ') + '"' + (tap ? ' data-on="row:' + esc(x.id) + '"' : '') + '><td class="d">' + esc(dShort(x.d)) + '</td>';
      if (x.st === 'หยุด') h += '<td colspan="2">' + esc(x.n || 'วันหยุด') + '</td>';
      else h += '<td><span class="nm">' + namesHtml(x.t) + '</span>' + (x.n ? '<span class="nt">' + esc(x.n) + '</span>' : '') + '</td><td class="s">' + (x.st === 'ยกเลิก' ? '<span class="tag cxl">ยกเลิก</span>' : (x.st === 'เลื่อน' ? '<span class="tag mv">เลื่อน</span><br>' : '') + tagOf(x.s)) + '</td>';
      h += '</tr>';
      if (S.adm && S.edit === x.id) h += '<tr><td colspan="3" style="padding:0;border:0">' + editor(x) + '</td></tr>';
    });
    h += '</table></div>';
    h += '<div style="font-size:12px;color:#667;margin:0 4px">🔔 ครูผู้ติวได้รับแจ้งเตือนเวลา 18.00 น. ของวันก่อนวันติว (ต้องเปิดการแจ้งเตือนในหน้าแรกไว้)</div>';
    if (S.adm) {
      h += '<div class="on-h">🕘 ประวัติการเปลี่ยน</div><div class="on-card" style="padding:8px 12px">' + (S.H.length ? S.H.map(function (r) {
        return '<div class="on-log"><b>' + esc(r[0]) + '</b> · ' + esc(r[2]) + (r[7] && r[7] !== '-' ? ' · ' + esc(r[7]) : '') + '<br>' + esc(r[3]) + (r[4] ? ' → ' + esc(r[4]) : '') + (r[5] ? '<br>เหตุผล: ' + esc(r[5]) : '') + '</div>';
      }).join('') : '<div class="on-empty" style="padding:12px">ยังไม่มีการเปลี่ยน</div>') + '</div>';
    }
    h += '</div></div><div id="onPrint">' + printHtml() + '</div>';
    box.innerHTML = h;
  }

  function editor(x) {
    var a = S.act, h = '<div class="on-ed"><b style="font-size:13.5px">แก้ไข: ' + esc(dLong(x.d)) + ' · ' + esc(x.s) + '</b>';
    h += '<label>ทำอะไร</label><div class="seg">' + ACT.map(function (c) { return '<button data-on="act:' + c[0] + '" class="' + (a === c[0] ? 'on' : '') + '">' + c[1] + '</button>'; }).join('') + '</div>';
    if (x.st !== 'ปกติ') h += '<button class="on-lnk" data-on="act:back">' + (a === 'back' ? '✔ ' : '') + 'คืนเป็นปกติ (ยกเลิกสถานะ ' + esc(x.st) + ')</button>';
    var all = {}; S.names.concat(people()).forEach(function (n) { all[n] = 1; }); var opts = Object.keys(all).sort();
    var sel = function (id, cur, blank) { return '<select id="' + id + '">' + (blank ? '<option value="">— ไม่มี —</option>' : '') + opts.map(function (n) { return '<option' + (n === cur ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select>'; };
    var cur = split(x.t);
    if (a === 'chg') h += '<label>ครูผู้ติว คนที่ 1</label>' + sel('onT1', cur[0] || '', false) + '<label>ครูผู้ติว คนที่ 2 (ถ้ามี)</label>' + sel('onT2', cur[1] || '', true);
    if (a === 'swap') h += '<label>สลับกับคาบ (ครูและวิชาจะสลับวันกัน)</label><select id="onId2"><option value="">— เลือกคาบ —</option>' + S.L.filter(function (y) { return y.id !== x.id && y.st !== 'หยุด'; }).map(function (y) { return '<option value="' + esc(y.id) + '">' + esc(dShort(y.d) + ' · ' + y.s + ' · ' + split(y.t).map(fn).join('/')) + '</option>'; }).join('') + '</select>';
    if (a === 'move') h += '<label>เลื่อนไปวันที่</label><input id="onD2" type="date" value="' + esc(x.d) + '">';
    if (a === 'cancel') h += '<div style="font-size:13px;color:#a3262b;margin-top:8px">คาบนี้จะแสดงว่า "ยกเลิก" และแจ้งครูผู้ติว</div>';
    h += '<label>หมายเหตุ/เหตุผล (ต้องกรอก)</label><textarea id="onWhy" rows="2" maxlength="300"></textarea>';
    h += '<button class="on-save" data-on="save"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'กำลังบันทึก…' : '💾 บันทึก + แจ้งครูที่เกี่ยวข้อง') + '</button>';
    h += '<button class="on-lnk" data-on="row:' + esc(x.id) + '">ปิด</button></div>';
    return h;
  }

  function printHtml() {
    var r = S.L.map(function (x) {
      var x0 = dt(x.d), dd = WD[x0.getUTCDay()] + ' ที่ ' + x0.getUTCDate() + ' ' + MF[x0.getUTCMonth()] + ' ' + (x0.getUTCFullYear() + 543);
      if (x.st === 'หยุด') return '<tr class="hol"><td>' + esc(dd) + '</td><td colspan="2">' + esc(x.n) + '</td><td></td></tr>';
      var note = x.st === 'ยกเลิก' ? 'ยกเลิก' + (x.n ? ' (' + x.n + ')' : '') : x.n;
      return '<tr><td>' + esc(dd) + '</td><td>' + split(x.t).map(esc).join(' /<br>') + '</td><td>' + esc(x.s) + '</td><td>' + esc(note) + '</td></tr>';
    }).join('');
    return '<h1>ตารางติวเข้ม การยกระดับผลสัมฤทธิ์ O-NET ชั้นประถมศึกษาปีที่ 6 ปีการศึกษา 2569</h1><div class="tm">เวลา 07.30 – 08.30 น. (1 ชั่วโมง)</div>' +
      '<table><tr><th style="width:30%">วัน/เดือน/ปี</th><th>ครูผู้สอน</th><th style="width:16%">รายวิชา</th><th style="width:20%">หมายเหตุ</th></tr>' + r + '</table>' +
      '<div class="note">หมายเหตุ: จัดติวหมุนเวียนตามลำดับ ภาษาไทย → วิทยาศาสตร์ → ภาษาอังกฤษ → คณิตศาสตร์ ทุกวิชาเท่ากันวิชาละ 5 ชั่วโมง · พิมพ์เมื่อ ' + esc(dLong(today())) + '</div>' +
      '<div class="sg"><div>ลงชื่อ ...................................... ผู้จัดทำ<br>(นางสาวณพิชญา ศิราภัทธสกุล)<br>รองผู้อำนวยการสถานศึกษา</div><div>ลงชื่อ ...................................... ผู้อนุมัติ<br>(......................................)<br>ผู้อำนวยการโรงเรียนวัดแสนเกษม</div></div>';
  }

  function onChange(ev) {
    var el = ev.target;
    if (el.getAttribute && el.getAttribute('data-on') === 'me') { S.me = el.value; lset('on_me', S.me); render(); }
  }
  function val(id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; }
  function onClick(ev) {
    var el = ev.target.closest && ev.target.closest('[data-on]'); if (!el || el.tagName === 'SELECT') return;
    var k = el.getAttribute('data-on'), p = k.split(':');
    if (k === 'close') return close();
    if (k === 'reload') { S.err = ''; render(); return load(); }
    if (k === 'mine') { S.mine = !S.mine; return render(); }
    if (k === 'print') { render(); return setTimeout(function () { window.print(); }, 50); }
    if (k === 'adm') { if (S.adm) return; S.login = !S.login; S.lerr = ''; render(); var i = document.getElementById('onPw'); if (i) i.focus(); return; }
    if (k === 'logout') { S.adm = false; S.pw = ''; S.edit = null; S.H = []; S.login = false; return render(); }
    if (k === 'login') {
      var pw = val('onPw'); if (!pw) { S.lerr = 'กรุณาพิมพ์รหัส'; return render(); }
      S.busy = true; S.lerr = ''; render();
      return post({ a: 'onet', pw: pw }).then(function (j) {
        S.busy = false;
        if (j && j.ok && j.adm) { S.pw = pw; S.login = false; take(j); toast('เข้าสู่ระบบผู้บริหารแล้ว'); } else S.lerr = 'รหัสไม่ถูกต้อง';
        render();
      }, function () { S.busy = false; S.lerr = 'เชื่อมต่อไม่ได้ ลองใหม่'; render(); });
    }
    if (p[0] === 'row') { S.edit = S.edit === p[1] ? null : p[1]; S.act = 'chg'; return render(); }
    if (p[0] === 'act') { var w = val('onWhy'); S.act = p[1]; render(); var t = document.getElementById('onWhy'); if (t) t.value = w; return; }
    if (k === 'save') {
      if (S.busy) return;
      var x = S.L.filter(function (y) { return y.id === S.edit; })[0]; if (!x) return;
      var o = { a: 'onetset', pw: S.pw, act: S.act, id: x.id, why: val('onWhy') };
      if (o.why.length < 2) return toast('กรุณากรอกหมายเหตุ/เหตุผล');
      if (S.act === 'chg') { var t1 = val('onT1'), t2 = val('onT2'); if (!t1) return toast('กรุณาเลือกครูผู้ติว'); o.t = t2 && t2 !== t1 ? t1 + ' / ' + t2 : t1; }
      if (S.act === 'swap') { o.id2 = val('onId2'); if (!o.id2) return toast('กรุณาเลือกคาบที่จะสลับ'); }
      if (S.act === 'move') { o.d2 = val('onD2'); if (!o.d2) return toast('กรุณาเลือกวันที่ใหม่'); }
      if (S.act === 'cancel' && !window.confirm('ยืนยันยกเลิกการติว ' + dLong(x.d) + ' ?')) return;
      S.busy = true; render(); var tw = document.getElementById('onWhy'); if (tw) tw.value = o.why;
      return post(o).then(function (j) {
        S.busy = false;
        if (!j || !j.ok) { toast((j && j.err) || 'บันทึกไม่สำเร็จ'); return render(); }
        take(j); S.edit = null; render(); toast('บันทึกแล้ว · แจ้งเตือนส่งถึง ' + (j.sent || 0) + ' เครื่อง');
      }, function () { S.busy = false; render(); toast('เชื่อมต่อไม่ได้ ลองใหม่'); });
    }
  }

  window.SKOnet = { open: open, close: close };
})();
