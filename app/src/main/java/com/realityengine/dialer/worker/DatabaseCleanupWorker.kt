package com.realityengine.dialer.worker

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.realityengine.dialer.db.RealityDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

/**
 * Android WorkManager CoroutineWorker scheduled weekly.
 * Connects to the encrypted SQLCipher database and purges raw transcript rows
 * older than 30 days while strictly retaining structured profile summaries.
 */
class DatabaseCleanupWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        private const val TAG = "DatabaseCleanupWorker"
        private const val WORK_NAME = "reality_engine_weekly_db_cleanup"
        private const val RETENTION_PERIOD_DAYS = 30L

        /**
         * Enqueues the weekly recurring cleanup job in WorkManager.
         */
        fun enqueueWeekly(context: Context) {
            val cleanupRequest = PeriodicWorkRequestBuilder<DatabaseCleanupWorker>(7, TimeUnit.DAYS)
                .addTag("db_maintenance")
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                cleanupRequest
            )
            Log.i(TAG, "Enqueued weekly DatabaseCleanupWorker via WorkManager.")
        }
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            Log.i(TAG, "Executing weekly raw transcript database purge...")
            val database = RealityDatabase.getInstance(applicationContext)

            // Compute 30-day cutoff timestamp
            val thirtyDaysInMillis = RETENTION_PERIOD_DAYS * 24 * 60 * 60 * 1000L
            val cutoffTimestamp = System.currentTimeMillis() - thirtyDaysInMillis

            val deletedRows = database.purgeRawTranscriptsOlderThan(cutoffTimestamp)
            Log.i(TAG, "DatabaseCleanupWorker finished: Purged $deletedRows raw rows older than 30 days. Structured summaries preserved.")

            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "DatabaseCleanupWorker failed: ${e.message}", e)
            Result.retry()
        }
    }
}