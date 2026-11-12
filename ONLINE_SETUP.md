# EMJI: cuentas, ranking y salas online

## Arranque local

Necesitás Node.js 22.5 o superior.

Terminal 1: servidor web del juego (desde la carpeta `EMJI`):

```bash
node server.js
```

Terminal 2: backend SQLite + relay:

```bash
cd backend
npm install
# Linux/macOS: generá un secreto persistente para los tokens
export GAME_TOKEN_SECRET="$(openssl rand -hex 32)"
npm start
```

Abrí `http://localhost:3000`. El backend escucha en `http://localhost:3100`.
En Windows PowerShell podés definir el secreto con:

```powershell
$env:GAME_TOKEN_SECRET = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
npm start
```

Si el juego está alojado en otro dominio/puerto, definí `window.EMJI_BACKEND_URL` antes de `Game/BackendClient.js` en `index.html` y ajustá `GAME_CORS_ORIGIN`.

## Qué persiste el backend

- Usuarios y contraseñas derivadas con `scrypt` (nunca se guarda la contraseña en texto plano).
- Nombre del robot, loadout de componentes y código RAssembly.
- Puntajes y ranking global.
- Salas, host y miembros.

La base SQLite se crea en `backend/emji.sqlite`. La carpeta `backend` se excluye del servidor estático del juego para no publicar la base de datos ni el código del servidor.

## Host Relay

El creador de una sala queda como `host`. Los clientes envían mensajes `input`, `ready` o `program:submit` al host; el host puede retransmitir `state`, `fight:start` y fases de combate. El backend autentica las conexiones y retransmite mensajes, pero no ejecuta la física del combate.

**Estado de integración:** el login/registro, guardado de perfil, puntajes, listado/creación/unión a salas y transporte WebSocket están conectados. El lobby permite volver al editor de bloques antes de iniciar. El motor `FightScene` todavía no implementa el enfrentamiento PvP autoritativo ni el consumo/renderizado de snapshots remotos; por ahora `fight:start` se comunica por el relay y se muestra en el lobby. No se debe presentar esta versión como PvP terminado.
