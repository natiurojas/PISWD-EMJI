# Ejemplo Android Studio

Agregá OkHttp en `build.gradle` del módulo:
```gradle
implementation("com.squareup.okhttp3:okhttp:4.12.0")
```

En `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
```
Para desarrollo local con `ws://`, dentro de la etiqueta `<application>` agregá
`android:usesCleartextTraffic="true"` (en producción conviene configurar WSS).

Instanciá `ControllerWebSocket`, conectá con la IP LAN de la computadora que corre
el servidor Node (`connect("192.168.1.20")`) y llamá `sendInput(...)` cuando cambie
el joystick o el estado de los botones. En `onDestroy()` llamá `disconnect()`.

El servidor y el juego deben estar en la misma computadora; el celular y la PC
deben estar en la misma red Wi-Fi. Abrí el puerto TCP 8080 en el firewall.
