package com.realityengine.dialer.ui

import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.telecom.TelecomManager
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.realityengine.dialer.audio.AudioCaptureEngine
import com.realityengine.dialer.worker.DatabaseCleanupWorker
import rikka.shizuku.Shizuku

class MainActivity : ComponentActivity() {

    private val audioCaptureEngine by lazy { AudioCaptureEngine(this) }

    private val requestDialerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            Toast.makeText(this, "Reality Engine is now your Default Dialer!", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Schedule weekly SQLCipher cleanup worker
        DatabaseCleanupWorker.enqueueWeekly(this)

        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF090D16)
                ) {
                    MainDialerScreen(
                        onCheckShizuku = { audioCaptureEngine.isShizukuAvailable() },
                        onRequestDefaultDialer = { requestDefaultDialerRole() },
                        onPlaceCall = { number -> makePhoneCall(number) }
                    )
                }
            }
        }
    }

    private fun requestDefaultDialerRole() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val roleManager = getSystemService(RoleManager::class.java)
            if (roleManager?.isRoleAvailable(RoleManager.ROLE_DIALER) == true &&
                !roleManager.isRoleHeld(RoleManager.ROLE_DIALER)
            ) {
                val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER)
                requestDialerLauncher.launch(intent)
            } else {
                Toast.makeText(this, "Default Dialer role already granted.", Toast.LENGTH_SHORT).show()
            }
        } else {
            val intent = Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER).apply {
                putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, packageName)
            }
            startActivity(intent)
        }
    }

    private fun makePhoneCall(number: String) {
        val intent = Intent(Intent.ACTION_CALL, Uri.parse("tel:$number"))
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED) {
            startActivity(intent)
        } else {
            Toast.makeText(this, "CALL_PHONE permission required.", Toast.LENGTH_SHORT).show()
        }
    }
}

@Composable
fun MainDialerScreen(
    onCheckShizuku: () -> Boolean,
    onRequestDefaultDialer: () -> Unit,
    onPlaceCall: (String) -> Unit
) {
    var dialNumber by remember { mutableStateOf("+1-555-019-2834") }
    var shizukuAvailable by remember { mutableStateOf(onCheckShizuku()) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "REALITY ENGINE",
            color = Color.White,
            fontSize = 22.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 2.sp
        )
        Text(
            text = "Android Native Dialer & Tactical Call AI",
            color = Color(0xFF64748B),
            fontSize = 12.sp
        )

        Spacer(modifier = Modifier.height(20.dp))

        // Shizuku Health Check Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = if (shizukuAvailable) Color(0xFF064E3B) else Color(0xFF450A0A)
            ),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    if (shizukuAvailable) Icons.Default.CheckCircle else Icons.Default.Warning,
                    contentDescription = null,
                    tint = if (shizukuAvailable) Color(0xFF34D399) else Color(0xFFF87171),
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = if (shizukuAvailable) "Shizuku IPC Service Connected" else "Shizuku Binder Inactive",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                    Text(
                        text = if (shizukuAvailable) "Elevated audio stream hook ready" else "Falling back to standard VOICE_COMMUNICATION",
                        color = Color(0xFFE2E8F0),
                        fontSize = 11.sp
                    )
                }
                Button(
                    onClick = { shizukuAvailable = onCheckShizuku() },
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Black.copy(alpha = 0.4f))
                ) {
                    Text("Ping", fontSize = 11.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = onRequestDefaultDialer,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))
        ) {
            Text("Set as Default Android Dialer")
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Dial Pad Display
        OutlinedTextField(
            value = dialNumber,
            onValueChange = { dialNumber = it },
            label = { Text("Enter Phone Number") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = { onPlaceCall(dialNumber) },
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A))
        ) {
            Icon(Icons.Default.Call, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Start Protected Call Session", fontWeight = FontWeight.Bold)
        }
    }
}
