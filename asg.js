/* บันทึกการมอบหมายงาน — ระบบติดตามการส่งงานครู ร.ร.วัดแสนเกษม
 * ไฟล์นี้เพิ่มปุ่ม "📌 มอบหมายงาน", "⚙️ Admin" และปุ่มเมนูใหม่ (กิจกรรมออนไลน์/โครงสร้างการบริหาร/ดาวน์โหลดเอกสาร) ในหัวข้อระบบของโรงเรียน
 * ครู: เลือกชื่อตัวเอง → เห็นงานของตัวเอง + กด "รับทราบ" (แจ้งเตือนในระบบ: ตัวเลขสีแดงที่ปุ่ม + แถบเตือน)
 * ผู้บริหาร: ใส่รหัสผ่านผู้บริหาร (รหัสเดียวกับระบบติดตาม) → มอบหมาย/แก้ไข/ลบ/บันทึกว่าเสร็จ
 */
(function () {
  var API = 'https://script.google.com/macros/s/AKfycby8sOIXP7zEzWaunedJHsI2QhRF_lNp3gpAlKSlLa7gs6mR8GgKujSsT54f4y0bgPSh7Q/exec';
  var MS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var S = { teachers: [], G: [], open: false, tab: 'me', me: '', pw: '', form: null, busy: false, who: '', old: false, acts: null, loaded: false };
  var TT = 'https://script.google.com/macros/s/AKfycbxcOJT-I3bpSGXQphtBv-lC9AHwo0IAcb2WK-7YddeiChbo00rLNEu_ZmaLlG-dPSNj/exec';
  function get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function sget(k) { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function sput(k, v) { try { if (v) sessionStorage.setItem(k, v); else sessionStorage.removeItem(k); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function th(iso) { var p = String(iso || '').split('-').map(Number); return p[0] ? p[2] + ' ' + MS[p[1] - 1] + ' ' + String(p[0] + 543).slice(2) : ''; }
  function today() { return new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); }
  function days(u) { return Math.round((new Date(u + 'T00:00:00Z') - new Date(today() + 'T00:00:00Z')) / 864e5); }
  function short(n) { return String(n).replace(/^(นางสาว|นาง|นาย)\s*/, '').split(' ')[0]; }
  // ---------- กิจกรรมออนไลน์ (จากระบบตารางสอน · ดูได้ทุกคน) ----------
  function first(n) { return String(n || '').replace(/^(นางสาว|นาง|นาย|ว่าที่\s*ร\.?ต\.?\s*(หญิง)?)\s*/, '').split(' ')[0]; }
  function actMine(x, name) {
    var txt = (x.people || '') + ' ' + (x.note || ''), f = first(name);
    var isT = S.teachers.indexOf(name) >= 0 || ((S.people || []).filter(function (q) { return q.name === name; })[0] || {}).grp === 'ข้าราชการครู';
    if (/บุคลากรทุกคน/.test(txt) || /ทุกคน/.test(txt.replace(/ครูทุกคน|ครูทั้งหมด|คณะครู/g, ''))) return true;
    if (isT && /ครูทุกคน|ครูทั้งหมด|คณะครู/.test(txt)) return true;
    var pp = (S.people || []).filter(function (q) { return q.name === name; })[0];
    if (pp && pp.grp === 'ผู้บริหาร' && /ผู้บริหาร/.test(txt)) return true;
    if (pp && pp.nick && String(pp.nick).length > 2 && txt.indexOf(pp.nick) >= 0) return true;
    if (f && txt.indexOf(f) >= 0) return true;
    var t = ((S.acts && S.acts.teachers) || []).filter(function (q) { return first(q.name) === f; })[0], sh = t ? String(t.short || '').replace(/^ครู/, '') : '';
    return sh.length > 1 && txt.indexOf(sh) >= 0;
  }
  function loadActs() {
    if (S.acts) return Promise.resolve(S.acts);
    return fetch(TT + '?api=acts').then(function (r) { return r.json(); }).then(function (j) { S.acts = j.ok ? j.data : { items: [], teachers: [], err: true }; return S.acts; })
      .catch(function () { S.acts = { items: [], teachers: [], err: true }; return S.acts; });
  }
  function actsBlock(name, max) {
    if (!S.acts) return '<div class="asg-s">กำลังโหลดปฏิทินงาน…</div>';
    if (S.acts.err) return '<div class="asg-s">โหลดปฏิทินงานไม่ได้ (ระบบตารางสอนต้องอัปเดตเป็นฉบับล่าสุด)</div>';
    var td = today(), L = S.acts.items.filter(function (x) { return x.date >= td && actMine(x, name); });
    var h = L.length ? L.slice(0, max || 10).map(function (x) {
      return '<div class="asg-act"><span class="asg-ad">' + th(x.date) + (x.time ? '<br><small>' + esc(x.time) + '</small>' : '') + '</span><span><b>' + esc(x.title) + '</b>' +
        (x.people ? '<br><small>👥 ' + esc(x.people) + '</small>' : '') + (x.place ? '<br><small>📍 ' + esc(x.place) + '</small>' : '') + (x.note ? '<br><small>📝 ' + esc(x.note) + '</small>' : '') + '</span></div>';
    }).join('') : '<div class="asg-s">ไม่มีกิจกรรมออนไลน์ที่จะถึง</div>';
    if (L.length > (max || 10)) h += '<div class="asg-s">และอีก ' + (L.length - (max || 10)) + ' รายการ</div>';
    return h + '<a class="asg-btn gh" style="display:inline-block;text-decoration:none;color:inherit" href="' + TT + '?page=acts" target="_top">📅 ดูปฏิทินงานโรงเรียนทั้งหมด</a>';
  }

  function pnames() { var L = (S.people || []).map(function (p) { return p.name; }); S.teachers.forEach(function (t) { if (L.indexOf(t) < 0) L.push(t); }); return L; }
  function pgroups() {
    var P = (S.people && S.people.length ? S.people : []).slice(); S.teachers.forEach(function (t) { if (!P.some(function (p) { return p.name === t; })) P.push({ name: t, nick: '', grp: 'ข้าราชการครู' }); });
    var order = ['ผู้บริหาร', 'ข้าราชการครู', 'บุคลากรทางการศึกษา', 'ลูกจ้างประจำ', 'ลูกจ้างชั่วคราว/จ้างเหมา'], G = {};
    P.forEach(function (p) { var g = p.grp || 'อื่น ๆ'; (G[g] = G[g] || []).push(p); });
    return Object.keys(G).sort(function (a, b) { var x = order.indexOf(a), y = order.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); }).map(function (g) { return { grp: g, list: G[g] }; });
  }
  function post(o) {
    return fetch(API, { method: 'POST', body: JSON.stringify(o) }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) throw new Error({ auth: 'รหัสผ่านผู้บริหารไม่ถูกต้อง', bad: 'ข้อมูลไม่ครบหรือไม่ถูกต้อง', notfound: 'ไม่พบรายการ (อาจถูกลบแล้ว)', server: 'ระบบขัดข้อง ลองใหม่อีกครั้ง' }[j.err] || 'บันทึกไม่สำเร็จ');
      return j;
    });
  }
  function toast(msg) { var t = document.getElementById('asgToast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(function () { t.style.display = 'none'; }, 3500); }
  // ---------- ประชุม: ปิดงานเองเมื่อเลยวันประชุม · อบรม: เสร็จเมื่อส่งรายงาน (ชื่อเรื่องตามงานมอบหมาย) ----------
  var TRRE = /อบรม|สัมมนา|ศึกษาดูงาน/;
  function tnorm(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  function kindOf(x) { return TRRE.test(x.n) ? 'tr' : /ประชุม/.test(x.n) ? 'mt' : ''; }
  function aug() {
    var M = {}; (S.TR || []).forEach(function (r) { var k = tnorm(r.n) + '|' + tnorm(r.t); if (!M[k] || M[k] < r.at) M[k] = r.at; });
    var td = today();
    S.G.forEach(function (x) {
      x._k = kindOf(x);
      x.a.forEach(function (z) {
        var g = x.st[z] || {}, at = x._k === 'tr' ? M[tnorm(z) + '|' + tnorm(x.n)] : '';
        if (at) { g.rp = at; if (!g.d) { g.d = at; g.au = 1; } }
        else if (x._k === 'mt' && td > x.u && !g.d) { g.d = x.u; g.au = 1; }
        if (g.d || g.rp) x.st[z] = g;
      });
    });
  }
  function kindNote(x, nm) {
    var g = x.st[nm] || {};
    if (x._k === 'mt') return g.au ? '<div class="asg-ok">✅ ปิดงานอัตโนมัติ (ประชุมผ่านไปแล้ว)</div>' : '';
    if (x._k !== 'tr') return '';
    if (g.rp) return '<div class="asg-ok">📄 ส่งรายงานการอบรมเรื่องนี้แล้ว ' + esc(String(g.rp).slice(0, 16)) + '</div>';
    if (g.d) return '';
    var late = days(x.u) < 0;
    return '<div class="tr-need' + (late ? ' late' : '') + '"><span>' + (late ? '⏰ ยังไม่ได้ส่งรายงานการอบรมเรื่องนี้' : '📄 อบรมเสร็จแล้ว ส่งรายงานเป็นภาพได้เลย') + '</span><button class="asg-btn tr" data-asg="trrep:' + x.id + ':' + encodeURIComponent(nm) + '">📄 ส่งรายงานการอบรม</button></div>';
  }
  // หน้าต่างส่งรายงาน (ภาพ ≤ 5 ภาพ · ย่อขนาดในเครื่องก่อนส่ง)
  var TRF = { x: null, nm: '', imgs: [], busy: false };
  function trShrink(file) {
    return new Promise(function (ok, no) {
      var fr = new FileReader();
      fr.onload = function () {
        var im = new Image();
        im.onload = function () {
          var k = Math.min(1, 1600 / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
          var cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height); cx.drawImage(im, 0, 0, c.width, c.height);
          ok(c.toDataURL('image/jpeg', 0.82));
        };
        im.onerror = function () { no(new Error('เปิดภาพ ' + file.name + ' ไม่ได้ (ลองใช้ภาพ JPG/PNG)')); };
        im.src = fr.result;
      };
      fr.onerror = function () { no(new Error('อ่านไฟล์ไม่ได้')); };
      fr.readAsDataURL(file);
    });
  }
  function trDraw() {
    var w = document.getElementById('trBox'); if (!w) return;
    var x = TRF.x, n = TRF.imgs.length;
    w.innerHTML = '<div class="tr-box"><div class="tr-hd"><b>📄 ส่งรายงานการอบรม</b><button data-tr="x" title="ปิด">✕</button></div>' +
      '<div class="tr-topic"><small>เรื่องที่อบรม</small>' + esc(x.n) + '<small>วันที่ ' + th(x.u) + ' · ผู้ส่ง: ' + esc(TRF.nm) + '</small></div>' +
      '<div class="tr-imgs">' + TRF.imgs.map(function (s, i) { return '<figure><img src="' + s + '" alt="ภาพที่ ' + (i + 1) + '"><button data-tr="rm:' + i + '" title="เอาออก">✕</button></figure>'; }).join('') +
      (n < 5 ? '<label class="tr-add">＋<span>' + (n ? 'เพิ่มภาพ' : 'เลือกภาพรายงาน') + '</span><input type="file" accept="image/*" multiple id="trFile"></label>' : '') + '</div>' +
      '<div class="asg-s">ถ่ายรูปหรือเลือกภาพรายงานได้สูงสุด 5 ภาพ ระบบย่อขนาดให้อัตโนมัติ</div>' +
      '<button class="asg-btn ok tr-go" data-tr="go"' + (n && !TRF.busy ? '' : ' disabled') + '>' + (TRF.busy ? '⏳ กำลังส่ง…' : '📤 ส่งรายงานเรื่องนี้') + '</button></div>';
  }
  function trOpen(id, nm) {
    var x = S.G.filter(function (y) { return y.id === id; })[0]; if (!x) return;
    TRF = { x: x, nm: nm || S.me, imgs: [], busy: false };
    var w = document.getElementById('trBox');
    if (!w) { w = document.createElement('div'); w.id = 'trBox'; document.body.appendChild(w); }
    w.style.display = 'flex'; trDraw();
  }
  function trClose() { var w = document.getElementById('trBox'); if (w && !TRF.busy) w.style.display = 'none'; }
  document.addEventListener('change', function (ev) {
    if (ev.target.id !== 'trFile') return;
    var L = [].slice.call(ev.target.files || [], 0, 5 - TRF.imgs.length);
    Promise.all(L.map(trShrink)).then(function (a) { TRF.imgs = TRF.imgs.concat(a).slice(0, 5); trDraw(); }, function (e) { toast(e.message); });
  });
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-tr]'); if (!el) { if (ev.target.id === 'trBox') trClose(); return; }
    ev.preventDefault(); var a = el.getAttribute('data-tr');
    if (a === 'x') return trClose();
    if (a.indexOf('rm:') === 0) { TRF.imgs.splice(Number(a.slice(3)), 1); return trDraw(); }
    if (a === 'go' && TRF.imgs.length && !TRF.busy) {
      TRF.busy = true; trDraw();
      var x = TRF.x, nm = TRF.nm;
      fetch(TT, { method: 'POST', body: JSON.stringify({ a: 'trsub', id: x.id, name: nm, title: x.n, date: x.u, files: TRF.imgs.map(function (s) { return s.split(',')[1]; }) }) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          TRF.busy = false;
          if (!j.ok) throw new Error(j.err || 'ส่งไม่สำเร็จ');
          (S.TR = S.TR || []).push({ n: nm, t: tnorm(x.n), at: j.at }); aug();
          var w = document.getElementById('trBox'); if (w) w.style.display = 'none';
          toast('✅ ส่งรายงานเรื่อง "' + x.n + '" แล้ว'); render(); try { teacherView(true); } catch (e) {}
        })
        .catch(function (e) { TRF.busy = false; trDraw(); toast('ส่งไม่สำเร็จ: ' + (e.message || e)); });
    }
  });

  // ---------- ข้อมูลวิจัย: บันทึกการใช้งาน (เฉพาะชื่อเมนู · ไม่เก็บข้อความที่พิมพ์) + แจ้งปัญหา/ข้อเสนอแนะ ----------
  var NT = 'https://script.google.com/macros/s/AKfycbwskmmW5YzzBnZCTi5q0TkuHEgW6DnIvkvWmw64Ee8xlawg9mJRQ6cdM5c2_0YK9x_MWg/exec', LGS = {};
  function who() { return get('asg_me') || get('push_nm') || ''; }
  function dev() { var u = navigator.userAgent; return /iPad|Tablet/i.test(u) ? 'แท็บเล็ต' : /Mobi|Android|iPhone/i.test(u) ? 'มือถือ' : 'คอมพิวเตอร์'; }
  function logU(m) {
    m = String(m || '').replace(/\s+/g, ' ').trim().slice(0, 50); if (!m || LGS[m]) return; LGS[m] = 1;
    try { fetch(NT, { method: 'POST', mode: 'no-cors', keepalive: true, body: JSON.stringify({ a: 'log', n: who(), m: m, dv: dev(), ch: sget('ch') }) }); } catch (e) {}
  }
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest && ev.target.closest('a,button'); if (!el || el.closest('#trBox,#fbBox,#ctBox,#evBox')) return;
    if (el.closest('.asg-chk,.asg-form') || el.type === 'submit') return;
    var t = (el.getAttribute('data-sec') || el.getAttribute('title') || el.textContent || '').replace(/\s+/g, ' ').trim();
    if (t.length >= 2 && !/^[\d✕×←→]+$/.test(t)) logU(t);
  }, true);
  function fbOpen() {
    var w = document.getElementById('fbBox');
    if (!w) { w = document.createElement('div'); w.id = 'fbBox'; document.body.appendChild(w); }
    w.innerHTML = '<div class="tr-box"><div class="tr-hd"><b>💬 แจ้งปัญหา / เสนอแนะ</b><button data-fb="x" title="ปิด">✕</button></div>' +
      '<div class="asg-s">ช่วยให้ระบบดีขึ้น · ข้อความส่งถึงผู้ดูแลระบบเท่านั้น</div>' +
      '<label class="asg-f">ประเภท<select id="fbK"><option>ปัญหา</option><option>ข้อเสนอแนะ</option></select></label>' +
      '<label class="asg-f">เกิดที่เมนู/หน้าไหน<input id="fbP" maxlength="60" placeholder="เช่น ตารางสอน, มอบหมายงาน"></label>' +
      '<label class="asg-f">รายละเอียด<textarea id="fbX" rows="4" maxlength="1500" placeholder="เล่าสั้น ๆ ว่าเกิดอะไรขึ้น หรืออยากให้ปรับอะไร"></textarea></label>' +
      (function () {
        var me = who(), L = []; try { L = pnames(); } catch (e) {} if (me && L.indexOf(me) < 0) L = [me].concat(L);
        return '<label class="asg-f">ผู้แจ้ง<select id="fbN"><option value="">🙈 ไม่ประสงค์ออกนาม</option>' +
          L.map(function (n) { return '<option value="' + esc(n) + '"' + (n === me ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select></label>';
      })() +
      '<button class="asg-btn ok tr-go" data-fb="go">📤 ส่ง</button></div>';
    w.style.display = 'flex';
    // รายชื่อยังไม่โหลด (เปิดฟอร์มก่อนเมนูอื่น) → โหลดแล้วเติมรายชื่อทั้งหมด โดยคงค่าที่เลือกไว้
    if (!S.loaded || pnames().length < 2) {
      var sel = document.getElementById('fbN'); if (sel) sel.insertAdjacentHTML('beforeend', '<option disabled data-fbw="1">⏳ กำลังโหลดรายชื่อ…</option>');
      (S.loaded ? Promise.resolve() : load()).catch(function () {}).then(function () {
        var e = document.getElementById('fbN'); if (!e) return;
        var cur = e.value, me = who(), L = []; try { L = pnames(); } catch (x) {} if (me && L.indexOf(me) < 0) L = [me].concat(L);
        e.innerHTML = '<option value="">🙈 ไม่ประสงค์ออกนาม</option>' + L.map(function (n) { return '<option value="' + esc(n) + '"' + (n === cur ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('');
      });
    }
  }
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-fb]'), w = document.getElementById('fbBox');
    if (!el) { if (w && ev.target === w) w.style.display = 'none'; return; }
    ev.preventDefault(); var a = el.getAttribute('data-fb');
    if (a === 'open') return fbOpen();
    if (a === 'x') { w.style.display = 'none'; return; }
    if (a === 'go') {
      var x = (document.getElementById('fbX').value || '').trim(); if (x.length < 3) return toast('กรุณาพิมพ์รายละเอียด');
      el.disabled = true; el.textContent = '⏳ กำลังส่ง…';
      fetch(NT, { method: 'POST', body: JSON.stringify({ a: 'fb', n: (document.getElementById('fbN') || {}).value || 'ไม่ประสงค์ออกนาม', k: document.getElementById('fbK').value, pg: document.getElementById('fbP').value, x: x }) })
        .then(function (r) { return r.json(); }).then(function (j) { if (!j.ok) throw new Error(j.err || 'ส่งไม่สำเร็จ'); w.style.display = 'none'; toast('✅ ส่งถึงผู้ดูแลระบบแล้ว ขอบคุณค่ะ'); })
        .catch(function (e) { el.disabled = false; el.textContent = '📤 ส่ง'; toast('ส่งไม่สำเร็จ: ' + (e.message || e)); });
    }
  });

  // ---------- 🎂 วันเกิดวันนี้ (แถบบนหน้าแรก) ----------
  var BD = null;
  function bdLoad() { fetch(TT + '?api=bday').then(function (r) { return r.json(); }).then(function (j) { BD = j.data || {}; bdDraw(); }, function () {}); }
  function bdDraw() {
    var up = document.getElementById('upBan'); if (!BD || !up) return;
    var el = document.getElementById('bdBan');
    var L = BD.today || [], S2 = (BD.soon || []).filter(function (x) { return x.in <= 3; });
    if (!L.length && !S2.length) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'bdBan'; up.parentNode.insertBefore(el, up); }
    var cake = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Birthday%20cake/3D/birthday_cake_3d.png';
    el.className = L.length ? 'bd-on' : 'bd-soon';
    el.innerHTML = '<img src="' + cake + '" alt="" onerror="this.remove()"><div>' + (L.length ? '<b>🎉 สุขสันต์วันเกิด ' + esc(L.join(', ')) + '</b><span>ร่วมส่งคำอวยพรกันนะคะ 🎁</span>' : '') +
      (S2.length ? '<small>เร็ว ๆ นี้: ' + S2.map(function (x) { return esc(x.name) + ' (' + (x.in === 1 ? 'พรุ่งนี้' : 'อีก ' + x.in + ' วัน') + ')'; }).join(' · ') + '</small>' : '') + '</div>';
  }
  // ---------- 📇 ข้อมูลติดต่อส่วนบุคคล (อีเมลส่วนตัว · อีเมล edu · LINE ID) — เก็บในข้อมูลบุคลากร แอดมินเห็นคนเดียว ----------
  var CT = { L: null };
  function ctLoad() { fetch(NT, { method: 'POST', body: JSON.stringify({ a: 'ctst' }) }).then(function (r) { return r.json(); }).then(function (j) { CT.L = j.L || []; ctBan(); if (S.open && S.tab === 'adm' && !S.form) render(); }, function () {}); }
  function ctDone(nm) { var n = tnorm(nm), f = (CT.L || []).filter(function (x) { return x.n === n; })[0]; return !f || f.f; }
  function ctBan() {
    var up = document.getElementById('upBan'); if (!up || !CT.L) return;
    var el = document.getElementById('ctBan'), me = who();
    var need = me ? !ctDone(me) : !get('ct_done');
    if (!need) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'ctBan'; up.parentNode.insertBefore(el, up); }
    el.innerHTML = '<span>📇 ยังไม่ได้กรอกข้อมูลติดต่อ (อีเมล · LINE ID)</span><button data-ct="open">กรอกเลย</button>';
  }
  function ctAdm() {
    if (!CT.L) { ctLoad(); return ''; }
    var not = CT.L.filter(function (x) { return !x.f; });
    return '<div class="asg-card" style="border-left-color:#0891B2"><b>📇 ข้อมูลติดต่อบุคลากร</b> <span class="asg-s">กรอกแล้ว ' + (CT.L.length - not.length) + '/' + CT.L.length + ' คน · ดูข้อมูลได้ที่แผ่น "ข้อมูลบุคลากร" (คอลัมน์ J–M) ในไฟล์ระบบตารางสอน</span>' +
      (not.length ? '<div class="asg-s" style="margin-top:4px">ยังไม่กรอก: ' + not.map(function (x) { return esc(x.n); }).join(', ') + '</div>' : '<div class="asg-ok">✅ กรอกครบทุกคนแล้ว</div>') + '</div>';
  }
  function ctOpen() {
    var w = document.getElementById('ctBox');
    if (!w) { w = document.createElement('div'); w.id = 'ctBox'; document.body.appendChild(w); }
    var me = who(), names = (CT.L && CT.L.length ? CT.L : (S.people || []).map(function (p) { return { n: p.name }; })).map(function (x) { return x.n; });
    if (me && names.indexOf(me) < 0) names.unshift(me);
    w.innerHTML = '<div class="tr-box"><div class="tr-hd"><b>📇 ข้อมูลติดต่อส่วนบุคคล</b><button data-ct="x" title="ปิด">✕</button></div>' +
      '<div class="ct-note">🔒 ข้อมูลนี้ใช้เป็นข้อมูลส่วนบุคคล ไม่เผยแพร่</div>' +
      '<label class="asg-f">ชื่อ *<select id="ctN"><option value="">— เลือกชื่อของคุณ —</option>' + names.map(function (n) { return '<option' + (n === me ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select></label>' +
      '<label class="asg-f">อีเมลส่วนตัว *<input id="ctE1" type="email" inputmode="email" autocomplete="email" maxlength="120" placeholder="เช่น name@gmail.com"></label>' +
      '<label class="asg-f">อีเมล edu *<input id="ctE2" type="email" inputmode="email" maxlength="120" placeholder="อีเมลที่หน่วยงานออกให้"></label>' +
      '<label class="asg-f">LINE ID *<input id="ctL" maxlength="40" autocapitalize="off" autocomplete="off" placeholder="LINE ID ของคุณ"></label>' +
      '<button class="asg-btn ok tr-go" data-ct="go">💾 บันทึก</button></div>';
    w.style.display = 'flex';
  }
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-ct]'), w = document.getElementById('ctBox');
    if (!el) { if (w && ev.target === w) w.style.display = 'none'; return; }
    ev.preventDefault(); var a = el.getAttribute('data-ct');
    if (a === 'open') return ctOpen();
    if (a === 'x') { w.style.display = 'none'; return; }
    if (a === 'go') {
      var re = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[A-Za-z]{2,}$/, n = document.getElementById('ctN').value, e1 = document.getElementById('ctE1').value.trim(), e2 = document.getElementById('ctE2').value.trim(), ln = document.getElementById('ctL').value.trim();
      if (!n) return toast('กรุณาเลือกชื่อ');
      if (!re.test(e1)) return toast('อีเมลส่วนตัวไม่ถูกต้อง');
      if (!re.test(e2)) return toast('อีเมล edu ไม่ถูกต้อง');
      if (!ln) return toast('กรุณากรอก LINE ID');
      if (!/^[A-Za-z0-9._@\-]{2,40}$/.test(ln)) return toast('LINE ID ใช้ได้เฉพาะอักษรอังกฤษ ตัวเลข . _ -');
      el.disabled = true; el.textContent = '⏳ กำลังบันทึก…';
      fetch(NT, { method: 'POST', body: JSON.stringify({ a: 'contact', n: n, e1: e1, e2: e2, ln: ln }) }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j.ok) throw new Error(j.err || 'บันทึกไม่สำเร็จ');
        put('ct_done', '1'); (CT.L || []).forEach(function (x) { if (x.n === tnorm(n)) x.f = true; });
        w.style.display = 'none'; ctBan(); toast('✅ บันทึกข้อมูลติดต่อแล้ว ขอบคุณค่ะ');
      }).catch(function (e) { el.disabled = false; el.textContent = '💾 บันทึก'; toast(e.message || 'บันทึกไม่สำเร็จ'); });
    }
  });
  // ---------- 🏷️ สถานะกิจกรรมในปฏิทิน (แอดมินตั้งเท่านั้น · ครูเห็นอย่างเดียว) ----------
  var EV = { M: null }, EVI = { 'เสร็จสิ้น': ['✅', 'ok'], 'เสร็จสิ้น (ไม่มีรายการ)': ['⭕', 'nil'], 'ไม่เข้าร่วม': ['🚫', 'no'], 'เลื่อน / ยกเลิก': ['📅', 'mv'] };
  function evk(x) { return x.date + '|' + String(x.title || '').replace(/[\s.()\-–]/g, '').slice(0, 60); }
  function evLoad() { fetch(NT, { method: 'POST', body: JSON.stringify({ a: 'evst' }) }).then(function (r) { return r.json(); }).then(function (j) { EV.M = j.M || {}; try { renderUp(); } catch (e) {} }, function () {}); }
  function evChip(x) { var e = x._ev; if (!e) return ''; var i = EVI[e.s] || ['✅', 'ok']; return '<span class="ev-chip ev-' + i[1] + '">' + i[0] + ' ' + esc(e.s) + (e.n ? ' · ' + esc(e.n) : '') + '</span>'; }
  function evBtn(x) { return S.pw ? '<button class="up-ed" data-ev="' + encodeURIComponent(x._k) + '" title="ตั้งสถานะ (แอดมิน)">✏️</button>' : ''; }
  function evOpen(k) {
    var x = (UP._L || {})[k]; if (!x) return;
    var w = document.getElementById('evBox'); if (!w) { w = document.createElement('div'); w.id = 'evBox'; document.body.appendChild(w); }
    var cur = (x._ev || {}).s || '', opts = [['เสร็จสิ้น', '✅ เสร็จสิ้น', 'ทำแล้ว ส่งแล้ว เข้าร่วมแล้ว'], ['เสร็จสิ้น (ไม่มีรายการ)', '⭕ เสร็จสิ้น (ไม่มีรายการ)', 'ตรวจแล้วไม่มีอะไรต้องส่ง'], ['ไม่เข้าร่วม', '🚫 ไม่เข้าร่วม', 'ระบุเหตุผลได้'], ['เลื่อน / ยกเลิก', '📅 เลื่อน / ยกเลิก', 'ผู้จัดเลื่อนหรือยกเลิก'], ['', '↩️ ยังไม่ปิด', 'ล้างสถานะ']];
    w.innerHTML = '<div class="tr-box"><div class="tr-hd"><b>🏷️ สถานะกิจกรรม</b><button data-evm="x" title="ปิด">✕</button></div>' +
      '<div class="tr-topic"><small>เรื่อง</small>' + esc(x.title) + '<small>' + esc(th(x.date)) + (x.time ? ' · ' + esc(x.time) : '') + '</small></div>' +
      '<div class="ev-opts">' + opts.map(function (o) { return '<label><input type="radio" name="evS" value="' + esc(o[0]) + '"' + (o[0] === cur ? ' checked' : '') + '><span><b>' + o[1] + '</b><small>' + o[2] + '</small></span></label>'; }).join('') + '</div>' +
      '<label class="asg-f">หมายเหตุ (ถ้ามี)<input id="evN" maxlength="120" value="' + esc((x._ev || {}).n || '') + '" placeholder="เช่น ไม่มีนักเรียนผ่านเกณฑ์คัดกรอง"></label>' +
      '<button class="asg-btn ok tr-go" data-evm="go" data-k="' + encodeURIComponent(k) + '">💾 บันทึกสถานะ</button></div>';
    w.style.display = 'flex';
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-ev]'); if (!b) return;
    ev.preventDefault(); ev.stopPropagation(); evOpen(decodeURIComponent(b.getAttribute('data-ev')));
  }, true);
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-evm]'), w = document.getElementById('evBox');
    if (!el) { if (w && ev.target === w) w.style.display = 'none'; return; }
    ev.preventDefault(); var a = el.getAttribute('data-evm');
    if (a === 'x') { w.style.display = 'none'; return; }
    if (a === 'go') {
      var k = decodeURIComponent(el.getAttribute('data-k')), x = (UP._L || {})[k], r = w.querySelector('input[name=evS]:checked');
      if (!x || !r) return toast('กรุณาเลือกสถานะ');
      el.disabled = true; el.textContent = '⏳ กำลังบันทึก…';
      fetch(NT, { method: 'POST', body: JSON.stringify({ a: 'evset', pw: S.pw, k: k, s: r.value, n: document.getElementById('evN').value, d: x.date, t: x.title }) }).then(function (res) { return res.json(); }).then(function (j) {
        if (!j.ok) throw new Error(j.err === 'auth' ? 'รหัสผ่านผู้บริหารไม่ถูกต้องหรือหมดเวลา กรุณาเข้าสู่ระบบใหม่' : j.err === 'busy' ? 'ระบบไม่ว่าง ลองใหม่อีกครั้ง' : 'บันทึกไม่สำเร็จ');
        EV.M = j.M || {}; w.style.display = 'none'; renderUp(); toast('✅ บันทึกสถานะแล้ว');
      }).catch(function (e) { el.disabled = false; el.textContent = '💾 บันทึกสถานะ'; toast(e.message || 'บันทึกไม่สำเร็จ'); });
    }
  });
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
  // แจ้งเตือนของทุกคน: ใครยังไม่รับทราบ / เลยกำหนด (แสดงหน้าแรก ทุกคนเห็น)
  function allPending() {
    var M = {};
    S.G.forEach(function (x) {
      x.a.forEach(function (z) {
        var g = x.st[z] || {}; if (g.d) return;
        var d = days(x.u), m = M[z] || (M[z] = { unack: 0, late: 0, soon: 0 });
        if (!g.k) m.unack++; if (d < 0) m.late++; else if (d <= 2) m.soon++;
      });
    });
    return M;
  }
  function disp(n) {
    var p = (S.people || []).filter(function (q) { return q.name === n; })[0];
    if (S.teachers.indexOf(n) >= 0 || (p && p.grp === 'ข้าราชการครู')) return 'ครู' + short(n);
    return p && p.nick ? p.nick : short(n);
  }
  function badge() {
    var M = allPending(), names = Object.keys(M), tot = 0;
    names.forEach(function (n) { tot += M[n].unack + M[n].late; });
    var b = document.getElementById('asgNb'), ban = document.getElementById('asgBan');
    if (b) { b.textContent = tot; b.style.display = tot ? '' : 'none'; }
    if (ban) { ban.style.display = 'none'; ban.innerHTML = ''; }
    if (!ban || true) return; // แถบ "ยังไม่รับทราบงาน" ซ้ำกับตัวเลขที่เมนูมอบหมายงาน — ซ่อน
    var chip = function (n, v, col, bg) { return '<a href="#" class="asg-chip" style="background:' + bg + ';color:' + col + '" data-asg="who:' + encodeURIComponent(n) + '" title="' + esc(n) + '">' + esc(disp(n)) + ' <b>' + v + '</b></a>'; };
    var un = names.filter(function (n) { return M[n].unack; }).sort(function (a, b) { return M[b].unack - M[a].unack; });
    var lt = names.filter(function (n) { return M[n].late; }).sort(function (a, b) { return M[b].late - M[a].late; });
    var h = '';
    if (lt.length) h += '<div class="asg-bl"><span>⚠️ <b>เลยกำหนดส่ง</b> (' + lt.length + ' คน):</span> ' + lt.map(function (n) { return chip(n, M[n].late, '#991B1B', '#FEE2E2'); }).join('') + '</div>';
    if (un.length) h += '<div class="asg-bl"><span>🔔 <b>ยังไม่รับทราบงาน</b> (' + un.length + ' คน):</span> ' + un.map(function (n) { return chip(n, M[n].unack, '#78350F', '#FDE68A'); }).join('') + '</div>';
    if (h) h += '<div class="asg-s" style="margin-top:4px">กดชื่อเพื่อดูงานและกด 👍 รับทราบ · <a href="#" data-asg="open">เปิดบันทึกมอบหมายงาน</a></div>';
    ban.innerHTML = h && !S.open ? h : '';
    ban.style.display = h && !S.open ? '' : 'none';
  }

  // ---------- หน้าจอ ----------
  function render() {
    var box = document.getElementById('asgBox'); if (!box) return;
    badge();
    if (!S.open) { box.style.display = 'none'; return; }
    box.style.display = '';
    var h = '<div class="asg-head"><b>📌 บันทึกการมอบหมายงาน</b><button data-asg="close" title="ปิด">✕</button></div>';
    h += '<div class="asg-tabs"><button data-asg="tab:me" class="' + (S.tab === 'me' ? 'on' : '') + '">📌 งานมอบหมายของฉัน</button><button data-asg="tab:all" class="' + (S.tab === 'all' ? 'on' : '') + '">🗂️ งานทั้งหมด</button><button data-asg="tab:ppl" class="' + (S.tab === 'ppl' ? 'on' : '') + '">👥 รายบุคคล</button><button data-asg="tab:adm" class="' + (S.tab === 'adm' ? 'on' : '') + '">✏️ แก้ไข (Admin)</button></div>';
    if (S.old) h += '<div class="asg-card" style="border-left-color:#B91C1C;background:#FEF2F2"><b>⚠️ ระบบติดตาม (Apps Script) ยังไม่ได้อัปเดตโค้ดมอบหมายงาน</b><div class="asg-s">ให้นำไฟล์ ระบบติดตาม_Code.txt ไปวางแทนโค้ดเดิม แล้วกด ทำให้ใช้งานได้ → จัดการการทำให้ใช้งานได้ → แก้ไข → เวอร์ชันใหม่</div></div>';
    if (S.tab === 'me') h += viewMe(); else if (S.tab === 'all') h += viewAll(false); else if (S.tab === 'ppl') h += viewPpl(); else h += viewAdm() + (S.pw ? ctAdm() : '');
    box.innerHTML = h;
  }
  function card(x, inner) { var st = x._st || 'open'; return '<div class="asg-card" style="border-left-color:' + COL[st] + '">' + inner + '</div>'; }
  function head(x, st, label) {
    return '<span class="asg-b" style="background:' + BG[st] + ';color:' + COL[st] + '">' + esc(label) + '</span><div class="asg-t">' + esc(x.n) + '</div>' +
      '<div class="asg-s">มอบหมาย ' + th(x.d) + ' · กำหนดส่ง <b>' + th(x.u) + '</b></div>' + (x.m ? amHtml(x.m) : '');
  }
  function viewMe() {
    var h = '<label class="asg-f">ชื่อของฉัน<select id="asgMe"><option value="">— เลือกชื่อของคุณ —</option>' + pnames().map(function (t) { return '<option' + (t === S.me ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></label>';
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
        (g.k ? '<div class="asg-ok">👍 รับทราบแล้ว ' + esc(g.k.slice(0, 16)) + '</div>' : (g.d ? '' : '<button class="asg-btn ok" data-asg="ack:' + x.id + '">👍 รับทราบ</button>')) + kindNote(x, S.me));
    }).join('');
  }
  function pstat(nm) {
    var o = { all: 0, unack: 0, late: 0, open: 0, done: 0 };
    S.G.forEach(function (x) {
      if (x.a.indexOf(nm) < 0) return; var g = x.st[nm] || {}; o.all++;
      if (g.d) { o.done++; return; } if (!g.k) o.unack++; if (days(x.u) < 0) o.late++; else o.open++;
    });
    return o;
  }
  function plink(nm) { return location.href.split('#')[0].split('?')[0] + '?asg=' + encodeURIComponent(nm); }
  function viewPpl() {
    if (S.who) {
      var nm = S.who, o = pstat(nm), admin = !!S.pw;
      var mine = S.G.filter(function (x) { return x.a.indexOf(nm) >= 0; }).map(function (x) { x._st = state(x, nm); return x; });
      var order = { late: 0, soon: 1, open: 2, done: 3 };
      mine.sort(function (a, b) { return order[a._st] - order[b._st] || (a.u < b.u ? -1 : 1); });
      var h = '<div class="asg-tools"><button class="asg-btn gh" data-asg="who:">← กลับรายชื่อ</button><button class="asg-btn gh" data-asg="copy:' + encodeURIComponent(nm) + '">🔗 คัดลอกลิงก์ของครูคนนี้</button>' +
        (admin ? '<button class="asg-btn ok" data-asg="newfor:' + encodeURIComponent(nm) + '">＋ มอบหมายงานให้ครูคนนี้</button>' : '') + '</div>';
      h += '<div class="asg-t" style="font-size:19px;margin-top:8px">' + esc(nm) + '</div>';
      h += '<div class="asg-stats"><div><b style="color:#2563EB">' + o.all + '</b>งานทั้งหมด</div><div><b style="color:#7C3AED">' + o.unack + '</b>ยังไม่รับทราบ</div><div><b style="color:#B91C1C">' + o.late + '</b>เลยกำหนด</div><div><b style="color:#047857">' + o.done + '</b>เสร็จแล้ว</div></div>';
      var actH = '<div class="asg-card" style="border-left-color:#0891B2"><b>📅 งาน/กิจกรรมที่จะถึง</b>' + actsBlock(nm, 8) + '</div>';
      if (!S.acts) loadActs().then(render);
      if (!mine.length) return h + '<div class="asg-empty">ยังไม่มีงานที่ได้รับมอบหมาย</div>' + actH;
      return h + mine.map(function (x) {
        var g = x.st[nm] || {};
        return card(x, head(x, x._st, x._st === 'done' ? 'เสร็จแล้ว' : dueText(x)) +
          '<div class="asg-s">' + (g.k ? '👍 รับทราบแล้ว ' + esc(g.k.slice(0, 16)) : '❔ ยังไม่รับทราบ') + (g.d ? ' · ✅ เสร็จ ' + esc(String(g.d).slice(0, 10)) : '') + '</div>' + kindNote(x, nm) +
          (!g.k && !g.d ? '<button class="asg-btn ok" data-asg="ackf:' + x.id + ':' + encodeURIComponent(nm) + '">👍 รับทราบ</button>' : '') +
          (admin ? '<div class="asg-tools"><button class="asg-btn ' + (g.d ? 'ok' : 'gh') + '" data-asg="done:' + x.id + ':' + (g.d ? 0 : 1) + ':' + encodeURIComponent(nm) + '">' + (g.d ? '✅ เสร็จแล้ว (กดเพื่อยกเลิก)' : 'บันทึกว่าเสร็จ') + '</button><button class="asg-btn gh" data-asg="edit:' + x.id + '">✏️ แก้ไขงาน</button></div>' : ''));
      }).join('') + actH;
    }
    var h2 = '<div class="asg-s" style="margin:6px 0">กดชื่อครูเพื่อดูงานที่ได้รับมอบหมายรายบุคคล</div><div class="asg-ppl">';
    h2 += pnames().map(function (t) {
      var o = pstat(t);
      return '<a href="#" data-asg="who:' + encodeURIComponent(t) + '"><b>' + esc(t) + '</b><span class="asg-s">งาน ' + o.all + ' · ค้าง ' + (o.all - o.done) +
        (o.late ? ' · <span style="color:#B91C1C">เลยกำหนด ' + o.late + '</span>' : '') + (o.unack ? ' · <span style="color:#7C3AED">ยังไม่รับทราบ ' + o.unack + '</span>' : '') + '</span></a>';
    }).join('');
    return h2 + '</div>';
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
        '<div class="asg-bar"><i style="width:' + (x._done / x.a.length * 100) + '%"></i></div><div class="asg-s">' + (x._k === 'tr' ? '🎓 งานอบรม · ส่งรายงานแล้ว <b>' + x.a.filter(function (z) { return (x.st[z] || {}).rp; }).length + '/' + x.a.length + '</b> คน' + (admin ? ' · <a href="' + TT + '?page=training" target="_blank">ดูภาพรายงาน</a>' : '') : x._k === 'mt' ? '🗣️ งานประชุม (ปิดเองเมื่อเลยวันประชุม) · รับทราบ ' + x._ack + '/' + x.a.length : 'รับทราบ ' + x._ack + '/' + x.a.length + ' · เสร็จ ' + x._done + '/' + x.a.length) + '</div>' +
        '<div class="asg-pp">' + x.a.map(function (z) {
          var g = x.st[z] || {};
          return '<div><a href="#" class="asg-nm" data-asg="who:' + encodeURIComponent(z) + '">' + esc(z) + '</a><span class="asg-s">' + (x._k === 'tr' ? (g.rp ? '📄 ส่งรายงานแล้ว ' + esc(String(g.rp).slice(5, 16)) : '⏳ ยังไม่ส่งรายงาน') : (g.k ? '👍 ' + esc(g.k.slice(5, 16)) : '❔ ยังไม่รับทราบ')) + '</span>' +
            (admin ? '<button class="asg-btn ' + (g.d ? 'ok' : 'gh') + '" data-asg="done:' + x.id + ':' + (g.d ? 0 : 1) + ':' + encodeURIComponent(z) + '">' + (g.d ? '✅ เสร็จ' : 'ยังไม่เสร็จ') + '</button>' : (g.d ? '<span class="asg-ok">✅ เสร็จ</span>' : '<span></span>')) + '</div>';
        }).join('') + '</div>' +
        (admin ? '<div class="asg-tools"><button class="asg-btn gh" data-asg="done:' + x.id + ':1:ALL">✅ เสร็จทุกคน</button><button class="asg-btn gh" data-asg="edit:' + x.id + '">✏️ แก้ไข</button><button class="asg-btn del" data-asg="del:' + x.id + '">🗑️ ลบ</button></div>' : ''));
    }).join('');
  }

  // ---------- 🔗🖼️ ลิงก์และรูปประกอบงานมอบหมาย (เก็บต่อท้ายรายละเอียด: บรรทัด "🔗 ..." / "🖼️ ...") ----------
  function amSplit(m) {
    var t = [], L = [], I = [], C = null;
    String(m || '').split('\n').forEach(function (ln) {
      var a = ln.trim(), k;
      if (a.indexOf('📅 ') === 0 && (k = a.match(/^📅 (\d{4}-\d{2}-\d{2}) (.+)$/))) C = { date: k[1], title: k[2] };
      else if (a.indexOf('🔗 ') === 0 && /^https?:\/\/\S+$/.test(a.slice(3).trim())) L.push(a.slice(3).trim());
      else if (a.indexOf('🖼️ ') === 0 && (k = a.match(/\/d\/([\w-]{20,})/))) I.push(k[1]);
      else t.push(ln);
    });
    return { t: t.join('\n').replace(/\s+$/, ''), L: L, I: I, C: C };
  }
  function amJoin(t, L, I, C) {
    return [String(t || '').replace(/\s+$/, '')].concat(L.map(function (u) { return '🔗 ' + u; }), I.map(function (id) { return '🖼️ https://drive.google.com/file/d/' + id + '/view'; }), C ? ['📅 ' + C.date + ' ' + C.title] : []).filter(Boolean).join('\n');
  }
  // 📅 รายการปฏิทินให้เลือกเชื่อมกับงานมอบหมาย (ปฏิทินงานโรงเรียน + กิจกรรมออนไลน์ ตั้งแต่วันนี้)
  function amCalOpts() {
    var td = today(), seen = {}, L = [];
    (UP.items || []).concat(S.acts && S.acts.items ? S.acts.items : []).forEach(function (x) {
      if (!x || !x.date || !x.title || x.date < td) return; var t = String(x.title).trim(), k = x.date + '|' + t; if (seen[k]) return; seen[k] = 1;
      L.push({ date: x.date, title: t, time: x.time || '' });
    });
    return L.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time < b.time ? -1 : 1); }).slice(0, 80);
  }
  function amLinkify(t) { return esc(t).replace(/https?:\/\/[^\s<]+/g, function (u) { return '<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>'; }); }
  function amHtml(m) {
    var x = amSplit(m), h = x.t ? '<div class="asg-m am-t">' + amLinkify(x.t) + '</div>' : '';
    if (x.C) h += '<div class="asg-s">📅 ปฏิทิน: ' + esc(th(x.C.date) + ' · ' + x.C.title) + '</div>';
    if (x.L.length) h += '<div class="am-ls">' + x.L.map(function (u) { return '<a class="am-l" href="' + esc(u) + '" target="_blank" rel="noopener">🔗 เปิดลิงก์</a>'; }).join('') + '</div>';
    if (x.I.length) h += '<div class="am-is">' + x.I.map(function (id) { return '<a href="https://drive.google.com/file/d/' + id + '/view" target="_blank" rel="noopener"><img loading="lazy" src="https://drive.google.com/thumbnail?id=' + id + '&sz=w600" alt="รูปประกอบ"></a>'; }).join('') + '</div>';
    return h;
  }
  document.addEventListener('input', function (ev) { if (ev.target && S.form && {asgL:'l',asgN:'n',asgM:'m',asgD:'d',asgU:'u'}[ev.target.id]) S.form[{asgL:'l',asgN:'n',asgM:'m',asgD:'d',asgU:'u'}[ev.target.id]] = ev.target.value; });
  document.addEventListener('change', function (ev) {
    var t = ev.target; if (!t || !S.form) return;
    if (t.classList && t.classList.contains('amKeep')) { S.form.keep = [].filter.call(document.querySelectorAll('.amKeep'), function (c) { return c.checked; }).map(function (c) { return c.value; }); return; }
    if (t.id === 'asgC') {
      var o = (S.form.co || [])[Number(t.value)] || null; S.form.c = o; if (!o) return;
      var n = document.getElementById('asgN'), u = document.getElementById('asgU'); if (n) n.value = o.title; if (u) u.value = o.date; return;
    }
    if (t.id !== 'asgI') return;
    var fs = [].slice.call(t.files || []), room = 3 - (S.form.keep || []).length - (S.form.ni || []).length;
    if (fs.length > room) { toast('แนบรูปได้รวมไม่เกิน 3 รูปต่องาน'); fs = fs.slice(0, Math.max(0, room)); }
    Promise.all(fs.map(trShrink)).then(function (L) { S.form.ni = (S.form.ni || []).concat(L); amPrev(); }, function (e) { toast(e.message); });
    t.value = '';
  });
  function amPrev() {
    var b = document.getElementById('amNew'); if (!b || !S.form) return;
    b.innerHTML = (S.form.ni || []).map(function (u, i) { return '<span class="am-n"><img src="' + u + '" alt=""><button type="button" data-amx="' + i + '" title="เอาออก">✕</button></span>'; }).join('');
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-amx]'); if (!b || !S.form) return;
    ev.preventDefault(); S.form.ni.splice(Number(b.getAttribute('data-amx')), 1); amPrev();
  });
  function viewAdm() {
    if (!S.pw) return '<div class="asg-card"><div class="asg-s" style="color:#1D4ED8">การเพิ่ม/แก้ไขงาน ต้องเข้าสู่ระบบที่แท็บนี้ก่อน (แยกจากปุ่ม Admin ของระบบติดตาม) ใช้รหัสผ่านเดียวกัน</div><label class="asg-f">รหัสผ่านผู้บริหาร (รหัสเดียวกับระบบติดตาม)<input type="password" id="asgPw" autocomplete="current-password"></label><button class="asg-btn ok" data-asg="login">เข้าสู่ระบบ</button></div>';
    var f = S.form, h = '<div class="asg-tools"><button class="asg-btn gh" data-asg="logout">ออกจากระบบผู้บริหาร</button>' + (f ? '' : '<button class="asg-btn ok" data-asg="new">＋ มอบหมายงาน</button><button class="asg-btn gh" data-asg="owner">👤 เปลี่ยนผู้รับผิดชอบโครงการ</button><button class="asg-btn gh" data-asg="migrate" title="คัดลอกงานจาก ตารางงาน/ปฏิทินเดิม มาไว้ที่บันทึกมอบหมายงาน">📥 ย้ายงานจากปฏิทินเดิม</button>') + '</div>';
    if (f) {
      h += '<div class="asg-card asg-form"><b>' + (f.id ? '✏️ แก้ไขงาน' : '＋ มอบหมายงาน') + '</b>' +
        '<div class="asg-row"><label class="asg-f">วันที่มอบหมาย<input type="date" id="asgD" value="' + esc(f.d) + '"></label><label class="asg-f">กำหนดส่ง *<input type="date" id="asgU" value="' + esc(f.u) + '"></label></div>' +
        (function () {
          var co = amCalOpts(); if (f.c && !co.some(function (o) { return o.date === f.c.date && o.title === f.c.title; })) co.unshift(f.c); f.co = co;
          return '<label class="asg-f" style="background:#E0F2FE;color:#075985;border-radius:8px;padding:8px">📅 เชื่อมกับกิจกรรมในปฏิทิน (ถ้ามี)<select id="asgC" style="width:100%;max-width:100%;color:#111;background:#fff"><option value="">— ไม่เชื่อม (งานทั่วไป) —</option>' +
            co.map(function (o, i) { return '<option value="' + i + '"' + (f.c && o.date === f.c.date && o.title === f.c.title ? ' selected' : '') + '>' + esc(th(o.date) + ' · ' + o.title + (o.time ? ' · ' + o.time : '')) + '</option>'; }).join('') +
            '</select><small style="display:block;margin-top:4px">เลือกแล้ว ระบบเติมเรื่องและกำหนดส่งให้ · หน้าแรกจะขึ้นเป็นรายการเดียวกับปฏิทิน</small></label>';
        })() +
        '<label class="asg-f">เรื่อง *<input id="asgN" maxlength="200" value="' + esc(f.n) + '"></label>' +
        '<label class="asg-f">รายละเอียด<textarea id="asgM" rows="3" maxlength="1500">' + esc(amSplit(f.m).t) + '</textarea></label>' +
        '<label class="asg-f">🔗 ลิงก์ (ถ้ามี เช่น ฟอร์มให้ครูกรอก หนังสือราชการ)<input id="asgL" type="url" inputmode="url" maxlength="400" placeholder="https://..." value="' + esc(f.l) + '"></label>' +
        '<div class="asg-f">🖼️ แนบรูปภาพ (ไม่เกิน 3 รูป)' + (f.I.length ? '<div class="am-old">' + f.I.map(function (id) { return '<label><input type="checkbox" class="amKeep" value="' + id + '"' + (f.keep.indexOf(id) >= 0 ? ' checked' : '') + '><img src="https://drive.google.com/thumbnail?id=' + id + '&sz=w200" alt=""></label>'; }).join('') + '<small>เอาติ๊กออก = ไม่ใช้รูปนั้น</small></div>' : '') +
        '<div id="amNew" class="am-new"></div><input type="file" id="asgI" accept="image/*" multiple></div>' +
        '<div class="asg-s" style="margin-top:6px">ผู้ได้รับมอบหมาย * (เลือกได้หลายคน) · <a href="#" data-asg="pick:t">เลือกครูทั้งหมด</a> · <a href="#" data-asg="pick:1">เลือกทุกคน</a> · <a href="#" data-asg="pick:0">ล้าง</a></div><div class="asg-chk">' +
        pgroups().map(function (g) { return '<div class="asg-grp">' + esc(g.grp) + ' <a href="#" data-asg="pickg:' + encodeURIComponent(g.grp) + '">เลือกทั้งกลุ่ม</a></div>' + g.list.map(function (p) { return '<label><input type="checkbox" name="asgA" data-g="' + esc(g.grp) + '" value="' + esc(p.name) + '"' + (f.a.indexOf(p.name) >= 0 ? ' checked' : '') + '> ' + esc(p.name) + (p.nick ? ' <small style="color:#6B7280">(' + esc(p.nick) + ')</small>' : '') + '</label>'; }).join(''); }).join('') + '</div>' +
        '<div class="asg-tools"><button class="asg-btn ok" data-asg="save">💾 บันทึก</button><button class="asg-btn gh" data-asg="cancel">ยกเลิก</button></div></div>';
    }
    return h + viewAll(true);
  }

  // ---------- การทำงาน ----------
  function load() {
    var g = post({ a: 'asgall' }).then(function (j) { S.old = false; return j; }, function () { S.old = true; return { G: [] }; });
    var pp = post({ a: 'people' }).then(function (j) { return j.people || []; }, function () { return []; });
    var trl = fetch(TT + '?api=trsent').then(function (r) { return r.json(); }).then(function (j) { return (j.data && j.data.L) || []; }, function () { return S.TR || []; });
    return Promise.all([post({ a: 'teachers' }), g, pp, trl]).then(function (r) { S.teachers = r[0].teachers || []; S.G = r[1].G || []; S.people = r[2]; S.TR = r[3]; aug(); S.loaded = true; if (S.me && pnames().indexOf(S.me) < 0) S.me = ''; render(); renderUp(); nwRender(); try { dlRender(); } catch (e) {} teacherView(true); pushUi(); });
  }
  function click(ev) {
    var el = ev.target.closest('[data-asg]'); if (!el) return;
    ev.preventDefault();
    var p = el.getAttribute('data-asg').split(':'), a = p[0];
    if (a === 'open') { S.open = !S.open; render(); if (S.open) { document.getElementById('asgBox').scrollIntoView({ behavior: 'smooth' }); load().catch(function () {}); } return; }
    if (a === 'close') { S.open = false; return render(); }
    if (a === 'trrep') { trOpen(p[1], decodeURIComponent(p[2] || '')); return; }
    if (a === 'admin') { document.getElementById('asgAdm').style.display = 'flex'; return; }
    if (a === 'admclose') { document.getElementById('asgAdm').style.display = 'none'; return; }
    if (a === 'admtrack') {
      document.getElementById('asgAdm').style.display = 'none'; document.body.classList.add('sks-open');
      var home = document.getElementById('home') || document.body;
      var b = [].filter.call(home.querySelectorAll('button,a'), function (x) { return /^\s*admin\s*$/i.test(x.textContent); })[0];
      if (b) { b.click(); setTimeout(function () { (home.querySelector('input[type=password]') || b).scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 150); }
      else home.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (a === 'tab') { S.tab = p[1]; if (p[1] === 'ppl') S.who = ''; return render(); }
    if (a === 'who') { S.open = true; S.tab = 'ppl'; S.who = decodeURIComponent(p.slice(1).join(':')); render(); document.getElementById('asgBox').scrollIntoView({ behavior: 'smooth' }); return; }
    if (a === 'copy') {
      var lk = plink(decodeURIComponent(p.slice(1).join(':')));
      var ok = function () { toast('คัดลอกลิงก์แล้ว ส่งให้ครูทางไลน์ได้เลย'); };
      if (navigator.clipboard) navigator.clipboard.writeText(lk).then(ok, function () { window.prompt('คัดลอกลิงก์นี้', lk); }); else window.prompt('คัดลอกลิงก์นี้', lk);
      return;
    }
    if (a === 'newfor') { S.tab = 'adm'; S.form = { id: '', d: today(), u: '', n: '', m: '', l: '', I: [], keep: [], ni: [], c: null, a: [decodeURIComponent(p.slice(1).join(':'))] }; render(); document.getElementById('asgBox').scrollIntoView({ behavior: 'smooth' }); return; }
    if (a === 'openadm') { S.open = true; S.tab = 'adm'; render(); document.getElementById('asgBox').scrollIntoView({ behavior: 'smooth' }); load().catch(function () {}); return; }
    if (a === 'pick') { [].forEach.call(document.querySelectorAll('[name=asgA]'), function (c) { c.checked = p[1] === '1' || (p[1] === 't' && S.teachers.indexOf(c.value) >= 0); }); return; }
    if (a === 'pickg') { var gg = decodeURIComponent(p.slice(1).join(':')), bx = [].filter.call(document.querySelectorAll('[name=asgA]'), function (c) { return c.getAttribute('data-g') === gg; }), on = bx.some(function (c) { return !c.checked; }); bx.forEach(function (c) { c.checked = on; }); return; }
    if (a === 'new') { S.form = { id: '', d: today(), u: '', n: '', m: '', l: '', I: [], keep: [], ni: [], c: null, a: [] }; return render(); }
    if (a === 'cancel') { S.form = null; return render(); }
    if (a === 'edit') { var x = S.G.filter(function (q) { return q.id === p[1]; })[0]; var xs = amSplit(x.m); S.form = { id: x.id, d: x.d, u: x.u, n: x.n, m: x.m, l: xs.L[0] || '', I: xs.I, keep: xs.I.slice(), ni: [], c: xs.C, a: x.a.slice() }; S.tab = 'adm'; render(); document.getElementById('asgBox').scrollIntoView({ behavior: 'smooth' }); return; }
    if (a === 'logout') { S.pw = ''; sput('asg_pw', ''); S.form = null; try { renderUp(); } catch (e) {} return render(); }
    if (S.busy) return;
    var job = null;
    if (a === 'ack') job = post({ a: 'asgack', id: p[1], name: S.me }).then(function () { toast('รับทราบงานแล้ว'); });
    if (a === 'ackf') job = post({ a: 'asgack', id: p[1], name: decodeURIComponent(p.slice(2).join(':')) }).then(function () { toast('รับทราบงานแล้ว'); });
    if (a === 'migrate') job = migrate();
    if (a === 'owner') {
      var fr = window.prompt('ชื่อผู้รับผิดชอบเดิม (พิมพ์ให้ตรงกับในรายการโครงการ)', ''); if (!fr) return;
      var to = window.prompt('เปลี่ยนเป็นชื่อ', S.teachers[0] || ''); if (!to) return;
      if (!window.confirm('เปลี่ยนผู้รับผิดชอบโครงการทุกรายการ\nจาก: ' + fr + '\nเป็น: ' + to)) return;
      job = post({ a: 'pjowner', pw: S.pw, from: fr.trim(), to: to.trim() }).then(function (j) { MW.P = null; toast('เปลี่ยนแล้ว ' + j.n + ' รายการ'); });
    }
    if (a === 'login') { var pw = document.getElementById('asgPw').value; job = post({ a: 'all', pw: pw }).then(function () { S.pw = pw; sput('asg_pw', pw); try { renderUp(); } catch (e) {} toast('เข้าสู่ระบบผู้บริหารแล้ว'); }); }
    if (a === 'save') {
      var e = { d: document.getElementById('asgD').value, u: document.getElementById('asgU').value, n: document.getElementById('asgN').value, m: document.getElementById('asgM').value,
        a: [].map.call(document.querySelectorAll('[name=asgA]:checked'), function (c) { return c.value; }) };
      if (!e.n.trim()) return toast('กรุณาใส่เรื่อง'); if (!e.u) return toast('กรุณาใส่กำหนดส่ง'); if (e.u < e.d) return toast('กำหนดส่งต้องไม่ก่อนวันที่มอบหมาย'); if (!e.a.length) return toast('กรุณาเลือกครูอย่างน้อย 1 คน');
      var lk = (document.getElementById('asgL').value || '').trim(), ff = S.form;
      if (lk && !/^https?:\/\/\S+$/.test(lk)) return toast('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https:// และไม่มีช่องว่าง');
      var up = (ff.ni || []).length ? fetch(NT, { method: 'POST', body: JSON.stringify({ a: 'asgimg', pw: S.pw, n: e.n, files: ff.ni.map(function (u) { return u.split(',')[1]; }) }) }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j.ok) throw new Error(j.err === 'auth' ? 'รหัสผ่านผู้บริหารไม่ถูกต้องหรือหมดเวลา กรุณาเข้าสู่ระบบใหม่' : 'อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง'); return j.ids || []; }) : Promise.resolve([]);
      toast('⏳ กำลังบันทึก…');
      job = up.then(function (ids) {
        e.m = amJoin(e.m, lk ? [lk] : [], (ff.keep || []).concat(ids), ff.c);
        if (e.m.length > 2000) throw new Error('รายละเอียดยาวเกินไป');
        return post({ a: 'asgsave', pw: S.pw, id: ff.id || undefined, e: e });
      }).then(function () { S.form = null; toast('บันทึกการมอบหมายงานแล้ว'); });
    }
    if (a === 'done') job = post({ a: 'asgdone', pw: S.pw, id: p[1], v: Number(p[2]), name: decodeURIComponent(p.slice(3).join(':')) });
    if (a === 'del') { if (!window.confirm('ลบงานนี้?')) return; job = post({ a: 'asgdel', pw: S.pw, id: p[1] }).then(function () { toast('ลบแล้ว'); }); }
    if (!job) return;
    S.busy = true; el.disabled = true;
    job.then(load).catch(function (err) { if (/รหัสผ่าน/.test(err.message)) { S.pw = ''; sput('asg_pw', ''); } toast(err.message); render(); }).then(function () { S.busy = false; });
  }
  function change(ev) { if (ev.target.id === 'asgMe') { S.me = ev.target.value; put('asg_me', S.me); render(); } }

  // ---------- หน้า "ข้อมูลรายบุคคล" ของระบบติดตาม: แสดงงานมอบหมาย + กิจกรรมออนไลน์ ----------
  function teacherView(force) {
    var tv = document.getElementById('teacher'); if (!tv || tv.hidden) return;
    var tn = tv.querySelector('.tn'); if (!tn) return;
    var nm = tn.textContent.trim();
    var old = [].filter.call(tv.querySelectorAll('.tc'), function (d) { return /งานที่ได้รับมอบหมาย \(ที่จะถึง\)/.test(d.textContent) && !d.id; })[0];
    var box = document.getElementById('asgTv');
    if (!box) {
      if (!old) return;
      box = document.createElement('div'); box.id = 'asgTv'; old.parentNode.replaceChild(box, old);
    } else if (old) old.parentNode.removeChild(old);
    else if (!force && box.getAttribute('data-n') === nm) return;
    box.setAttribute('data-n', nm);
    if (!S.me && !S.pw && pnames().indexOf(nm) >= 0) { S.me = nm; put('asg_me', nm); badge(); } // ตั้งชื่อให้เฉพาะเครื่องที่ยังไม่เคยเลือกชื่อ และไม่ใช่ผู้บริหารที่เปิดดูหน้าครูคนอื่น
    var mine = S.G.filter(function (x) { return x.a.indexOf(nm) >= 0; }).map(function (x) { x._st = state(x, nm); return x; });
    var order = { late: 0, soon: 1, open: 2, done: 3 };
    mine.sort(function (a, b) { return order[a._st] - order[b._st] || (a.u < b.u ? -1 : 1); });
    var open = mine.filter(function (x) { return x._st !== 'done'; }), done = mine.length - open.length;
    var h = '<div class="tc asg-tv"><b>📌 งานที่ได้รับมอบหมาย</b> <span style="color:var(--mu,#6B7280);font-size:13px">ค้าง ' + open.length + ' · เสร็จแล้ว ' + done + '</span>';
    if (!S.loaded) h += '<p class="asg-s">กำลังโหลด…</p>';
    else if (!open.length) h += '<p class="asg-s">ไม่มีงานค้าง 🎉</p>';
    else h += open.map(function (x) {
      var g = x.st[nm] || {};
      return '<div class="row" style="align-items:flex-start"><span><span class="asg-b" style="background:' + BG[x._st] + ';color:' + COL[x._st] + '">' + esc(dueText(x)) + '</span><br><b>' + esc(x.n) + '</b>' +
        '<br><small>มอบหมาย ' + th(x.d) + ' · กำหนดส่ง ' + th(x.u) + '</small>' + (x.m ? '<div class="am-sm">' + amHtml(x.m) + '</div>' : '') + '</span>' +
        (g.k ? '<span class="asg-ok">👍 รับทราบแล้ว</span>' : '<button class="asg-btn ok" style="margin:0" data-asg="ackf:' + x.id + ':' + encodeURIComponent(nm) + '">👍 รับทราบ</button>') + '</div>';
    }).join('');
    h += '<div class="bt"><button class="o" data-asg="who:' + encodeURIComponent(nm) + '" onclick="window.scrollTo(0,0)">📌 ดูงานทั้งหมดในบันทึกมอบหมายงาน</button></div></div>';
    h += '<div class="tc asg-tv"><b>📅 งาน/กิจกรรมที่จะถึง</b>' + actsBlock(nm, 10) + '</div>';
    box.innerHTML = h;
    if (!S.acts) loadActs().then(function () { teacherView(true); });
  }
  function migrate() {
    if (!window.confirm('คัดลอกงานจาก "ตารางงาน/ปฏิทิน" เดิม มาไว้ที่บันทึกมอบหมายงาน?\n(งานที่มีชื่อและวันที่ซ้ำกับที่มีอยู่แล้วจะข้าม · ปฏิทินเดิมไม่ถูกลบ)')) return null;
    return post({ a: 'events' }).then(function (j) {
      var have = {}; S.G.forEach(function (x) { have[x.n + '|' + x.d] = 1; });
      var L = (j.ev || []).filter(function (e) { return e.n && e.d && !have[e.n + '|' + e.d]; }).map(function (e) {
        var a = (e.a || []).indexOf('ALL') >= 0 ? S.teachers.slice() : (e.a || []).filter(function (n) { return S.teachers.indexOf(n) >= 0; });
        var m = [e.t ? 'เวลา ' + e.t : '', e.p ? 'สถานที่ ' + e.p : '', e.x ? 'ร่วมกับ ' + e.x : '', e.m || ''].filter(Boolean).join(' · ');
        return { d: e.d, u: e.u && e.u >= e.d ? e.u : e.d, n: String(e.n).slice(0, 200), m: m.slice(0, 2000), a: a };
      }).filter(function (e) { return e.a.length; });
      if (!L.length) { toast('ไม่มีงานใหม่ให้ย้าย (ย้ายครบแล้ว)'); return; }
      var i = 0;
      function next() { if (i >= L.length) { toast('ย้ายงานแล้ว ' + L.length + ' รายการ'); return; } toast('กำลังย้าย ' + (i + 1) + '/' + L.length + '…'); return post({ a: 'asgsave', pw: S.pw, e: L[i++] }).then(next); }
      return next();
    });
  }

  // =====================================================================
  // 👩‍🏫 งานของฉัน · 📊 ภาพรวมงานครู — รวมงานทุกเมนูไว้ที่เดียว
  // =====================================================================
  var MW = { open: false, view: 'me', W: null, P: null, sum: null, mine: null, month: '', filter: '', busy: false };
  var TH_M = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  function mLabel(m) { var p = String(m).split('-').map(Number); return p[0] ? TH_M[p[1] - 1] + ' ' + (p[0] + 543) : ''; }
  function trTerm() { try { if (typeof TERM !== 'undefined' && TERM) return TERM; } catch (e) {} var el = document.getElementById('term'); return el && el.value ? el.value : ''; }
  function ttW() {
    if (MW.W) return Promise.resolve(MW.W);
    return fetch(TT + '?api=mywork').then(function (r) { return r.json(); }).then(function (j) { if (!j.ok) throw new Error(j.error || 'tt'); MW.W = j.data; if (!MW.month) MW.month = j.data.today.slice(0, 7); return MW.W; });
  }
  function trP() { return MW.P ? Promise.resolve(MW.P) : post({ a: 'pjall' }).then(function (j) { MW.P = j.P || []; return MW.P; }).catch(function () { MW.P = []; return MW.P; }); }
  function tid(nm) { var t = ((MW.W && MW.W.teachers) || []).filter(function (x) { return x.name === nm; })[0] || ((MW.W && MW.W.teachers) || []).filter(function (x) { return first(x.name) === first(nm); })[0]; return t ? t.id : ''; }
  function ownPj(nm) { var f = first(nm); return (MW.P || []).filter(function (p) { return p.o.indexOf(nm) >= 0 || (f.length > 1 && p.o.indexOf(f) >= 0); }); }
  // แผนปกติ = ส่งรายภาคเรียน · แผนหน้าเดียว+MakerSpace = ส่งรายเดือน
  function planOf(id, kind, m) { var tm = MW.W && MW.W.term ? MW.W.term.id : ''; return ((MW.W && MW.W.plans) || []).filter(function (x) { return x.t === id && x.k === kind && (kind === 'normal' ? (!tm || x.term === tm) : x.m === m); }); }
  function asgOf(nm) { return S.G.filter(function (x) { return x.a.indexOf(nm) >= 0; }); }
  function ttLink(page, id) { return TT + '?page=' + page + (id ? '&t=' + encodeURIComponent(id) : ''); }
  function okc(t) { return '<span class="mw-ok">✅ ' + t + '</span>'; }
  function noc(t) { return '<span class="mw-no">❌ ' + t + '</span>'; }

  function mwLoad() {
    var jobs = [ttW(), trP()];
    if (!S.loaded) jobs.push(load());
    if (!S.acts) jobs.push(loadActs());
    if (!S.night) jobs.push(nightLoad());
    return Promise.all(jobs).then(function (r) { MW.at = new Date(); return r; });
  }
  function mwRender() {
    var box = document.getElementById('mwBox'); if (!box) return;
    if (!MW.open) { box.style.display = 'none'; return; }
    box.style.display = '';
    var h = '<div class="asg-head"><b>' + (MW.view === 'me' ? '👩‍🏫 งานของฉัน' : '📊 ภาพรวมงานครู') + '</b><span>' + '<button class="mw-pbtn" data-mw="print">🖨️ พิมพ์</button>' + (MW.view !== 'me' ? '<button class="adm-edit" data-asg="admtrack" title="ติ๊กสถานะการส่งงาน">✏️ แก้ไข (Admin)</button> ' : '') + '<button data-mw="close" title="ปิด">✕</button></span></div>';
    if (MW.view === 'dash' && !S.pw) MW.view = 'all';
    h += '<div class="asg-tabs"><button data-mw="view:me" class="' + (MW.view === 'me' ? 'on' : '') + '">👤 ของฉัน (รายบุคคล)</button><button data-mw="view:all" class="' + (MW.view === 'all' ? 'on' : '') + '">📊 ภาพรวมทุกคน</button>' + (S.pw ? '<button data-mw="view:dash" class="' + (MW.view === 'dash' ? 'on' : '') + '">📈 แดชบอร์ด</button>' : '') + '</div>';
    if (!MW.W) { box.innerHTML = h + (MW.err ? '<div class="asg-empty">โหลดข้อมูลไม่ได้: ' + esc(MW.err) + '<br><small>ระบบตารางสอนต้องอัปเดตเป็นฉบับล่าสุด</small></div>' : '<div class="asg-empty">กำลังโหลดข้อมูล…</div>'); return; }
    box.innerHTML = h + (MW.view === 'me' ? mwMe() : MW.view === 'dash' ? mwDash() : mwAll());
  }
  function monthSel(id) {
    var ms = {}, td = MW.W.today.slice(0, 7); ms[td] = 1; (MW.W.plans || []).forEach(function (x) { if (x.m) ms[x.m] = 1; });
    (MW.W.months || []).forEach(function (k) { ms[k] = 1; }); // ทุกเดือนของภาคเรียน (เช่น พ.ย. – มี.ค.)
    if (!(MW.W.months || []).length) { var y = Number(td.slice(0, 4)), m = Number(td.slice(5, 7)); for (var i = 1; i <= 2; i++) { var d = new Date(Date.UTC(y, m - 1 - i, 1)); ms[d.toISOString().slice(0, 7)] = 1; } }
    return '<select id="' + id + '">' + Object.keys(ms).sort().map(function (k) { return '<option value="' + k + '"' + (k === MW.month ? ' selected' : '') + '>เดือน ' + mLabel(k) + (k === td ? ' (เดือนนี้)' : '') + '</option>'; }).join('') + '</select>';
  }
  function mwMe() {
    var nm = S.me, T = (MW.W.people && MW.W.people.length ? MW.W.people : (S.people && S.people.length ? S.people : MW.W.teachers));
    var h = '<div class="mw-top"><label class="asg-f" style="flex:1 1 260px">ชื่อของฉัน<select id="mwMe"><option value="">— เลือกชื่อของคุณ —</option>' + T.map(function (t) { return '<option' + (t.name === nm ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') + '</select></label>' +
      '<label class="asg-f" style="flex:0 1 220px">' + (MW.mon ? 'เดือนที่สรุป' : 'แผนหน้าเดียวของเดือน') + monthSel('mwMonth') + '</label><button class="asg-btn ' + (MW.mon ? 'gh' : 'ok') + ' mm-btn" data-mw="mon">' + (MW.mon ? '← กลับหน้างานของฉัน' : '🗓️ สรุปรายเดือน (พิมพ์เก็บ)') + '</button></div>';
    if (!nm) return h + '<div class="asg-empty">เลือกชื่อของคุณครั้งเดียว ระบบจำไว้ในเครื่องนี้ — แล้วจะเห็นงานทุกเมนูในหน้าเดียว</div>';
    var id = tid(nm), M = MW.month, isT = !!id || S.teachers.indexOf(nm) >= 0, me = MW.mine && MW.mine.name === nm ? MW.mine : null;
    if (!me && isT) { mwMine(nm); }
    if (MW.mon) return h + mwMon(nm, id, me);
    var cnt = { no: 0, soon: 0, ok: 0 };
    // แผนการสอน
    var pn = planOf(id, 'normal', M), po = planOf(id, 'onepage', M), c0 = { no: 0, ok: 0 };
    var plan = '<div class="mw-sec" style="border-left-color:#2563EB"><h4>📘 แผนการสอน</h4>' +
      row('แผนการสอน (ปกติ) · ภาคเรียน ' + esc(MW.W.term.label || ''), pn.length ? okc('ส่งแล้ว ' + th(pn[0].at.slice(0, 10))) : noc('ยังไม่ส่ง') + ' <a class="mw-go" href="' + ttLink('plans', id) + '" target="_top">ส่งเลย</a>') +
      row('แผนหน้าเดียว + MakerSpace · ' + mLabel(M), po.length ? okc('ส่งแล้ว ' + th(po[0].at.slice(0, 10))) : noc('ยังไม่ส่ง') + ' <a class="mw-go" href="' + ttLink('onepage', id) + '" target="_top">ส่งเลย</a>') + '</div>';
    if (isT) { cnt[pn.length ? 'ok' : 'no']++; cnt[po.length ? 'ok' : 'no']++; }
    // มอบหมายงาน
    var A = asgOf(nm).map(function (x) { x._st = state(x, nm); return x; }), order = { late: 0, soon: 1, open: 2, done: 3 };
    A.sort(function (a, b) { return order[a._st] - order[b._st] || (a.u < b.u ? -1 : 1); });
    var asg = '<div class="mw-sec" style="border-left-color:#7C3AED"><h4>📌 งานที่ได้รับมอบหมาย</h4>' + (A.length ? A.slice(0, 6).map(function (x) {
      var g = x.st[nm] || {};
      if (x._st === 'done') cnt.ok++; else if (x._st === 'late') cnt.no++; else if (x._st === 'soon') cnt.soon++; else cnt.no++;
      return row(esc(x.n) + '<br><small>กำหนดส่ง ' + th(x.u) + '</small>', x._st === 'done' ? okc('เสร็จแล้ว') : '<span style="color:' + COL[x._st] + ';font-weight:700">' + (x._st === 'late' ? '⚠️ ' : '⏳ ') + esc(dueText(x)) + '</span>' +
        (g.k ? '' : ' <button class="asg-btn ok" style="margin:0" data-asg="ackf:' + x.id + ':' + encodeURIComponent(nm) + '">👍 รับทราบ</button>'), true);
    }).join('') + (A.length > 6 ? '<div class="asg-s">และอีก ' + (A.length - 6) + ' งาน · <a href="#" data-asg="who:' + encodeURIComponent(nm) + '">ดูทั้งหมด</a></div>' : '') : '<div class="asg-s">ยังไม่มีงานที่ได้รับมอบหมาย</div>') + '</div>';
    // ติดตามการส่งงาน (ระบบติดตาม)
    var trk = '<div class="mw-sec" style="border-left-color:#0a7f45"><h4>📋 ติดตามการส่งงาน' + (me && me.term ? ' · ภาคเรียน ' + esc(me.term) : '') + '</h4>';
    if (!me) trk += '<div class="asg-s">กำลังโหลด…</div>';
    else if (me.err) trk += '<div class="asg-s">' + esc(me.err) + '</div>';
    else {
      var pend = [], done = 0, appl = 0;
      var pjk = me.auto && me.auto.length ? me.auto[0] : me.K.indexOf('รายงานโครงการ');
      me.K.forEach(function (k, j) { var v = me.s[j]; if (v === 2 || j === pjk) return; appl++; if (v === 0) done++; else pend.push(k + (me.auto.indexOf(j) >= 0 ? ' <small>(อัตโนมัติ)</small>' : '')); });
      cnt.ok += done; cnt.no += pend.length;
      trk += row('ส่งแล้ว', '<b>' + done + '/' + appl + '</b> รายการ') + (pend.length ? pend.map(function (k) { return row(k, noc('ยังไม่ส่ง')); }).join('') : row('ทุกรายการ', okc('ส่งครบแล้ว')));
    }
    trk += '</div>';
    // โครงการ/กิจกรรม
    var P = ownPj(nm);
    var pj = '<div class="mw-sec" style="border-left-color:#D97706"><h4>📁 โครงการ/กิจกรรม ที่รับผิดชอบ</h4>' + (P.length ? P.slice(0, 8).map(function (p) {
      var ok = Number(p.s) === 0; cnt[ok ? 'ok' : 'no']++;
      return row(esc(p.n), ok ? okc('ส่งรายงานแล้ว') : noc('ยังไม่ส่งรายงาน'));
    }).join('') + (P.length > 8 ? '<div class="asg-s">และอีก ' + (P.length - 8) + ' รายการ</div>' : '') : '<div class="asg-s">ไม่มีโครงการที่รับผิดชอบ</div>') + '</div>';
    // อบรม · รางวัล
    var TR = (MW.W.trainings || []).filter(function (x) { return x.t === id; }), aw = (MW.W.awards || {})[id] || 0;
    var tr = '<div class="mw-sec" style="border-left-color:#DB2777"><h4>🎓 รายงานการอบรม · 🏆 รางวัล (ปีการศึกษา ' + MW.W.year + ')</h4>' +
      row('รายงานการอบรม', TR.length ? okc('ส่งแล้ว ' + TR.length + ' ครั้ง') : '<span class="asg-s">ยังไม่มี</span> <a class="mw-go" href="' + ttLink('training', id) + '" target="_top">ส่งรายงาน</a>') +
      row('รางวัล/เกียรติบัตร', aw + ' รายการ <a class="mw-go gh" href="' + ttLink('awards', id) + '" target="_top">บันทึกรางวัล</a>') + '</div>';
    // หน้าที่ช่วงนี้
    var td = MW.W.today, SB = (MW.W.subs || []).filter(function (x) { return x.t === id && x.date >= td; });
    var f = first(nm), prMine = (MW.W.pr.names || []).some(function (n) { return String(n).indexOf(f) >= 0; });
    var duty = '<div class="mw-sec" style="border-left-color:#0891B2"><h4>📅 หน้าที่ของฉันช่วงนี้</h4>' +
      (SB.length ? SB.slice(0, 5).map(function (x) { return row('🔄 สอนแทน ' + th(x.date) + ' คาบ ' + x.period + ' · ' + esc(x.cls) + ' ' + esc(x.subj), '<small>แทน' + esc(x.instead) + (x.role === 'ผู้ประกบ' ? ' (ประกบ)' : '') + '</small>'); }).join('') : row('🔄 สอนแทน', '<span class="asg-s">ไม่มี</span>')) +
      (prMine ? row('📣 เวรสื่อประชาสัมพันธ์', '<b>เดือน' + esc(MW.W.pr.label) + '</b>') : '');
    var NG = nightMine(nm, td); if (NG.length) duty += row('🌙 ผู้ตรวจเวรกลางคืน', '<b>' + NG.map(function (x) { return x.date === td ? 'คืนนี้' : th(x.date); }).join(', ') + '</b>');
    var AC = S.acts && !S.acts.err ? S.acts.items.filter(function (x) { return x.date >= td && actMine(x, nm); }).slice(0, 4) : [];
    duty += AC.map(function (x) { return row('🗓️ ' + th(x.date) + (x.time ? ' ' + esc(x.time) : '') + ' · ' + esc(x.title), '<small>' + esc(x.place || '') + '</small>'); }).join('') + '</div>';
    var tot = cnt.ok + cnt.no + cnt.soon, pct = tot ? Math.round(cnt.ok * 100 / tot) : 100;
    h += '<div class="asg-stats"><div><b style="color:#B91C1C">' + cnt.no + '</b>ยังไม่ส่ง/ค้าง</div><div><b style="color:#D97706">' + cnt.soon + '</b>ใกล้ครบกำหนด</div><div><b style="color:#047857">' + cnt.ok + '</b>ส่งแล้ว/เสร็จ</div><div><b style="color:#2563EB">' + pct + '%</b>ความครบถ้วน</div></div>';
    if (!isT) return h + '<div class="mw-grid">' + asg + (P.length ? pj : '') + duty + '</div>';
    return h + '<div class="mw-grid">' + plan + asg + trk + pj + tr + duty + '</div>';
  }

  // ---------- 🗓️ สรุปผลการปฏิบัติงานประจำเดือน (รายบุคคล · พิมพ์ครั้งเดียว เก็บเป็นหลักฐาน) ----------
  function mwMon(nm, id, me) {
    var M = MW.month, td = MW.W.today, inM = function (d) { return String(d || '').slice(0, 7) === M; };
    var tr = function (a, b, c) { return '<tr><td class="mm-d">' + a + '</td><td>' + b + '</td><td class="mm-r">' + (c || '') + '</td></tr>'; };
    var sec = function (head, color, rows, empty) { return '<div class="mw-sec mm-sec" style="border-left-color:' + color + '"><h4>' + head + ' <small>(' + rows.length + ')</small></h4>' + (rows.length ? '<table class="mm-t"><tbody>' + rows.join('') + '</tbody></table>' : '<div class="asg-s">' + (empty || 'ไม่มีในเดือนนี้') + '</div>') + '</div>'; };
    var AC = S.acts && !S.acts.err ? S.acts.items.filter(function (x) { return inM(x.date) && actMine(x, nm); }) : [];
    var acR = AC.map(function (x) { var e = EV.M && EV.M[evk(x)]; return tr(th(x.date) + (x.time ? '<br><small>' + esc(x.time) + '</small>' : ''), esc(x.title) + (x.place ? '<br><small>📍 ' + esc(x.place) + '</small>' : ''), e ? (EVI[e.s] || ['✅'])[0] + ' ' + esc(e.s) + (e.n ? '<br><small>' + esc(e.n) + '</small>' : '') : (x.date <= td ? 'ดำเนินการแล้ว' : 'ยังไม่ถึงกำหนด')); });
    var SB = (MW.W.subs || []).filter(function (x) { return x.t === id && inM(x.date); });
    var sbR = SB.map(function (x) { return tr(th(x.date), 'คาบ ' + esc(x.period) + ' · ' + esc(x.cls) + ' ' + esc(x.subj), 'แทน' + esc(x.instead) + (x.role === 'ผู้ประกบ' ? ' (ประกบ)' : '')); });
    var f = nfn(nm), NG = f ? ((S.night && S.night.days) || []).filter(function (x) { return inM(x.date) && nfn(x.name) === f; }) : [];
    var dR = NG.map(function (x) { return tr(th(x.date), '🌙 ผู้ตรวจเวรกลางคืน', x.date <= td ? 'ปฏิบัติแล้ว' : 'ยังไม่ถึง'); });
    var pf = first(nm); if (inM(td) && (MW.W.pr.names || []).some(function (q) { return String(q).indexOf(pf) >= 0; })) dR.push(tr('ทั้งเดือน', '📣 เวรสื่อประชาสัมพันธ์', ''));
    var A = asgOf(nm).filter(function (x) { var g = x.st[nm] || {}; return inM(x.u) || inM(x.d) || inM(String(g.d || '').slice(0, 10)); });
    var aR = A.map(function (x) { var g = x.st[nm] || {}, st = state(x, nm); return tr(th(x.u), esc(x.n), st === 'done' ? '✅ เสร็จ' + (g.d ? ' ' + th(String(g.d).slice(0, 10)) : '') : st === 'late' ? '⚠️ เลยกำหนด' : '⏳ ยังไม่เสร็จ'); });
    var po = planOf(id, 'onepage', M), pn = planOf(id, 'normal', M);
    var pR = id ? [tr('', 'แผนหน้าเดียว + MakerSpace ' + mLabel(M), po.length ? '✅ ส่ง ' + th(po[0].at.slice(0, 10)) : '❌ ยังไม่ส่ง'), tr('', 'แผนการสอน (ปกติ) ภาคเรียน ' + esc(MW.W.term.label || ''), pn.length ? '✅ ส่ง ' + th(pn[0].at.slice(0, 10)) : '❌ ยังไม่ส่ง')] : [];
    var TR = (MW.W.trainings || []).filter(function (x) { return x.t === id && inM(x.at); });
    var tR = TR.map(function (x) { return tr(th(x.at), esc(x.title), '✅ ส่งรายงานแล้ว'); });
    var kR = [];
    if (me && !me.err) { var pjk = me.auto && me.auto.length ? me.auto[0] : me.K.indexOf('รายงานโครงการ'); me.K.forEach(function (k, j) { var v = me.s[j]; if (v === 2 || j === pjk) return; kR.push(tr('', esc(k), v === 0 ? '✅ ส่งแล้ว' : '❌ ยังไม่ส่ง')); }); }
    var h = '<div class="mm"><div class="mm-who"><b>' + esc(nm) + '</b> · ประจำเดือน <b>' + esc(mLabel(M)) + '</b></div>' +
      '<div class="asg-stats mm-stats"><div><b>' + AC.length + '</b>กิจกรรม</div><div><b>' + SB.length + '</b>คาบสอนแทน</div><div><b>' + dR.length + '</b>เวร</div><div><b>' + A.filter(function (x) { return state(x, nm) === 'done'; }).length + '/' + A.length + '</b>งานมอบหมายเสร็จ</div></div>' +
      sec('🗓️ กิจกรรม/งานตามปฏิทินโรงเรียน', '#0891B2', acR) + sec('📌 งานที่ได้รับมอบหมาย', '#7C3AED', aR) + sec('🔄 สอนแทน', '#2563EB', sbR) + sec('🌙 เวร', '#334155', dR) +
      (id ? sec('📘 แผนการสอน', '#1D4ED8', pR) : '') + sec('🎓 รายงานการอบรม', '#DB2777', tR) + (kR.length ? sec('📋 ติดตามการส่งงาน (ภาคเรียน ' + esc(me.term || MW.W.term.label || '') + ')', '#0a7f45', kR) : '') +
      '<div class="mm-sign"><div>ลงชื่อ ..................................<br>(' + esc(nm) + ')<br>ผู้รายงาน</div><div>ลงชื่อ ..................................<br>(..................................)<br>ผู้บริหารสถานศึกษา</div></div>' +
      '<div class="asg-s mm-note">ข้อมูลจากระบบงานโรงเรียน · กิจกรรมและสอนแทนย้อนหลังได้ถึงเดือนก่อน · เวรกลางคืนแสดงเฉพาะตารางเวรเดือนปัจจุบัน — แนะนำพิมพ์เก็บทุกสิ้นเดือน</div></div>';
    return h;
  }
  function row(l, r, top) { return '<div class="mw-it"' + (top ? ' style="align-items:flex-start"' : '') + '><span>' + l + '</span><span class="mw-r">' + r + '</span></div>'; }
  function mwMine(nm) {
    if (MW.loadingMine === nm) return; MW.loadingMine = nm;
    var r = S.teachers.indexOf(nm), t = trTerm();
    if (r < 0) { MW.mine = { name: nm, err: 'ไม่พบชื่อในระบบติดตาม (ระบบติดตามต้องอัปเดตโค้ดเพื่อใช้รายชื่อชุดเดียวกัน)' }; MW.loadingMine = ''; return mwRender(); }
    Promise.all([post({ a: 'teacher', r: r, t: t || undefined }), MW.sum ? Promise.resolve({ K: MW.sum.K }) : post({ a: 'pubsum', t: t || undefined }).catch(function () { return null; })]).then(function (x) {
      var K = x[0].K || (x[1] && x[1].K) || ['เยี่ยมบ้าน', 'การอ่านประจำเดือน', 'วิเคราะห์ผู้เรียน', 'บัญชีนม', 'บัญชีเรียกชื่อ', 'รายงานโครงการ', 'บันทึกหลังแผน (สค.)', 'วิจัยในชั้นเรียน', 'รายงานการอบรม', 'รายงานผลการเรียน'];
      MW.mine = { name: nm, s: x[0].s, K: K, auto: x[0].auto || [], term: t };
    }).catch(function () { MW.mine = { name: nm, err: 'โหลดสถานะการส่งงานไม่ได้' }; }).then(function () { MW.loadingMine = ''; mwRender(); });
  }
  function mwAll() {
    var h = '<div class="mw-top"><label class="asg-f" style="flex:0 1 220px">แผนหน้าเดียวของเดือน' + monthSel('mwMonth2') + '</label><label class="asg-f" style="flex:0 1 220px">แสดง<select id="mwFil"><option value="">ครูทุกคน</option><option value="pend"' + (MW.filter === 'pend' ? ' selected' : '') + '>เฉพาะคนที่ยังค้าง</option></select></label></div>';
    if (!MW.sum) { mwSum(); return h + '<div class="asg-empty">กำลังโหลดภาพรวม…</div>'; }
    if (MW.sum.err) h += '<div class="asg-s" style="color:#B91C1C">' + esc(MW.sum.err) + '</div>';
    var M = MW.month, rows = mwRows(M);
    if (MW.filter === 'pend') rows = rows.filter(function (r) { return r.pct < 100; });
    rows.sort(function (a, b) { return a.pct - b.pct || a.t.name.localeCompare(b.t.name, 'th'); });
    return mwAllTable(h, M, rows);
  }
  function mwRows(M) {
    return MW.W.teachers.map(function (t) {
      var id = t.id, pn = planOf(id, 'normal', M).length > 0, po = planOf(id, 'onepage', M).length > 0;
      var A = asgOf(t.name), aOpen = A.filter(function (x) { return !(x.st[t.name] || {}).d; }).length, aLate = A.filter(function (x) { return state(x, t.name) === 'late'; }).length;
      var i = MW.sum.T ? MW.sum.T.indexOf(t.name) : -1, s = i >= 0 ? MW.sum.S[i] : null, td = 0, ta = 0;
      var pjk = MW.sum.auto && MW.sum.auto.length ? MW.sum.auto[0] : -1;
      if (s) s.forEach(function (v, j) { if (v !== 2 && j !== pjk) { ta++; if (v === 0) td++; } });
      var P = ownPj(t.name), pd = P.filter(function (p) { return Number(p.s) === 0; }).length;
      var tr = (MW.W.trainings || []).filter(function (x) { return x.t === id; }).length;
      var ok = (pn ? 1 : 0) + (po ? 1 : 0) + td + pd + (A.length - aOpen), all = 2 + ta + P.length + A.length;
      return { t: t, pn: pn, po: po, aOpen: aOpen, aLate: aLate, td: td, ta: ta, s: s, pd: pd, pt: P.length, tr: tr, pct: all ? Math.round(ok * 100 / all) : 100, left: (pn ? 0 : 1) + (po ? 0 : 1) + (ta - td) + (P.length - pd) + aOpen };
    });
  }
  function mwAllTable(h, M, rows) {
    var avg = rows.length ? Math.round(rows.reduce(function (n, r) { return n + r.pct; }, 0) / rows.length) : 0;
    h += '<div class="asg-stats"><div><b style="color:#2563EB">' + MW.W.teachers.length + '</b>ครูทั้งหมด</div><div><b style="color:#047857">' + rows.filter(function (r) { return r.pct === 100; }).length + '</b>ส่งครบ</div><div><b style="color:#B91C1C">' + rows.filter(function (r) { return r.pct < 100; }).length + '</b>ยังมีงานค้าง</div><div><b style="color:#7C3AED">' + avg + '%</b>ความครบถ้วนเฉลี่ย</div></div>';
    var c = function (b) { return b ? '<td class="mw-ok">✅</td>' : '<td class="mw-no">❌</td>'; };
    h += '<div class="mw-wrap" id="mwPrint"><div class="mw-ph">ภาพรวมงานครู โรงเรียนวัดแสนเกษม · ภาคเรียน ' + esc(MW.W.term.label || '') + ' · แผนหน้าเดียวเดือน' + mLabel(M) + ' · ข้อมูล ณ ' + th(MW.W.today) + '</div><table class="mw-t"><tr><th>ครู</th><th>แผนปกติ<br>ภาคเรียน ' + esc(MW.W.term.label || '') + '</th><th>แผนหน้าเดียว+MakerSpace<br>' + esc(mLabel(M).split(' ')[0]) + '</th><th>มอบหมายงาน<br>(ค้าง)</th><th>ติดตามงาน</th><th>รายงาน<br>โครงการ</th><th>รายงาน<br>อบรม</th><th>ครบถ้วน</th></tr>' +
      (rows.length ? rows.map(function (r) {
        var col = r.pct === 100 ? '#047857' : r.pct >= 70 ? '#D97706' : '#B91C1C';
        return '<tr><td class="mw-n"><a href="#" data-mw="me:' + encodeURIComponent(r.t.name) + '">' + esc(r.t.name) + '</a></td>' + c(r.pn) + c(r.po) +
          '<td' + (r.aLate ? ' class="mw-no"' : r.aOpen ? ' style="color:#D97706;font-weight:700"' : '') + '>' + r.aOpen + '</td><td>' + (r.s ? r.td + '/' + r.ta : '-') + '</td><td>' + (r.pt ? r.pd + '/' + r.pt : '-') + '</td><td>' + r.tr + '</td><td style="color:' + col + ';font-weight:700">' + r.pct + '%</td></tr>';
      }).join('') : '<tr><td colspan="8">ทุกคนส่งครบแล้ว 🎉</td></tr>') + '</table></div><div class="asg-s">กดชื่อครูเพื่อดูงานรายบุคคล · ติดตามงาน = 10 รายการของระบบติดตาม (ไม่นับที่ "ไม่เกี่ยวข้อง") · รายงานโครงการ/อบรม ติ๊กอัตโนมัติจากเมนูที่ครูส่ง</div>';
    return h;
  }
  // 📈 แดชบอร์ด (เฉพาะแอดมิน): % ส่งงานรายหัวข้อ · ครูที่ค้างมากสุด · สถานะงานมอบหมาย · ใครเปิดการแจ้งเตือน
  function mwDash() {
    if (!MW.sum) { mwSum(); return '<div class="asg-empty">กำลังโหลดภาพรวม…</div>'; }
    if (!MW.pn) pnLoad();
    var M = MW.month, rows = mwRows(M), sum = MW.sum, pjk = sum.auto && sum.auto.length ? sum.auto[0] : -1;
    var avg = rows.length ? Math.round(rows.reduce(function (n, r) { return n + r.pct; }, 0) / rows.length) : 0;
    var col = function (p) { return p >= 80 ? '#059669' : p >= 50 ? '#D97706' : '#DC2626'; };
    var bar = function (name, d, a) { var p = a ? Math.round(d * 100 / a) : 0; return '<div class="db-bar"><span>' + esc(name) + '</span><div class="db-tr"><i style="width:' + p + '%;background:' + col(p) + '"></i></div><b>' + d + '/' + a + '</b></div>'; };
    var B = bar('แผนการสอน (ปกติ)', rows.filter(function (r) { return r.pn; }).length, rows.length) + bar('แผนหน้าเดียว ' + mLabel(M).split(' ')[0], rows.filter(function (r) { return r.po; }).length, rows.length);
    (sum.K || []).forEach(function (k, j) { if (j === pjk) return; var d = 0, a = 0; (sum.S || []).forEach(function (s) { if (s && s[j] !== 2) { a++; if (s[j] === 0) d++; } }); if (a) B += bar(k, d, a); });
    var pjA = 0, pjD = 0; rows.forEach(function (r) { pjA += r.pt; pjD += r.pd; }); if (pjA) B += bar('รายงานโครงการ', pjD, pjA);
    var top = rows.filter(function (r) { return r.left > 0; }).sort(function (a, b) { return b.left - a.left || a.t.name.localeCompare(b.t.name, 'th'); }).slice(0, 5);
    var as = { done: 0, late: 0, soon: 0, open: 0 }, ack = 0, tot = 0;
    S.G.forEach(function (x) { x.a.forEach(function (n) { tot++; as[state(x, n)]++; if ((x.st[n] || {}).k) ack++; }); });
    var seg = function (n, c) { return tot && n ? '<i style="width:' + (n * 100 / tot) + '%;background:' + c + '"></i>' : ''; };
    var PN = MW.pn, names = pnames(), on = [], off = [], nOn = 0;
    if (PN && PN.L) { var cnt = {}; PN.L.forEach(function (x) { if (x.n) cnt[x.n] = (cnt[x.n] || 0) + 1; }); names.forEach(function (n) { if (cnt[n]) { on.push(esc(n) + (cnt[n] > 1 ? ' <small>· ' + cnt[n] + ' เครื่อง</small>' : '')); nOn++; } else off.push(esc(n)); }); }
    var h = '<div class="asg-stats"><div><b style="color:#2563EB">' + rows.length + '</b>ครูทั้งหมด</div><div><b style="color:#047857">' + avg + '%</b>ส่งงานแล้ว (เฉลี่ย)</div><div><b style="color:#B91C1C">' + as.late + '</b>งานเลยกำหนด</div><div><b style="color:#7C3AED">' + (PN && PN.L ? nOn + '/' + names.length : '…') + '</b>เปิดแจ้งเตือน</div></div>';
    h += '<div class="db-card"><h4>📤 การส่งงานแต่ละหัวข้อ' + (sum.term || MW.W.term.label ? ' (ภาคเรียน ' + esc(MW.W.term.label || '') + ')' : '') + '</h4>' + B + '<div class="db-note">เขียว ≥ 80% · ส้ม 50–79% · แดง &lt; 50% · ไม่นับคนที่ "ไม่เกี่ยวข้อง"</div></div>';
    h += '<div class="db-card"><h4>⏳ ครูที่มีงานค้างมากที่สุด</h4>' + (top.length ? top.map(function (r, i) { return '<div class="db-who"><a href="#" data-mw="me:' + encodeURIComponent(r.t.name) + '">' + (i + 1) + '. ' + esc(r.t.name) + '</a><span class="db-pill" style="background:' + (r.left >= 5 ? '#DC2626' : '#D97706') + '">ค้าง ' + r.left + '</span></div>'; }).join('') : '<div class="asg-s">ทุกคนส่งครบแล้ว 🎉</div>') + '<div class="db-note">นับรวม: แผนการสอน + หัวข้อติดตามงาน + งานมอบหมาย + รายงานโครงการ · กดชื่อเพื่อดูรายละเอียด</div></div>';
    h += '<div class="db-card"><h4>📌 สถานะงานมอบหมาย (' + tot + ' รายการ)</h4>' + (tot ? '<div class="db-stack">' + seg(as.done, '#059669') + seg(as.late, '#DC2626') + seg(as.soon, '#D97706') + seg(as.open, '#94A3B8') + '</div><div class="db-lg"><span style="--c:#059669">เสร็จ ' + as.done + '</span><span style="--c:#DC2626">เลยกำหนด ' + as.late + '</span><span style="--c:#D97706">ใกล้ครบกำหนด ' + as.soon + '</span><span style="--c:#94A3B8">กำลังทำ ' + as.open + '</span></div><div class="db-note">👍 รับทราบงานแล้ว ' + ack + '/' + tot + '</div>' : '<div class="asg-s">ยังไม่มีงานมอบหมาย</div>') + '</div>';
    h += '<div class="db-card"><h4>🔔 การแจ้งเตือนบนมือถือ' + (PN && PN.L ? ' · ' + nOn + '/' + names.length + ' คน' : '') + '</h4>';
    if (!PN) h += '<div class="asg-s">กำลังโหลด…</div>';
    else if (PN.err) h += '<div class="asg-s" style="color:#B91C1C">' + esc(PN.err) + '</div>';
    else h += '<div class="db-stack">' + (names.length ? '<i style="width:' + (nOn * 100 / names.length) + '%;background:#7C3AED"></i>' : '') + '</div><div class="db-nt"><div class="db-on"><b>🔔 เปิดแล้ว (' + nOn + ')</b>' + (on.join('<br>') || '-') + '</div><div class="db-off"><b>🔕 ยังไม่เปิด (' + off.length + ')</b>' + (off.join('<br>') || '-') + '</div></div>' +
      (PN.anon ? '<div class="db-note">มีอีก ' + PN.anon + ' เครื่องที่เปิดไว้ก่อนมีระบบชื่อ → ครั้งหน้าที่เครื่องนั้นเปิดแอป ระบบจะถามชื่อ 1 ครั้ง</div>' : '');
    h += '</div>';
    // 📋 ข้อความตามงานสำเร็จรูป (วางในกลุ่มไลน์ครูครั้งเดียว แทนการทักทีละคน)
    var td = today(), RM = [];
    S.G.filter(function (x) { return x.u >= td; }).sort(function (a, b) { return a.u < b.u ? -1 : 1; }).forEach(function (x) {
      var w = x.a.filter(function (n) { return !(x.st[n] || {}).k && state(x, n) !== 'done'; }); if (w.length) RM.push('📌 ' + x.n + ' (กำหนด ' + th(x.u) + ')\n   ยังไม่กดรับทราบ: ' + w.join(', '));
    });
    var offN = PN && PN.L ? names.filter(function (n) { return !PN.L.some(function (z) { return z.n === n; }); }) : [];
    var app = location.href.split('#')[0].split('?')[0];
    var txt = (RM.length ? '🙏 รบกวนคุณครูกดรับทราบงานในแอปค่ะ\n' + RM.join('\n') + '\n' : '') + (offN.length ? '\n🔕 ยังไม่เปิดการแจ้งเตือน: ' + offN.join(', ') + '\nเปิดแอป แล้วกดปุ่ม "🔔 เปิดการแจ้งเตือน" ด้านบน (iPhone: กดแชร์ → เพิ่มไปยังหน้าจอโฮม ก่อน)\n' : '') + ((RM.length || offN.length) ? '\n👉 ' + app : '');
    MW.rmTxt = txt;
    h += '<div class="db-card"><h4>📋 ข้อความตามงาน (วางในกลุ่มไลน์ครูครั้งเดียว)</h4>' + (txt ? '<textarea id="rmTxt" rows="7" readonly style="width:100%;max-width:100%;box-sizing:border-box;font:inherit;font-size:13px;padding:8px;border:1px solid #CBD5E1;border-radius:8px;background:#F8FAFC;color:#111">' + esc(txt) + '</textarea><button class="asg-btn ok" style="width:100%;margin-top:6px;color:#fff" data-mw="copyrm">📋 คัดลอกข้อความ</button><div class="db-note">กดคัดลอก → เปิดกลุ่มไลน์ครู → กดค้างที่ช่องพิมพ์ → วาง</div>' : '<div class="asg-s">ทุกคนกดรับทราบงานและเปิดแจ้งเตือนครบแล้ว 🎉 ไม่ต้องตามใคร</div>') + '</div>';
    return h;
  }
  function pnLoad() {
    if (MW.pnBusy) return; MW.pnBusy = true;
    fetch(PUSH.url, { method: 'POST', body: JSON.stringify({ a: 'who', pw: S.pw }) }).then(function (r) { return r.json(); })
      .then(function (j) { MW.pn = j.ok ? j : { err: j.err === 'auth' ? 'รหัสผ่านไม่ถูกต้อง' : 'โหลดรายชื่อไม่ได้' }; })
      .catch(function () { MW.pn = { err: 'โหลดรายชื่อไม่ได้' }; }).then(function () { MW.pnBusy = false; mwRender(); });
  }
  function mwSum() {
    if (MW.loadingSum) return; MW.loadingSum = true;
    post({ a: 'pubsum', t: trTerm() || undefined }).then(function (j) { MW.sum = j; }).catch(function () { MW.sum = { T: [], S: [], err: 'โหลดสถานะติดตามงานไม่ได้ (ระบบติดตามต้องอัปเดตโค้ด)' }; }).then(function () { MW.loadingSum = false; mwRender(); });
  }
  function mwOpen(view) {
    MW.open = true; MW.view = view || MW.view; MW.err = '';
    mwRender(); var b = document.getElementById('mwBox'); if (b) b.scrollIntoView({ behavior: 'smooth' });
    mwLoad().then(mwRender).catch(function (e) { MW.err = e.message || 'ไม่ทราบสาเหตุ'; mwRender(); });
  }
  function mwClick(ev) {
    var el = ev.target.closest('[data-mw]'); if (!el) return; ev.preventDefault();
    var p = el.getAttribute('data-mw').split(':'), a = p[0];
    if (a === 'open') return mwOpen(p[1]);
    if (a === 'close') { MW.open = false; return mwRender(); }
    if (a === 'copyrm') {
      var t = MW.rmTxt || '', ok = function () { toast('✅ คัดลอกแล้ว นำไปวางในกลุ่มไลน์ได้เลย'); }, fb = function () { var ta = document.getElementById('rmTxt'); if (ta) { ta.removeAttribute('readonly'); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { toast('กดค้างที่ข้อความแล้วเลือก คัดลอก'); } ta.setAttribute('readonly', ''); } };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, fb); else fb(); return;
    }
    if (a === 'mon') { MW.mon = !MW.mon; if (MW.mon && !S.night) { try { nightLoad().then(mwRender); } catch (e) {} } return mwRender(); }
    if (a === 'view') { MW.view = p[1]; MW.mon = false; return mwRender(); }
    if (a === 'me') { S.me = decodeURIComponent(p.slice(1).join(':')); put('asg_me', S.me); badge(); MW.view = 'me'; mwRender(); document.getElementById('mwBox').scrollIntoView({ behavior: 'smooth' }); return; }
    if (a === 'print') { var bx = document.getElementById('mwBox'), ph = document.getElementById('mwPH'); if (ph) ph.remove(); if (bx) bx.insertAdjacentHTML('afterbegin', pHead(MW.view === 'me' ? (MW.mon ? 'สรุปผลการปฏิบัติงานประจำเดือน ' + mLabel(MW.month) + ' · ' : 'สรุปงานรายบุคคล · ') + (S.me || '') : MW.view === 'dash' ? 'แดชบอร์ดภาพรวมการส่งงาน' : 'สรุปภาพรวมงานครู', MW.at)); document.body.classList.add('mw-printing'); window.print(); setTimeout(function () { document.body.classList.remove('mw-printing'); var p2 = document.getElementById('mwPH'); if (p2) p2.remove(); }, 800); return; }
    if (a === 'track') { document.body.classList.add('sks-open'); var hm = document.getElementById('home'); if (hm) hm.scrollIntoView({ behavior: 'smooth' }); return; }
    if (a === 'proj') { document.body.classList.add('sks-open'); var tp = document.getElementById('topj'); if (tp) tp.click(); return; }
  }
  function mwChange(ev) {
    var id = ev.target.id;
    if (id === 'mwMe') { S.me = ev.target.value; put('asg_me', S.me); badge(); render(); mwRender(); }
    if (id === 'mwMonth' || id === 'mwMonth2') { MW.month = ev.target.value; mwRender(); }
    if (id === 'mwFil') { MW.filter = ev.target.value; mwRender(); }
  }
  // ⏰ แบนเนอร์ "งานที่ใกล้จะถึง" (ทุกคนเห็น) — ปฏิทินปฏิบัติงาน + กิจกรรมออนไลน์ + กำหนดส่งงานมอบหมาย
  var UP = { items: null, more: false };
  function loadUp() { return fetch(TT + '?api=upcoming').then(function (r) { return r.json(); }).then(function (j) { UP.items = j.ok ? j.data.items : []; UP.news = j.ok ? (j.data.news || []) : []; renderNews(); renderUp(); }).catch(function () { UP.items = []; renderUp(); }); }
  // 📢 ประกาศข่าวสาร (Admin เพิ่มที่ระบบตารางสอน → เมนู ประกาศข่าวสาร)
  function nbFiles(fs) {
    fs = fs || []; if (!fs.length) return '';
    var isImg = function (f) { return /^image\//.test(f.mime || '') || /\.(jpe?g|png|gif|webp)$/i.test(f.name || ''); };
    var vw = function (f) { return 'https://drive.google.com/file/d/' + encodeURIComponent(f.id) + '/view'; }, dl = function (f) { var mob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent); return mob ? (isImg(f) ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(f.id) + '&sz=w2400' : vw(f)) : 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(f.id); };
    var im = fs.filter(isImg), ot = fs.filter(function (f) { return !isImg(f); });
    return (im.length ? '<div class="nb-imgs">' + im.map(function (f) { return '<figure><a href="' + vw(f) + '" target="_blank" rel="noopener"><img loading="lazy" src="https://drive.google.com/thumbnail?id=' + encodeURIComponent(f.id) + '&sz=w1000" alt="' + esc(f.name) + '"></a><a class="nb-dl" href="' + dl(f) + '" target="_blank" rel="noopener">⬇️ ดาวน์โหลดรูป</a>' + (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? '<small class="nb-hint">เปิดแล้วกดค้างที่รูป → บันทึกรูปภาพ</small>' : '') + '</figure>'; }).join('') + '</div>' : '') +
      (ot.length ? '<div class="nb-files">' + ot.map(function (f) { return '<div>📎 ' + esc(f.name) + ' <a href="' + vw(f) + '" target="_blank" rel="noopener">เปิดดู</a> · <a href="' + dl(f) + '" target="_blank" rel="noopener">⬇️ ดาวน์โหลด</a></div>'; }).join('') + '</div>' : '');
  }
  function renderNews() {
    var el = document.getElementById('newsBan'); if (!el) return;
    var N = UP.news || [];
    if (!N.length) { el.innerHTML = '<div class="nb-empty"><span>📢 ยังไม่มีประกาศใหม่</span><a class="adm-edit" href="' + TT + '?page=admin&to=news" target="_top">✏️ แก้ไข (Admin)</a></div>'; return; }
    el.innerHTML = '<div class="nb-wrap"><div class="nb-head"><b>📢 ประกาศข่าวสาร</b><span><a href="' + TT + '?page=news" target="_top">ดูทั้งหมด</a> · <a class="adm-edit" href="' + TT + '?page=admin&to=news" target="_top">✏️ แก้ไข (Admin)</a></span></div>' +
      N.map(function (x, i) {
        var p = x.date.split('-').map(Number);
        return '<details class="nb-it' + (x.level === 'ด่วน' ? ' nb-u' : '') + '"' + (i === 0 ? ' open' : '') + '><summary data-annid="' + esc(x.ann_id) + '">' + (x.level === 'ด่วน' ? '<span class="nb-tag">🚨 ด่วน</span>' : '<span class="nb-new">' + (days(x.date) >= -1 ? 'ใหม่' : p[2] + ' ' + MS[p[1] - 1]) + '</span>') + '<b>' + esc(x.title) + '</b></summary>' +
          (x.body ? '<div class="nb-b">' + esc(x.body) + '</div>' : '') + nbFiles(x.files) + (x.link ? '<a class="nb-l" href="' + esc(x.link) + '" target="_blank" rel="noopener">🔗 เปิดลิงก์/เอกสาร</a>' : '') +
          '<div class="nb-m">ประกาศ ' + th(x.date) + (x.by ? ' · ' + esc(String(x.by).replace(/\s*\(.*\)$/, '')) : '') + '</div></details>';
      }).join('') + '</div>';
  }
  var TMS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'], TWD = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  function renderUp() {
    var el = document.getElementById('upBan'); bdDraw(); ctBan(); if (!el || UP.items === null) return;
    var td = today(), L = UP.items.slice();
    S.G.forEach(function (x) {
      var open = x.a.filter(function (z) { return !(x.st[z] || {}).d; }), C = amSplit(x.m).C; if (!open.length || (C ? C.date : x.u) < td) return;
      L.push({ src: 'asg', date: C ? C.date : x.u, time: '', title: C ? C.title : x.n, who: open.length === x.a.length ? x.a.length + ' คน' : 'ค้าง ' + open.length + '/' + x.a.length + ' คน', place: '', id: x.id });
    });
    L = L.filter(function (x) { return x.date >= td || (x.end && x.end >= td); }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time < b.time ? -1 : 1); });
    var lim = Date.parse(td + 'T00:00:00Z') + 14 * 864e5; L = L.filter(function (x) { return Date.parse(x.date + 'T00:00:00Z') <= lim || x.date < td; });
    if (!L.length) { el.innerHTML = '<div class="up-wrap up-none">✅ ไม่มีงานหรือกิจกรรมในอีก 14 วันข้างหน้า</div>'; return; }
    var TAG = { event: ['📅 ปฏิทินงานโรงเรียน', '#0E7490'], act: ['📅 ปฏิทินงานโรงเรียน', '#0E7490'], asg: ['📌 กำหนดส่งงาน', '#B91C1C'] };
    // ไม่ให้ขึ้นซ้ำ: วันเดียวกัน + ชื่อคล้ายกัน (ข้อความตรงกันต่อเนื่อง ≥ 10 ตัวอักษร) → เหลือรายการเดียว (ปฏิทินปฏิบัติงาน > ปฏิทินที่เพิ่มเอง > งานมอบหมาย)
    var PRI = { event: 0, act: 1, asg: 2 }, nzT = function (t) { return String(t || '').replace(/[\s.()\-–]/g, ''); };
    var sim = function (a, b) { if (a === b || a.indexOf(b) >= 0 || b.indexOf(a) >= 0) return true; var m = 0, p = []; for (var j = 0; j <= b.length; j++) p[j] = 0; for (var i = 1; i <= a.length; i++) { var prev = 0; for (j = 1; j <= b.length; j++) { var t = p[j]; p[j] = a[i - 1] === b[j - 1] ? prev + 1 : 0; if (p[j] > m) m = p[j]; prev = t; } } return m >= 10 && m >= Math.min(a.length, b.length) * 0.6; };
    L = L.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : PRI[a.src] - PRI[b.src]; });
    var keep = []; L.forEach(function (x) {
      var nx = nzT(x.title), y = keep.filter(function (k) { return k.date === x.date && k.src !== x.src && !(k.time && x.time && nzT(k.time) !== nzT(x.time)) && sim(nzT(k.title), nx); })[0];
      if (!y) { keep.push(Object.assign({}, x)); return; }
      if (!y.time && x.time) y.time = x.time; if (!y.place && x.place) y.place = x.place; if (!y.who && x.who) y.who = x.who;
      if (x.src === 'asg') { y.asgId = x.id; if (y.src !== 'asg') y.asgW = x.who; }
    });
    L = keep.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time < b.time ? -1 : 1); });
    UP._L = {}; L.forEach(function (x) { x._k = evk(x); x._ev = EV.M ? EV.M[x._k] || null : null; UP._L[x._k] = x; });
    L = L.filter(function (x) { return !x._ev; }).concat(L.filter(function (x) { return x._ev; }));
    var dd = function (x) { var d = days(x.date); return x.date < td ? 'กำลังดำเนินการ' : d === 0 ? 'วันนี้!' : d === 1 ? 'พรุ่งนี้' : 'อีก ' + d + ' วัน'; };
    var lvl = function (x) { var d = days(x.date); return d <= 0 ? 'u0' : d <= 2 ? 'u1' : d <= 7 ? 'u2' : 'u3'; };
    var dt = function (x) { var p = x.date.split('-').map(Number), w = new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay(); return { d: p[2], m: TMS[p[1] - 1], w: TWD[w] }; };
    var go = function (x) { return x.src === 'asg' ? ' data-asg="open"' : ' href="' + TT + '?page=acts" target="_top"'; };
    var f = L[0], fd = dt(f), rest = L.slice(1, UP.more ? 30 : 7);
    var h = '<div class="up-wrap"><div class="up-head"><div><b>⏰ งานที่ใกล้จะถึง</b><small>อีก 14 วันข้างหน้า · ' + L.length + ' รายการ</small></div><div class="up-legend"><span style="background:#0E7490">ปฏิทินงานโรงเรียน</span><span style="background:#B91C1C">กำหนดส่งงาน</span></div></div>' +
      '<div class="up-body"><a class="up-next ' + lvl(f) + '"' + go(f) + '><div class="up-cd">' + esc(dd(f)) + '</div><div class="up-nt">' + esc(f.title) + '</div>' +
      '<div class="up-nm">' + esc('วัน' + fd.w + 'ที่ ' + fd.d + ' ' + fd.m) + (f.time ? ' · ' + esc(f.time) + ' น.' : '') + (f.place ? ' · 📍 ' + esc(f.place) : '') + '</div>' + (f.who ? '<div class="up-nm">👥 ' + esc(f.who) + '</div>' : '') + (f.asgW ? '<div class="up-nm">📌 มีงานมอบหมาย · ' + esc(f.asgW) + '</div>' : '') +
      '<span class="up-tag" style="background:rgba(255,255,255,.25)">' + TAG[f.src][0] + '</span>' + evBtn(f) + evChip(f) + '</a><div class="up-list">' +
      rest.map(function (x) { var d = dt(x); return '<a class="up-it' + (x._ev ? ' up-done' : '') + '"' + go(x) + '><span class="up-date ' + lvl(x) + '"><b>' + d.d + '</b>' + d.m + '</span><span class="up-tx"><b>' + esc(x.title) + '</b><small><i style="background:' + TAG[x.src][1] + '"></i>' + esc(dd(x)) + (x.time ? ' · ' + esc(x.time) : '') + (x.who ? ' · ' + esc(x.who) : '') + (x.asgW ? ' · 📌 มอบหมาย ' + esc(x.asgW) : '') + '</small>' + evChip(x) + '</span>' + evBtn(x) + '</a>'; }).join('') +
      (L.length > 7 ? '<a class="up-more" href="#" data-up="more">' + (UP.more ? 'ย่อ ▲' : 'ดูทั้งหมด ' + L.length + ' รายการ ▼') + '</a>' : '') + '</div></div></div>';
    el.innerHTML = h;
  }
  // 🔔 มีอะไรใหม่ — ตัวเลขบนเมนู · แถบสรุป · ตัวเลขบนไอคอนแอป (เครื่องนี้จำว่าเห็นอะไรแล้ว)
  var NW = { data: null, seen: null };
  var NSEC = [['news', '📢 ประกาศ', TT + '?page=news'], ['subs', '📢 จัดสอนแทน', TT + '?page=subtoday'], ['acts', '📅 ปฏิทินงาน', TT + '?page=acts'], ['docs', '📂 เอกสาร', TT + '?page=docs'], ['awards', '🏆 รางวัล', TT + '?page=awards'], ['links', '🔗 ลิงก์', '#mwLinks']];
  function nwSeen() { if (NW.seen) return NW.seen; try { NW.seen = JSON.parse(localStorage.getItem('nw_seen') || '{}'); } catch (e) { NW.seen = {}; } return NW.seen; }
  function nwSave() { try { localStorage.setItem('nw_seen', JSON.stringify(NW.seen)); } catch (e) {} }
  function nwItems(k) { if (k === 'asg') return S.loaded ? S.G.map(function (x) { return { id: x.id, t: x.n, d: x.d }; }) : null; return NW.data ? NW.data[k] || [] : null; }
  function nwNew(k) {
    var L = nwItems(k); if (!L) return []; var sn = nwSeen();
    if (!sn[k]) { // ครั้งแรกในเครื่องนี้: ถือว่าเห็นของเก่าแล้ว (เกิน 2 วัน) — ไม่ให้ตัวเลขท่วม
      var lim = new Date(Date.now() + 7 * 3600e3 - 2 * 864e5).toISOString().slice(0, 10);
      sn[k] = L.filter(function (x) { return k === 'subs' ? false : k === 'acts' ? true : !x.d || x.d < lim; }).map(function (x) { return x.id; }); nwSave();
    }
    return L.filter(function (x) { return sn[k].indexOf(x.id) < 0; });
  }
  function nwMark(k, id) {
    var L = nwItems(k); if (!L) return; var sn = nwSeen(), cur = L.map(function (x) { return x.id; });
    sn[k] = id ? (sn[k] || []).filter(function (x) { return cur.indexOf(x) >= 0; }).concat([id]) : cur; nwSave(); nwRender();
  }
  function nwLoad() { return fetch(TT + '?api=pulse').then(function (r) { return r.json(); }).then(function (j) { if (j.ok) { NW.data = j.data; nwRender(); } }).catch(function () {}); }
  // 🔔 แจ้งเตือนแบบเด้ง (Firebase Cloud Messaging) — ครูกดเปิดครั้งเดียว · ระบบเช็กของใหม่ทุก 10 นาทีแล้วเด้งเตือน + ตัวเลขบนไอคอน
  var PUSH = { url: 'https://script.google.com/macros/s/AKfycbwskmmW5YzzBnZCTi5q0TkuHEgW6DnIvkvWmw64Ee8xlawg9mJRQ6cdM5c2_0YK9x_MWg/exec',
    vapid: 'BFsmrvNmbypSxWNjHVVKZMul0GJly7IitnHrAynME2IfEDzhD7YH-AcV8UdtNHPgX9zoW2DFTscI_Ohmxz3iArE',
    cfg: { apiKey: 'AIzaSyCMsD14OfR04FmPmp0ZY2T3hi4PaEMGKBM', authDomain: 'watsaenkasem-notify.firebaseapp.com', projectId: 'watsaenkasem-notify', storageBucket: 'watsaenkasem-notify.firebasestorage.app', messagingSenderId: '445561003767', appId: '1:445561003767:web:f7e028d26ce1db537f7df2' } };
  function pushOk() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
  function pushIOS() { return /iPhone|iPad|iPod/.test(navigator.userAgent); }
  function pushStandalone() { return !!(window.navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)); }
  function pushLoad(src) { return new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { bad(new Error('โหลดไม่สำเร็จ')); }; document.head.appendChild(s); }); }
  function pushToken() {
    var V = 'https://www.gstatic.com/firebasejs/10.12.2/';
    return navigator.serviceWorker.register('sw-push.js').then(function (reg) {
      return (window.firebase && firebase.messaging ? Promise.resolve() : pushLoad(V + 'firebase-app-compat.js').then(function () { return pushLoad(V + 'firebase-messaging-compat.js'); }))
        .then(function () { if (!firebase.apps.length) firebase.initializeApp(PUSH.cfg); return navigator.serviceWorker.ready; })
        .then(function () { return firebase.messaging().getToken({ vapidKey: PUSH.vapid, serviceWorkerRegistration: reg }); });
    }).then(function (t) {
      if (!t) throw new Error('ไม่ได้รับรหัสเครื่อง');
      var nm = S.me || '';
      return fetch(PUSH.url, { method: 'POST', body: JSON.stringify({ a: 'reg', t: t, n: nm, d: pushIOS() ? 'iOS' : (/Android/i.test(navigator.userAgent) ? 'Android' : 'PC') }) })
        .then(function (r) { return r.json(); }).then(function (j) { if (!j.ok) throw new Error('ลงทะเบียนไม่สำเร็จ'); put('push_tk', t); put('push_at', String(Date.now())); put('push_nm', nm); return t; });
    });
  }
  function pushEnable() {
    if (!S.me) { MW.pushAsk = true; return pushUi(); }
    if (!pushOk()) { toast(pushIOS() && !pushStandalone() ? 'iPhone: ต้องเปิดจากไอคอน "ระบบงานโรงเรียน" บนหน้าจอโฮมก่อน (Safari → แชร์ → เพิ่มไปยังหน้าจอโฮม)' : 'เครื่องหรือเบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน'); return; }
    Notification.requestPermission().then(function (p) {
      if (p !== 'granted') { toast('ยังไม่ได้อนุญาต — เปิดได้ที่ ตั้งค่า → การแจ้งเตือน → ระบบงานโรงเรียน'); return; }
      toast('กำลังเปิดการแจ้งเตือน…');
      return pushToken().then(function (t) {
        pushUi(); toast('✅ เปิดการแจ้งเตือนแล้ว — กำลังส่งข้อความทดสอบ');
        return fetch(PUSH.url, { method: 'POST', body: JSON.stringify({ a: 'test', t: t }) });
      });
    }).catch(function (e) { toast('เปิดการแจ้งเตือนไม่สำเร็จ: ' + ((e && e.message) || e)); });
  }
  function pushUi() {
    var el = document.getElementById('pushBar'); if (!el) return;
    var on = pushOk() && Notification.permission === 'granted' && get('push_tk');
    var ask = (!on && MW.pushAsk) || (on && !get('push_nm') && !S.me);
    if (ask) { var L = pnames(); el.innerHTML = '<div class="push-btn push-ask">🔔 ' + (on ? 'ระบุชื่อสำหรับการแจ้งเตือน (ครั้งเดียว)' : 'เปิดการแจ้งเตือน') + '<small>เลือกชื่อของท่าน (ใช้ชื่อเดียวกับ "งานของฉัน")</small><select id="pushNm"><option value="">— เลือกชื่อ —</option>' + L.map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('') + '</select><button type="button" id="pushGo">' + (on ? 'บันทึกชื่อ' : 'เปิดการแจ้งเตือน') + '</button><small>เก็บแค่ชื่อกับรหัสเครื่องรับแจ้งเตือน ไม่เก็บเบอร์ อีเมล หรือข้อมูลอื่น</small></div>'; return; }
    if (on && S.me && get('push_nm') !== S.me && !MW.pushSync) { MW.pushSync = true; pushToken().catch(function () {}).then(function () { MW.pushSync = false; }); }
    el.innerHTML = on ? '' : '<a href="#" id="pushBtn" class="push-btn">🔔 เปิดการแจ้งเตือน <small>เด้งเตือน + ตัวเลขบนไอคอน เมื่อมีประกาศ งานมอบหมาย สอนแทนใหม่</small></a>';
  }
  function pushBadge(n) { try { if (window.caches) caches.open('push-badge').then(function (c) { return c.put('n', new Response(String(n))); }).catch(function () {}); } catch (e) {} }
  function pushRefresh() { // รหัสเครื่องอาจเปลี่ยน → ส่งใหม่วันละครั้ง
    try { if (pushOk() && Notification.permission === 'granted' && get('push_tk') && Date.now() - Number(get('push_at') || 0) > 864e5) pushToken().catch(function () {}); } catch (e) {}
  }
  document.addEventListener('click', function (ev) {
    if (ev.target.closest && ev.target.closest('#pushBtn')) { ev.preventDefault(); pushEnable(); }
    if (ev.target.id === 'pushGo') { var v = (document.getElementById('pushNm') || {}).value; if (!v) return toast('กรุณาเลือกชื่อ'); S.me = v; put('asg_me', v); MW.pushAsk = false; badge(); render(); if (MW.open) mwRender();
      if (pushOk() && Notification.permission === 'granted' && get('push_tk')) { pushToken().then(function () { pushUi(); toast('✅ บันทึกชื่อแล้ว'); }).catch(function () { toast('บันทึกชื่อไม่สำเร็จ ลองใหม่อีกครั้ง'); }); } else pushEnable(); }
  });
  // 🌙 เวรกลางคืน (จากระบบตารางสอน · เมนูกลุ่มกิจกรรม/เวร)
  function nightLoad() { return fetch(TT + '?api=night').then(function (r) { return r.json(); }).then(function (j) { S.night = j.ok ? j.data : { days: [] }; }).catch(function () { S.night = { days: [] }; }); }
  function nfn(s) { return String(s || '').replace(/^(นางสาว|นาง|นาย|น\.ส\.|รองฯ|รอง ผอ\.|ผอ\.|ครู|ว่าที่ร้อยตรี)\s*/, '').trim().split(/\s+/)[0]; }
  function nightMine(nm, td) { var f = nfn(nm); return f ? ((S.night && S.night.days) || []).filter(function (x) { return x.date >= td && nfn(x.name) === f; }) : []; }
  // 🔮 ดวงของฉันวันนี้ (โหลดไฟล์ horo.js เมื่อกดเท่านั้น)
  function hrJobs(nm) {
    return Promise.all([S.loaded ? 0 : load(), ttW().catch(function () { return null; }), S.acts ? 0 : loadActs(), S.night ? 0 : nightLoad()]).then(function () {
      var td = today(), tm = new Date(Date.now() + 31 * 3600e3).toISOString().slice(0, 10), L = [];
      asgOf(nm).forEach(function (x) { if ((x.st[nm] || {}).d) return; var d = days(x.u); if (d < 0) L.push([0, '⚠️ เลยกำหนด ' + (-d) + ' วัน · ' + esc(x.n)]); else if (d <= 3) L.push([1, '⏳ ' + esc(dueText(x)) + ' · ' + esc(x.n)]); });
      var id = tid(nm); ((MW.W && MW.W.subs) || []).forEach(function (x) { if (id && x.t === id && (x.date === td || x.date === tm)) L.push([2, '🔄 สอนแทน' + (x.date === td ? 'วันนี้' : 'พรุ่งนี้') + ' คาบ ' + x.period + ' · ' + esc(x.cls) + ' ' + esc(x.subj)]); });
      nightMine(nm, td).forEach(function (x) { if (x.date === td || x.date === tm) L.push([1, '🌙 ผู้ตรวจเวรกลางคืน' + (x.date === td ? 'คืนนี้' : 'คืนพรุ่งนี้')]); });
      if (S.acts && !S.acts.err) S.acts.items.forEach(function (x) { if ((x.date === td || x.date === tm) && actMine(x, nm)) L.push([3, '🗓️ ' + (x.date === td ? 'วันนี้' : 'พรุ่งนี้') + (x.time ? ' ' + esc(x.time) : '') + ' · ' + esc(x.title)]); });
      return L.sort(function (a, b) { return a[0] - b[0]; }).map(function (x) { return x[1]; });
    });
  }
  var HR_API = {
    me: function () { return S.me; }, names: function () { return pnames(); }, esc: esc, toast: toast, jobs: hrJobs,
    setMe: function (v) { S.me = v; put('asg_me', v); badge(); render(); if (MW.open) mwRender(); },
    horoNames: function () { return fetch(TT + '?api=horo').then(function (r) { return r.json(); }).then(function (j) { return j.ok ? j.data.names : []; }); },
    birth: function (nm) { return fetch(TT + '?api=horo&n=' + encodeURIComponent(nm)).then(function (r) { return r.json(); }).then(function (j) { return j.ok ? j.data : null; }); }
  };
  function hrOpen() {
    var box = document.getElementById('hrBox'); if (!box) return;
    if (window.SKHoro) return window.SKHoro.open(box, HR_API);
    box.style.display = ''; box.innerHTML = '<div class="asg-empty">กำลังเปิดดวงของฉันวันนี้…</div>';
    var s = document.createElement('script'); s.src = 'horo.js?v=4'; s.onload = function () { window.SKHoro.open(box, HR_API); }; s.onerror = function () { box.innerHTML = '<div class="asg-empty">เปิดไม่สำเร็จ ลองกด 🔄 รีเฟรช</div>'; }; document.head.appendChild(s);
  }
  document.addEventListener('click', function (ev) { var el = ev.target.closest && ev.target.closest('[data-hr-open]'); if (el) { ev.preventDefault(); hrOpen(); } });
  // 🎯 ติวเข้ม O-NET ป.6 (โหลดไฟล์ onet.js เมื่อกดเท่านั้น)
  function onOpen() {
    if (window.SKOnet) return window.SKOnet.open();
    toast('กำลังเปิดตารางติว O-NET…');
    var s = document.createElement('script'); s.src = 'onet.js?v=1'; s.onload = function () { window.SKOnet.open(); }; s.onerror = function () { toast('เปิดไม่สำเร็จ ลองกด 🔄 รีเฟรช'); }; document.head.appendChild(s);
  }
  document.addEventListener('click', function (ev) { var el = ev.target.closest && ev.target.closest('[data-on-open]'); if (el) { ev.preventDefault(); onOpen(); } });
  // 📝 ประเมินครูผู้ช่วย (โหลดไฟล์ pmt.js เมื่อกดเท่านั้น)
  function pmOpen() {
    if (window.SKPmt) return window.SKPmt.open();
    toast('กำลังเปิดประเมินครูผู้ช่วย…');
    var s = document.createElement('script'); s.src = 'pmt.js?v=1'; s.onload = function () { window.SKPmt.open(); }; s.onerror = function () { toast('เปิดไม่สำเร็จ ลองกด 🔄 รีเฟรช'); }; document.head.appendChild(s);
  }
  document.addEventListener('click', function (ev) { var el = ev.target.closest && ev.target.closest('[data-pmt-open]'); if (el) { ev.preventDefault(); pmOpen(); } });
  // ✨ ไอคอน 3 มิติ (Fluent Emoji · Microsoft, MIT) + ธีมสดใสหน้าแรก
  var I3D = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/';
  var I3M = { '👩‍🏫': 'Woman teacher/Default/3D/woman_teacher_3d_default.png', '📊': 'Bar chart/3D/bar_chart_3d.png', '🔮': 'Crystal ball/3D/crystal_ball_3d.png', '📅': 'Calendar/3D/calendar_3d.png', '🗓': 'Spiral calendar/3D/spiral_calendar_3d.png', '📢': 'Loudspeaker/3D/loudspeaker_3d.png', '📘': 'Blue book/3D/blue_book_3d.png', '🎓': 'Graduation cap/3D/graduation_cap_3d.png', '🏆': 'Trophy/3D/trophy_3d.png', '📁': 'File folder/3D/file_folder_3d.png', '📌': 'Pushpin/3D/pushpin_3d.png', '👥': 'Busts in silhouette/3D/busts_in_silhouette_3d.png', '📣': 'Megaphone/3D/megaphone_3d.png', '🏛️': 'Classical building/3D/classical_building_3d.png', '👤': 'Bust in silhouette/3D/bust_in_silhouette_3d.png', '📂': 'Open file folder/3D/open_file_folder_3d.png', '⏰': 'Alarm clock/3D/alarm_clock_3d.png', '📤': 'Outbox tray/3D/outbox_tray_3d.png', '🏫': 'School/3D/school_3d.png', '🔗': 'Link/3D/link_3d.png', '🎯': 'Direct hit/3D/direct_hit_3d.png', '📝': 'Memo/3D/memo_3d.png' };
  function i3d(e, cls) { var p = I3M[e]; return p ? '<img class="' + cls + '" src="' + I3D + encodeURI(p) + '" alt="" loading="lazy" onerror="this.replaceWith(document.createTextNode(\'' + e + '\'))">' : e; }
  function fx3d() {
    var m = document.getElementById('mwMenu'); if (!m) return;
    m.querySelectorAll('.mw-big a>span:first-child:not(.fx), .g a>span:first-child:not(.fx)').forEach(function (sp) { var t = sp.textContent.trim(); if (I3M[t]) { sp.innerHTML = i3d(t, sp.closest('.mw-big') ? 'i3b' : 'i3s'); sp.classList.add('fx'); } });
    m.querySelectorAll('.h:not(.fx), .up-head b:not(.fx)').forEach(function (h) { var n = h.firstChild; if (!n || n.nodeType !== 3) return; var t = n.textContent, k = Object.keys(I3M).filter(function (x) { return t.indexOf(x) === 0; })[0]; if (!k) return; n.textContent = t.slice(k.length); h.insertAdjacentHTML('afterbegin', i3d(k, h.tagName === 'B' ? 'i3u' : 'i3h')); h.classList.add('fx'); });
    m.querySelectorAll('.up-next:not(.fxb)').forEach(function (u) { u.classList.add('fxb'); u.insertAdjacentHTML('afterbegin', '<span class="boom"><img class="bm-c" src="' + I3D + 'Collision/3D/collision_3d.png" alt=""><img class="bm-b" src="' + I3D + 'Bomb/3D/bomb_3d.png" alt=""><b>BOOM !!!</b></span>'); });
    var b3 = m.querySelector('.mw-b3'); if (b3 && !b3.querySelector('.sp')) b3.insertAdjacentHTML('beforeend', '<span class="sp" style="left:46%;top:10px">✨</span><span class="sp" style="left:60%;bottom:10px;animation-delay:.4s">💫</span><span class="sp" style="left:75%;top:16px;animation-delay:.8s">⭐</span><span class="sp" style="left:88%;bottom:14px;animation-delay:1.2s">🌙</span>');
    m.querySelectorAll('.mw-b1,.mw-b2').forEach(function (a, i) { if (!a.querySelector('.sp')) a.insertAdjacentHTML('beforeend', '<span class="sp" style="right:22px;' + (i ? 'bottom:12px;animation-delay:.6s' : 'top:12px') + '">' + (i ? '⭐' : '✨') + '</span>'); });
  }
  function fxInit() {
    var st = document.createElement('style');
    st.textContent = '#mwMenu{background:linear-gradient(180deg,#FFF1F8,#F5F3FF 45%,#EEF6FF);border-radius:22px;padding:12px;color:#1E1B4B}' +
      '#mwMenu .h{color:#5B21B6!important;font-size:17px!important;font-weight:800!important;display:flex;align-items:center;gap:6px;margin:14px 2px 8px!important}' +
      '.i3h{width:26px;height:26px}.i3s{width:36px;height:36px;display:block}.i3b{width:58px;height:58px;display:block;filter:drop-shadow(0 4px 6px rgba(30,27,75,.3))}.i3u{width:30px;height:30px;vertical-align:-7px;margin-right:4px;animation:fxWig 2.5s ease-in-out infinite}' +
      '#mwMenu .mw-big a{position:relative;overflow:hidden;box-shadow:0 8px 20px rgba(99,102,241,.28)!important;text-shadow:0 2px 4px rgba(30,27,75,.45);font-weight:800!important;font-size:21px!important}' +
      '#mwMenu .mw-big a small{opacity:1!important;font-weight:600!important;font-size:13.5px!important}' +
      '#mwMenu .mw-big a>span:first-child{font-size:40px;animation:fxBob 2.2s ease-in-out infinite;flex:0 0 auto}' +
      '#mwMenu .mw-big a::after{content:"";position:absolute;top:0;left:-60%;width:40%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);animation:fxSh 3.2s ease-in-out infinite;pointer-events:none}' +
      '.mw-b1{background:linear-gradient(135deg,#38BDF8,#6366F1)!important}.mw-b2{background:linear-gradient(135deg,#A78BFA,#EC4899)!important}' +
      '.mw-b3{background:linear-gradient(120deg,#F472B6,#C084FC 40%,#818CF8 70%,#FBBF24)!important;background-size:200% 200%!important;animation:fxFlow 6s ease infinite}' +
      '#mwMenu .sp{position:absolute;font-size:17px;animation:fxTw 1.6s ease-in-out infinite;pointer-events:none;text-shadow:none}' +
      '#mwMenu .g a{background:#fff!important;border:2px solid #EDE9FE!important;border-radius:16px!important;color:#1E1B4B!important;font-weight:700!important;box-shadow:0 3px 10px rgba(124,58,237,.10);transition:transform .15s,box-shadow .15s}' +
      '#mwMenu .g a:hover{transform:translateY(-3px);box-shadow:0 8px 18px rgba(124,58,237,.2)}#mwMenu .g a>span:first-child{display:inline-flex}' +
      '.up-wrap{background:linear-gradient(135deg,#FB923C,#F472B6 55%,#C084FC)!important;box-shadow:0 8px 22px rgba(244,114,182,.35)!important;text-shadow:0 1px 3px rgba(80,7,36,.35)}' +
      '.up-wrap{background:linear-gradient(135deg,#FEF08A,#FDBA74 50%,#FCA5A5)!important;color:#1F1235!important;text-shadow:none!important}.up-head b{font-size:22px;color:#B91C1C;font-weight:900}.up-head small{color:#7C2D12!important;opacity:1!important;font-weight:600}' +
      '.up-next{position:relative;overflow:visible!important;background:#fff!important;border:3px solid #EF4444!important;box-shadow:0 6px 18px rgba(239,68,68,.35)!important;color:#111!important;padding-right:118px!important}' +
      '.up-next .up-cd{color:#DC2626!important;font-size:34px!important;font-weight:900!important}.up-next .up-nt{color:#1E1B4B!important;font-size:20px!important;font-weight:800!important}.up-next .up-nm{color:#374151!important;opacity:1!important;font-weight:600}.up-next .up-tag{background:#FEE2E2!important;color:#991B1B!important;font-weight:700;font-size:13.5px!important;padding:3px 12px!important}' +
      '.boom{position:absolute;top:-14px;right:-6px;width:124px;height:110px;pointer-events:none}.boom .bm-c{position:absolute;top:0;right:0;width:110px;height:110px;animation:fxBurst 1.2s ease-in-out infinite}.boom .bm-b{position:absolute;top:20px;right:30px;width:58px;height:58px;animation:fxShake .5s ease-in-out infinite}' +
      '.boom b{position:absolute;bottom:-4px;right:6px;font-size:24px;font-weight:900;color:#FACC15;-webkit-text-stroke:1.5px #B91C1C;text-shadow:2px 2px 0 #B91C1C;transform:rotate(-8deg);animation:fxFlash .8s steps(2,end) infinite;white-space:nowrap;letter-spacing:.5px}' +
      '@keyframes fxBurst{0%,100%{transform:scale(.85) rotate(0)}50%{transform:scale(1.08) rotate(12deg)}}@keyframes fxShake{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(10deg) translateY(-2px)}}@keyframes fxFlash{0%{color:#FACC15;transform:rotate(-8deg) scale(1)}50%{color:#fff;transform:rotate(-8deg) scale(1.12)}}' +
      '@media(max-width:600px){.up-next{padding-right:100px!important}.boom{transform:scale(.8);transform-origin:top right;right:2px}.boom b{right:14px;font-size:21px}.up-next .up-cd{font-size:30px!important}}.up-list{text-shadow:none}' +
      '@keyframes fxBob{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-6px) rotate(4deg)}}@keyframes fxTw{0%,100%{opacity:.15;transform:scale(.6)}50%{opacity:1;transform:scale(1.2) rotate(20deg)}}' +
      '@keyframes fxSh{0%{left:-60%}60%,100%{left:130%}}@keyframes fxFlow{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}@keyframes fxWig{0%,100%{transform:rotate(0)}10%{transform:rotate(-14deg)}20%{transform:rotate(12deg)}30%{transform:rotate(-8deg)}40%{transform:rotate(0)}}' +
      '@media (prefers-reduced-motion:reduce){#mwMenu *,#mwMenu *::after{animation:none!important}}@media print{#mwMenu .sp,#mwMenu .mw-big a::after{display:none}}';
    document.head.appendChild(st);
    var m = document.getElementById('mwMenu'); if (!m) return; fx3d();
    new MutationObserver(function () { fx3d(); }).observe(m, { childList: true, subtree: true });
  }
  // 🔄 รีเฟรชอัตโนมัติ: ทุก 5 นาที + ทุกครั้งที่กลับมาเปิดแอป · มีเวอร์ชันใหม่ → โหลดหน้าใหม่เอง (ไม่โหลดขณะกำลังพิมพ์)
  function busyTyping() { var a = document.activeElement; return !!(a && /INPUT|TEXTAREA/.test(a.tagName) && a.value); }
  function refreshAll() { nwLoad(); loadUp(); load().catch(function () {}); }
  function verCheck() {
    var cur = ((document.querySelector('script[src*="asg.js"]') || {}).src || '').match(/v=(\d+)/);
    return fetch('index.html?vc=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); })
      .then(function (h) { var m = h.match(/asg\.js\?v=(\d+)/); return !!(m && cur && m[1] !== cur[1]); }).catch(function () { return false; });
  }
  function setupAutoRefresh() {
    var hiddenAt = 0;
    setInterval(function () { if (document.hidden) return; verCheck().then(function (nv) { if (nv && !busyTyping()) location.reload(); else refreshAll(); }); }, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { hiddenAt = Date.now(); return; }
      verCheck().then(function (nv) { if ((nv || (hiddenAt && Date.now() - hiddenAt > 30 * 60 * 1000)) && !busyTyping()) location.reload(); else refreshAll(); });
    });
    var rb = document.createElement('button'); rb.id = 'rfBtn'; rb.type = 'button'; rb.innerHTML = '🔄<small>รีเฟรช</small>'; rb.title = 'โหลดข้อมูลล่าสุด';
    rb.addEventListener('click', function () { rb.classList.add('spin'); location.reload(); });
    document.body.appendChild(rb);
  }
  // 🖨️ หัวกระดาษพิมพ์: โลโก้ กทม. + โลโก้โรงเรียน · ชื่อโรงเรียน · วันที่พิมพ์ · วันที่อัปเดตข้อมูล
  function thDT(d) { d = d || new Date(); var p = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getDate() + ' ' + MS[d.getMonth()] + ' ' + (d.getFullYear() + 543) + ' เวลา ' + p(d.getHours()) + '.' + p(d.getMinutes()) + ' น.'; }
  function pHead(title, at) {
    var L = window.SK_LOGO || {};
    return '<div id="mwPH" class="p-head">' + (L.bma ? '<img src="' + L.bma + '" alt="">' : '<span></span>') + '<div><b>โรงเรียนวัดแสนเกษม</b><div>สำนักงานเขตหนองจอก กรุงเทพมหานคร</div><div class="p-ti">' + esc(title) + '</div>' +
      '<small>พิมพ์เมื่อ ' + thDT(new Date()) + ' · ข้อมูลอัปเดตเมื่อ ' + thDT(at || new Date()) + '</small></div>' + (L.sch ? '<img src="' + L.sch + '" alt="">' : '<span></span>') + '</div>';
  }
  function nwRender() {
    var tot = 0, rows = [];
    NSEC.forEach(function (sc) {
      var N = nwNew(sc[0]); tot += N.length;
      [].forEach.call(document.querySelectorAll('[data-sec="' + sc[0] + '"]'), function (a) {
        var b = a.querySelector('.nw-dot'); if (!b) { b = document.createElement('i'); b.className = 'nw-dot'; a.appendChild(b); }
        b.textContent = N.length > 9 ? '9+' : N.length; b.style.display = N.length ? '' : 'none';
      });
      N.slice(0, 4).forEach(function (x) { rows.push({ k: sc[0], lab: sc[1], href: sc[2], x: x }); });
    });
    var el = document.getElementById('nwBar');
    if (el) {
      // แถบสั้น 1 บรรทัด (ไม่แสดงรายการซ้ำ — รายละเอียดดูจากตัวเลขแดงที่เมนู)
      el.innerHTML = tot ? '<div class="nw-wrap"><div class="nw-head"><b>🔔 ใหม่ !!! <span class="nw-n">' + tot + '</span></b><a href="#" data-nw="all">✓ อ่านแล้วทั้งหมด</a></div><div class="asg-s">ดูตัวเลขสีแดงที่เมนูด้านล่าง</div></div>' : '';
    }
    var base = document.title.replace(/^\(\d+\+?\)\s*/, ''); document.title = (tot ? '(' + tot + ') ' : '') + base;
    try { if (navigator.setAppBadge) { if (tot) navigator.setAppBadge(tot); else navigator.clearAppBadge(); } } catch (e) {}
    pushBadge(tot);
  }
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest('[data-nw="all"]'); if (a) { ev.preventDefault(); NSEC.forEach(function (sc) { nwMark(sc[0]); }); return; }
    var r = ev.target.closest('[data-nwk]'); if (r) { nwMark(r.getAttribute('data-nwk'), r.getAttribute('data-nwid')); return; }
    var m = ev.target.closest('[data-sec]'); if (m) nwMark(m.getAttribute('data-sec'));
    var n = ev.target.closest('[data-annid]'); if (n) nwMark('news', n.getAttribute('data-annid'));
  }, true);
  // ⚙️ รายการงานที่ติดตาม (ตั้งเองได้ แยกตามภาคเรียน) — ต้องแก้ index.html: "const K=" เป็น "let K=" 1 ครั้ง
  var TKS = { list: null, term: '', edit: null, warn: '' };
  function tkTerm() { return trTerm() || ''; }
  function tkLoad() {
    var t = tkTerm(); if (!t) { tkLoad.n = (tkLoad.n || 0) + 1; if (tkLoad.n < 30) setTimeout(tkLoad, 500); return Promise.resolve(); }
    return post({ a: 'tasks', t: t }).then(function (j) {
      TKS.list = j.list || []; TKS.term = t; TKS.warn = '';
      try { if (typeof K !== 'undefined' && j.K && j.K.length) { K = j.K; var ft = document.getElementById('ft'); if (ft) { var v = ft.value; ft.innerHTML = '<option value="">ทุกรายการงาน</option>' + j.K.map(function (k, i) { return '<option value="' + i + '">' + esc(k) + '</option>'; }).join(''); ft.value = v; } try { if (typeof mx === 'function' && document.getElementById('mx')) mx(); } catch (e2) {} try { if (typeof dash === 'function') dash(); } catch (e3) {} } }
      catch (e) { TKS.warn = 'ยังเปลี่ยนหัวข้อในตารางเดิมไม่ได้ — ต้องแก้ index.html จาก const K= เป็น let K= ก่อน'; }
      try { if (typeof ADM !== 'undefined' && ADM && typeof window.all === 'function') window.all(); } catch (e) {}
      tkRender();
    }).catch(function () {});
  }
  function tkRender() {
    var ad = document.getElementById('admin'); if (!ad) return;
    var box = document.getElementById('tkBox'); if (!box) { box = document.createElement('details'); box.id = 'tkBox'; box.className = 'box'; var t0 = ad.querySelector('.tools'); if (t0 && t0.nextSibling) ad.insertBefore(box, t0.nextSibling.nextSibling || null); else ad.appendChild(box); }
    var open = box.open, L = TKS.edit || (TKS.list || []).map(function (x) { return { n: x.n, col: x.col, auto: x.auto }; });
    var h = '<summary><b>⚙️ รายการงานที่ติดตาม · ภาคเรียน ' + esc(TKS.term) + '</b> <span style="color:var(--mu);font-size:13px">(' + L.length + ' หัวข้อ · กดเพื่อเพิ่ม/แก้/เรียง)</span></summary>';
    if (TKS.warn) h += '<p style="color:var(--no)">⚠️ ' + esc(TKS.warn) + '</p>';
    h += '<p style="color:var(--mu);font-size:13px;margin:6px 0">แก้ชื่อ · เรียงลำดับ ↑↓ · ✕ เอาออก (ข้อมูลเดิมยังเก็บไว้ เพิ่มกลับได้) · หัวข้อใหม่เริ่มเป็น "ยังไม่ส่ง" ทุกคน · แต่ละภาคเรียนตั้งแยกกัน</p>' +
      L.map(function (x, i) {
        return '<div class="tk-row"><span class="tk-no">' + (i + 1) + '</span><input class="tk-n" data-i="' + i + '" value="' + esc(x.n) + '" maxlength="60">' +
          '<select class="tk-a" data-i="' + i + '"><option value="">ติ๊กเอง</option><option value="โครงการ"' + (x.auto === 'โครงการ' ? ' selected' : '') + '>อัตโนมัติจากรายงานโครงการ</option><option value="อบรม"' + (x.auto === 'อบรม' ? ' selected' : '') + '>อัตโนมัติจากรายงานการอบรม</option></select>' +
          '<button class="o" data-tk="up:' + i + '" title="เลื่อนขึ้น">↑</button><button class="o" data-tk="dn:' + i + '" title="เลื่อนลง">↓</button><button class="o" data-tk="del:' + i + '" title="เอาออก" style="color:var(--no)">✕</button></div>';
      }).join('') +
      '<div class="tools" style="margin-top:8px"><button class="o" data-tk="add">＋ เพิ่มหัวข้อ</button><button data-tk="save">💾 บันทึกรายการงาน</button>' + (TKS.edit ? '<button class="o" data-tk="reset">ยกเลิกการแก้</button>' : '') + '</div>';
    box.innerHTML = h; box.open = open || !!TKS.edit;
  }
  function tkSync() { [].forEach.call(document.querySelectorAll('.tk-n'), function (el) { TKS.edit[+el.getAttribute('data-i')].n = el.value; }); [].forEach.call(document.querySelectorAll('.tk-a'), function (el) { TKS.edit[+el.getAttribute('data-i')].auto = el.value; }); }
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-tk]'); if (!el) return; ev.preventDefault();
    if (!TKS.edit) TKS.edit = (TKS.list || []).map(function (x) { return { n: x.n, col: x.col, auto: x.auto }; });
    tkSync(); var p = el.getAttribute('data-tk').split(':'), a = p[0], i = +p[1], E = TKS.edit;
    if (a === 'up' && i > 0) { var t = E[i]; E[i] = E[i - 1]; E[i - 1] = t; }
    if (a === 'dn' && i < E.length - 1) { var u = E[i]; E[i] = E[i + 1]; E[i + 1] = u; }
    if (a === 'del') { if (!window.confirm('เอา "' + E[i].n + '" ออกจากรายการ? (ข้อมูลเดิมยังเก็บไว้)')) return; E.splice(i, 1); }
    if (a === 'add') { E.push({ n: '', col: 0, auto: '' }); tkRender(); var ins = document.querySelectorAll('.tk-n'); if (ins.length) ins[ins.length - 1].focus(); return; }
    if (a === 'reset') { TKS.edit = null; return tkRender(); }
    if (a === 'save') {
      var L = E.filter(function (x) { return String(x.n).trim(); });
      if (!L.length) return toast('ต้องมีอย่างน้อย 1 หัวข้อ');
      if (!S.pw) return toast('กรุณาเข้าสู่ระบบ Admin ระบบติดตามอีกครั้ง');
      el.disabled = true;
      return post({ a: 'tasksave', pw: S.pw, t: TKS.term, list: L }).then(function () { TKS.edit = null; toast('บันทึกรายการงานแล้ว — กำลังโหลดตารางใหม่'); MW.sum = null; MW.mine = null; return tkLoad(); })
        .then(function () { var rb = document.getElementById('rfb'); if (rb) rb.click(); }).catch(function (e) { el.disabled = false; toast(e.message); });
    }
    tkRender();
  });
  // จัดเมนูหน้าแรกใหม่เป็นหมวด + ปุ่มใหญ่ งานของฉัน / ภาพรวม
  function mwMenu(links) {
    if (!links || document.getElementById('mwMenu')) return;
    var A = function (href, ic, tx, extra) { return '<a href="' + href + '"' + (extra || ' target="_top"') + '><span>' + ic + '</span>' + tx + '</a>'; };
    var html = '<div id="mwMenu"><div id="pushBar"></div><div id="nwBar"></div><div id="dlCard"></div><div id="newsBan"></div><div id="upBan"></div><div class="mw-big"><a href="#" data-mw="open:me" class="mw-b1"><span>👩‍🏫</span><div>งานของฉัน<small>เลือกชื่อครั้งเดียว เห็นงานทุกเมนู ส่งแล้ว/ยังไม่ส่ง และส่งงานได้จากที่นี่</small></div></a>' +
      '<a href="#" data-mw="open:all" class="mw-b2"><span>📊</span><div>ภาพรวมงานครู<small>ตารางสรุปทุกคน ใครส่งครบ ใครยังค้าง (ดูได้ทุกคน)</small></div></a>' +
      '<a href="#" data-hr-open="1" class="mw-b3"><span>🔮</span><div>ดวงของฉันวันนี้<small>งานของฉันวันนี้ · ดวงรายวันตามวันเกิด · ไพ่เลอนอร์ม็อง</small></div></a></div>' +
      '<div class="h">📅 ตารางและสอนแทน</div><div class="g">' + A(TT, '📅', 'ตารางสอน') + A(TT + '?page=daily', '🗓', 'ตารางรายวัน') + A(TT + '?page=subtoday', '📢', 'จัดสอนแทนวันนี้', ' target="_top" data-sec="subs"') + '<a href="#" data-on-open="1"><span>🎯</span>ติวเข้ม O-NET ป.6</a></div>' +
      '<div class="h">📤 ส่งงาน</div><div class="g">' + A(TT + '?page=plans', '📘', 'ส่งแผนการสอน') + A(TT + '?page=training', '🎓', 'รายงานการอบรม') + A(TT + '?page=awards', '🏆', 'รางวัล/เกียรติบัตร', ' target="_top" data-sec="awards"') +
      A('#', '📁', 'โครงการ/กิจกรรม', ' data-mw="proj"') + '<a href="#" data-asg="open" data-sec="asg"><span>📌</span>มอบหมายงาน<em id="asgNb" style="display:none"></em></a></div>' +
      '<div class="h">🏫 ข้อมูลโรงเรียน</div><div class="g">' + A(TT + '?page=news', '📢', 'ประกาศข่าวสาร', ' target="_top" data-sec="news"') + A(TT + '?page=acts', '📅', 'ปฏิทินงานโรงเรียน', ' target="_top" data-sec="acts"') + A(TT + '?page=groups', '👥', 'กลุ่มกิจกรรม/ผู้รับเช็ค') + A(TT + '?page=prduty', '📣', 'เวรสื่อประชาสัมพันธ์') +
      A(TT + '?page=org', '🏛️', 'โครงสร้างการบริหาร') + A(TT + '?page=staff', '👤', 'ข้อมูลบุคลากร') + '<a href="#" data-pmt-open="1"><span>📝</span>ประเมินครูผู้ช่วย</a>' + A(TT + '?page=docs', '📂', 'ดาวน์โหลดเอกสาร', ' target="_top" data-sec="docs"') + '</div>' +
      '<div id="mwLinks"></div></div>';
    var old = links.querySelector('.g'), hh = links.querySelector('.h');
    if (old) old.style.display = 'none'; if (hh) hh.style.display = 'none';
    links.insertAdjacentHTML('beforeend', html);
    pushUi(); pushRefresh();
    // 🔗 ลิงก์ที่ใช้บ่อย (Admin เพิ่ม/แก้ที่ระบบตารางสอน → เมนู ลิงก์ที่ใช้บ่อย)
    fetch(TT + '?api=links').then(function (r) { return r.json(); }).then(function (j) {
      var L = j.ok ? j.data.items : [], el = document.getElementById('mwLinks'); if (!el) return;
      el.innerHTML = '<div class="h">🔗 ลิงก์ที่ใช้บ่อย <a class="adm-edit" href="' + TT + '?page=admin&to=links" target="_top">✏️ แก้ไข (Admin)</a></div><div class="g">' +
        (L.length ? L.map(function (x) { return '<a data-nwk="links" data-nwid="' + esc(x.link_id || '') + '" href="' + esc(x.url) + '" target="_blank" rel="noopener" title="' + esc(x.note || x.title) + '"><span>' + esc(x.icon || '🔗') + '</span>' + esc(x.title) + '</a>'; }).join('') : '<span class="asg-s">ยังไม่มีลิงก์</span>') + '</div>';
    }).catch(function () {});
    loadUp(); nwLoad(); dlLoad(); setTimeout(tkLoad, 300);
    setInterval(function () { var t = tkTerm(); if (t && t !== TKS.term && !tkLoad.busy) { tkLoad.busy = 1; tkLoad().then(function () { tkLoad.busy = 0; }, function () { tkLoad.busy = 0; }); } }, 1500); // ภาคเรียนเปลี่ยน → โหลดชื่อหัวข้องานให้ตรง
    document.addEventListener('change', function (ev) { if (ev.target.id === 'term') setTimeout(tkLoad, 50); });
    setInterval(function () { var ad = document.getElementById('admin'); if (ad && !ad.hidden && !document.getElementById('tkBox') && TKS.list) tkRender(); }, 1500); setupAutoRefresh(); fxInit();
    document.addEventListener('click', function (ev) { var u = ev.target.closest('[data-up]'); if (u) { ev.preventDefault(); UP.more = !UP.more; renderUp(); } });
    var mb = document.createElement('div'); mb.id = 'mwBox'; mb.style.display = 'none'; links.insertAdjacentElement('afterend', mb);
    var hb = document.createElement('div'); hb.id = 'hrBox'; hb.style.display = 'none'; mb.insertAdjacentElement('afterend', hb);
  }
  // Admin เข้าครั้งเดียว: เข้า Admin ระบบติดตามแล้ว ใช้กับมอบหมายงานได้เลย
  function adminLink() {
    var cand = '';
    document.addEventListener('click', function (ev) { if (ev.target.id === 'lgo') { var pw = document.getElementById('pw'); cand = pw ? pw.value : ''; } if (ev.target.id === 'lgx') { S.pw = ''; sput('asg_pw', ''); render(); } }, true);
    document.addEventListener('keydown', function (ev) { if (ev.target.id === 'pw' && ev.key === 'Enter') cand = ev.target.value; }, true);
    setInterval(function () { var ad = document.getElementById('admin'); if (cand && ad && !ad.hidden) { S.pw = cand; sput('asg_pw', cand); cand = ''; render(); try { renderUp(); } catch (e) {} } }, 800);
  }

  // ==================== 📢 อัปเดตใหม่วันนี้ (การ์ดหน้าแรก + ข้อความ LINE กลุ่มครู · ข้อมูลชุดเดียวกัน) ====================
  // ครูทุกคนเห็นแบบเดียวกัน (งานวิจัย) · การกดรับทราบ/เสร็จทำในแอปเท่านั้น · สอนแทนแจ้งเพื่อทราบ (ไม่มีปุ่มรับทราบ)
  var DL = { d: null, busy: false, open: {}, out: '', kind: '' };
  var DWS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  function dlDay(iso, yr) { var p = String(iso || '').split('-').map(Number); if (!p[0]) return ''; var w = new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay(); return DWS[w] + ' ' + p[2] + ' ' + MS[p[1] - 1] + (yr ? ' ' + String(p[0] + 543).slice(2) : ''); }
  function dlLoad() {
    if (DL.busy) return DL.busy;
    DL.busy = fetch(TT + '?api=daily&t=' + Date.now()).then(function (r) { return r.json(); }).then(function (j) { if (j.ok) DL.d = j.data; }).catch(function () {}).then(function () { DL.busy = false; dlRender(); dlAdmRender(); });
    return DL.busy;
  }
  function dlLink() { return location.origin + location.pathname + '?p=mytasks&src=line&openExternalBrowser=1'; }
  function dlT(n) { var f = nfn(n); return f ? 'ครู' + f : String(n || ''); }
  function dlSub(x) { return 'คาบ ' + x.p + ' ' + x.cls + (x.subj ? ' ' + x.subj : '') + ' → ' + x.who + (x.co ? ' (ประกบ)' : ''); }
  function dlTime(t) { return String(t || '').replace(/:/g, '.'); }
  /** งานมอบหมายใหม่ = มอบหมายหลังวันทำการก่อนหน้า ถึงวันนี้ (ข้อมูลจากระบบติดตาม) */
  function dlAsg() {
    var d = DL.d; if (!d || !S.loaded) return [];
    var all = pnames().length || 0;
    return S.G.filter(function (x) { return x.d > d.prev && x.d <= d.today; }).map(function (x) {
      var C = amSplit(x.m).C, who = all && x.a.length >= all - 2 ? 'ครูทุกคน' : x.a.length > 4 ? x.a.slice(0, 3).map(dlT).join(', ') + ' และอีก ' + (x.a.length - 3) + ' คน' : x.a.map(dlT).join(', ');
      return { id: x.id, n: C ? C.title : x.n, u: C ? C.date : x.u, who: who };
    });
  }
  function dlSecs() {
    var d = DL.d; if (!d) return [];
    var nx = d.next, tm = dlDay(nx), tomorrow = (Date.parse(nx + 'T00:00:00Z') - Date.parse(d.today + 'T00:00:00Z')) === 864e5;
    var nxLab = tomorrow ? 'พรุ่งนี้ (' + tm + ')' : tm, out = [], A = dlAsg();
    var CK = { add: '➕ เพิ่ม', move: '📆 เลื่อน', cancel: '❌ ยกเลิก/เลื่อน' };
    if (d.subs.length) out.push({ k: 'subs', ic: '🔁', h: 'สอนแทน' + nxLab, L: d.subs.map(dlSub), note: true });
    if (A.length) out.push({ k: 'asg', ic: '📌', h: 'งานมอบหมายใหม่', L: A.map(function (x) { return x.n + ' · ส่ง ' + th(x.u) + ' · ' + x.who; }) });
    var C = d.cal.changes.map(function (x) { return CK[x.k] + ': ' + x.title + (x.k === 'move' && x.from ? ' (' + th(x.from) + ' → ' + th(x.date) + ')' : x.date ? ' (' + th(x.date) + ')' : '') + (x.note ? ' · ' + x.note : ''); })
      .concat(d.cal.next.map(function (x) { return (tomorrow ? 'พรุ่งนี้' : tm) + ': ' + x.title + (x.time ? ' ' + dlTime(x.time) + ' น.' : '') + (x.place ? ' · ' + x.place : ''); }));
    if (C.length) out.push({ k: 'cal', ic: '📅', h: 'ปฏิทินงาน', L: C });
    if (d.news.length) out.push({ k: 'news', ic: '📣', h: 'ประกาศใหม่', L: d.news.map(function (x) { return (x.u ? '🚨 ' : '') + x.title; }) });
    if (d.awards.length) out.push({ k: 'aw', ic: '🏆', h: 'รางวัล/เกียรติบัตรใหม่', L: d.awards.map(function (x) { return x.who + ' · ' + x.title + (x.result ? ' (' + x.result + ')' : ''); }) });
    if (d.night.length) out.push({ k: 'night', ic: '🌙', h: 'เวรกลางคืนวันนี้', L: d.night.map(dlT) });
    return out;
  }
  function dlNow() { var t = new Date(Date.now() + 7 * 3600e3).toISOString(); return t.slice(11, 13) + '.' + t.slice(14, 16); }
  /** ข้อความ LINE: pm = สรุปอัปเดตวันนี้ (แนะนำ 16.30 น.) · am = อัปเดตสอนแทนวันนี้ (เฉพาะที่ใหม่/เปลี่ยน) */
  function dlText(kind) {
    var d = DL.d; if (!d) return '';
    if (kind === 'am') {
      var M = d.morning.items; if (!M.length) return '';
      return '🔁 อัปเดตสอนแทนวันนี้ · ' + dlDay(d.today, 1) + '\n' + M.map(function (x) {
        return x.k === 'new' ? '🆕 ' + dlSub(x) : x.k === 'edit' ? '✏️ ' + dlSub(x) + ' (เดิม ' + x.was + ')' : '❌ ยกเลิก คาบ ' + x.p + ' ' + x.cls + (x.subj ? ' ' + x.subj : '') + ' (เดิม ' + x.who + ')';
      }).join('\n') + '\n\n👉 ดูตารางสอนแทนล่าสุดในแอป\n' + dlLink();
    }
    var Ls = dlSecs(); if (!Ls.length) return '';
    var asg = Ls.some(function (s) { return s.k === 'asg'; });
    return '📢 อัปเดตใหม่วันนี้ · ' + dlDay(d.today, 1) + '\n' + Ls.map(function (s) {
      return '\n' + s.ic + ' ' + s.h + '\n' + s.L.map(function (t) { return '• ' + t; }).join('\n') + (s.note ? '\nข้อมูล ณ ' + dlNow() + ' น. อาจเปลี่ยนแปลงตอนเช้า ดูล่าสุดในแอป' : '');
    }).join('\n') + '\n\n👉 ' + (asg ? 'เปิดดูรายละเอียดและกดรับทราบในแอป' : 'เปิดดูรายละเอียดในแอป') + '\n' + dlLink();
  }
  // การ์ดหน้าแรก: บรรทัดละเรื่อง · แตะเพื่อดูรายการ · งานมอบหมายกดไปหน้ารับทราบ
  function dlRender() {
    var el = document.getElementById('dlCard'); if (!el) return;
    if (!DL.d) { el.innerHTML = ''; return; }
    var Ls = dlSecs();
    if (!Ls.length) { el.innerHTML = '<div class="dl-card dl-none">📢 อัปเดตใหม่วันนี้ · ยังไม่มีความเคลื่อนไหว</div>'; return; }
    var n = Ls.reduce(function (s, x) { return s + x.L.length; }, 0);
    el.innerHTML = '<div class="dl-card"><div class="dl-hd"><b>📢 อัปเดตใหม่วันนี้</b><span class="dl-n">' + n + ' เรื่อง</span></div>' +
      (sget('ch') === 'line' ? '<div class="dl-line">📲 เปิดจากลิงก์ใน LINE</div>' : '') +
      Ls.map(function (s) {
        var cnt = s.k === 'subs' ? s.L.length + ' คาบ' : s.L.length + ' รายการ';
        return '<details class="dl-row"' + (DL.open[s.k] ? ' open' : '') + ' data-dlk="' + s.k + '"><summary><span class="dl-ic">' + s.ic + '</span><span class="dl-tx"><b>' + esc(s.h) + '</b><small>' + (s.k === 'subs' ? 'แจ้งเพื่อทราบ · ' : '') + cnt + '</small></span>' +
          (s.k === 'asg' ? '<a href="#" class="dl-ack" data-asg="open">รับทราบในแอป</a>' : '<span class="dl-cv">▾</span>') + '</summary>' +
          '<ul>' + s.L.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' + (s.note ? '<div class="dl-note">ข้อมูลอาจเปลี่ยนแปลงตอนเช้า</div>' : '') + '</details>';
      }).join('') + '</div>';
  }
  document.addEventListener('toggle', function (ev) { var t = ev.target; if (t && t.getAttribute && t.getAttribute('data-dlk')) DL.open[t.getAttribute('data-dlk')] = t.open; }, true);
  // กล่องในหน้า Admin: ปุ่มสร้างข้อความ + คัดลอก
  function dlAdmRender() {
    var ad = document.getElementById('admin'); if (!ad || ad.hidden) return;
    var box = document.getElementById('dlBox');
    if (!box) { box = document.createElement('details'); box.id = 'dlBox'; box.className = 'box'; box.open = true; var t0 = ad.querySelector('.tools'); if (t0 && t0.nextSibling) ad.insertBefore(box, t0.nextSibling); else ad.insertBefore(box, ad.firstChild); }
    var msg = '';
    if (DL.kind && !DL.d) msg = '<p class="dl-msg">⏳ กำลังโหลดข้อมูลล่าสุด…</p>';
    else if (DL.kind === 'am' && !DL.out) msg = '<p class="dl-msg dl-ok">✅ วันนี้สอนแทนไม่มีการเปลี่ยนแปลงจากข้อความเมื่อวาน — <b>ไม่ต้องส่ง</b></p>';
    else if (DL.kind === 'pm' && !DL.out) msg = '<p class="dl-msg dl-ok">✅ วันนี้ยังไม่มีความเคลื่อนไหว — ไม่ต้องส่ง</p>';
    else if (DL.out) msg = '<textarea id="dlOut" readonly rows="12">' + esc(DL.out) + '</textarea><button class="dl-copy" data-dl="copy">📋 คัดลอกข้อความ</button><p class="dl-hint">วางในกลุ่ม LINE ครู · ครูกดลิงก์แล้วเปิดหน้า "งานของฉัน" ทันที</p>';
    box.innerHTML = '<summary><b>📢 ข้อความ LINE กลุ่มครู</b> <span style="color:var(--mu);font-size:13px">(อัปเดตใหม่วันนี้ · สอนแทนตอนเช้า)</span></summary>' +
      '<div class="dl-btns"><button data-dl="pm"' + (DL.kind === 'pm' ? ' class="on"' : '') + '>📝 สรุปอัปเดตวันนี้<small>แนะนำส่ง 16.30 น.</small></button><button data-dl="am"' + (DL.kind === 'am' ? ' class="on"' : '') + '>🌅 อัปเดตสอนแทนวันนี้<small>ตอนเช้า · เฉพาะ 🆕/✏️</small></button></div>' + msg;
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-dl]'); if (!b) return; ev.preventDefault();
    var a = b.getAttribute('data-dl');
    if (a === 'pm' || a === 'am') {
      DL.kind = a; DL.out = ''; DL.d = null; dlAdmRender();
      var go = function () { DL.out = dlText(a); dlAdmRender(); };
      Promise.all([dlLoad(), S.loaded ? 0 : load().catch(function () {})]).then(go);
      return;
    }
    if (a === 'copy') {
      var t = DL.out, ok = function () { toast('✅ คัดลอกแล้ว นำไปวางในกลุ่ม LINE ได้เลย'); }, fb = function () { var ta = document.getElementById('dlOut'); if (ta) { ta.removeAttribute('readonly'); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { toast('กดค้างที่ข้อความแล้วเลือก คัดลอก'); } ta.setAttribute('readonly', ''); } };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, fb); else fb();
    }
  });
  setInterval(function () { var ad = document.getElementById('admin'); if (ad && !ad.hidden && !document.getElementById('dlBox')) dlAdmRender(); }, 1500);
  /** เปิดจากลิงก์ LINE: จำช่องทางไว้ทั้งรอบการใช้งาน (บันทึกการใช้งานแยก "จาก LINE") แล้วเปิดหน้างานของฉันทันที */
  function dlEntry() {
    var q = location.search;
    if (/[?&]src=line\b/.test(q)) sput('ch', 'line');
    var my = /[?&]p=mytasks\b/.test(q);
    if (/[?&](src|p|openExternalBrowser)=/.test(q) && window.history && history.replaceState) { try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {} }
    return my;
  }

  function init() {
    S.me = get('asg_me'); S.pw = sget('asg_pw'); var dlMy = dlEntry();
    (function () { var lg = document.createElement('script'); lg.src = 'logos.js?v=1'; document.head.appendChild(lg); })();
    var css = document.createElement('style');
    css.textContent = '#asgBox,#asgBan,#asgToast{font-family:inherit}' +
      '.push-ask select{display:block;width:100%;margin:8px 0 6px;padding:8px;border-radius:10px;border:0;font:inherit;font-size:15px;color:#111}.push-ask button{display:block;width:100%;padding:9px;border:0;border-radius:10px;background:#fff;color:#5B21B6;font:inherit;font-weight:700;font-size:15px;margin-bottom:4px;cursor:pointer}' +
      '#mwBox .asg-head button.mw-pbtn{width:auto;height:auto;border-radius:99px;padding:6px 14px;margin-right:6px;background:#E0E7FF;color:#3730A3;font:inherit;font-size:14px;font-weight:700;vertical-align:middle}' +
      '.db-card{background:#fff;border-radius:12px;padding:10px 12px;margin:8px 0;box-shadow:0 1px 3px rgba(0,0,0,.08)}.db-card h4{margin:0 0 8px;font-size:15px}.db-bar{display:grid;grid-template-columns:minmax(0,9.5em) 1fr 3.4em;align-items:center;gap:8px;font-size:13.5px;margin:6px 0}.db-bar>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.db-bar b{text-align:right;font-size:13px}.db-tr{background:#EEF2F7;border-radius:6px;height:12px;overflow:hidden}.db-tr i{display:block;height:100%;border-radius:6px}' +
      '.db-who{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:14px;padding:6px 0;border-bottom:1px solid #F1F5F9}.db-who a{color:#1F2937;text-decoration:none}.db-pill{border-radius:99px;padding:1px 9px;font-size:12.5px;font-weight:700;color:#fff;white-space:nowrap}.db-stack{display:flex;height:16px;border-radius:8px;overflow:hidden;margin:4px 0 8px;background:#E2E8F0}.db-stack i{display:block;height:100%;-webkit-print-color-adjust:exact;print-color-adjust:exact}.db-tr i{-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      '.db-lg{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:13px}.db-lg span::before{content:"";display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;background:var(--c)}.db-nt{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}.db-nt>div{border-radius:10px;padding:8px;font-size:13px;line-height:1.6;overflow-wrap:anywhere}.db-nt b{display:block}.db-on{background:#ECFDF5;border:1px solid #A7F3D0}.db-off{background:#FEF2F2;border:1px solid #FECACA}.db-note{font-size:12px;color:#6B7280;margin-top:6px}' +
      '.push-btn{display:block!important;background:linear-gradient(135deg,#7C3AED,#2563EB)!important;color:#fff!important;border:0!important;border-radius:14px!important;padding:10px 14px!important;margin-bottom:10px;font-size:16px;font-weight:700;text-decoration:none!important;text-align:left}.push-btn small{display:block;font-weight:400;font-size:12.5px;opacity:.9}' +
      '#rfBtn{position:fixed;right:12px;bottom:14px;z-index:95;width:58px;height:58px;border-radius:50%;border:0;background:#1D4ED8;color:#fff;font-size:22px;line-height:1;box-shadow:0 4px 14px rgba(0,0,0,.3);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:inherit}#rfBtn small{font-size:11px;margin-top:2px}#rfBtn.spin{opacity:.6}@media print{#rfBtn{display:none!important}}' +
      '@font-face{font-family:"SKF";src:local("TH SarabunPSK"),local("THSarabunPSK"),local("TH Sarabun New"),local("THSarabunNew");size-adjust:128%}' +
      'body,button,input,select,textarea,#mwMenu,#mwBox,#asgBox{font-family:"SKF","Sarabun",sans-serif!important}' +
      '.p-head{display:none}@media print{@page{margin:0}body.mw-printing{padding:12mm!important;margin:0!important}body.mw-printing #mwBox>*{display:revert!important}body.mw-printing #mwBox .asg-tabs,body.mw-printing #mwBox .asg-head,body.mw-printing #mwBox .mw-top,body.mw-printing #mwBox select,body.mw-printing #mwBox button,body.mw-printing #mwBox .asg-btn{display:none!important}body.mw-printing .mw-ph{display:none!important}body.mw-printing .p-head{display:grid!important;grid-template-columns:70px 1fr 70px;align-items:center;gap:10px;text-align:center;border-bottom:1.5pt solid #000;padding-bottom:6px;margin-bottom:10px;color:#000}.p-head img{width:68px;height:68px;object-fit:contain}.p-head b{font-size:20pt}.p-head div{font-size:15pt}.p-head .p-ti{font-size:17pt;font-weight:700;margin-top:2px}.p-head small{font-size:12pt}body.mw-printing *{font-family:"SKF","Sarabun",sans-serif!important}}' +
      '#mwMenu a.adm-edit,#mwMenu .nb-head a.adm-edit,#mwMenu .h a.adm-edit,button.adm-edit,a.adm-edit{display:inline-block!important;background:#F59E0B!important;color:#fff!important;border:0!important;border-radius:99px!important;padding:3px 12px!important;font-size:13px!important;font-weight:700!important;text-decoration:none!important;cursor:pointer;margin-left:6px;line-height:1.5;min-height:0!important;width:auto!important}#mwMenu a.adm-edit:hover,button.adm-edit:hover{background:#D97706!important}' +
      '@media(max-width:600px){.mw-wrap{overflow-x:visible!important}.mw-t{width:100%!important;min-width:0!important;table-layout:fixed;font-size:11.5px}.mw-t th{font-size:10px!important;line-height:1.25;padding:4px 1px!important;word-break:normal;overflow-wrap:anywhere;white-space:normal!important}.mw-t td{padding:4px 1px!important}.mw-t th:first-child,.mw-t td:first-child{width:30%;text-align:left}.mw-t td:first-child,.mw-t td:first-child *{white-space:normal!important;overflow-wrap:anywhere}.mw-t td:first-child{overflow:hidden}}' +
      '.tr-need{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;justify-content:space-between;background:#EEF2FF;border:1px solid #C7D2FE;border-radius:10px;padding:8px 10px;margin-top:8px;font-size:14px;color:#3730A3}.tr-need.late{background:#FEF2F2;border-color:#FECACA;color:#991B1B}.tr-need .asg-btn{margin:0}.asg-btn.tr{background:#4F46E5;color:#fff;border-color:#4F46E5}' +
      '#trBox,#fbBox,#ctBox,#evBox{display:none;position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:120;align-items:center;justify-content:center;padding:12px}.tr-box{background:#fff;color:#111;border-radius:16px;padding:14px;width:100%;max-width:460px;max-height:92vh;overflow:auto;box-sizing:border-box}.tr-hd{display:flex;justify-content:space-between;align-items:center;font-size:18px;margin-bottom:8px}.tr-hd button{border:0;background:#E5E7EB;border-radius:50%;width:34px;height:34px;font-size:16px;cursor:pointer;flex:none}' +
      '.tr-topic{background:#EEF2FF;border-radius:12px;padding:10px 12px;font-weight:700;font-size:16.5px;color:#312E81;overflow-wrap:anywhere}.tr-topic small{display:block;font-weight:400;font-size:12.5px;color:#4338CA}.tr-imgs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:10px 0 6px}.tr-imgs figure{margin:0;position:relative;aspect-ratio:3/4;border-radius:10px;overflow:hidden;border:1px solid #E5E7EB}.tr-imgs img{width:100%;height:100%;object-fit:cover}.tr-imgs figure button{position:absolute;top:4px;right:4px;border:0;border-radius:50%;width:26px;height:26px;background:rgba(0,0,0,.6);color:#fff;cursor:pointer}' +
      '.tr-add{aspect-ratio:3/4;border:2px dashed #A5B4FC;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#4F46E5;font-size:28px;cursor:pointer;background:#F5F7FF;text-align:center}.tr-add span{font-size:13px;font-weight:700}.tr-add input{display:none}.tr-go{display:block;width:100%;padding:10px;font-size:16px;margin-top:10px}' +
      '#bdBan{display:flex;gap:10px;align-items:center;border-radius:16px;padding:8px 14px;margin:0 0 10px;color:#831843;background:linear-gradient(135deg,#FCE7F3,#FDF2F8 60%,#FEF3C7);border:2px solid #F9A8D4;box-sizing:border-box;max-width:100%}#bdBan img{width:52px;height:52px;flex:none}#bdBan div{min-width:0;overflow-wrap:anywhere}#bdBan b{display:block;font-size:18px}#bdBan span{font-size:14px}#bdBan small{display:block;font-size:13px;color:#9D174D}#bdBan.bd-soon{background:#FDF2F8;border-width:1px}#bdBan.bd-soon img{width:36px;height:36px}' +
      '.fb-link{text-align:center;margin:18px auto 80px;font-size:14px}.fb-link a{color:#4F46E5;text-decoration:none;border:1px solid #C7D2FE;border-radius:99px;padding:6px 14px;background:#fff;display:inline-block}@media print{#bdBan,.fb-link,#trBox,#fbBox{display:none!important}}' +
      '#ctBan{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;justify-content:space-between;border-radius:14px;padding:8px 12px;margin:0 0 10px;background:#ECFEFF;border:2px solid #67E8F9;color:#155E75;font-size:15px;box-sizing:border-box;max-width:100%}#ctBan span{min-width:0;overflow-wrap:anywhere}#ctBan button{border:0;border-radius:99px;padding:6px 14px;background:#0891B2;color:#fff;font:inherit;font-weight:700;cursor:pointer;flex:none}.ct-note{background:#F0FDF4;border:1px solid #BBF7D0;color:#166534;border-radius:10px;padding:8px 10px;font-size:14px;margin-bottom:4px}@media print{#ctBan,#ctBox{display:none!important}}' +
      '.am-t{white-space:pre-line;overflow-wrap:anywhere}.am-t a{color:#1D4ED8;text-decoration:underline}.am-ls{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.am-l{display:inline-block;background:#EEF2FF;color:#3730A3;border-radius:99px;padding:5px 12px;font-weight:700;font-size:13.5px;text-decoration:none}.am-is{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.am-is img{width:96px;height:96px;object-fit:cover;border-radius:10px;border:1px solid #E5E7EB;display:block}.am-sm{font-size:13px;max-width:100%}.am-old,.am-new{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0}.am-old label{display:flex;gap:4px;align-items:center}.am-old img,.am-n img{width:64px;height:64px;object-fit:cover;border-radius:8px;display:block}.am-old small{width:100%;color:#6B7280}.am-n{position:relative}.am-n button{position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;border:0;background:#B91C1C;color:#fff;font-size:12px;cursor:pointer;line-height:22px;padding:0}#asgI{max-width:100%}.mm-btn{align-self:flex-end;margin:0}.mm{display:flex;flex-direction:column;gap:10px;margin-top:10px}.mm-who{font-size:16px}.mm-t{width:100%;border-collapse:collapse;font-size:14px;table-layout:fixed}.mm-t td{border-bottom:1px solid #E5E7EB;padding:5px 4px;vertical-align:top;overflow-wrap:anywhere}.mm-d{width:70px;color:#374151}.mm-r{width:34%;text-align:right}.mm-sec h4 small{color:#6B7280;font-weight:400}.mm-sign{display:flex;justify-content:space-around;gap:16px;margin-top:26px;text-align:center;line-height:2;font-size:14px;break-inside:avoid}.mm-note{font-size:12px}@media print{.mm-sec{break-inside:avoid;box-shadow:none!important;border:1px solid #ccc}.mm-t{font-size:12pt}.mm-btn{display:none!important}}.up-done{opacity:.6}.ev-chip{display:inline-block;margin-top:3px;font-size:12.5px!important;line-height:1.6!important;font-weight:700;border-radius:99px;padding:1px 9px;max-width:100%;overflow-wrap:anywhere}.ev-ok{background:#DCFCE7;color:#166534}.ev-nil{background:#E0F2FE;color:#075985}.ev-no{background:#FEE2E2;color:#991B1B}.ev-mv{background:#FEF3C7;color:#92400E}.up-ed{flex:none;border:0;background:#EEF2FF;border-radius:50%;width:34px;height:34px;cursor:pointer;font-size:15px;margin-left:auto;align-self:center}.up-next .up-ed{margin-left:8px;vertical-align:middle;background:rgba(255,255,255,.6)}.up-next .ev-chip{display:block;width:max-content;margin-top:6px}' +
      '.ev-opts{display:flex;flex-direction:column;gap:6px;margin:10px 0}.ev-opts label{display:flex;gap:10px;align-items:center;border:1px solid #E5E7EB;border-radius:12px;padding:8px 10px;cursor:pointer}.ev-opts label:has(input:checked){border-color:#4F46E5;background:#EEF2FF}.ev-opts span{display:flex;flex-direction:column}.ev-opts small{color:#6B7280;font-size:12.5px}@media print{.up-ed,#evBox{display:none!important}}' +
'.dl-card{background:#fff;color:#1F2937;border:2px solid #93C5FD;border-radius:16px;padding:10px 12px;margin:0 0 10px;box-sizing:border-box;max-width:100%}.dl-none{border-width:1px;border-color:#E5E7EB;color:#6B7280;font-size:14px}.dl-hd{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px}.dl-hd b{font-size:17px;color:#1E3A8A}.dl-n{background:#DBEAFE;color:#1E40AF;border-radius:99px;padding:1px 10px;font-size:12.5px;font-weight:700;white-space:nowrap}.dl-line{display:inline-block;background:#DCFCE7;color:#166534;border-radius:99px;padding:1px 10px;font-size:12.5px;font-weight:700;margin:2px 0 4px}.dl-row{border-top:1px solid #F1F5F9}.dl-row:first-of-type{border-top:0}.dl-row summary{display:flex;align-items:center;gap:8px;padding:7px 0;cursor:pointer;list-style:none}.dl-row summary::-webkit-details-marker{display:none}.dl-ic{font-size:18px;flex:none}.dl-tx{flex:1;min-width:0;overflow-wrap:anywhere}.dl-tx b{display:block;font-size:15px;color:#1F2937}.dl-tx small{font-size:12.5px;color:#6B7280}.dl-cv{color:#9CA3AF;flex:none}.dl-row[open] .dl-cv{transform:rotate(180deg)}#mwMenu .dl-ack,.dl-ack{flex:none;background:#FEF3C7!important;border:1px solid #FCD34D!important;color:#92400E!important;border-radius:99px!important;padding:3px 10px!important;min-height:0!important;width:auto!important;display:inline-block!important;font-size:12.5px;font-weight:700;text-decoration:none!important;white-space:nowrap}.dl-row ul{margin:0 0 8px;padding-left:34px;font-size:14px;line-height:1.6;color:#374151}.dl-row li{overflow-wrap:anywhere}.dl-note{font-size:12px;color:#9CA3AF;padding-left:34px;margin:-4px 0 6px}#dlBox .dl-btns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:8px 0}#dlBox .dl-btns button{font:inherit;font-size:15px;font-weight:700;padding:10px 6px;border-radius:12px;border:1px solid #BFDBFE;background:#EFF6FF;color:#1E3A8A;cursor:pointer;line-height:1.35}#dlBox .dl-btns button.on{background:#2563EB;color:#fff;border-color:#2563EB}#dlBox .dl-btns small{display:block;font-weight:400;font-size:12px;opacity:.85}#dlBox textarea{width:100%;box-sizing:border-box;font:inherit;font-size:14px;line-height:1.5;padding:10px;border:1px solid #CBD5E1;border-radius:10px;background:#fff;color:#111}#dlBox .dl-copy{display:block;width:100%;margin-top:8px;padding:10px;font:inherit;font-size:16px;font-weight:700;border:0;border-radius:12px;background:#06C755;color:#fff;cursor:pointer}#dlBox .dl-msg{margin:8px 0;font-size:14.5px}#dlBox .dl-ok{background:#ECFDF5;border:1px solid #A7F3D0;color:#166534;border-radius:10px;padding:10px}#dlBox .dl-hint{font-size:12.5px;color:var(--mu);margin:6px 0 0}' +
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
      '.asg-ppl{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px}.asg-ppl a{display:flex;flex-direction:column;gap:2px;background:#fff;border-radius:12px;padding:10px 12px;text-decoration:none;color:#111;border:1px solid #e5e7eb}.asg-ppl a:hover{border-color:#2563EB;background:#EFF6FF}' +
      '.asg-nm{color:#1D4ED8;text-decoration:none}.asg-nm:hover{text-decoration:underline}' +
      '.asg-grp{grid-column:1/-1;font-weight:700;color:#0a7f45;margin-top:6px;border-bottom:1px solid #e5e7eb;padding-bottom:2px}.asg-grp a{font-weight:400;font-size:12.5px;margin-left:6px}' +
      '#asgBan{cursor:default!important}.asg-bl{margin:3px 0;line-height:2.1}.asg-chip{display:inline-block;border-radius:999px;padding:1px 10px;margin:0 4px 2px 0;font-size:14px;text-decoration:none;white-space:nowrap}.asg-chip:hover{filter:brightness(.95);text-decoration:underline}' +
      '.asg-empty{background:#fff;border-radius:12px;padding:16px;text-align:center;color:#6B7280}' +
      '#asgToast{display:none;position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#111827;color:#fff;padding:10px 16px;border-radius:10px;z-index:99;max-width:90vw}' +
      '#asgAdm{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:98;align-items:center;justify-content:center;padding:16px}.asg-adm-box{background:#fff;color:#111;border-radius:16px;padding:16px;max-width:420px;width:100%}' +
      '.asg-adm-opt{display:flex;gap:12px;align-items:center;padding:12px;border:1px solid #e5e7eb;border-radius:12px;margin-top:10px;text-decoration:none;color:#111}.asg-adm-opt:hover{background:#f1f5f9}.asg-adm-opt>span{font-size:28px}.asg-adm-opt small{display:block;color:#6b7280;font-size:13px}' +
      '#asgNb{font-style:normal;background:#DC2626;color:#fff;border-radius:10px;font-size:12px;font-weight:700;padding:0 7px;margin-left:6px}' +
      '#tosch,#adsch,#tnm,#tba{display:none!important}' +
      '#mwMenu .h{font-weight:700;color:#0a7f45;margin:12px 0 6px;font-size:15px}#mwMenu .g{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px}' +
      '.tk-row{display:flex;gap:6px;align-items:center;margin:4px 0;flex-wrap:wrap}.tk-no{width:22px;text-align:right;color:var(--mu,#6B7280)}.tk-n{flex:1 1 220px;min-width:160px}.tk-a{flex:0 1 230px}.tk-row button{padding:5px 10px}' +
      '.nw-wrap{background:#FFFBEB;border:2px solid #F59E0B;border-radius:14px;padding:8px 12px;margin-bottom:10px;color:#111}.nw-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:2px}.nw-head b{font-size:17px;color:#92400E}.nw-head a{font-size:13px;color:#92400E!important;border:0!important;padding:0!important;background:none!important}' +
      '.nw-n{display:inline-block;background:#DC2626;color:#fff;border-radius:99px;padding:0 8px;font-size:13px;margin-left:4px;animation:upPulse 2s infinite}' +
      '.nw-row{display:flex!important;gap:8px;align-items:center;padding:5px 2px!important;border:0!important;border-top:1px solid #FDE68A!important;border-radius:0!important;background:none!important;color:#111!important;text-decoration:none!important;font-weight:400!important;font-size:14.5px}.nw-row:hover{background:#FEF3C7!important}' +
      '.nw-lab{flex:none;font-size:12px;background:#fff;border:1px solid #FCD34D;border-radius:99px;padding:0 8px;color:#92400E}' +
      '.nw-dot{font-style:normal;background:#DC2626;color:#fff;border-radius:10px;font-size:12px;font-weight:700;padding:0 7px;margin-left:auto;box-shadow:0 0 0 2px #fff}' +
      '.nb-wrap{background:#fff;border-radius:16px;padding:10px 14px;margin-bottom:12px;border:3px solid #2563EB;box-shadow:0 4px 14px rgba(37,99,235,.2);color:#111}.nb-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:4px}.nb-head b{font-size:20px;color:#1D4ED8}.nb-head a{font-size:13px;color:#1D4ED8!important;border:0!important;padding:0!important;background:none!important;display:inline!important;box-shadow:none!important;min-height:0!important}' +
      '.nb-it{border-top:1px solid #e5e7eb;padding:7px 2px}.nb-it summary{cursor:pointer;font-size:16px;list-style:none;display:flex;gap:8px;align-items:center}.nb-it summary::-webkit-details-marker{display:none}' +
      '.nb-new{background:#2563EB;color:#fff;border-radius:99px;padding:0 9px;font-size:12px;flex:none}.nb-tag{background:#DC2626;color:#fff;border-radius:99px;padding:0 9px;font-size:12px;flex:none;animation:upPulse 1.6s infinite}.nb-u{background:#FEF2F2;border-radius:10px;padding:8px}.nb-u summary b{color:#B91C1C}' +
      '.nb-imgs{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0 2px 4px}.nb-imgs figure{margin:0;flex:1 1 200px;max-width:420px;text-align:center}.nb-imgs img{width:100%;max-height:380px;object-fit:contain;border-radius:10px;border:1px solid #E5E7EB;background:#fff}.nb-dl,.nb-files a{color:#1D4ED8!important;font-size:14px;border:0!important;padding:0!important;background:none!important;display:inline!important}.nb-hint{display:block;font-size:12px;color:#6B7280}.nb-files{margin:6px 0 2px 4px;font-size:14.5px;display:flex;flex-direction:column;gap:3px}' +
      '.nb-b{white-space:pre-line;margin:6px 0 2px 4px;font-size:15px}.nb-l{display:inline-block;margin:4px 0 0 4px;color:#1D4ED8!important;font-size:14px;border:0!important;padding:0!important;background:none!important}.nb-m{font-size:12px;color:#6B7280;margin:4px 0 0 4px}' +
      '.nb-empty{display:flex;justify-content:space-between;background:rgba(255,255,255,.08);color:#9CA3AF;border-radius:12px;padding:6px 12px;margin-bottom:10px;font-size:13.5px}.nb-empty a{color:#93C5FD!important;border:0!important;padding:0!important;background:none!important;font-weight:400!important}' +
      '.up-wrap{background:linear-gradient(135deg,#F97316,#E11D48 60%,#BE185D);border-radius:18px;padding:14px;color:#fff;margin-bottom:12px;box-shadow:0 6px 18px rgba(225,29,72,.25)}.up-none{background:linear-gradient(135deg,#059669,#10B981);font-size:16px;font-weight:600}' +
      '.up-head{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}.up-head b{font-size:21px}.up-head small{display:block;opacity:.9;font-size:13px}.up-legend span{display:inline-block;font-size:11.5px;border-radius:99px;padding:1px 8px;margin-left:4px;border:1px solid rgba(255,255,255,.6)}' +
      '.up-body{display:grid;grid-template-columns:minmax(240px,1fr) minmax(0,1.6fr);gap:10px}.up-body>*{min-width:0}.up-next{display:flex!important;flex-direction:column;align-items:flex-start!important;text-align:left;min-width:0;gap:4px;border-radius:14px;padding:14px!important;color:#fff!important;text-decoration:none!important;border:0!important;background:rgba(255,255,255,.15)!important;cursor:pointer;animation:upPulse 2.4s infinite}' +
      '.up-next.u0{background:rgba(127,29,29,.45)!important}.up-cd{font-size:30px;font-weight:800;line-height:1.1}.up-nt{font-size:18px;font-weight:700}.up-nm{font-size:13.5px;opacity:.95}.up-tag{align-self:flex-start;border-radius:99px;padding:2px 10px;font-size:12px;margin-top:4px}' +
      '@keyframes upPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.35)}50%{box-shadow:0 0 0 6px rgba(255,255,255,0)}}' +
      '.up-list{background:#fff;border-radius:14px;padding:6px 8px;color:#111}.up-it{display:flex!important;gap:10px;align-items:center;padding:6px 4px!important;border:0!important;border-bottom:1px solid #f1f5f9!important;border-radius:0!important;text-decoration:none!important;color:#111!important;background:none!important;font-weight:400!important}.up-it:hover{background:#FFF7ED!important}' +
      '.up-date{flex:0 0 48px;text-align:center;border-radius:10px;padding:3px 0;font-size:11.5px;line-height:1.1;color:#fff}.up-date b{display:block;font-size:19px}.up-date.u0{background:#B91C1C}.up-date.u1{background:#EA580C}.up-date.u2{background:#D97706}.up-date.u3{background:#64748B}' +
      '.up-tx{display:flex;flex-direction:column;min-width:0}.up-tx b{font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.up-tx small{color:#6B7280;font-size:12.5px}.up-tx i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}' +
      '.up-more{display:block!important;text-align:center;padding:6px!important;border:0!important;background:none!important;color:#BE185D!important;font-size:13.5px}' +
      '@media(max-width:700px){.up-body{grid-template-columns:minmax(0,1fr)}.up-cd{font-size:26px}}' +
      '.mw-big{display:grid;grid-template-columns:1fr 1fr;gap:10px}.mw-big a{text-decoration:none!important;display:flex!important;gap:12px;align-items:center;padding:14px 16px!important;border-radius:14px!important;color:#fff!important;border:0!important;font-size:19px;font-weight:700}' +
      '.mw-big a>span{font-size:32px}.mw-big small{display:block;font-weight:400;font-size:13px;opacity:.92}.mw-b1{background:linear-gradient(135deg,#2563EB,#1D4ED8)!important}.mw-b2{background:linear-gradient(135deg,#7C3AED,#6D28D9)!important}.mw-b3{grid-column:1/-1;background:linear-gradient(135deg,#4C1D95,#BE185D)!important}' +
      '#mwBox{max-width:1200px;margin:12px auto;padding:14px;background:#F4F7FC;color:#1F2937;border-radius:16px;box-shadow:0 2px 10px rgba(0,0,0,.08);font-family:inherit}#mwBox .asg-head button{border:0;background:#e5e7eb;border-radius:50%;width:34px;height:34px;cursor:pointer}' +
      '.mw-top{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}.mw-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
      '.mw-sec{background:#fff;border-radius:12px;padding:10px 14px;border-left:5px solid #2563EB;box-shadow:0 1px 3px rgba(0,0,0,.06)}.mw-sec h4{margin:2px 0 6px;font-size:15.5px}' +
      '.mw-it{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:14.5px}.mw-it:last-child{border:0}.mw-it small{color:#6B7280}.mw-r{text-align:right;flex:none;max-width:60%}' +
      '.mw-ok{color:#047857;font-weight:700}.mw-no{color:#B91C1C;font-weight:700}.mw-go{display:inline-block;background:#047857;color:#fff!important;border-radius:8px;padding:3px 10px;font-size:13px;text-decoration:none;margin-left:4px}.mw-go.gh{background:#fff;color:#1D4ED8!important;border:1px solid #BFDBFE}' +
      '.mw-wrap{overflow-x:auto;background:#fff;border-radius:12px;margin:8px 0}.mw-t{border-collapse:collapse;width:100%;font-size:14px}.mw-t th{background:#0a7f45;color:#fff;padding:7px 5px;font-weight:600}.mw-t td{border-bottom:1px solid #eef2f7;padding:7px 5px;text-align:center}.mw-n{text-align:left!important;white-space:nowrap}.mw-n a{color:#1D4ED8;text-decoration:none}.mw-ph{display:none}' +
      '@media print{body.mw-printing>*{display:none!important}body.mw-printing .sks-links{display:none!important}body.mw-printing #mwBox{display:block!important;box-shadow:none;background:#fff}body.mw-printing .mw-ph{display:block;font-weight:700;margin-bottom:6px}}' +
      '@media(max-width:700px){.mw-grid,.mw-big{grid-template-columns:1fr}}' +
      '.asg-act{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,.08);font-size:14px}.asg-act:last-of-type{border:0}.asg-ad{flex:0 0 74px;font-weight:700;color:#0891B2;font-size:13px}.asg-act small{color:#6B7280}' +
      '.asg-tv .asg-act small{color:var(--mu,#6B7280)}.asg-tv .asg-s{color:var(--mu,#6B7280)}' +
      '@media(max-width:560px){.asg-stats{grid-template-columns:1fr 1fr}.asg-pp>div{grid-template-columns:1fr auto}.asg-pp>div>span:nth-child(2){grid-row:2}}' +
      /* v38: กันล้นจอมือถือ (iPhone ขยายทั้งหน้าเมื่อมีชิ้นใดกว้างเกินจอ) + โหมดมืด: ตัวอักษรปุ่มขาวบนพื้นขาว */
      'html,body{max-width:100%;overflow-x:clip}#asgBox{box-sizing:border-box;overflow-wrap:anywhere;min-width:0}#asgBox .asg-card,#asgBox .asg-pp>div>*,#asgBox .asg-tools>*,#asgBox .asg-row>*{min-width:0}#asgBox img,#asgBox input,#asgBox textarea,#asgBox select{max-width:100%;box-sizing:border-box}#asgBox .asg-tools .asg-btn{white-space:normal}' +
      '.asg-btn{color:#1F2937}.asg-btn.ok,.asg-btn.del,.asg-btn.tr{color:#fff}.asg-head button{color:#374151}#asgBox input,#asgBox textarea,#asgBox select{color:#111827;background:#fff}';
    document.head.appendChild(css);
    var links = document.querySelector('.sks-links'), anchor = document.getElementById('asgBox');
    mwMenu(links); adminLink();
    var btn = document.createElement('a'); btn.href = '#'; btn.setAttribute('data-asg', 'open'); btn.innerHTML = '<span>📌</span>มอบหมายงาน<em id="asgNb" style="display:none"></em>';
    var grid = document.getElementById('mwMenu') ? null : (links ? (document.getElementById('sksTrack') || links.querySelector('a')) : null);
    if (grid && grid.parentNode) grid.parentNode.appendChild(btn);
    // ปุ่มเมนูเพิ่มเติม (เพิ่มอัตโนมัติ ไม่ต้องแก้ index.html) + ปุ่ม Admin รวม
    if (grid && grid.parentNode) {
      var dl = grid.parentNode.querySelector('a[href*="page=daily"]');
      if (!grid.parentNode.querySelector('a[href*="page=subtoday"]')) {
        var st = document.createElement('a'); st.href = TT + '?page=subtoday'; st.target = '_top'; st.innerHTML = '<span>📢</span>จัดสอนแทนวันนี้';
        if (dl && dl.nextSibling) grid.parentNode.insertBefore(st, dl.nextSibling); else grid.parentNode.appendChild(st);
      }
      [['acts', '📅', 'ปฏิทินงานโรงเรียน'], ['org', '🏛️', 'โครงสร้างการบริหาร'], ['docs', '📂', 'ดาวน์โหลดเอกสาร']].forEach(function (x) {
        if (grid.parentNode.querySelector('a[href*="page=' + x[0] + '"]')) return;
        var a2 = document.createElement('a'); a2.href = TT + '?page=' + x[0]; a2.target = '_top'; a2.innerHTML = '<span>' + x[1] + '</span>' + x[2]; grid.parentNode.appendChild(a2);
      });
    }
    var am = document.createElement('div'); am.id = 'asgAdm'; am.style.display = 'none';
    am.innerHTML = '<div class="asg-adm-box"><div class="asg-head"><b>⚙️ เข้าสู่ระบบ Admin</b><button data-asg="admclose">✕</button></div>' +
      '<a class="asg-adm-opt" href="' + TT + '?page=admin" target="_top"><span>📅</span><div><b>Admin ระบบตารางสอน</b><small>ตารางสอน สอนแทน รางวัล เอกสาร กิจกรรม เว็บไซต์โรงเรียน</small></div></a>' +
      '<a class="asg-adm-opt" href="#" data-asg="admtrack"><span>📋</span><div><b>Admin ระบบติดตามงาน</b><small>สถานะการส่งงาน ตารางงาน โครงการ มอบหมายงาน</small></div></a></div>';
    document.body.appendChild(am);
    var ban = document.createElement('div'); ban.id = 'asgBan'; ban.style.display = 'none';
    if (!anchor) { anchor = document.createElement('div'); anchor.id = 'asgBox'; (links || document.body).insertAdjacentElement(links ? 'afterend' : 'afterbegin', anchor); }
    anchor.parentNode.insertBefore(ban, anchor);
    var t = document.createElement('div'); t.id = 'asgToast'; document.body.appendChild(t);
    document.addEventListener('click', click); document.addEventListener('change', change);
    bdLoad(); logU('เปิดแอป'); ctLoad(); evLoad();
    (function () { var f = document.createElement('div'); f.className = 'fb-link'; f.innerHTML = '<a href="#" data-fb="open">💬 แจ้งปัญหา / เสนอแนะการใช้งานแอป</a>'; document.body.appendChild(f); })();
    document.addEventListener('click', mwClick); document.addEventListener('change', mwChange);
    if (/[?&]my\b/.test(location.search) || dlMy) setTimeout(function () { mwOpen('me'); }, 300);
    if (/[?&#]asg\b/.test(location.href)) S.open = true;
    var mq = location.search.match(/[?&]asg=([^&#]+)/);
    if (mq) { try { var who = decodeURIComponent(mq[1].replace(/\+/g, ' ')); S.me = who; put('asg_me', who); S.tab = 'me'; } catch (e) {} }
    // ปุ่ม "📌 มอบหมายงาน (เพิ่ม/แก้ไข)" ข้างปุ่มของ Admin ระบบติดตาม
    setInterval(function () {
      if (document.getElementById('asgAdmBtn')) return;
      var lo = [].filter.call(document.querySelectorAll('button,a'), function (x) { return /ออกจากระบบ\s*admin/i.test(x.textContent) && x.offsetParent; })[0];
      if (!lo) return;
      var b2 = document.createElement('button'); b2.id = 'asgAdmBtn'; b2.type = 'button'; b2.className = lo.className; b2.setAttribute('data-asg', 'openadm'); b2.textContent = '📌 มอบหมายงาน (เพิ่ม/แก้ไข)';
      lo.parentNode.appendChild(b2);
    }, 1500);
    var tvEl = document.getElementById('teacher');
    if (tvEl && window.MutationObserver) new MutationObserver(function () { teacherView(false); }).observe(tvEl, { childList: true });
    render(); load().catch(function () {}); loadActs();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
