package com.azizi.pos;

import android.Manifest;
import android.app.AlertDialog;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;
import android.webkit.JavascriptInterface;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import com.getcapacitor.BridgeActivity;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public class MainActivity extends BridgeActivity {
    private static final int STORAGE_REQUEST = 4101;
    private static final int BLUETOOTH_REQUEST = 4102;
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private String pendingPrintBase64;
    private int pendingPrintWidth = 576;
    private Uri lastSavedUri;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getBridge() != null && getBridge().getWebView() != null)
            getBridge().getWebView().addJavascriptInterface(new NativeBridge(), "Android");
    }

    private boolean hasBluetoothPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        return ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
                && ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestBluetoothPermissionInternal() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !hasBluetoothPermission())
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT}, BLUETOOTH_REQUEST);
    }

    private void openBluetoothSettings() {
        try { startActivity(new Intent(Settings.ACTION_BLUETOOTH_SETTINGS)); }
        catch (Exception e) { try { startActivity(new Intent(Settings.ACTION_SETTINGS)); } catch (Exception ignored) {} }
    }

    private void showPrinterPicker(final String imageBase64, final int preferredWidth) {
        runOnUiThread(() -> {
            if (!hasBluetoothPermission()) {
                pendingPrintBase64 = imageBase64; pendingPrintWidth = preferredWidth;
                requestBluetoothPermissionInternal(); return;
            }
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter == null) { showMessage("البلوتوث غير متوفر", "هذا الهاتف لا يدعم البلوتوث."); return; }
            if (!adapter.isEnabled()) {
                new AlertDialog.Builder(this).setTitle("تشغيل البلوتوث")
                        .setMessage("يجب تشغيل البلوتوث لاختيار الطابعة الحرارية الصغيرة.")
                        .setPositiveButton("فتح إعدادات البلوتوث", (d,w) -> openBluetoothSettings())
                        .setNegativeButton("إلغاء", null).show(); return;
            }
            Set<BluetoothDevice> bonded = adapter.getBondedDevices();
            if (bonded == null || bonded.isEmpty()) {
                new AlertDialog.Builder(this).setTitle("لا توجد طابعة مقترنة")
                        .setMessage("قم بإقران الطابعة الحرارية الصغيرة من إعدادات البلوتوث أولاً، ثم عد للتطبيق.")
                        .setPositiveButton("فتح إعدادات البلوتوث", (d,w) -> openBluetoothSettings())
                        .setNegativeButton("إلغاء", null).show(); return;
            }
            final List<BluetoothDevice> devices = new ArrayList<>(bonded);
            final String[] names = new String[devices.size()];
            for (int i=0;i<devices.size();i++) {
                String name;
                try { name = devices.get(i).getName(); } catch (SecurityException e) { name = null; }
                names[i] = (name == null || name.trim().isEmpty()) ? "طابعة حرارية" : name;
            }
            new AlertDialog.Builder(this).setTitle("اختر الطابعة الحرارية الصغيرة")
                    .setItems(names, (dialog, which) -> printToDevice(devices.get(which), imageBase64, preferredWidth))
                    .setNeutralButton("إعدادات البلوتوث", (d,w) -> openBluetoothSettings())
                    .setNegativeButton("إلغاء", null).show();
        });
    }

    private void printToDevice(final BluetoothDevice device, final String imageBase64, final int preferredWidth) {
        new Thread(() -> {
            BluetoothSocket socket = null;
            try {
                if (!hasBluetoothPermission()) throw new SecurityException("Bluetooth permission denied");
                try { BluetoothAdapter.getDefaultAdapter().cancelDiscovery(); } catch (Exception ignored) {}
                socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                socket.connect();
                OutputStream out = socket.getOutputStream();
                byte[] image = android.util.Base64.decode(imageBase64, android.util.Base64.DEFAULT);
                Bitmap bitmap = BitmapFactory.decodeByteArray(image, 0, image.length);
                if (bitmap == null) throw new IllegalArgumentException("Invalid receipt image");
                int targetWidth = preferredWidth <= 384 ? 384 : 576;
                Bitmap scaled = scaleForPrinter(bitmap, targetWidth);
                out.write(new byte[]{0x1B,0x40});
                out.write(new byte[]{0x1B,0x61,0x01});
                out.write(bitmapToEscPosRaster(scaled));
                out.write(new byte[]{0x1B,0x61,0x00});
                out.write(new byte[]{0x1B,0x64,0x04});
                out.write(new byte[]{0x1D,0x56,0x00});
                out.flush();
                String name = device.getName();
                toastToWeb("تمت الطباعة الحرارية بنجاح عبر " + ((name==null||name.isEmpty())?"الطابعة":name));
            } catch (Exception e) {
                toastToWeb("فشل الطباعة الحرارية: " + (e.getMessage()==null?"تعذر الاتصال بالطابعة":e.getMessage()));
            } finally { if (socket != null) try { socket.close(); } catch (Exception ignored) {} }
        }).start();
    }

    private Bitmap scaleForPrinter(Bitmap source, int targetWidth) {
        if (source.getWidth() == targetWidth) return source;
        int targetHeight = Math.max(1, Math.round(source.getHeight() * (targetWidth / (float)source.getWidth())));
        return Bitmap.createScaledBitmap(source, targetWidth, targetHeight, true);
    }

    private byte[] bitmapToEscPosRaster(Bitmap bitmap) throws Exception {
        int width=bitmap.getWidth(), height=bitmap.getHeight(), bytesPerRow=(width+7)/8;
        ByteArrayOutputStream data=new ByteArrayOutputStream(bytesPerRow*height+8);
        data.write(0x1D); data.write(0x76); data.write(0x30); data.write(0x00);
        data.write(bytesPerRow&0xFF); data.write((bytesPerRow>>8)&0xFF);
        data.write(height&0xFF); data.write((height>>8)&0xFF);
        for(int y=0;y<height;y++) for(int xb=0;xb<bytesPerRow;xb++) {
            int value=0;
            for(int bit=0;bit<8;bit++) { int x=xb*8+bit; if(x>=width) continue;
                int p=bitmap.getPixel(x,y), r=(p>>16)&255, g=(p>>8)&255, b=p&255;
                int gray=(r*299+g*587+b*114)/1000; if(gray<180) value|=(0x80>>bit);
            }
            data.write(value);
        }
        return data.toByteArray();
    }

    private void showMessage(String title,String message) {
        runOnUiThread(() -> new AlertDialog.Builder(this).setTitle(title).setMessage(message).setPositiveButton("حسناً",null).show());
    }

    private void toastToWeb(String message) {
        if (getBridge()==null || getBridge().getWebView()==null) return;
        String js="window.dispatchEvent(new CustomEvent('azizi-native-message',{detail:"+org.json.JSONObject.quote(message)+"}));";
        getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(js,null));
    }

    private String normalizePhone(String phone) {
        if (phone == null) return "";
        String p = phone.replaceAll("[^0-9]", "");
        if (p.startsWith("00")) p = p.substring(2);
        if (p.startsWith("0") && p.length() == 10) p = "967" + p.substring(1);
        else if (p.length() == 9 && p.startsWith("7")) p = "967" + p;
        return p;
    }

    private Uri createShareFile(byte[] data, String fileName, String mimeType) throws Exception {
        File dir = new File(getCacheDir(), "whatsapp-share");
        if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("Cannot create share cache");
        File file = new File(dir, fileName.replaceAll("[^A-Za-z0-9._-]", "_") + ".share");
        try (FileOutputStream out = new FileOutputStream(file)) { out.write(data); }
        return FileProvider.getUriForFile(this, getPackageName()+".fileprovider", file);
    }

    public class NativeBridge {
        @JavascriptInterface public boolean requestStoragePermission() {
            if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.Q) return true;
            if(ContextCompat.checkSelfPermission(MainActivity.this,Manifest.permission.WRITE_EXTERNAL_STORAGE)==PackageManager.PERMISSION_GRANTED) return true;
            ActivityCompat.requestPermissions(MainActivity.this,new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE,Manifest.permission.READ_EXTERNAL_STORAGE},STORAGE_REQUEST);
            return false;
        }
        @JavascriptInterface public boolean requestBluetoothPermission() {
            if(Build.VERSION.SDK_INT<Build.VERSION_CODES.S || hasBluetoothPermission()) return true;
            requestBluetoothPermissionInternal(); return false;
        }
        @JavascriptInterface public boolean printBluetoothImage(String base64Png,int preferredWidth) {
            if(base64Png==null||base64Png.isEmpty()) return false;
            pendingPrintBase64=base64Png; pendingPrintWidth=preferredWidth;
            if(!hasBluetoothPermission()){ requestBluetoothPermissionInternal(); return true; }
            showPrinterPicker(base64Png,preferredWidth); return true;
        }
        @JavascriptInterface public boolean saveFileToDownloads(String base64,String fileName,String mimeType) {
            try {
                byte[] data=android.util.Base64.decode(base64,android.util.Base64.DEFAULT);
                String folder=Environment.DIRECTORY_DOWNLOADS+"/بقالة العزي للمواد الغذائية";
                if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.Q){
                    ContentValues v=new ContentValues();
                    v.put(MediaStore.Downloads.DISPLAY_NAME,fileName);
                    v.put(MediaStore.Downloads.MIME_TYPE,mimeType);
                    v.put(MediaStore.Downloads.RELATIVE_PATH,folder);
                    v.put(MediaStore.Downloads.IS_PENDING,1);
                    Uri uri=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,v);
                    if(uri==null)return false;
                    try(OutputStream out=getContentResolver().openOutputStream(uri)){if(out==null)throw new IllegalStateException();out.write(data);}
                    ContentValues done=new ContentValues();done.put(MediaStore.Downloads.IS_PENDING,0);getContentResolver().update(uri,done,null,null);
                    lastSavedUri=uri;return true;
                }
                if(ContextCompat.checkSelfPermission(MainActivity.this,Manifest.permission.WRITE_EXTERNAL_STORAGE)!=PackageManager.PERMISSION_GRANTED){requestStoragePermission();return false;}
                File dir=new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),"بقالة العزي للمواد الغذائية");
                if(!dir.exists()&&!dir.mkdirs())return false;
                File target=new File(dir,fileName);
                try(FileOutputStream out=new FileOutputStream(target)){out.write(data);}
                lastSavedUri=FileProvider.getUriForFile(MainActivity.this,getPackageName()+".fileprovider",target);return true;
            }catch(Exception e){return false;}
        }
        @JavascriptInterface public boolean openLastSavedFile(String fileName,String mimeType) {
            try { Uri uri=lastSavedUri;
                if(uri==null&&Build.VERSION.SDK_INT>=Build.VERSION_CODES.Q){
                    String sel=MediaStore.Downloads.DISPLAY_NAME+"=? AND "+MediaStore.Downloads.RELATIVE_PATH+"=?";
                    String[] args={fileName,Environment.DIRECTORY_DOWNLOADS+"/بقالة العزي للمواد الغذائية"};
                    try(android.database.Cursor c=getContentResolver().query(MediaStore.Downloads.EXTERNAL_CONTENT_URI,new String[]{MediaStore.Downloads._ID},sel,args,null)){
                        if(c!=null&&c.moveToFirst())uri=Uri.withAppendedPath(MediaStore.Downloads.EXTERNAL_CONTENT_URI,String.valueOf(c.getLong(c.getColumnIndexOrThrow(MediaStore.Downloads._ID))));
                    }
                }
                if(uri==null)return false;
                Intent i=new Intent(Intent.ACTION_VIEW);i.setDataAndType(uri,mimeType==null?"application/octet-stream":mimeType);i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_ACTIVITY_NEW_TASK);startActivity(i);return true;
            }catch(Exception e){return false;}
        }
        @JavascriptInterface public boolean shareFileToWhatsApp(String base64,String fileName,String mimeType,String phone,String text) {
            try {
                byte[] data=android.util.Base64.decode(base64,android.util.Base64.DEFAULT);
                Uri uri=createShareFile(data,fileName,mimeType);
                Intent send=new Intent(Intent.ACTION_SEND);
                send.setType(mimeType==null?"application/octet-stream":mimeType);
                send.putExtra(Intent.EXTRA_STREAM,uri);
                if(text!=null&&!text.isEmpty())send.putExtra(Intent.EXTRA_TEXT,text);
                String p=normalizePhone(phone);
                if(p.length()>0)send.putExtra("jid",p+"@s.whatsapp.net");
                send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_ACTIVITY_NEW_TASK);
                try { send.setPackage("com.whatsapp"); startActivity(send); }
                catch(Exception noWhatsApp) { send.setPackage(null); startActivity(Intent.createChooser(send,"مشاركة عبر واتساب أو تطبيق آخر")); }
                return true;
            } catch(Exception e) { toastToWeb("تعذر إرفاق الملف بواتساب: "+(e.getMessage()==null?"خطأ غير معروف":e.getMessage())); return false; }
        }
    }

    @Override public void onRequestPermissionsResult(int requestCode,@NonNull String[] permissions,@NonNull int[] grantResults){
        super.onRequestPermissionsResult(requestCode,permissions,grantResults);
        if(requestCode==BLUETOOTH_REQUEST){boolean granted=grantResults.length>0;for(int r:grantResults)if(r!=PackageManager.PERMISSION_GRANTED)granted=false;if(granted&&pendingPrintBase64!=null){String image=pendingPrintBase64;int width=pendingPrintWidth;pendingPrintBase64=null;showPrinterPicker(image,width);}else if(!granted)toastToWeb("تم رفض إذن البلوتوث والأجهزة المجاورة.");}
    }
}
