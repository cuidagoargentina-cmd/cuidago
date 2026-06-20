// SERVICE WORKER — Recibe notificaciones aunque la app esté cerrada
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCLq0tqrQIk2gyTzwvTm5PjagUnsInf67M",
  authDomain: "cuida-go.firebaseapp.com",
  projectId: "cuida-go",
  storageBucket: "cuida-go.firebasestorage.app",
  messagingSenderId: "375139093568",
  appId: "1:375139093568:web:d78abb7e1ba9f0a74123a5"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Notificación en background:', payload);
  const { title, body, icon } = payload.notification || {};
  const link = payload.data?.link || '/';

  self.registration.showNotification(title || '¡Nueva Solicitud!', {
    body:    body || 'Tenés una nueva notificación en Cuida Go',
    icon:    icon || '/icon-192.png',
    badge:   '/icon-192.png',
    vibrate: [500, 200, 500],
    requireInteraction: true,
    data:    { link, ...payload.data }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('cuida-go.web.app') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('https://cuida-go.web.app' + link);
      }
    })
  );
});