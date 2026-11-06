package com.example.robotcontroller

import okhttp3.*
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class ControllerWebSocket {
    private val client = OkHttpClient.Builder()
        .pingInterval(15, TimeUnit.SECONDS)
        .build()
    private var socket: WebSocket? = null

    fun connect(serverIp: String, onState: (String) -> Unit = {}) {
        val request = Request.Builder()
            .url("ws://$serverIp:8080")
            .build()
        socket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                onState("Conectado")
            }
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                onState("Error: ${t.message}")
            }
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                onState("Desconectado")
            }
        })
    }

    // x/y deben estar normalizados entre -1 y 1.
    fun sendInput(x: Float, y: Float, shoot: Boolean, shield: Boolean, boost: Boolean) {
        val movement = JSONObject().put("x", x.coerceIn(-1f, 1f))
            .put("y", y.coerceIn(-1f, 1f))
        val packet = JSONObject()
            .put("type", "input")
            .put("movement", movement)
            .put("shoot", shoot)
            .put("shield", shield)
            .put("boost", boost)
        socket?.send(packet.toString())
    }

    fun disconnect() {
        socket?.close(1000, "Control terminado")
        socket = null
        client.dispatcher.executorService.shutdown()
    }
}
