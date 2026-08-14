package com.realityengine.dialer.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import android.view.Gravity
import android.view.WindowManager
import androidx.compose.ui.platform.ComposeView
import androidx.core.app.NotificationCompat
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import com.realityengine.dialer.R
import com.realityengine.dialer.audio.AudioCaptureEngine
import com.realityengine.dialer.network.DeepgramLiveSocket
import com.realityengine.dialer.network.GroqTacticalEngine
import com.realityengine.dialer.ui.MainActivity
import com.realityengine.dialer.ui.RealityOverlayContent
import com.realityengine.dialer.util.OverlayLifecycleOwner
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel

/**
 * Foreground Service running under FOREGROUND_SERVICE_PHONE_CALL & FOREGROUND_SERVICE_MICROPHONE.
 * Acquires a 45-minute PowerManager.PARTIAL_WAKE_LOCK and mounts a dark-mode Compose overlay.
 */
class FloatingOverlayService : Service() {

    companion object {
        private const val TAG = "FloatingOverlayService"
        private const val CHANNEL_ID = "reality_engine_active_call_channel"
        private const val NOTIFICATION_ID = 4096
        private const val WAKELOCK_TIMEOUT_MS = 45 * 60 * 1000L // 45 minutes

        const val EXTRA_CALL_ID = "extra_call_id"
        const val EXTRA_PHONE_NUMBER = "extra_phone_number"
        const val EXTRA_CONTACT_NAME = "extra_contact_name"
    }

    private val serviceScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var windowManager: WindowManager? = null
    private var overlayComposeView: ComposeView? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var lifecycleOwner: OverlayLifecycleOwner? = null

    private lateinit var audioCaptureEngine: AudioCaptureEngine
    private lateinit var deepgramSocket: DeepgramLiveSocket
    private lateinit var groqTacticalEngine: GroqTacticalEngine

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "Initializing FloatingOverlayService foreground engine...")

        // 1. Acquire Partial WakeLock with 45-minute timeout
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "RealityEngine::ActiveCallAudioWakeLock"
        ).apply {
            setReferenceCounted(false)
            acquire(WAKELOCK_TIMEOUT_MS)
            Log.d(TAG, "Acquired PARTIAL_WAKE_LOCK with 45-min timeout (isHeld=${isHeld})")
        }

        // 2. Initialize engines
        audioCaptureEngine = AudioCaptureEngine(applicationContext)
        deepgramSocket = DeepgramLiveSocket(
            scope = serviceScope,
            onTranscriptUpdated = { slidingWindowText ->
                // Feed truncated 45s sliding window into Groq LLaMA 3.1
                groqTacticalEngine.evaluateTactics(
                    slidingTranscript = slidingWindowText,
                    currentRms = audioCaptureEngine.currentRms.value
                )
            }
        )
        groqTacticalEngine = GroqTacticalEngine(serviceScope)

        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val phoneNumber = intent?.getStringExtra(EXTRA_PHONE_NUMBER) ?: "Unknown Caller"
        val contactName = intent?.getStringExtra(EXTRA_CONTACT_NAME) ?: "Unsaved Contact"

        // Promote to foreground service with required types
        val notification = buildForegroundNotification(contactName, phoneNumber)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val type = ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL or
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            startForeground(NOTIFICATION_ID, notification, type)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        // Inflate Compose Overlay in WindowManager
        setupOverlayView(contactName, phoneNumber)

        // Connect Deepgram live socket & start audio recording
        deepgramSocket.connect()
        audioCaptureEngine.startCapture { pcmChunk ->
            deepgramSocket.sendAudio(pcmChunk)
        }

        return START_NOT_STICKY
    }

    private fun setupOverlayView(contactName: String, phoneNumber: String) {
        if (overlayComposeView != null) return

        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        lifecycleOwner = OverlayLifecycleOwner().apply { performRestore(null) }

        val layoutParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            },
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            y = 80
        }

        overlayComposeView = ComposeView(this).apply {
            setViewTreeLifecycleOwner(lifecycleOwner)
            setViewTreeSavedStateRegistryOwner(lifecycleOwner)
            setContent {
                RealityOverlayContent(
                    contactName = contactName,
                    phoneNumber = phoneNumber,
                    audioRmsFlow = audioCaptureEngine.currentRms,
                    tacticalPromptsFlow = groqTacticalEngine.tacticalPrompts,
                    liveAssessmentFlow = groqTacticalEngine.liveAssessment,
                    recentTranscriptFlow = deepgramSocket.slidingWindowTranscript,
                    onDismiss = { stopSelf() }
                )
            }
        }

        lifecycleOwner?.handleLifecycleEvent(androidx.lifecycle.Lifecycle.Event.ON_CREATE)
        lifecycleOwner?.handleLifecycleEvent(androidx.lifecycle.Lifecycle.Event.ON_START)
        lifecycleOwner?.handleLifecycleEvent(androidx.lifecycle.Lifecycle.Event.ON_RESUME)

        windowManager?.addView(overlayComposeView, layoutParams)
        Log.i(TAG, "Compose floating overlay inflated into SYSTEM_ALERT_WINDOW.")
    }

    private fun buildForegroundNotification(name: String, number: String): Notification {
        val launchIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Reality Engine Active")
            .setContentText("Live coaching active for $name ($number)")
            .setSmallIcon(android.R.drawable.stat_sys_phone_call)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Reality Engine Active Call Session",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Foreground call coaching & tactical transcription status"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        Log.i(TAG, "Destroying FloatingOverlayService - executing comprehensive teardown...")

        // 1. Cancel coroutines
        serviceScope.cancel()

        // 2. Stop audio capture and close socket
        audioCaptureEngine.stopCapture()
        deepgramSocket.disconnect()

        // 3. Remove Compose overlay from WindowManager
        overlayComposeView?.let { view ->
            lifecycleOwner?.handleLifecycleEvent(androidx.lifecycle.Lifecycle.Event.ON_DESTROY)
            windowManager?.removeView(view)
            overlayComposeView = null
        }

        // 4. Release partial wake lock safely
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
                Log.d(TAG, "WakeLock released successfully.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing WakeLock: ${e.message}")
        }

        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}