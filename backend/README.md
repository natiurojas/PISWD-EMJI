# EMJI Game Backend

Backend inicial de cuentas, perfil del robot, puntajes, salas y Host Relay.

## Requisitos

- Node.js 22.5 o superior (`node:sqlite`).
- npm.

## Inicio

```bash
cd backend
npm install
# En producción, usar un secreto aleatorio de al menos 32 caracteres.
# Linux/macOS:
export GAME_TOKEN_SECRET="$(openssl rand -hex 32)"
npm start
```

El backend escucha en `http://localhost:3100` y guarda la base en `backend/emji.sqlite`.

## API

- `POST /api/register` `{ username, password }`
- `POST /api/login` `{ username, password }`
- `GET /api/me` (Bearer token)
- `PUT /api/profile` `{ robotName, loadout, programCode }`
- `POST /api/scores` `{ score }`
- `GET /api/ranking` (Bearer token)
- `GET /api/rooms`
- `POST /api/rooms` `{ name, maxPlayers }`
- `POST /api/rooms/:id/join`
- `POST /api/rooms/:id/leave`

WebSocket: `ws://localhost:3100/ws?token=...&room=...`

El host puede enviar `state`, `fight:start`, `fight:phase`, `program:ready` y `chat`.
Los clientes pueden enviar `input`, `program:submit`, `ready` y `chat`.
El servidor autentica y retransmite; el host conserva la autoridad de la simulación.

## Seguridad y límites

- Contraseñas derivadas con `scrypt` y salt aleatorio.
- Tokens HMAC con expiración.
- Consultas SQLite parametrizadas y claves foráneas.
- Configurá `GAME_TOKEN_SECRET` y `GAME_CORS_ORIGIN` antes de exponerlo.
- Este backend es una base de integración: el host relay requiere que el cliente del juego conecte el WebSocket y aplique el estado recibido. No reemplaza validación anti-trampas del host.
