import JSZip from 'jszip';
import { ANDROID_PROJECT_FILES } from '../data/kotlinCodebase';

export async function generateAndDownloadApkZip(): Promise<void> {
  const zip = new JSZip();

  // Root project files
  zip.file('README.md', `# Reality Engine - Android Dialer & Tactical Coaching Engine

## 📦 Distribution Package
This package contains the complete, compilable Android Studio project source tree, ready for building a production APK.

### 🚀 Build Instructions
1. Open this directory in **Android Studio Hedgehog / Iguana / Jellyfish (or newer)**.
2. Ensure JDK 17+ and Android SDK 35 are configured.
3. Run \`./gradlew assembleRelease\` or \`./gradlew assembleDebug\` to build the APK.
4. The output APK will be located at:
   \`app/build/outputs/apk/release/app-release.apk\`
   \`app/build/outputs/apk/debug/app-debug.apk\`

### 🛡️ Security & Biometrics
- **BiometricPrompt API**: Hardware-backed biometric authentication (Fingerprint / Face Unlock).
- **SQLCipher 256-bit AES**: KeyProvider hardware-backed Keystore per-device DB encryption.
`);

  // Add standard Gradle wrapper config
  zip.file('gradle/wrapper/gradle-wrapper.properties', `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.7-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`);

  zip.file('settings.gradle.kts', `pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\\\.android.*")
                includeGroupByRegex("com\\\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url = java.net.URI("https://jitpack.io") }
    }
}

rootProject.name = "RealityEngine"
include(":app")
`);

  zip.file('build.gradle.kts', `plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.kapt) apply false
}
`);

  zip.file('gradle/libs.versions.toml', `[versions]
agp = "8.4.1"
kotlin = "2.0.0"
coreKtx = "1.13.1"
lifecycleRuntimeKtx = "2.8.0"
activityCompose = "1.9.0"
composeBom = "2024.05.00"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
androidx-lifecycle-runtime-ktx = { group = "androidx.lifecycle", name = "lifecycle-runtime-ktx", version.ref = "lifecycleRuntimeKtx" }
androidx-activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }
androidx-compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
androidx-compose-ui = { group = "androidx.compose.ui", name = "ui" }
androidx-compose-ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }
androidx-compose-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
androidx-compose-material3 = { group = "androidx.compose.material3", name = "material3" }
androidx-compose-material-icons-extended = { group = "androidx.compose.material", name = "material-icons-extended" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
kotlin-kapt = { id = "org.jetbrains.kotlin.kapt", version.ref = "kotlin" }
`);

  // Add all Kotlin codebase files into the zip structure
  ANDROID_PROJECT_FILES.forEach((file) => {
    zip.file(file.path, file.content);
  });

  // Generate binary ZIP bundle as .apk.zip
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `RealityEngine-v1.0.0-Release-APK-Package.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
