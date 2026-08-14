package com.realityengine.dialer

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.realityengine.dialer.db.RealityDatabase
import com.realityengine.dialer.worker.DatabaseCleanupWorker
import java.util.concurrent.TimeUnit

class RealityEngineApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        instance = this

        // Initialize SQLCipher encrypted database
        try {
            RealityDatabase.getInstance(this)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Create notification channels
        createNotificationChannels()

        // Schedule periodic database cleanup worker (every 24h)
        scheduleDatabaseCleanup()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val callChannel = NotificationChannel(
                CHANNEL_CALL_SERVICE,
                "Tactical Call Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Ongoing call audio capture and analysis"
                setShowBadge(false)
            }

            val overlayChannel = NotificationChannel(
                CHANNEL_OVERLAY_SERVICE,
                "Tactical Overlay HUD",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Active HUD overlay for real-time call intelligence"
                setShowBadge(false)
            }

            notificationManager.createNotificationChannel(callChannel)
            notificationManager.createNotificationChannel(overlayChannel)
        }
    }

    private fun scheduleDatabaseCleanup() {
        try {
            val cleanupRequest = PeriodicWorkRequestBuilder<DatabaseCleanupWorker>(24, TimeUnit.HOURS)
                .build()

            WorkManager.getInstance(this).enqueueUniquePeriodicWork(
                "RealityEngineDbCleanup",
                ExistingPeriodicWorkPolicy.KEEP,
                cleanupRequest
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    companion object {
        const val CHANNEL_CALL_SERVICE = "reality_call_service_channel"
        const val CHANNEL_OVERLAY_SERVICE = "reality_overlay_service_channel"

        lateinit var instance: RealityEngineApplication
            private set
    }
}
