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
    private static final int OPEN_FILE = 10, SAVE_FILE = 11, CAMERA = 12;
    private Uri cameraUri;
    private InvoiceOcr ocr;
    private WebView web;
    private ValueCallback<Uri[]> chooser;
    private final NativeFiles files = new NativeFiles();

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        File[] abandoned = getCacheDir().listFiles((dir, name) -> name.startsWith("export-"));
        if (abandoned != null) for (File file : abandoned) file.delete();
        for(String cacheName:new String[]{"camera","shared"}){File dir=new File(getCacheDir(),cacheName);File[] old=dir.listFiles();if(old!=null)for(File f:old)if(System.currentTimeMillis()-f.lastModified()>86400000L)f.delete();}
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
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (chooser != null) chooser.onReceiveValue(null);
                chooser = callback;
                if (params.isCaptureEnabled()) {
                    try {
                        File folder=new File(getCacheDir(),"camera");folder.mkdirs();
                        File photo=File.createTempFile("invoice-",".jpg",folder);cameraUri=androidx.core.content.FileProvider.getUriForFile(MainActivity.this,getPackageName()+".files",photo);
                        Intent capture=new Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE).putExtra(android.provider.MediaStore.EXTRA_OUTPUT,cameraUri).addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        startActivityForResult(capture,CAMERA);
                    } catch(Exception e){chooser.onReceiveValue(null);chooser=null;Toast.makeText(MainActivity.this,"无法打开相机，请使用相册选择",Toast.LENGTH_LONG).show();}
                    return true;
                }
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try { startActivityForResult(intent, OPEN_FILE); }
                catch (Exception e) { chooser.onReceiveValue(null); chooser = null; Toast.makeText(MainActivity.this, "没有可用的文件选择器", Toast.LENGTH_LONG).show(); }
                return true;
            }
            @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
        });
        web.addJavascriptInterface(files, "ZhuzhangNative");
        ocr = new InvoiceOcr((id,text,error)->runOnUiThread(()->{if(web!=null)web.evaluateJavascript("window.dispatchEvent(new CustomEvent('zhuzhang-ocr',{detail:{id:"+JSONObject.quote(id)+",text:"+JSONObject.quote(text)+",error:"+JSONObject.quote(error)+"}}))",null);}));
        web.addJavascriptInterface(ocr,"ZhuzhangOcr");
        ReminderReceiver.schedule(this);
        web.setWebViewClient(new LocalClient(assets));
        web.loadUrl(HOME);
    }

    private final class LocalClient extends WebViewClient {
        private final WebViewAssetLoader assets;
        LocalClient(WebViewAssetLoader assets){this.assets=assets;}
        @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
            Uri u=request.getUrl();if("https".equals(u.getScheme())&&"appassets.androidplatform.net".equals(u.getHost())&&(HOME.equals(u.toString())||u.getPath().startsWith("/assets/pdf/")))return assets.shouldInterceptRequest(u);
            return new WebResourceResponse("text/plain","UTF-8",403,"Blocked",java.util.Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
        }
        @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !HOME.equals(request.getUrl().toString());}
        @Override public void onPageFinished(WebView view,String url){if(getIntent().getBooleanExtra("openReminders",false)){getIntent().removeExtra("openReminders");view.evaluateJavascript("window.dispatchEvent(new Event('zhuzhang-open-reminders'))",null);}}
    }
    @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);if(intent.getBooleanExtra("openReminders",false)&&web!=null)web.evaluateJavascript("window.dispatchEvent(new Event('zhuzhang-open-reminders'))",null);}
    private void complete(String id, String error) {
        runOnUiThread(() -> {
            if (web != null) web.evaluateJavascript("window.dispatchEvent(new CustomEvent('zhuzhang-native-save',{detail:{id:" + JSONObject.quote(id) + ",error:" + JSONObject.quote(error) + "}}))", null);
        });
    }

    public class NativeFiles {
        @JavascriptInterface public boolean syncReminders(String json){try{ReminderReceiver.sync(MainActivity.this,json);return true;}catch(Exception e){return false;}}
        @JavascriptInterface public String reminderStatus(){return "{\"enabled\":"+ReminderReceiver.prefs(MainActivity.this).getBoolean("enabled",false)+",\"allowed\":"+ReminderReceiver.allowed(MainActivity.this)+"}";}
        @JavascriptInterface public void enableReminders(boolean enabled){runOnUiThread(()->{ReminderReceiver.prefs(MainActivity.this).edit().putBoolean("enabled",enabled).apply();if(enabled&&Build.VERSION.SDK_INT>=33&&checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=android.content.pm.PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},33);ReminderReceiver.schedule(MainActivity.this);if(!enabled)getSystemService(android.app.NotificationManager.class).cancel(ReminderReceiver.NOTICE);});}
        @JavascriptInterface public void notificationSettings(){runOnUiThread(()->startActivity(new Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(android.provider.Settings.EXTRA_APP_PACKAGE,getPackageName())));}
        @JavascriptInterface public void testNotification(){runOnUiThread(()->ReminderReceiver.show(MainActivity.this,true));}

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
        @JavascriptInterface public synchronized boolean share(String id) {
            if(!id.equals(token)||pending||stream==null||written!=expected)return false;
            try{stream.close();stream=null;pending=true;
                File folder=new File(getCacheDir(),"shared");folder.mkdirs();File shared=new File(folder,name);try(InputStream input=new FileInputStream(file);OutputStream out=new FileOutputStream(shared)){byte[] b=new byte[65536];int n;while((n=input.read(b))!=-1)out.write(b,0,n);}
                Uri uri=androidx.core.content.FileProvider.getUriForFile(MainActivity.this,getPackageName()+".files",shared);String type=mime;
                runOnUiThread(()->{try{Intent send=new Intent(Intent.ACTION_SEND).setType(type).putExtra(Intent.EXTRA_STREAM,uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);startActivity(Intent.createChooser(send,"分享筑账文件"));complete(id,"");}catch(Exception e){complete(id,"没有可用的分享应用，请改用保存文件");}finally{cleanup();}});return true;
            }catch(Exception e){cleanup();return false;}
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
        if (request == OPEN_FILE && chooser != null) {
            Uri[] selected = uri == null ? null : new Uri[]{uri};
            if (result == RESULT_OK && data != null && data.getClipData() != null) {
                android.content.ClipData clips = data.getClipData();
                selected = new Uri[clips.getItemCount()];
                for (int i = 0; i < selected.length; i++) selected[i] = clips.getItemAt(i).getUri();
            }
            chooser.onReceiveValue(selected); chooser = null;
        }
        if(request==CAMERA&&chooser!=null){chooser.onReceiveValue(result==RESULT_OK&&cameraUri!=null?new Uri[]{cameraUri}:null);chooser=null;cameraUri=null;}
        if (request == SAVE_FILE) files.save(uri);
    }
    @Override public void onBackPressed() {
        new android.app.AlertDialog.Builder(this).setTitle("退出筑账？").setMessage("账本已自动保存在本机。重要资料请定期导出备份。").setNegativeButton("继续使用", null).setPositiveButton("退出", (dialog, which) -> finish()).show();
    }
    @Override protected void onDestroy() {
        if (chooser != null) chooser.onReceiveValue(null);
        if(ocr!=null)ocr.close();
        if (web != null) { web.removeJavascriptInterface("ZhuzhangOcr");web.removeJavascriptInterface("ZhuzhangNative"); web.destroy(); web = null; }
        super.onDestroy();
    }
}
