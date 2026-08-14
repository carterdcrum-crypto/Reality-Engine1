package com.realityengine.dialer.network

import android.util.Log
import com.google.gson.Gson
import com.google.gson.JsonObject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString.Companion.toByteString
import java.util.ArrayDeque
import java.util.concurrent.TimeUnit

/**
 * Real-time WebSocket connection to Deepgram Linear16 STT with diarization.
 * Maintains an in-memory ArrayDeque holding strictly the last 45 seconds of speech.
 */
class DeepgramLiveSocket(
    private val scope: CoroutineScope,
    private val onTranscriptUpdated: (slidingWindowText: String) -> Unit
) {
    companion object {
        private const val TAG = "DeepgramLiveSocket"
        // INJECTED DEEPGRAM API KEY
        const val DEEPGRAM_API_KEY = "ba982685-b1ee-4f99-bf52-39253cc5edd8"
        private const val WSS_URL = "wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&diarize=true&punctuate=true&interim_results=true"
        private const val SLIDING_WINDOW_MS = 45_000L // 45 seconds
    }

    data class TimestampedSegment(
        val timestamp: Long,
        val speaker: Int,
        val text: String
    )

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .pingInterval(10, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()
    private var webSocket: WebSocket? = null
    private var isConnected = false
    private var reconnectJob: Job? = null

    // 45-Second Sliding Window Transcript Deque
    private val transcriptDeque = ArrayDeque<TimestampedSegment>()

    private val _slidingWindowTranscript = MutableStateFlow("")
    val slidingWindowTranscript: StateFlow<String> = _slidingWindowTranscript.asStateFlow()

    // Full transcript accumulator for post-call chunked summarization
    val fullCallTranscriptAccumulator = StringBuilder()

    fun connect() {
        if (isConnected || webSocket != null) return

        val request = Request.Builder()
            .url(WSS_URL)
            .addHeader("Authorization", "Token $DEEPGRAM_API_KEY")
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                Log.i(TAG, "Deepgram live audio WebSocket established successfully.")
                isConnected = true
                reconnectJob?.cancel()
            }

            override fun onMessage(ws: WebSocket, text: String) {
                parseAndSlidewindow(text)
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                Log.w(TAG, "Deepgram WebSocket failure: ${t.message}. Triggering auto-reconnect...")
                isConnected = false
                webSocket = null
                scheduleReconnect()
            }

            override fun onClosed(ws: WebSocket, code: Int, reason: String) {
                Log.i(TAG, "Deepgram WebSocket closed (${code}): $reason")
                isConnected = false
                webSocket = null
            }
        })
    }

    fun sendAudio(pcmData: ByteArray) {
        if (isConnected && webSocket != null) {
            webSocket?.send(pcmData.toByteString())
        }
    }

    private fun parseAndSlidewindow(rawJson: String) {
        try {
            val root = gson.fromJson(rawJson, JsonObject::class.java)
            val channel = root.getAsJsonObject("channel") ?: return
            val alternatives = channel.getAsJsonArray("alternatives") ?: return
            if (alternatives.size() == 0) return

            val firstAlt = alternatives.get(0).asJsonObject
            val transcript = firstAlt.get("transcript")?.asString?.trim() ?: ""
            val isFinal = root.get("is_final")?.asBoolean ?: false

            if (transcript.isNotEmpty() && isFinal) {
                val now = System.currentTimeMillis()
                val speaker = firstAlt.getAsJsonArray("words")
                    ?.firstOrNull()?.asJsonObject?.get("speaker")?.asInt ?: 0

                val segment = TimestampedSegment(now, speaker, transcript)

                synchronized(transcriptDeque) {
                    transcriptDeque.addLast(segment)

                    // Prune anything older than 45 seconds
                    val cutoff = now - SLIDING_WINDOW_MS
                    while (transcriptDeque.isNotEmpty() && transcriptDeque.peekFirst()!!.timestamp < cutoff) {
                        transcriptDeque.removeFirst()
                    }

                    // Format formatted sliding window string
                    val formattedWindow = transcriptDeque.joinToString(separator = "\n") {
                        val label = if (it.speaker == 0) "Recipient" else "Caller"
                        "[$label]: ${it.text}"
                    }

                    val currentLabel = if (speaker == 0) "Recipient" else "Caller"
                    _slidingWindowTranscript.value = formattedWindow
                    fullCallTranscriptAccumulator.append("[$currentLabel]: $transcript\n")
                    onTranscriptUpdated(formattedWindow)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing Deepgram JSON response: ${e.message}")
        }
    }

    private fun scheduleReconnect() {
        if (reconnectJob?.isActive == true) return
        reconnectJob = scope.launch(Dispatchers.IO) {
            delay(3000)
            Log.i(TAG, "Attempting Deepgram socket reconnection...")
            connect()
        }
    }

    fun disconnect() {
        reconnectJob?.cancel()
        webSocket?.close(1000, "Call Session Terminated")
        webSocket = null
        isConnected = false
    }
}