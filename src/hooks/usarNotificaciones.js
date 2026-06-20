// src/hooks/usarNotificaciones.js
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { app, auth, db } from '../firebase/config'

const VAPID_KEY = 'BEXGzX7dJkas9eFT9vSa9XbDWRPcJ1xsCcd4UQv8uzC6BiS2BtvGytxx9wSx--WRw--W9cAi5EAy8qS_BxG0VUw'

export async function pedirPermisoNotificaciones() {
  try {
    if (!('Notification' in window)) {
      console.log('Este navegador no soporta notificaciones')
      return null
    }

    const permiso = await Notification.requestPermission()
    if (permiso !== 'granted') {
      console.log('Permiso de notificaciones denegado')
      return null
    }

    const messaging = getMessaging(app)
    const token = await getToken(messaging, { vapidKey: VAPID_KEY })

    if (token) {
      console.log('FCM Token obtenido ✅', token)
      const user = auth.currentUser
      if (user) {
        const snapEnf = await getDoc(doc(db, 'enfermeros', user.uid))
        if (snapEnf.exists()) {
          await setDoc(doc(db, 'enfermeros', user.uid), { fcmToken: token }, { merge: true })
          console.log('Token guardado en enfermeros ✅')
        } else {
          await setDoc(doc(db, 'pacientes', user.uid), { fcmToken: token }, { merge: true })
          console.log('Token guardado en pacientes ✅')
        }
      }
      return token
    } else {
      console.log('No se pudo obtener el token (sin error, pero vacío)')
    }
  } catch (error) {
    console.error('Error obteniendo token FCM:', error)
  }
  return null
}

export function escucharNotificacionesApp() {
  try {
    const messaging = getMessaging(app)
    onMessage(messaging, async (payload) => {
      console.log('Notificación recibida (app abierta):', payload)
      const { title, body } = payload.notification || {}
      if (!title) return
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(title, {
        body: body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [500, 200, 500],
        requireInteraction: true,
        data: payload.data || {}
      })
    })
  } catch (error) {
    console.error('Error escuchando notificaciones:', error)
  }
}
