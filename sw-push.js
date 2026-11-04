/* sw-push.js — รับการแจ้งเตือน (Push) ของระบบงานโรงเรียนวัดแสนเกษม + ตัวเลขบนไอคอนแอป */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

function getN() {
  return caches.open('push-badge').then(function (c) { return c.match('n'); })
    .then(function (r) { return r ? r.text() : '0'; }).then(function (t) { return Number(t) || 0; }).catch(function () { return 0; });
}
function setN(n) {
  return caches.open('push-badge').then(function (c) { return c.put('n', new Response(String(n))); }).catch(function () {});
}

self.addEventListener('push', function (e) {
  var p = {}; try { p = e.data ? e.data.json() : {}; } catch (x) { p = {}; }
  var d = p.data || p.notification || p;
  var add = d.n === '0' ? 0 : (Number(d.n) || 1);
  e.waitUntil(getN().then(function (n) {
    var total = n + add;
    return setN(total).then(function () {
      try { if (self.navigator && self.navigator.setAppBadge && total) self.navigator.setAppBadge(total); } catch (x) {}
      return self.registration.showNotification(d.title || 'ระบบงานโรงเรียน', {
        body: d.body || 'มีรายการใหม่', icon: 'icon-192_1.png', badge: 'icon-192_1.png', tag: 'sks-' + Date.now(), data: { url: d.url || './' }
      });
    });
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (ws) {
    for (var i = 0; i < ws.length; i++) { if ('focus' in ws[i]) return ws[i].focus(); }
    return self.clients.openWindow(url);
  }));
});
