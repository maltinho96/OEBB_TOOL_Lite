package de.nettec.oebbtool;

// Android-App des ÖBB-Tools – eigenständig, ohne Chrome.
//
// Die komplette App (dieselbe wie im Browser und am PC) steckt in der APK
// (assets/www) und läuft im eingebauten Android System WebView. Diese Klasse
// ergänzt nur, was ein WebView nicht von selbst kann:
//   - Fotos: Kamera (mit Rückkamera) oder Galerie/Dateien für <input type=file>
//   - Standort für Kamerafotos (Berechtigung wird beim ersten Mal erfragt)
//   - Speichern von Protokollen/Excel über den Android-Speichern-Dialog
//   - Drucken / „Als PDF speichern“ über den Android-Druckdienst
//   - mailto:- und Internet-Links im passenden Programm öffnen
// Alles läuft lokal: es werden keine Daten an fremde Server geschickt
// (außer den Kartenkacheln von OpenStreetMap und ggf. Geodiensten).

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.content.FileProvider;
import androidx.webkit.WebViewAssetLoader;

import java.io.File;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {

    private static final String START = "https://appassets.androidplatform.net/assets/www/index.html";
    private static final String HOST = "appassets.androidplatform.net";
    private static final int REQ_DATEI = 1;
    private static final int REQ_SPEICHERN = 2;
    private static final int REQ_STANDORT = 3;

    private WebView web;
    private WebViewAssetLoader lader;

    private ValueCallback<Uri[]> dateiRueckruf;
    private Uri kameraUri;

    private GeolocationPermissions.Callback standortRueckruf;
    private String standortHerkunft;

    private byte[] speicherDaten;

    @Override
    protected void onCreate(Bundle zustand) {
        super.onCreate(zustand);
        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // localStorage, Entwürfe (IndexedDB)
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setAllowFileAccess(false);           // kein direkter Zugriff auf Dateien per file://
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSupportMultipleWindows(false);
        s.setTextZoom(100);

        lader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                return lader.shouldInterceptRequest(r.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (HOST.equals(u.getHost())) return false;     // eigene App-Seiten
                extern(u);                                      // mailto:, https:// …
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> rueckruf, FileChooserParams p) {
                if (dateiRueckruf != null) dateiRueckruf.onReceiveValue(null);
                dateiRueckruf = rueckruf;
                kameraUri = null;
                boolean bilder = false;
                for (String t : p.getAcceptTypes()) if (t != null && t.startsWith("image")) bilder = true;
                Intent i;
                if (p.isCaptureEnabled() && bilder) {
                    // „📷 Foto aufnehmen“: Kamera-App, Foto in eine eigene Datei
                    try {
                        File ordner = new File(getCacheDir(), "kamera");
                        ordner.mkdirs();
                        File f = new File(ordner, "foto_" + System.currentTimeMillis() + ".jpg");
                        kameraUri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".dateien", f);
                    } catch (Exception e) {
                        rueckruf.onReceiveValue(null);
                        dateiRueckruf = null;
                        return true;
                    }
                    i = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                    i.putExtra(MediaStore.EXTRA_OUTPUT, kameraUri);
                    i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                } else {
                    // Galerie / Dateien (Fotos, Protokoll laden, Shapefiles …)
                    i = new Intent(Intent.ACTION_GET_CONTENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType(bilder ? "image/*" : "*/*");
                    if (p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) {
                        i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    }
                }
                try {
                    startActivityForResult(i, REQ_DATEI);
                } catch (ActivityNotFoundException e) {
                    rueckruf.onReceiveValue(null);
                    dateiRueckruf = null;
                }
                return true;
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String herkunft, GeolocationPermissions.Callback rueckruf) {
                if (!HOST.equals(Uri.parse(herkunft).getHost())) { rueckruf.invoke(herkunft, false, false); return; }
                if (hatStandortRecht()) { rueckruf.invoke(herkunft, true, false); return; }
                standortRueckruf = rueckruf;
                standortHerkunft = herkunft;
                requestPermissions(new String[] {
                        Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }, REQ_STANDORT);
            }
        });

        web.addJavascriptInterface(new Bruecke(), "OebbAndroid");

        if (zustand != null) web.restoreState(zustand);
        else web.loadUrl(START);
    }

    private boolean hatStandortRecht() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void extern(Uri u) {
        try {
            Intent i = "mailto".equals(u.getScheme()) ? new Intent(Intent.ACTION_SENDTO, u) : new Intent(Intent.ACTION_VIEW, u);
            startActivity(i);
        } catch (ActivityNotFoundException e) {
            js("alert('Keine passende App zum Öffnen gefunden.')");
        }
    }

    private void js(String code) {
        runOnUiThread(() -> web.evaluateJavascript(code, null));
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] rechte, int[] ergebnis) {
        if (code == REQ_STANDORT && standortRueckruf != null) {
            standortRueckruf.invoke(standortHerkunft, hatStandortRecht(), false);
            standortRueckruf = null;
        }
    }

    @Override
    protected void onActivityResult(int code, int ergebnis, Intent daten) {
        if (code == REQ_DATEI) {
            Uri[] liste = null;
            if (ergebnis == RESULT_OK) {
                if (kameraUri != null) {
                    liste = new Uri[] { kameraUri };
                } else if (daten != null) {
                    ClipData clip = daten.getClipData();
                    if (clip != null) {
                        liste = new Uri[clip.getItemCount()];
                        for (int n = 0; n < clip.getItemCount(); n++) liste[n] = clip.getItemAt(n).getUri();
                    } else if (daten.getData() != null) {
                        liste = new Uri[] { daten.getData() };
                    }
                }
            }
            if (dateiRueckruf != null) dateiRueckruf.onReceiveValue(liste);
            dateiRueckruf = null;
            kameraUri = null;
            return;
        }
        if (code == REQ_SPEICHERN) {
            boolean ok = false;
            if (ergebnis == RESULT_OK && daten != null && daten.getData() != null && speicherDaten != null) {
                // "wt": vorhandene Datei vollständig ersetzen
                try (OutputStream o = getContentResolver().openOutputStream(daten.getData(), "wt")) {
                    o.write(speicherDaten);
                    ok = true;
                } catch (Exception e) {
                    js("alert('Speichern fehlgeschlagen: ' + " + jsText(String.valueOf(e.getMessage())) + ")");
                }
            }
            speicherDaten = null;
            js("window.__oebbAndroidGespeichert && window.__oebbAndroidGespeichert(" + ok + ")");
            return;
        }
        super.onActivityResult(code, ergebnis, daten);
    }

    private static String jsText(String s) {
        return "'" + s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ") + "'";
    }

    // Zurück-Taste: App in den Hintergrund statt beenden (Formular bleibt).
    @Override
    public void onBackPressed() {
        moveTaskToBack(true);
    }

    @Override
    protected void onSaveInstanceState(Bundle aus) {
        super.onSaveInstanceState(aus);
        web.saveState(aus);
    }

    // ---------- Brücke für die Web-App (window.OebbAndroid) ----------
    private class Bruecke {
        @JavascriptInterface
        public void speichern(String name, String mime, String inhalt, boolean istBase64) {
            speicherDaten = istBase64 ? Base64.decode(inhalt, Base64.DEFAULT) : inhalt.getBytes(StandardCharsets.UTF_8);
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType(mime);
                i.putExtra(Intent.EXTRA_TITLE, name);
                try {
                    startActivityForResult(i, REQ_SPEICHERN);
                } catch (ActivityNotFoundException e) {
                    speicherDaten = null;
                    js("window.__oebbAndroidGespeichert && window.__oebbAndroidGespeichert(false)");
                }
            });
        }

        @JavascriptInterface
        public void drucken(String titel) {
            runOnUiThread(() -> {
                PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
                PrintDocumentAdapter innen = web.createPrintDocumentAdapter(titel);
                PrintDocumentAdapter aussen = new PrintDocumentAdapter() {
                    @Override public void onStart() { innen.onStart(); }
                    @Override public void onLayout(PrintAttributes a, PrintAttributes b, CancellationSignal c, LayoutResultCallback r, Bundle x) { innen.onLayout(a, b, c, r, x); }
                    @Override public void onWrite(PageRange[] p, ParcelFileDescriptor d, CancellationSignal c, WriteResultCallback r) { innen.onWrite(p, d, c, r); }
                    @Override public void onFinish() {
                        innen.onFinish();
                        js("window.__oebbAndroidDruckFertig && window.__oebbAndroidDruckFertig()");
                    }
                };
                PrintAttributes.Builder a = new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4);
                pm.print(titel, aussen, a.build());
            });
        }

        @JavascriptInterface
        public String version() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "";
            }
        }
    }
}
