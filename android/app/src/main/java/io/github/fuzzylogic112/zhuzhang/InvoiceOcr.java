package io.github.fuzzylogic112.zhuzhang;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.webkit.JavascriptInterface;
import android.util.Base64;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions;
import java.io.ByteArrayOutputStream;
import java.util.UUID;

/** Bundled Chinese model. No model download or Internet permission. */
public final class InvoiceOcr {
    interface Result { void send(String id, String text, String error); }
    private final Result result;
    private final TextRecognizer recognizer = TextRecognition.getClient(new ChineseTextRecognizerOptions.Builder().build());
    private String token;
    private long expected;
    private ByteArrayOutputStream buffer;
    private boolean running;
    InvoiceOcr(Result result) { this.result = result; }
    @JavascriptInterface public synchronized String begin(long size) {
        if (token != null || size < 1 || size > 10 * 1024 * 1024) return "";
        token = UUID.randomUUID().toString(); expected = size; buffer = new ByteArrayOutputStream(); return token;
    }
    @JavascriptInterface public synchronized boolean write(String id, String data) {
        if (!id.equals(token) || running || buffer == null || data.length() > 300000) return false;
        try { byte[] b = Base64.decode(data, Base64.NO_WRAP); if (buffer.size() + b.length > expected) return false; buffer.write(b); return true; }
        catch (Exception e) { return false; }
    }
    @JavascriptInterface public synchronized boolean recognize(String id) {
        if (!id.equals(token) || running || buffer == null || buffer.size() != expected) return false;
        running = true;
        byte[] bytes = buffer.toByteArray(); buffer = null;
        new Thread(() -> {
            Bitmap bitmap = null;
            try {
                BitmapFactory.Options options = new BitmapFactory.Options(); options.inJustDecodeBounds = true;
                BitmapFactory.decodeByteArray(bytes, 0, bytes.length, options);
                if (options.outWidth <= 0 || options.outHeight <= 0 || (long) options.outWidth * options.outHeight > 120000000) throw new IllegalArgumentException("图片尺寸无效");
                options.inSampleSize = 1; while (Math.max(options.outWidth, options.outHeight) / options.inSampleSize > 3000) options.inSampleSize *= 2;
                options.inJustDecodeBounds = false; bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length, options);
                if (bitmap == null) throw new IllegalArgumentException("图片无法解码");
                androidx.exifinterface.media.ExifInterface exif = new androidx.exifinterface.media.ExifInterface(new java.io.ByteArrayInputStream(bytes));
                int rotation = exif.getRotationDegrees();
                final Bitmap finalBitmap = bitmap;
                recognizer.process(InputImage.fromBitmap(bitmap, rotation))
                    .addOnSuccessListener(text -> done(id, text.getText(), ""))
                    .addOnFailureListener(error -> done(id, "", "识别失败，请裁剪清晰票面后重试"))
                    .addOnCompleteListener(task -> finalBitmap.recycle());
            } catch (Exception | OutOfMemoryError e) { if (bitmap != null) bitmap.recycle(); done(id, "", "图片无法读取，请重新拍照或换一张图片"); }
        }, "invoice-ocr").start();
        return true;
    }
    private synchronized void done(String id, String text, String error) {
        if (!id.equals(token)) return;
        token = null; running = false; buffer = null; result.send(id, text, error);
    }
    @JavascriptInterface public synchronized void abort(String id) { if (id.equals(token) && !running) { token = null; buffer = null; } }
    void close() { recognizer.close(); }
}
