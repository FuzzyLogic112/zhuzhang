package io.github.fuzzylogic112.zhuzhang;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.app.NotificationManager;
import android.util.Base64;
import java.io.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;

@RunWith(AndroidJUnit4.class)
public class NativeFeatureTest {
 private static void awaitNotificationCount(NotificationManager nm,int count) {
  long deadline=android.os.SystemClock.uptimeMillis()+5000;
  while(nm.getActiveNotifications().length!=count&&android.os.SystemClock.uptimeMillis()<deadline)android.os.SystemClock.sleep(50);
  assertEquals(count,nm.getActiveNotifications().length);
 }
 @Test public void bundledChineseOcrWorksWithoutInternetPermission() throws Exception {
  Context target=InstrumentationRegistry.getInstrumentation().getTargetContext();
  assertEquals(PackageManager.PERMISSION_DENIED,target.checkSelfPermission("android.permission.INTERNET"));
  byte[] bytes;try(InputStream in=InstrumentationRegistry.getInstrumentation().getContext().getAssets().open("invoice-ocr.png");ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[4096];int n;while((n=in.read(b))!=-1)out.write(b,0,n);bytes=out.toByteArray();}
  CountDownLatch done=new CountDownLatch(1);AtomicReference<String> output=new AtomicReference<>(),error=new AtomicReference<>();
  InvoiceOcr ocr=new InvoiceOcr((id,text,err)->{output.set(text);error.set(err);done.countDown();});
  String id=ocr.begin(bytes.length);assertFalse(id.isEmpty());assertTrue(ocr.write(id,Base64.encodeToString(bytes,Base64.NO_WRAP)));assertTrue(ocr.recognize(id));assertTrue("offline OCR timed out",done.await(60,TimeUnit.SECONDS));
  assertEquals("",error.get());assertTrue(output.get(),output.get().replaceAll("\\s", "").contains("20260927000000000123"));assertTrue(output.get().contains("4520"));assertTrue(output.get().contains("测试建材"));ocr.close();
 }
 @Test public void notificationIsPostedAndStaleNoticeCleared() throws Exception {
  Context c=InstrumentationRegistry.getInstrumentation().getTargetContext();
  if(android.os.Build.VERSION.SDK_INT>=33)InstrumentationRegistry.getInstrumentation().getUiAutomation().grantRuntimePermission(c.getPackageName(),"android.permission.POST_NOTIFICATIONS");
  ReminderReceiver.prefs(c).edit().putBoolean("enabled",true).remove("sent-day").commit();
  ReminderReceiver.sync(c,"[{\"id\":\"test\",\"title\":\"测试质保金\",\"body\":\"待收 7000 元\",\"start\":\"2020-01-01\"}]");
  new ReminderReceiver().onReceive(c,new Intent("io.github.fuzzylogic112.zhuzhang.REMIND"));
  NotificationManager nm=c.getSystemService(NotificationManager.class);awaitNotificationCount(nm,1);
  ReminderReceiver.sync(c,"[]");awaitNotificationCount(nm,0);
  ReminderReceiver.prefs(c).edit().putBoolean("enabled",false).commit();ReminderReceiver.schedule(c);
 }
 @Test public void malformedOcrPayloadIsRejected() {
  InvoiceOcr ocr=new InvoiceOcr((id,text,error)->{});assertEquals("",ocr.begin(0));assertEquals("",ocr.begin(11000000));String id=ocr.begin(10);assertFalse(ocr.write("bad", "YWJj"));assertFalse(ocr.recognize(id));ocr.abort(id);assertFalse(ocr.begin(1).isEmpty());ocr.close();
 }
 @Test public void bundledPdfResourcesUseJavaScriptMimeAndExternalRequestsAreBlocked() throws Exception {
  Context c=InstrumentationRegistry.getInstrumentation().getTargetContext();
  androidx.webkit.WebViewAssetLoader loader=new androidx.webkit.WebViewAssetLoader.Builder().addPathHandler("/assets/",new androidx.webkit.WebViewAssetLoader.AssetsPathHandler(c)).build();
  android.webkit.WebResourceResponse worker=MainActivity.assetResponse(loader,android.net.Uri.parse("https://appassets.androidplatform.net/assets/pdf/pdf.worker.min.mjs"));
  assertEquals("text/javascript",worker.getMimeType());try(InputStream stream=worker.getData()){assertTrue(stream.read()!=-1);}
  assertEquals(403,MainActivity.assetResponse(loader,android.net.Uri.parse("https://example.com/image.png")).getStatusCode());
 }
}
