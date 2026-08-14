package com.realityengine.dialer.service

import android.content.Intent
import android.net.Uri
import android.telecom.Call
import android.telecom.InCallService
import android.util.Log
import com.realityengine.dialer.db.RealityDatabase
import com.realityengine.dialer.util.ChunkedSummarizer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Native Android Default Dialer InCallService.
 * Listens for active call state transitions, orchestrates the floating overlay,
 * and executes rate-limited chunked post-call summarization into SQLCipher.
 */
class RealityCallService : InCallService() {

    companion object {
        private const val TAG = "RealityCallService"
    }

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private lateinit var chunkedSummarizer: ChunkedSummarizer
    private lateinit var database: RealityDatabase

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "RealityCallService created as Default Dialer InCallService.")
        database = RealityDatabase.getInstance(applicationContext)
        chunkedSummarizer = ChunkedSummarizer(database)
    }

    override fun onCallAdded(call: Call) {
        super.onCallAdded(call)
        val handle: Uri? = call.details.handle
        val phoneNumber = handle?.schemeSpecificPart ?: "Unknown Number"
        Log.i(TAG, "Call added for: $phoneNumber (State=${call.state})")

        // Fetch contact profile from SQLCipher database
        serviceScope.launch {
            val contact = database.getContactByNumber(phoneNumber)
            val contactName = contact?.name ?: "New Participant"

            // Start Floating Overlay Service
            val overlayIntent = Intent(this@RealityCallService, FloatingOverlayService::class.java).apply {
                putExtra(FloatingOverlayService.EXTRA_PHONE_NUMBER, phoneNumber)
                putExtra(FloatingOverlayService.EXTRA_CONTACT_NAME, contactName)
            }
            startService(overlayIntent)
        }

        call.registerCallback(object : Call.Callback() {
            override fun onStateChanged(activeCall: Call, state: Int) {
                Log.d(TAG, "Call state transition: $state")
            }
        })
    }

    override fun onCallRemoved(call: Call) {
        super.onCallRemoved(call)
        val handle: Uri? = call.details.handle
        val phoneNumber = handle?.schemeSpecificPart ?: "Unknown Number"
        val callDurationSeconds = (System.currentTimeMillis() - call.details.connectTimeMillis) / 1000

        Log.i(TAG, "Call removed for $phoneNumber (Duration: ${callDurationSeconds}s). Halting overlay...")

        // 1. Stop the Floating Overlay Foreground Service
        val overlayIntent = Intent(this, FloatingOverlayService::class.java)
        stopService(overlayIntent)

        // 2. Trigger Chunked Post-Call Summarization coroutine with rate-limited delays
        serviceScope.launch {
            Log.i(TAG, "Starting post-call chunked analysis with 12-second rate-limit pauses...")
            chunkedSummarizer.processCompletedCall(
                phoneNumber = phoneNumber,
                durationSeconds = callDurationSeconds
            )
        }
    }
}