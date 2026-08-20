# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

-keep class io.github.f4rsantos.organizer.widgets.** { *; }
-keep class * extends android.appwidget.AppWidgetProvider { *; }
-keep class * extends android.widget.RemoteViewsService { *; }

# Capacitor bridges JS to native through @JavascriptInterface methods, which are
# only ever called reflectively from the WebView. R8 cannot see those calls, so
# without this the bridge is stripped and the app opens to a blank WebView.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep our own bridge plugin entry points.
-keep class io.github.f4rsantos.organizer.** { *; }

# Readable crash reports in Play Console.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
