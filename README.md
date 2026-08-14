# Reality Engine

A high-performance Android Telecom dialer with an automated real-time tactical coaching HUD and biometric keystore protection.

---

## 📱 How to Get the Direct `.apk` from GitHub

GitHub handles APK files in two ways:
1. **GitHub Releases (Direct `.apk` file):**
   - Go to your repository on GitHub.
   - Click **Releases** on the right sidebar (or navigate to `https://github.com/<your-username>/<repo-name>/releases`).
   - Under **Assets**, click the direct `app-debug.apk` or `app-release.apk` file to download and install it directly on your Android phone.

2. **GitHub Actions Workflow:**
   - Go to the **Actions** tab in your repository.
   - Click **"Build & Release Android APK"** on the left.
   - Click **Run workflow** -> **Run workflow**.
   - This automatically compiles the APK using Gradle 8.7 & Android SDK 35 and publishes the `.apk` file straight into the **Releases** tab.

---

## 🚀 Pushing to GitHub

```bash
git init
git add .
git commit -m "feat: Initial commit with native Android codebase & CI/CD APK builder"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main

# To publish an official release with attached .apk binaries:
git tag v1.0.0
git push origin v1.0.0
```

---

## 🛠️ Local Android Studio Build

If you want to build locally:
1. Open this repository root folder in **Android Studio**.
2. Select **Build > Build Bundle(s) / APK(s) > Build APK(s)**, or run:
   ```bash
   ./gradlew assembleDebug
   ```
3. The APK will be generated at:
   `app/build/outputs/apk/debug/app-debug.apk`
