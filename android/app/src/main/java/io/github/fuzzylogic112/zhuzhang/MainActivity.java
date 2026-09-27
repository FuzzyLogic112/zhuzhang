package io.github.fuzzylogic112.zhuzhang;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.*;
import android.view.WindowInsets;
import android.os.Build;
import android.widget.Toast;
import android.util.Base64;
import androidx.webkit.WebViewAssetLoader;
import org.json.JSONObject;
import java.io.*;
import java.util.UUID;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final String HOME = "https://appassets.androidplatform.net/assets/index.html";
    private static final int OPEN_FILE = 10, SAVE_FILE = 11;
    private WebView web;
    private ValueCallback<Uri[]> chooser;
    private final NativeFiles files = new NativeFiles();

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        File[] abandoned = getCacheDir().listFiles((dir, name) -> name.startsWith("export-"));
        if (abandoned != null) for (File file : abandoned) file.delete();
        web = new WebView(this);
        setContentView(web);
        web.setBackgroundColor(0xfff5f7f8);
        if (Build.VERSION.SDK_INT >= 30) web.setOnApplyWindowInsetsListener((view, insets) -> {
            android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return insets;
        });
        else web.setFitsSystemWindows(true);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        WebViewAssetLoader assets = new WebViewAssetLoader.Builder().addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (HOME.equals(request.getUrl().toString())) return assets.shouldInterceptRequest(request.getUrl());
                return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", java.util.Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return !HOME.equals(request.getUrl().toString()); }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (chooser != null) chooser.onReceiveValue(null);
                chooser = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                try { startActivityForResult(intent, OPEN_FILE); }
                catch (Exception e) { chooser.onReceiveValue(null); chooser = null; Toast.makeText(MainActivity.this, "没有可用的文件选择器", Toast.LENGTH_LONG).show(); }
                return true;
            }
            @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
        });
        web.addJavascriptInterface(files, "ZhuzhangNative");
        web.loadUrl(HOME);
    }

    private void complete(String id, String error) {
        runOnUiThread(() -> {
            if (web != null) web.evaluateJavascript("window.dispatchEvent(new CustomEvent('zhuzhang-native-save',{detail:{id:" + JSONObject.quote(id) + ",error:" + JSONObject.quote(error) + "}}))", null);
        });
    }

    public class NativeFiles {
        private String token, name, mime;
        private long expected, written;
        private File file;
        private OutputStream stream;
        private boolean pending;
        @JavascriptInterface public synchronized String begin(String filename, String type, long size) {
            if (token != null || size < 0 || size > 250L * 1024 * 1024) return "";
            try {
                token = UUID.randomUUID().toString();
                name = new File(filename.replace('\\', '/')).getName().replaceAll("[\\p{Cntrl}]", "_");
                if (name.isEmpty()) name = "筑账导出.zip";
                mime = type.contains("/") ? type.split(";")[0] : "application/octet-stream";
                expected = size; written = 0;
                file = new File(getCacheDir(), "export-" + token);
                stream = new FileOutputStream(file);
                return token;
            } catch (Exception e) { cleanup(); return ""; }
        }
        @JavascriptInterface public synchronized boolean write(String id, String encoded) {
            if (!id.equals(token) || pending || stream == null || encoded.length() > 400000) return false;
            try {
                byte[] bytes = Base64.decode(encoded, Base64.NO_WRAP);
                if (written + bytes.length > expected) return false;
                stream.write(bytes); written += bytes.length; return true;
            } catch (Exception e) { return false; }
        }
        @JavascriptInterface public synchronized boolean finish(String id) {
            if (!id.equals(token) || pending || stream == null || written != expected) return false;
            try { stream.close(); stream = null; pending = true; }
            catch (Exception e) { return false; }
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(mime).putExtra(Intent.EXTRA_TITLE, name);
                    startActivityForResult(intent, SAVE_FILE);
                } catch (Exception e) { complete(id, "无法打开保存对话框"); cleanup(); }
            });
            return true;
        }
        @JavascriptInterface public synchronized void abort(String id) { if (id.equals(token) && !pending) cleanup(); }
        private synchronized void cleanup() {
            try { if (stream != null) stream.close(); } catch (Exception ignored) {}
            if (file != null) file.delete();
            token = null; file = null; stream = null; pending = false;
        }
        void save(Uri destination) {
            final String id = token;
            if (destination == null) { complete(id, "已取消保存"); cleanup(); return; }
            java.util.concurrent.ExecutorService executor = Executors.newSingleThreadExecutor();
            executor.execute(() -> {
                String error = "";
                try (InputStream input = new FileInputStream(file); OutputStream output = getContentResolver().openOutputStream(destination, "wt")) {
                    if (output == null) throw new IOException("Missing output stream");
                    byte[] buffer = new byte[65536]; int n;
                    while ((n = input.read(buffer)) != -1) output.write(buffer, 0, n);
                    output.flush();
                } catch (Exception e) { error = "保存失败，请检查剩余空间并重新导出"; }
                finally { cleanup(); }
                complete(id, error); executor.shutdown();
            });
        }
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        Uri uri = result == RESULT_OK && data != null ? data.getData() : null;
        if (request == OPEN_FILE && chooser != null) { chooser.onReceiveValue(uri == null ? null : new Uri[]{uri}); chooser = null; }
        if (request == SAVE_FILE) files.save(uri);
    }
    @Override public void onBackPressed() {
        new android.app.AlertDialog.Builder(this).setTitle("退出筑账？").setMessage("账本已自动保存在本机。重要资料请定期导出备份。").setNegativeButton("继续使用", null).setPositiveButton("退出", (dialog, which) -> finish()).show();
    }
    @Override protected void onDestroy() {
        if (chooser != null) chooser.onReceiveValue(null);
        if (web != null) { web.removeJavascriptInterface("ZhuzhangNative"); web.destroy(); web = null; }
        super.onDestroy();
    }
}
