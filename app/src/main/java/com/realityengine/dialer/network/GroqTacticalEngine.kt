package com.realityengine.dialer.network

import android.util.Log
import com.google.gson.Gson
import com.google.gson.JsonObject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

data class TacticalItem(
    val verbatim: String,
    val tonality: String
)

data class TacticalPromptsData(
    val bonding: TacticalItem = TacticalItem(
        verbatim = "Marcus, I hear you loud and clear on the audit certainty. We treat platform compliance with that exact same rigor.",
        tonality = "Warm, collaborative, unhurried pacing"
    ),
    val cognitiveProbe: TacticalItem = TacticalItem(
        verbatim = "What specific metric or condition from the last quarter is making you most hesitant right now?",
        tonality = "Curious, gentle, non-confrontational cadence"
    ),
    val mirroring: TacticalItem = TacticalItem(
        verbatim = "...database failover latency?",
        tonality = "Curious upward inflection with a 1-second pause"
    ),
    val pivot: TacticalItem = TacticalItem(
        verbatim = "If I share our stress-test latency report showing sub-18ms results, are you ready to lock in Friday's rollout?",
        tonality = "Decisive, grounded, steady cadence"
    )
)

data class LiveAssessmentData(
    val rapport: Int = 75,
    val cognitiveLoad: Int = 40,
    val truthfulness: Int = 85,
    val urgency: Int = 60,
    val dominantEmotion: String = "Analytical"
)

/**
 * Interacts with Groq llama-3.1-8b-instant model using sliding window tokens.
 */
class GroqTacticalEngine(private val scope: CoroutineScope) {

    companion object {
        private const val TAG = "GroqTacticalEngine"
        // INJECTED GROQ API KEY & MODEL
        const val GROQ_API_KEY = "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"
        const val GROQ_MODEL = "llama-3.1-8b-instant"
        private const val GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()
    private var isEvaluating = false

    private val _tacticalPrompts = MutableStateFlow(TacticalPromptsData())
    val tacticalPrompts: StateFlow<TacticalPromptsData> = _tacticalPrompts.asStateFlow()

    private val _liveAssessment = MutableStateFlow(LiveAssessmentData())
    val liveAssessment: StateFlow<LiveAssessmentData> = _liveAssessment.asStateFlow()

    fun evaluateTactics(slidingTranscript: String, currentRms: Float) {
        if (isEvaluating || slidingTranscript.isBlank()) return

        scope.launch(Dispatchers.IO) {
            isEvaluating = true
            try {
                val systemPrompt = """
You are the Reality Engine Tactical Conversation AI for active phone calls.
Analyze the following 45-second conversation window and acoustic RMS volume (${currentRms}).
You MUST provide the exact, verbatim words the user should speak out loud right now, accompanied by explicit tonality delivery instructions (inflection, pacing, warmth, confidence).

Produce a strict JSON response:
{
  "bonding": {
    "verbatim": "Exact spoken words to validate caller's emotional frame and build immediate connection",
    "tonality": "Tone and cadence (e.g., Warm, collaborative, unhurried pacing)"
  },
  "cognitive_probe": {
    "verbatim": "Exact spoken question to uncover hidden constraints or unspoken assumptions",
    "tonality": "Tone and cadence (e.g., Curious, gentle upward inflection)"
  },
  "mirroring": {
    "verbatim": "Exact 1-4 words to repeat back verbatim to prompt deeper elaboration",
    "tonality": "Tone and cadence (e.g., Curious inflection, followed by a 1-second pause)"
  },
  "pivot": {
    "verbatim": "Exact spoken transition sentence steering conversation toward concrete commitment",
    "tonality": "Tone and cadence (e.g., Decisive, grounded, steady tempo)"
  },
  "rapport": 0-100,
  "cognitive_load": 0-100,
  "truthfulness": 0-100,
  "urgency": 0-100,
  "dominant_emotion": "e.g. Guarded, Receptive, Stressed, Cooperative"
}
Return ONLY valid JSON.
""".trimIndent()

                val payload = JsonObject().apply {
                    addProperty("model", GROQ_MODEL)
                    addProperty("temperature", 0.3)
                    addProperty("max_tokens", 450)
                    addProperty("response_format", "json_object")

                    val messages = com.google.gson.JsonArray().apply {
                        add(JsonObject().apply {
                            addProperty("role", "system")
                            addProperty("content", systemPrompt)
                        })
                        add(JsonObject().apply {
                            addProperty("role", "user")
                            addProperty("content", "SLIDING 45s TRANSCRIPT:
$slidingTranscript")
                        })
                    }
                    add("messages", messages)
                }

                val request = Request.Builder()
                    .url(GROQ_ENDPOINT)
                    .addHeader("Authorization", "Bearer $GROQ_API_KEY")
                    .addHeader("Content-Type", "application/json")
                    .post(payload.toString().toRequestBody("application/json".toMediaType()))
                    .build()

                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val body = response.body?.string() ?: ""
                        val root = gson.fromJson(body, JsonObject::class.java)
                        val choices = root.getAsJsonArray("choices")
                        val contentStr = choices.get(0).asJsonObject
                            .getAsJsonObject("message").get("content").asString

                        val parsed = gson.fromJson(contentStr, JsonObject::class.java)

                        fun parseTacticalItem(key: String, fallback: TacticalItem): TacticalItem {
                            val element = parsed.get(key) ?: return fallback
                            return if (element.isJsonObject) {
                                val obj = element.asJsonObject
                                TacticalItem(
                                    verbatim = obj.get("verbatim")?.asString ?: fallback.verbatim,
                                    tonality = obj.get("tonality")?.asString ?: fallback.tonality
                                )
                            } else if (element.isJsonPrimitive) {
                                TacticalItem(verbatim = element.asString, tonality = "Natural cadence")
                            } else {
                                fallback
                            }
                        }

                        _tacticalPrompts.value = TacticalPromptsData(
                            bonding = parseTacticalItem("bonding", _tacticalPrompts.value.bonding),
                            cognitiveProbe = parseTacticalItem("cognitive_probe", _tacticalPrompts.value.cognitiveProbe),
                            mirroring = parseTacticalItem("mirroring", _tacticalPrompts.value.mirroring),
                            pivot = parseTacticalItem("pivot", _tacticalPrompts.value.pivot)
                        )

                        _liveAssessment.value = LiveAssessmentData(
                            rapport = parsed.get("rapport")?.asInt ?: _liveAssessment.value.rapport,
                            cognitiveLoad = parsed.get("cognitive_load")?.asInt ?: _liveAssessment.value.cognitiveLoad,
                            truthfulness = parsed.get("truthfulness")?.asInt ?: _liveAssessment.value.truthfulness,
                            urgency = parsed.get("urgency")?.asInt ?: _liveAssessment.value.urgency,
                            dominantEmotion = parsed.get("dominant_emotion")?.asString ?: _liveAssessment.value.dominantEmotion
                        )
                        Log.d(TAG, "Groq Tactics updated successfully with verbatim scripts & tonality.")
                    } else {
                        Log.w(TAG, "Groq API error: ${response.code} ${response.message}")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed evaluating Groq tactics: ${e.message}")
            } finally {
                isEvaluating = false
            }
        }
    }
}