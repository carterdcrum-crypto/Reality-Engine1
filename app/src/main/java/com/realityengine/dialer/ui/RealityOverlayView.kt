package com.realityengine.dialer.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.RecordVoiceOver
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.realityengine.dialer.network.LiveAssessmentData
import com.realityengine.dialer.network.TacticalPromptsData
import kotlinx.coroutines.flow.StateFlow

// Specific Tactic Colors
val ColorBondingGreen = Color(0xFF22C55E)
val ColorProbeRed = Color(0xFFEF4444)
val ColorMirroringBlue = Color(0xFF3B82F6)
val ColorPivotYellow = Color(0xFFEAB308)

@Composable
fun RealityOverlayContent(
    contactName: String,
    phoneNumber: String,
    audioRmsFlow: StateFlow<Float>,
    tacticalPromptsFlow: StateFlow<TacticalPromptsData>,
    liveAssessmentFlow: StateFlow<LiveAssessmentData>,
    recentTranscriptFlow: StateFlow<String>,
    onDismiss: () -> Unit
) {
    val rms by audioRmsFlow.collectAsState()
    val tactics by tacticalPromptsFlow.collectAsState()
    val assessment by liveAssessmentFlow.collectAsState()
    val transcript by recentTranscriptFlow.collectAsState()

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(12.dp),
        shape = RoundedCornerShape(16.dp),
        color = Color(0xFF0F172A).copy(alpha = 0.96f),
        tonalElevation = 8.dp,
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // ==========================================
            // 1. TOP: Contact Profile & Reliability
            // ==========================================
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF1E293B)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Shield, contentDescription = null, tint = ColorBondingGreen, modifier = Modifier.size(20.dp))
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = contactName,
                            color = Color.White,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = phoneNumber,
                            color = Color(0xFF94A3B8),
                            fontSize = 12.sp
                        )
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Badge(
                        containerColor = if (assessment.truthfulness > 70) Color(0xFF065F46) else Color(0xFF7F1D1D)
                    ) {
                        Text(
                            text = "Reliability: ${assessment.truthfulness}%",
                            color = Color.White,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Color(0xFF64748B))
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // ==========================================
            // 2. CENTER: Live Assessment Score Meter & RMS
            // ==========================================
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                shape = RoundedCornerShape(10.dp)
            ) {
                Column(modifier = Modifier.padding(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        AssessmentStatItem("Rapport", "${assessment.rapport}%", ColorBondingGreen)
                        AssessmentStatItem("Cognitive Load", "${assessment.cognitiveLoad}%", ColorProbeRed)
                        AssessmentStatItem("Urgency", "${assessment.urgency}%", ColorPivotYellow)
                        AssessmentStatItem("State", assessment.dominantEmotion, Color(0xFF38BDF8))
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Audio RMS Meter
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.RecordVoiceOver, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Live RMS:", color = Color(0xFF94A3B8), fontSize = 11.sp)
                        Spacer(modifier = Modifier.width(8.dp))
                        LinearProgressIndicator(
                            progress = { rms },
                            modifier = Modifier
                                .weight(1f)
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp)),
                            color = if (rms > 0.6f) ColorProbeRed else ColorBondingGreen,
                            trackColor = Color(0xFF334155)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // ==========================================
            // 3. SCROLLING TRANSCRIPT (Last 45 Seconds)
            // ==========================================
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 110.dp)
                    .background(Color(0xFF020617), RoundedCornerShape(8.dp))
                    .padding(8.dp)
            ) {
                val scrollState = rememberScrollState()
                LaunchedEffect(transcript) {
                    scrollState.animateScrollTo(scrollState.maxValue)
                }
                Text(
                    text = if (transcript.isBlank()) "Listening for speaker stream via Deepgram WebSocket..." else transcript,
                    color = if (transcript.isBlank()) Color(0xFF64748B) else Color(0xFFE2E8F0),
                    fontSize = 12.sp,
                    fontFamily = FontFamily.Monospace,
                    modifier = Modifier.verticalScroll(scrollState)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // ==========================================
            // 4. BOTTOM: 4 Dynamic Tactic UI Prompts
            // ==========================================
            Text(
                text = "DYNAMIC TACTICAL HUD",
                color = Color(0xFF64748B),
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )

            Spacer(modifier = Modifier.height(6.dp))

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                // 1. Bonding (Green)
                TacticPromptCard(
                    title = "1. Bonding",
                    item = tactics.bonding,
                    accentColor = ColorBondingGreen
                )

                // 2. Cognitive Probe (Red)
                TacticPromptCard(
                    title = "2. Cognitive Probe",
                    item = tactics.cognitiveProbe,
                    accentColor = ColorProbeRed
                )

                // 3. Mirroring (Blue)
                TacticPromptCard(
                    title = "3. Mirroring",
                    item = tactics.mirroring,
                    accentColor = ColorMirroringBlue
                )

                // 4. Pivot (Yellow)
                TacticPromptCard(
                    title = "4. Pivot",
                    item = tactics.pivot,
                    accentColor = ColorPivotYellow
                )
            }
        }
    }
}

@Composable
fun AssessmentStatItem(label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = label, color = Color(0xFF64748B), fontSize = 10.sp)
        Text(text = value, color = color, fontSize = 13.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun TacticPromptCard(title: String, item: TacticalItem, accentColor: Color) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(Color(0xFF1E293B))
            .border(1.dp, accentColor.copy(alpha = 0.4f), RoundedCornerShape(10.dp))
            .padding(10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(accentColor)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = title,
                    color = accentColor,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            // Tonality badge
            Surface(
                color = Color(0xFF0F172A),
                shape = RoundedCornerShape(4.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, accentColor.copy(alpha = 0.3f))
            ) {
                Text(
                    text = "Tone: ${item.tonality}",
                    color = accentColor,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        Text(
            text = ""${item.verbatim}"",
            color = Color(0xFFF8FAFC),
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            lineHeight = 16.sp
        )
    }
}
