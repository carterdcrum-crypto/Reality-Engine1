# Reality Engine ProGuard Rules
-keep class com.realityengine.dialer.** { *; }
-keepclassmembers class * {
    @androidx.annotation.Keep *;
}
-dontwarn dev.rikka.shizuku.**
-dontwarn net.zetetic.database.sqlcipher.**
-keep class net.zetetic.database.sqlcipher.** { *; }
-keep class dev.rikka.shizuku.** { *; }
