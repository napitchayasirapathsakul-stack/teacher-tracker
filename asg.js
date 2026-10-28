/* บันทึกการมอบหมายงาน — ระบบติดตามการส่งงานครู ร.ร.วัดแสนเกษม
 * ไฟล์นี้เพิ่มปุ่ม "📌 มอบหมายงาน" ในหัวข้อระบบของโรงเรียน และหน้าบันทึกการมอบหมายงาน
 * ครู: เลือกชื่อตัวเอง → เห็นงานของตัวเอง + กด "รับทราบ" (แจ้งเตือนในระบบ: ตัวเลขสีแดงที่ปุ่ม + แถบเตือน)
 * ผู้บริหาร: ใส่รหัสผ่านผู้บริหาร (รหัสเดียวกับระบบติดตาม) → มอบหมาย/แก้ไข/ลบ/บันทึกว่าเสร็จ
 */
(function () {
  var API = 'https://script.google.com/macros/s/AKfycby8sOIXP7zEzWaunedJHsI2QhRF_lNp3gpAlKSlLa7gs6mR8GgKujSsT54f4y0bgPSh7Q/exec';
  var MS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var S = { teachers: [], G: [], open: false, tab: 'me', me: '', pw: '', form: null, busy: false };
  function get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function sget(k) { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function sput(k, v) { try { if (v) sessionStorage.setItem(k, v); else sessionStorage.removeItem(k); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function th(iso) { var p = String(iso || '').split('-').map(Number); return p[0] ? p[2] + ' ' + MS[p[1] - 1] + ' ' + String(p[0] + 543).slice(2) : ''; }
  function today() { return new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); }
  function days(u) { return Math.round((new Date(u + 'T00:00:00Z') - new Date(today() + 'T00:00:00Z')) / 864e5); }
  function short(n) { return String(n).replace(/^(นางสาว|นาง|นาย)\s*/, '').split(' ')[0]; }
  function post(o) {
    return fetch(API, { method: 'POST', body: JSON.stringify(o) }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) throw new Error({ auth: 'รหัสผ่านผู้บริหารไม่ถูกต้อง', bad: 'ข้อมูลไม่ครบหรือไม่ถูกต้อง', notfound: 'ไม่พบรายการ (อาจถูกลบแล้ว)', server: 'ระบบขัดข้อง ลองใหม่อีกครั้ง' }[j.err] || 'บันทึกไม่สำเร็จ');
      return j;
    });
  }
  function toast(msg) { var t = document.getElementById('asgToast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(function () { t.style.display = 'none'; }, 3500); }
  function state(x, nm) {
    var g = x.st[nm] || {};
    if (g.d) return 'done';
    var d = days(x.u); return d < 0 ? 'late' : d <= 2 ? 'soon' : 'open';
  }
  function dueText(x) { var d = days(x.u); return d < 0 ? 'เลยกำหนด ' + (-d) + ' วัน' : d === 0 ? 'ครบกำหนดวันนี้' : d === 1 ? 'ครบกำหนดพรุ่งนี้' : 'อีก ' + d + ' วัน'; }
  var COL = { late: '#B91C1C', soon: '#D97706', open: '#2563EB', done: '#047857' };
  var BG = { late: '#FEE2E2', soon: '#FEF3C7', open: '#DBEAFE', done: '#D1FAE5' };

  // ---------- แจ้งเตือนในระบบ ----------
  function counts() {
    var c = { unack: 0, late: 0, soon: 0 }; if (!S.me) return c;
    S.G.forEach(function (x) {
      if (x.a.indexOf(S.me) < 0) return; var g = x.st[S.me] || {}; if (g.d) return;
      if (!g.k) c.unack++; var d = days(x.u); if (d < 0) c.late++; else if (d <= 2) c.soon++;
    });
    return c;
  }
  function badge() {
    var c = counts(), n = c.unack + c.late, b = document.getElementById('asgNb'), ban = document.getElementById('asgBan');
    if (b) { b.textContent = n; b.style.display = n ? '' : 'none'; }
    if (ban) {
      var parts = []; if (c.unack) parts.push('ยังไม่รับทราบ <b>' + c.unack + '</b> งาน'); if (c.late) parts.push('<b style="color:#B91C1C">เลยกำหนด ' + c.late + '</b>'); if (c.soon) parts.push('ใกล้ครบกำหนด <b>' + c.soon + '</b>');
      ban.innerHTML = parts.length && !S.open ? '🔔 ' + esc(S.me) + ': ' + parts.join(' · ') + ' — <u>ดูงาน</u>' : '';
      ban.style.display = parts.length && !S.open ? '' : 'none';
    }
  }

  // ---------- หน้าจอ ----------
  function render() {
    var box = document.getElementById('asgBox'); if (!box) return;
    badge();
    if (!S.open) { box.style.display = 'none'; return; }
    box.style.display = '';
    var h = '<div class="asg-head"><b>📌 บันทึกการมอบหมายงาน</b><button data-asg="close" title="ปิด">✕</button></div>';
    h += '<div class="asg-tabs"><button data-asg="tab:me" class="' + (S.tab === 'me' ? 'on' : '') + '">👩‍🏫 งานของฉัน</button><button data-asg="tab:all" class="' + (S.tab === 'all' ? 'on' : '') + '">🗂️ งานทั้งหมด</button><button data-asg="tab:adm" class="' + (S.tab === 'adm' ? 'on' : '') + '">🔐 ผู้บริหาร</button></div>';
    if (S.tab === 'me') h += viewMe(); else if (S.tab === 'all') h += viewAll(false); else h += viewAdm();
    box.innerHTML = h;
  }
  function card(x, inner) { var st = x._st || 'open'; return '<div class="asg-card" style="border-left-color:' + COL[st] + '">' + inner + '</div>'; }
  function head(x, st, label) {
    return '<span class="asg-b" style="background:' + BG[st] + ';color:' + COL[st] + '">' + esc(label) + '</span><div class="asg-t">' + esc(x.n) + '</div>' +
      '<div class="asg-s">มอบหมาย ' + th(x.d) + ' · กำหนดส่ง <b>' + th(x.u) + '</b></div>' + (x.m ? '<div class="asg-m">' + esc(x.m) + '</div>' : '');
  }
  function viewMe() {
    var h = '<label class="asg-f">ชื่อของฉัน<select id="asgMe"><option value="">— เลือกชื่อของคุณ —</option>' + S.teachers.map(function (t) { return '<option' + (t === S.me ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></label>';
    if (!S.me) return h + '<div class="asg-empty">เลือกชื่อของคุณเพื่อดูงานที่ได้รับมอบหมาย (ระบบจำไว้ในเครื่องนี้)</div>';
    var mine = S.G.filter(function (x) { return x.a.indexOf(S.me) >= 0; }).map(function (x) { x._st = state(x, S.me); return x; });
    var order = { late: 0, soon: 1, open: 2, done: 3 };
    mine.sort(function (a, b) { return order[a._st] - order[b._st] || (a.u < b.u ? -1 : 1); });
    var c = counts();
    h += '<div class="asg-stats"><div><b style="color:#7C3AED">' + c.unack + '</b>ยังไม่รับทราบ</div><div><b style="color:#B91C1C">' + c.late + '</b>เลยกำหนด</div><div><b style="color:#D97706">' + c.soon + '</b>ใกล้ครบกำหนด</div><div><b style="color:#047857">' + mine.filter(function (x) { return x._st === 'done'; }).length + '</b>เสร็จแล้ว</div></div>';
    if (!mine.length) return h + '<div class="asg-empty">ยังไม่มีงานที่ได้รับมอบหมาย</div>';
    return h + mine.map(function (x) {
      var g = x.st[S.me] || {}, others = x.a.filter(function (z) { return z !== S.me; }).map(short);
      return card(x, head(x, x._st, x._st === 'done' ? 'เสร็จแล้ว ' + g.d.slice(0, 10) : dueText(x)) + (others.length ? '<div class="asg-s">ร่วมกับ: ' + esc(others.join(', ')) + '</div>' : '') +
        (g.k ? '<div class="asg-ok">👍 รับทราบแล้ว ' + esc(g.k.slice(0, 16)) + '</div>' : '<button class="asg-btn ok" data-asg="ack:' + x.id + '">👍 รับทราบ</button>'));
    }).join('');
  }
  function viewAll(admin) {
    var list = S.G.slice().map(function (x) {
      var done = x.a.filter(function (z) { return (x.st[z] || {}).d; }).length, ack = x.a.filter(function (z) { return (x.st[z] || {}).k; }).length;
      x._done = done; x._ack = ack; var d = days(x.u); x._st = done === x.a.length ? 'done' : d < 0 ? 'late' : d <= 2 ? 'soon' : 'open'; return x;
    });
    var order = { late: 0, soon: 1, open: 2, done: 3 };
    list.sort(function (a, b) { return order[a._st] - order[b._st] || (a.u < b.u ? -1 : 1); });
    var h = '<div class="asg-s" style="margin:6px 0">ทั้งหมด ' + list.length + ' งาน · ค้าง ' + list.filter(function (x) { return x._st !== 'done'; }).length + ' งาน</div>';
    if (!list.length) return h + '<div class="asg-empty">ยังไม่มีการมอบหมายงาน</div>';
    return h + list.map(function (x) {
      return card(x, head(x, x._st, x._st === 'done' ? 'เสร็จครบแล้ว' : dueText(x)) +
        '<div class="asg-bar"><i style="width:' + (x._done / x.a.length * 100) + '%"></i></div><div class="asg-s">รับทราบ ' + x._ack + '/' + x.a.length + ' · เสร็จ ' + x._done + '/' + x.a.length + '</div>' +
        '<div class="asg-pp">' + x.a.map(function (z) {
          var g = x.st[z] || {};
          return '<div><span>' + esc(z) + '</span><span class="asg-s">' + (g.k ? '👍 ' + esc(g.k.slice(5, 16)) : '❔ ยังไม่รับทราบ') + '</span>' +
            (admin ? '<button class="asg-btn ' + (g.d ? 'ok' : 'gh') + '" data-asg="done:' + x.id + ':' + (g.d ? 0 : 1) + ':' + encodeURIComponent(z) + '">' + (g.d ? '✅ เสร็จ' : 'ยังไม่เสร็จ') + '</button>' : (g.d ? '<span class="asg-ok">✅ เสร็จ</span>' : '<span></span>')) + '</div>';
        }).join('') + '</div>' +
        (admin ? '<div class="asg-tools"><button class="asg-btn gh" data-asg="done:' + x.id + ':1:ALL">✅ เสร็จทุกคน</button><button class="asg-btn gh" data-asg="edit:' + x.id + '">✏️ แก้ไข</button><button class="asg-btn del" data-asg="del:' + x.id + '">🗑️ ลบ</button></div>' : ''));
    }).join('');
  }
  function viewAdm() {
    if (!S.pw) return '<div class="asg-card"><label class="asg-f">รหัสผ่านผู้บริหาร (รหัสเดียวกับระบบติดตาม)<input type="password" id="asgPw" autocomplete="current-password"></label><button class="asg-btn ok" data-asg="login">เข้าสู่ระบบ</button></div>';
    var f = S.form, h = '<div class="asg-tools"><button class="asg-btn gh" data-asg="logout">ออกจากระบบผู้บริหาร</button>' + (f ? '' : '<button class="asg-btn ok" data-asg="new">＋ มอบหมายงาน</button>') + '</div>';
    if (f) {
      h += '<div class="asg-card asg-form"><b>' + (f.id ? '✏️ แก้ไขงาน' : '＋ มอบหมายงาน') + '</b>' +
        '<div class="asg-row"><label class="asg-f">วันที่มอบหมาย<input type="date" id="asgD" value="' + esc(f.d) + '"></label><label class="asg-f">กำหนดส่ง *<input type="date" id="asgU" value="' + esc(f.u) + '"></label></div>' +
        '<label class="asg-f">เรื่อง *<input id="asgN" maxlength="200" value="' + esc(f.n) + '"></label>' +
        '<label class="asg-f">รายละเอียด<textarea id="asgM" rows="3" maxlength="2000">' + esc(f.m) + '</textarea></label>' +
        '<div class="asg-s" style="margin-top:6px">ครูที่ได้รับมอบหมาย * (เลือกได้หลายคน) · <a href="#" data-asg="pick:1">เลือกทั้งหมด</a> · <a href="#" data-asg="pick:0">ล้าง</a></div><div class="asg-chk">' +
        S.teachers.map(function (t) { return '<label><input type="checkbox" name="asgA" value="' + esc(t) + '"' + (f.a.indexOf(t) >= 0 ? ' checked' : '') + '> ' + esc(t) + '</label>'; }).join('') + '</div>' +
        '<div class="asg-tools"><button class="asg-btn ok" data-asg="save">💾 บันทึก</button><button class="asg-btn gh" data-asg="cancel">ยกเลิก</button></div></div>';
    }
    return h + viewAll(true);
  }

  // ---------- การทำงาน ----------
  function load() {
    return Promise.all([post({ a: 'teachers' }), post({ a: 'asgall' })]).then(function (r) { S.teachers = r[0].teachers || []; S.G = r[1].G || []; if (S.me && S.teachers.indexOf(S.me) < 0) S.me = ''; render(); });
  }
  function click(ev) {
    var el = ev.target.closest('[data-asg]'); if (!el) return;
    ev.preventDefault();
    var p = el.getAttribute('data-asg').split(':'), a = p[0];
    if (a === 'open') { S.open = !S.open; render(); if (S.open) { document.getElementById('asgBox').scrollIntoView({ behavior: 'smooth' }); load().catch(function () {}); } return; }
    if (a === 'close') { S.open = false; return render(); }
    if (a === 'tab') { S.tab = p[1]; return render(); }
    if (a === 'pick') { [].forEach.call(document.querySelectorAll('[name=asgA]'), function (c) { c.checked = p[1] === '1'; }); return; }
    if (a === 'new') { S.form = { id: '', d: today(), u: '', n: '', m: '', a: [] }; return render(); }
    if (a === 'cancel') { S.form = null; return render(); }
    if (a === 'edit') { var x = S.G.filter(function (q) { return q.id === p[1]; })[0]; S.form = { id: x.id, d: x.d, u: x.u, n: x.n, m: x.m, a: x.a.slice() }; render(); document.getElementById('asgBox').scrollIntoView({ behavior: 'smooth' }); return; }
    if (a === 'logout') { S.pw = ''; sput('asg_pw', ''); S.form = null; return render(); }
    if (S.busy) return;
    var job = null;
    if (a === 'ack') job = post({ a: 'asgack', id: p[1], name: S.me }).then(function () { toast('รับทราบงานแล้ว'); });
    if (a === 'login') { var pw = document.getElementById('asgPw').value; job = post({ a: 'all', pw: pw }).then(function () { S.pw = pw; sput('asg_pw', pw); toast('เข้าสู่ระบบผู้บริหารแล้ว'); }); }
    if (a === 'save') {
      var e = { d: document.getElementById('asgD').value, u: document.getElementById('asgU').value, n: document.getElementById('asgN').value, m: document.getElementById('asgM').value,
        a: [].map.call(document.querySelectorAll('[name=asgA]:checked'), function (c) { return c.value; }) };
      if (!e.n.trim()) return toast('กรุณาใส่เรื่อง'); if (!e.u) return toast('กรุณาใส่กำหนดส่ง'); if (e.u < e.d) return toast('กำหนดส่งต้องไม่ก่อนวันที่มอบหมาย'); if (!e.a.length) return toast('กรุณาเลือกครูอย่างน้อย 1 คน');
      job = post({ a: 'asgsave', pw: S.pw, id: S.form.id || undefined, e: e }).then(function () { S.form = null; toast('บันทึกการมอบหมายงานแล้ว'); });
    }
    if (a === 'done') job = post({ a: 'asgdone', pw: S.pw, id: p[1], v: Number(p[2]), name: decodeURIComponent(p.slice(3).join(':')) });
    if (a === 'del') { if (!window.confirm('ลบงานนี้?')) return; job = post({ a: 'asgdel', pw: S.pw, id: p[1] }).then(function () { toast('ลบแล้ว'); }); }
    if (!job) return;
    S.busy = true; el.disabled = true;
    job.then(load).catch(function (err) { if (/รหัสผ่าน/.test(err.message)) { S.pw = ''; sput('asg_pw', ''); } toast(err.message); render(); }).then(function () { S.busy = false; });
  }
  function change(ev) { if (ev.target.id === 'asgMe') { S.me = ev.target.value; put('asg_me', S.me); render(); } }

  function init() {
    S.me = get('asg_me'); S.pw = sget('asg_pw');
    var css = document.createElement('style');
    css.textContent = '#asgBox,#asgBan,#asgToast{font-family:inherit}' +
      '#asgBan{max-width:1200px;margin:8px auto 0;padding:10px 14px;background:#FEF3C7;color:#78350F;border-radius:12px;cursor:pointer;font-size:15px}' +
      '#asgBox{max-width:1200px;margin:12px auto;padding:14px;background:#F4F7FC;color:#1F2937;border-radius:16px;box-shadow:0 2px 10px rgba(0,0,0,.08)}' +
      '.asg-head{display:flex;justify-content:space-between;align-items:center;font-size:19px;margin-bottom:8px}.asg-head button{border:0;background:#e5e7eb;border-radius:50%;width:34px;height:34px;cursor:pointer;font-size:16px}' +
      '.asg-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}.asg-tabs button{border:1px solid #BFDBFE;background:#fff;color:#1D4ED8;border-radius:999px;padding:6px 14px;cursor:pointer;font:inherit;font-size:14px}.asg-tabs button.on{background:#2563EB;color:#fff;border-color:#2563EB}' +
      '.asg-f{display:flex;flex-direction:column;gap:3px;font-size:13.5px;color:#6B7280;margin:6px 0;flex:1}.asg-f input,.asg-f select,.asg-f textarea{font:inherit;font-size:15px;padding:8px 10px;border:1px solid #CBD5E1;border-radius:9px;background:#fff;color:#111}' +
      '.asg-row{display:flex;gap:10px;flex-wrap:wrap}.asg-card{background:#fff;border-radius:12px;padding:10px 12px;margin:8px 0;border-left:5px solid #2563EB;box-shadow:0 1px 3px rgba(0,0,0,.06)}' +
      '.asg-form{border-left-color:#7C3AED}.asg-b{display:inline-block;font-size:12px;font-weight:700;padding:1px 9px;border-radius:9px}.asg-t{font-weight:700;font-size:16.5px;margin:3px 0 1px}' +
      '.asg-s{font-size:13px;color:#6B7280}.asg-m{white-space:pre-line;font-size:14.5px;margin-top:4px}.asg-ok{color:#047857;font-size:13.5px;margin-top:4px}' +
      '.asg-btn{font:inherit;font-size:14px;font-weight:700;border-radius:9px;padding:6px 12px;cursor:pointer;margin-top:6px;border:1px solid #CBD5E1;background:#fff}.asg-btn.ok{background:#047857;color:#fff;border-color:#047857}.asg-btn.del{background:#B91C1C;color:#fff;border-color:#B91C1C}.asg-btn:disabled{opacity:.6}' +
      '.asg-tools{display:flex;gap:6px;flex-wrap:wrap}.asg-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:6px 0}.asg-stats div{background:#fff;border-radius:10px;padding:8px;text-align:center;font-size:12.5px;color:#6B7280}.asg-stats b{display:block;font-size:22px}' +
      '.asg-bar{height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;margin:6px 0 2px}.asg-bar i{display:block;height:100%;background:#047857}' +
      '.asg-pp{margin-top:6px;border-top:1px solid #eee}.asg-pp>div{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid #f3f4f6;font-size:14px}.asg-pp .asg-btn{margin:0;padding:3px 9px;font-size:13px}' +
      '.asg-chk{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:2px 10px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;font-size:14px;margin-top:4px}.asg-chk label{display:flex;gap:6px;align-items:center;min-height:30px}' +
      '.asg-empty{background:#fff;border-radius:12px;padding:16px;text-align:center;color:#6B7280}' +
      '#asgToast{display:none;position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#111827;color:#fff;padding:10px 16px;border-radius:10px;z-index:99;max-width:90vw}' +
      '#asgNb{font-style:normal;background:#DC2626;color:#fff;border-radius:10px;font-size:12px;font-weight:700;padding:0 7px;margin-left:6px}' +
      '@media(max-width:560px){.asg-stats{grid-template-columns:1fr 1fr}.asg-pp>div{grid-template-columns:1fr auto}.asg-pp>div>span:nth-child(2){grid-row:2}}';
    document.head.appendChild(css);
    var links = document.querySelector('.sks-links'), anchor = document.getElementById('asgBox');
    var btn = document.createElement('a'); btn.href = '#'; btn.setAttribute('data-asg', 'open'); btn.innerHTML = '<span>📌</span>มอบหมายงาน<em id="asgNb" style="display:none"></em>';
    var grid = links ? (document.getElementById('sksTrack') || links.querySelector('a')) : null;
    if (grid && grid.parentNode) grid.parentNode.appendChild(btn);
    var ban = document.createElement('div'); ban.id = 'asgBan'; ban.style.display = 'none'; ban.setAttribute('data-asg', 'open');
    if (!anchor) { anchor = document.createElement('div'); anchor.id = 'asgBox'; (links || document.body).insertAdjacentElement(links ? 'afterend' : 'afterbegin', anchor); }
    anchor.parentNode.insertBefore(ban, anchor);
    var t = document.createElement('div'); t.id = 'asgToast'; document.body.appendChild(t);
    document.addEventListener('click', click); document.addEventListener('change', change);
    if (/[?&#]asg\b/.test(location.href)) S.open = true;
    render(); load().catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
