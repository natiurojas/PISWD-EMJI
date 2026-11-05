# RATCON · Chat de consultas con IA

Chat flotante dentro del juego web. Responde las preguntas de los jugadores
(reglas, RAssembly, taller, niveles, controles, mando del celular, problemas
de conexión) usando un modelo de IA.

La clave de API **nunca** llega al navegador: el juego llama a `server.js`, y
el servidor es el único que habla con el proveedor de IA.

```
Navegador (index.html + HelpChat.js)
        │  POST /chat  (sin claves)
        ▼
server.js  ──►  OpenAI / Gemini / Groq / OpenRouter / Ollama / compatible
```

## Puesta en marcha rápida

1. Copiá el archivo de ejemplo:

   ```powershell
   Copy-Item chat.config.example.json chat.config.json
   ```

2. Editá `chat.config.json` con tu proveedor y tu clave:

   ```json
   {
     "provider": "openai",
     "apiKey": "sk-TU-CLAVE-AQUI",
     "model": "gpt-4o-mini"
   }
   ```

3. Reiniciá el servidor:

   ```powershell
   node server.js
   ```

   Al arrancar debe aparecer una línea como:

   ```
   Chat IA        :  openai / gpt-4o-mini
   ```

4. Abrí el juego desde el servidor (`http://localhost:3000/index.html`),
   entrá al menú principal y tocá el botón **CONSULTAS** de la esquina
   inferior derecha.

> `chat.config.json` está excluido del contenido estático y del precargado
> del servidor: el navegador no puede descargarlo. No lo subas a Git.

## Proveedores

### OpenAI

```json
{
  "provider": "openai",
  "apiKey": "sk-...",
  "model": "gpt-4o-mini"
}
```

### Google Gemini

```json
{
  "provider": "gemini",
  "apiKey": "TU_CLAVE_DE_GOOGLE_AI_STUDIO",
  "model": "gemini-2.0-flash"
}
```

### Groq (compatible con OpenAI)

```json
{
  "provider": "groq",
  "apiKey": "gsk_...",
  "model": "llama-3.3-70b-versatile"
}
```

### OpenRouter

```json
{
  "provider": "openrouter",
  "apiKey": "sk-or-...",
  "model": "openai/gpt-4o-mini"
}
```

### DeepSeek

```json
{
  "provider": "deepseek",
  "apiKey": "sk-...",
  "model": "deepseek-chat"
}
```

### Ollama (local, sin clave)

Requiere tener Ollama corriendo y el modelo descargado
(`ollama pull llama3.2`).

```json
{
  "provider": "ollama",
  "model": "llama3.2"
}
```

### Cualquier API compatible con OpenAI

```json
{
  "provider": "compatible",
  "apiKey": "TU_CLAVE",
  "baseUrl": "https://mi-proveedor.com/v1",
  "model": "mi-modelo"
}
```

## Opciones

| Campo | Por defecto | Descripción |
| --- | --- | --- |
| `provider` | `openai` | `openai`, `gemini`, `groq`, `openrouter`, `deepseek`, `mistral`, `ollama` o `compatible`. |
| `apiKey` | vacío | Clave del proveedor. En Ollama puede quedar vacía. |
| `baseUrl` | según proveedor | URL base de la API. |
| `model` | según proveedor | Modelo a usar. |
| `temperature` | `0.4` | Creatividad (0 a 2). |
| `maxTokens` | `500` | Largo máximo de la respuesta. |
| `timeoutMs` | `30000` | Tiempo máximo de espera al proveedor. |
| `rateLimit.requests` | `15` | Consultas permitidas por IP. |
| `rateLimit.windowMs` | `60000` | Ventana del límite, en milisegundos. |
| `systemPrompt` | incluido | Reemplaza el prompt del asistente (opcional). |

El archivo se recarga solo cuando cambia; no hace falta reiniciar el servidor
para probar otra clave o modelo. Si el archivo tiene un error de JSON, el
servidor lo informa en la consola y el chat queda sin configurar.

## Variables de entorno

También se puede configurar sin archivo:

```powershell
$env:CHAT_PROVIDER="openai"
$env:CHAT_API_KEY="sk-..."
$env:CHAT_MODEL="gpt-4o-mini"
node server.js
```

Variables disponibles: `CHAT_PROVIDER`, `CHAT_API_KEY`, `CHAT_BASE_URL`,
`CHAT_MODEL`, `CHAT_SYSTEM_PROMPT` y las claves específicas
`OPENAI_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GROQ_API_KEY`,
`OPENROUTER_API_KEY`, `DEEPSEEK_API_KEY`, `MISTRAL_API_KEY`.

Las variables de entorno tienen prioridad sobre `chat.config.json`.

## Cómo se comporta el chat

- **Dónde aparece:** menú principal, campaña, puntuaciones, taller, salas y
  opciones. Se oculta en login, combate, carga y editor RAssembly para no
  interferir con el teclado ni con los controles del juego.
- **Contexto:** envía la pantalla actual, el nombre y las estadísticas del
  jugador, la configuración del robot y el progreso de campaña. El servidor
  lo agrega al prompt como datos, nunca como instrucciones.
- **Historial:** se guarda en `sessionStorage` y se envía al modelo (máximo 8
  mensajes) para mantener el hilo de la conversación.
- **Privacidad:** las preguntas se envían al proveedor de IA que elijas. No se
  envían claves ni datos del sistema.
- **Límites:** 15 consultas por minuto por IP y un máximo de 4 consultas
  simultáneas, configurable en `rateLimit`.

## Endpoints

| Método | Ruta | Uso |
| --- | --- | --- |
| `POST` | `/chat` | Pregunta + historial + contexto. Devuelve `{ reply }`. |
| `GET` | `/chat/status` | Indica si hay proveedor configurado, sin exponer la clave. |

Ejemplo de consulta directa:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/chat `
  -ContentType "application/json" `
  -Body '{"message":"¿Cómo se activa el escudo?"}'
```

## Problemas comunes

- **El chat dice “SIN CONFIGURAR”:** falta `chat.config.json`, la clave está
  vacía o el JSON es inválido. Mirá la consola de `node server.js`.
- **“SIN SERVIDOR”:** el juego se abrió como archivo local o el servidor no
  está corriendo. Abrí `http://localhost:3000/index.html`.
- **Error 401/403:** la clave no es válida o no tiene permisos.
- **Error 404:** el modelo configurado no existe para ese proveedor.
- **Error 429:** el proveedor está limitando las consultas; esperá un momento.
- **Ollama no responde:** verificá `ollama serve` y que el modelo esté
  descargado.
- **El chat no aparece:** solo se muestra en las pantallas de menú. Volvé al
  menú principal.

## Archivos

- `server.js`: proxy `/chat`, carga de configuración, rate limit y prompt.
- `Game/HelpChat.js`: botón flotante, ventana, historial y contexto.
- `help-chat.css`: estilos del chat.
- `chat.config.example.json`: plantilla de configuración.
- `chat.config.json`: configuración real (no se sirve ni se versiona).
