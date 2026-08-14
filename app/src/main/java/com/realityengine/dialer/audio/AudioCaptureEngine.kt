package com.realityengine.dialer.audio

import android.annotation.SuppressLint
import android.content.Context
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import rikka.shizuku.Shizuku
import kotlin.math.sqrt

/**
 * High-performance Audio Capture engine sampling at 16000Hz Linear 16-bit PCM (Mono).
 * Computes local acoustic Root Mean Square (RMS) and interfaces with Shizuku IPC.
 */
class AudioCaptureEngine(private val context: Context) {

    companion object {
        private const val TAG = "AudioCaptureEngine"
        const val SAMPLE_RATE_HZ = 16000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    }

    private var audioRecord: AudioRecord? = null
    private var recordingJob: Job? = null
    private val audioScope = CoroutineScope(Dispatchers.IO)

    private val _currentRms = MutableStateFlow(0f)
    val currentRms: StateFlow<Float> = _currentRms.asStateFlow()

    /**
     * Checks if Shizuku binder is active for elevated IPC call capture.
     */
    fun isShizukuAvailable(): Boolean {
        return try {
            val ping = Shizuku.pingBinder()
            Log.d(TAG, "Shizuku.pingBinder() returned: $ping")
            ping
        } catch (e: Exception) {
            Log.w(TAG, "Shizuku binder is unavailable or permission denied: ${e.message}")
            false
        }
    }

    @SuppressLint("MissingPermission")
    fun startCapture(onChunkReady: (ByteArray) -> Unit) {
        if (recordingJob?.isActive == true) return

        val minBufferSize = AudioRecord.getMinBufferSize(
            SAMPLE_RATE_HZ,
            CHANNEL_CONFIG,
            AUDIO_FORMAT
        )
        val bufferSize = maxOf(minBufferSize, 2048)

        // Select standard source (VOICE_COMMUNICATION or MIC)
        val audioSource = MediaRecorder.AudioSource.VOICE_COMMUNICATION

        try {
            audioRecord = AudioRecord(
                audioSource,
                SAMPLE_RATE_HZ,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                bufferSize
            )

            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                Log.e(TAG, "AudioRecord initialization failed!")
                return
            }

            audioRecord?.startRecording()
            Log.i(TAG, "AudioRecord started capture at ${SAMPLE_RATE_HZ}Hz Mono.")

            recordingJob = audioScope.launch {
                val buffer = ShortArray(bufferSize / 2)
                val byteBuffer = ByteArray(bufferSize)

                while (isActive && audioRecord?.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
                    val shortsRead = audioRecord?.read(buffer, 0, buffer.size) ?: -1
                    if (shortsRead > 0) {
                        // 1. Calculate acoustic Root Mean Square (RMS)
                        var sumOfSquares = 0.0
                        for (i in 0 until shortsRead) {
                            val sample = buffer[i]
                            sumOfSquares += (sample * sample).toDouble()

                            // Convert Short (16-bit LE) to ByteArray
                            byteBuffer[i * 2] = (sample.toInt() and 0xFF).toByte()
                            byteBuffer[i * 2 + 1] = ((sample.toInt() shr 8) and 0xFF).toByte()
                        }

                        val rms = sqrt(sumOfSquares / shortsRead) / 32768.0
                        _currentRms.value = rms.toFloat().coerceIn(0f, 1f)

                        // 2. Dispatch raw linear16 PCM chunk
                        val exactChunk = byteBuffer.copyOf(shortsRead * 2)
                        onChunkReady(exactChunk)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error initiating audio capture: ${e.message}", e)
        }
    }

    fun stopCapture() {
        try {
            recordingJob?.cancel()
            recordingJob = null
            audioRecord?.stop()
            audioRecord?.release()
            audioRecord = null
            _currentRms.value = 0f
            Log.i(TAG, "AudioRecord successfully halted and released.")
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping audio capture: ${e.message}")
        }
    }
}