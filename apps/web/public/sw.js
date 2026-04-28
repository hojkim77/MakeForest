self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? '🌱 30분 집중 완료!', {
      body: data.body ?? '고생하셨어요! 이제 나무에 물을 주세요.',
      icon: '/icon-192.png',
      tag: 'water-reminder',
      renotify: true,
      data: { url: data.url ?? '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow(event.notification.data?.url ?? '/');
    })
  );
});
