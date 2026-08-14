package com.realityengine.dialer.db

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.util.Log
import net.sqlcipher.database.SQLiteDatabase
import net.sqlcipher.database.SQLiteOpenHelper

data class ContactEntity(
    val phoneNumber: String,
    val name: String,
    val reliabilityScore: Int,
    val preferences: String,
    val dislikes: String,
    val notes: String
)

data class RawTranscriptRow(
    val id: String,
    val phoneNumber: String,
    val speaker: String,
    val text: String,
    val timestamp: Long
)

data class CallSummaryEntity(
    val id: String,
    val phoneNumber: String,
    val durationSeconds: Long,
    val summaryText: String,
    val actionItems: String,
    val sentimentShift: String,
    val updatedReliabilityScore: Int,
    val createdAt: Long
)

/**
 * SQLCipher Encrypted SQLite Database for Reality Engine.
 * Injected with master passphrase.
 */
class RealityDatabase private constructor(context: Context) : SQLiteOpenHelper(
    context,
    DATABASE_NAME,
    null,
    DATABASE_VERSION
) {
    companion object {
        private const val TAG = "RealityDatabase"
        private const val DATABASE_NAME = "reality_engine_encrypted.db"
        private const val DATABASE_VERSION = 1

        // INJECTED SQLCIPHER DB PASSPHRASE
        const val DB_PASSPHRASE = "ba982685-b1ee-4f99-bf52-39253cc5edd8"

        @Volatile
        private var INSTANCE: RealityDatabase? = null

        fun getInstance(context: Context): RealityDatabase {
            return INSTANCE ?: synchronized(this) {
                SQLiteDatabase.loadLibs(context.applicationContext)
                INSTANCE ?: RealityDatabase(context.applicationContext).also { INSTANCE = it }
            }
        }
    }

    override fun onCreate(db: SQLiteDatabase) {
        Log.i(TAG, "Creating SQLCipher encrypted tables...")

        db.execSQL("""
            CREATE TABLE contacts (
                phone_number TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                reliability_score INTEGER DEFAULT 75,
                preferences TEXT,
                dislikes TEXT,
                notes TEXT
            );
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE raw_transcripts (
                id TEXT PRIMARY KEY,
                phone_number TEXT NOT NULL,
                speaker TEXT NOT NULL,
                text TEXT NOT NULL,
                timestamp INTEGER NOT NULL
            );
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE call_summaries (
                id TEXT PRIMARY KEY,
                phone_number TEXT NOT NULL,
                duration_seconds INTEGER NOT NULL,
                summary_text TEXT NOT NULL,
                action_items TEXT,
                sentiment_shift TEXT,
                updated_reliability_score INTEGER,
                created_at INTEGER NOT NULL
            );
        """.trimIndent())

        // Preseed initial contact profile
        db.execSQL("""
            INSERT OR REPLACE INTO contacts (phone_number, name, reliability_score, preferences, dislikes, notes)
            VALUES ('+1-555-019-2834', 'Marcus Vance (VP Tech)', 88, 'Direct communication, hard deadlines, data metrics', 'Vague timelines, unverified claims', 'Key stakeholder on Q3 platform migration');
        """.trimIndent())
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS contacts")
        db.execSQL("DROP TABLE IF EXISTS raw_transcripts")
        db.execSQL("DROP TABLE IF EXISTS call_summaries")
        onCreate(db)
    }

    fun getEncryptedDb(): SQLiteDatabase {
        return getWritableDatabase(DB_PASSPHRASE)
    }

    fun getContactByNumber(number: String): ContactEntity? {
        val db = getEncryptedDb()
        var cursor: Cursor? = null
        return try {
            cursor = db.rawQuery("SELECT * FROM contacts WHERE phone_number = ? LIMIT 1", arrayOf(number))
            if (cursor.moveToFirst()) {
                ContactEntity(
                    phoneNumber = cursor.getString(0),
                    name = cursor.getString(1),
                    reliabilityScore = cursor.getInt(2),
                    preferences = cursor.getString(3) ?: "",
                    dislikes = cursor.getString(4) ?: "",
                    notes = cursor.getString(5) ?: ""
                )
            } else null
        } finally {
            cursor?.close()
        }
    }

    fun getRawTranscriptsForCall(number: String): List<RawTranscriptRow> {
        val db = getEncryptedDb()
        val list = mutableListOf<RawTranscriptRow>()
        var cursor: Cursor? = null
        try {
            cursor = db.rawQuery("SELECT * FROM raw_transcripts WHERE phone_number = ? ORDER BY timestamp ASC", arrayOf(number))
            while (cursor.moveToNext()) {
                list.add(
                    RawTranscriptRow(
                        id = cursor.getString(0),
                        phoneNumber = cursor.getString(1),
                        speaker = cursor.getString(2),
                        text = cursor.getString(3),
                        timestamp = cursor.getLong(4)
                    )
                )
            }
        } finally {
            cursor?.close()
        }
        return list
    }

    fun insertCallSummary(summary: CallSummaryEntity) {
        val db = getEncryptedDb()
        val values = ContentValues().apply {
            put("id", summary.id)
            put("phone_number", summary.phoneNumber)
            put("duration_seconds", summary.durationSeconds)
            put("summary_text", summary.summaryText)
            put("action_items", summary.actionItems)
            put("sentiment_shift", summary.sentimentShift)
            put("updated_reliability_score", summary.updatedReliabilityScore)
            put("created_at", summary.createdAt)
        }
        db.insert("call_summaries", null, values)
    }

    fun updateContactReliability(number: String, newScore: Int) {
        val db = getEncryptedDb()
        val values = ContentValues().apply {
            put("reliability_score", newScore)
        }
        db.update("contacts", values, "phone_number = ?", arrayOf(number))
    }

    fun purgeRawTranscriptsOlderThan(cutoffTimestamp: Long): Int {
        val db = getEncryptedDb()
        val rowsDeleted = db.delete("raw_transcripts", "timestamp < ?", arrayOf(cutoffTimestamp.toString()))
        Log.i(TAG, "Purged ${rowsDeleted} stale raw transcript rows older than timestamp ${cutoffTimestamp}")
        return rowsDeleted
    }
}