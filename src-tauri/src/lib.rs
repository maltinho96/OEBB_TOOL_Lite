// Desktop-Hülle für das ÖBB-Tool.
//
// Die Oberfläche ist dieselbe Web-App wie auf GitHub Pages. Statt der
// File System Access API des Browsers greift sie hier über die Befehle unten
// direkt auf Ordner zu (src/core/storage/tauri.js). Der Grundordner steht in
// oebb-konfig.txt – damit muss niemand mehr einen Ordner auswählen.
//
// oebb-konfig.txt wird gesucht:
//   1. neben dem Programm (z. B. von der IT für alle hinterlegt)
//   2. im Einstellungsordner des Benutzers (%APPDATA%\de.nettec.oebbtool\)
// Inhalt:  Grundordner=\\server\Projekte\ÖBB

use base64::Engine;
use serde::Serialize;
use std::fs;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use tauri::Manager;

const KONFIG_DATEI: &str = "oebb-konfig.txt";

fn fehler<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

// Nur einfache Dateinamen – kein "..", keine Pfadtrenner.
fn pfad_in(ordner: &str, name: &str) -> Result<PathBuf, String> {
    if name.is_empty() || name.contains('/') || name.contains('\\') || name == "." || name == ".." {
        return Err(format!("Ungültiger Dateiname: {name}"));
    }
    Ok(Path::new(ordner).join(name))
}

fn konfig_kandidaten(app: &tauri::AppHandle) -> Vec<PathBuf> {
    let mut v = Vec::new();
    if let Ok(exe) = std::env::current_exe() {
        if let Some(d) = exe.parent() {
            v.push(d.join(KONFIG_DATEI));
        }
    }
    if let Ok(d) = app.path().app_config_dir() {
        v.push(d.join(KONFIG_DATEI));
    }
    v
}

fn pfad_aus_konfig(text: &str) -> Option<String> {
    for zeile in text.lines() {
        let z = zeile.trim();
        if z.starts_with('#') {
            continue;
        }
        if let Some((k, w)) = z.split_once('=') {
            let k = k.trim().to_lowercase();
            if k == "grundordner" || k == "pfad" {
                let w = w.trim().trim_matches('"').to_string();
                if !w.is_empty() {
                    return Some(w);
                }
            }
        }
    }
    None
}

#[derive(Serialize)]
struct Konfig {
    grundordner: Option<String>,
    datei: Option<String>,
    benutzer_datei: String,
}

#[tauri::command]
fn konfig_lesen(app: tauri::AppHandle) -> Konfig {
    let kandidaten = konfig_kandidaten(&app);
    let benutzer_datei = kandidaten.last().map(|p| p.display().to_string()).unwrap_or_default();
    for k in &kandidaten {
        if let Ok(t) = fs::read_to_string(k) {
            if let Some(p) = pfad_aus_konfig(&t) {
                return Konfig { grundordner: Some(p), datei: Some(k.display().to_string()), benutzer_datei };
            }
        }
    }
    Konfig { grundordner: None, datei: None, benutzer_datei }
}

#[tauri::command]
fn konfig_speichern(app: tauri::AppHandle, grundordner: String) -> Result<String, String> {
    let d = app.path().app_config_dir().map_err(fehler)?;
    fs::create_dir_all(&d).map_err(fehler)?;
    let datei = d.join(KONFIG_DATEI);
    let text = format!(
        "# ÖBB-Tool: Pfad des gemeinsamen Grundordners (Datenbank, firmen.txt, logos …)\r\n\
         # Diese Datei kann für alle gleich verteilt werden.\r\n\
         Grundordner={grundordner}\r\n"
    );
    fs::write(&datei, text).map_err(fehler)?;
    Ok(datei.display().to_string())
}

#[tauri::command]
fn ordner_existiert(pfad: String) -> bool {
    Path::new(&pfad).is_dir()
}

#[tauri::command]
fn datei_lesen(ordner: String, name: String) -> Result<Option<String>, String> {
    let p = pfad_in(&ordner, &name)?;
    match fs::read(&p) {
        Ok(b) => Ok(Some(String::from_utf8_lossy(&b).into_owned())),
        // Nur "gibt es nicht" ist ein leeres Ergebnis. Andere Fehler (Datei
        // gesperrt, Netzlaufwerk weg) werden gemeldet – sonst sähe eine
        // unlesbare Datenbank wie eine leere aus.
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("{name} konnte nicht gelesen werden: {e}")),
    }
}

#[tauri::command]
fn datei_lesen_base64(ordner: String, name: String) -> Result<Option<String>, String> {
    let p = pfad_in(&ordner, &name)?;
    match fs::read(&p) {
        Ok(b) => Ok(Some(base64::engine::general_purpose::STANDARD.encode(b))),
        Err(_) => Ok(None),
    }
}

#[tauri::command]
fn datei_schreiben(ordner: String, name: String, text: String) -> Result<(), String> {
    let p = pfad_in(&ordner, &name)?;
    // Erst in eine Hilfsdatei, dann umbenennen: eine halb geschriebene
    // Datenbank bleibt so nie zurück (z. B. bei Netzwerkabbruch).
    let tmp = pfad_in(&ordner, &format!("{name}.schreiben"))?;
    fs::write(&tmp, text.as_bytes()).map_err(fehler)?;
    if fs::rename(&tmp, &p).is_err() {
        // Manche Netzlaufwerke erlauben kein Überschreiben per rename.
        fs::write(&p, text.as_bytes()).map_err(fehler)?;
        let _ = fs::remove_file(&tmp);
    }
    Ok(())
}

#[tauri::command]
fn datei_loeschen(ordner: String, name: String) -> Result<(), String> {
    let p = pfad_in(&ordner, &name)?;
    let _ = fs::remove_file(p);
    Ok(())
}

#[tauri::command]
fn unterordner(ordner: String, name: String) -> Result<String, String> {
    let p = pfad_in(&ordner, &name)?;
    fs::create_dir_all(&p).map_err(fehler)?;
    Ok(p.display().to_string())
}

// Speichern-Dialog-Ziel: ganzer Pfad (kommt aus dem Speichern-Dialog).
#[tauri::command]
fn pfad_schreiben(pfad: String, text: Option<String>, base64: Option<String>) -> Result<(), String> {
    let daten = match (text, base64) {
        (Some(t), _) => t.into_bytes(),
        (None, Some(b)) => base64::engine::general_purpose::STANDARD.decode(b).map_err(fehler)?,
        _ => return Err("Kein Inhalt".into()),
    };
    fs::write(pfad, daten).map_err(fehler)
}

// Namen im Ordner (eine Ebene) – für die Einrichtung: leer, bestehender
// Grundordner oder fremder Ordner?
#[tauri::command]
fn ordner_inhalt(pfad: String) -> Result<Vec<String>, String> {
    let mut namen = Vec::new();
    for e in fs::read_dir(&pfad).map_err(fehler)?.flatten() {
        namen.push(e.file_name().to_string_lossy().into_owned());
    }
    Ok(namen)
}

// Logo bei der Einrichtung in den Grundordner kopieren.
#[tauri::command]
fn datei_kopieren(quelle: String, ordner: String, name: String) -> Result<(), String> {
    let ziel = pfad_in(&ordner, &name)?;
    fs::copy(quelle, ziel).map_err(fehler)?;
    Ok(())
}

#[derive(Serialize)]
struct Treffer {
    pfad: String,
    kopf: String,
    geaendert: u64,
}

#[derive(Serialize)]
struct ScanErgebnis {
    treffer: Vec<Treffer>,
    geprueft: u32,
}

fn teil_lesen(p: &Path, start: u64, laenge: usize) -> String {
    let mut puffer = vec![0u8; laenge];
    let Ok(mut f) = fs::File::open(p) else { return String::new() };
    if f.seek(SeekFrom::Start(start)).is_err() {
        return String::new();
    }
    let n = f.read(&mut puffer).unwrap_or(0);
    puffer.truncate(n);
    String::from_utf8_lossy(&puffer).into_owned()
}

// Wie scanneHtmlDateien in fsa.js: HTML-Dateien bis Tiefe 3, Kopf (200 kB)
// und – falls die Metadaten dort fehlen – zusätzlich das Dateiende.
fn scannen(ordner: &Path, rel: &str, tiefe: u32, erg: &mut ScanErgebnis) {
    let Ok(eintraege) = fs::read_dir(ordner) else { return };
    for e in eintraege.flatten() {
        let name = e.file_name().to_string_lossy().into_owned();
        let Ok(meta) = e.metadata() else { continue };
        if meta.is_file() && name.to_lowercase().ends_with(".html") {
            erg.geprueft += 1;
            let p = e.path();
            let groesse = meta.len();
            let mut kopf = teil_lesen(&p, 0, 200_000);
            if !kopf.contains("id=\"protokollMeta\"") && groesse > 200_000 {
                let start = std::cmp::max(200_000, groesse.saturating_sub(400_000));
                kopf.push('\n');
                kopf.push_str(&teil_lesen(&p, start, (groesse - start) as usize));
            }
            let geaendert = meta
                .modified()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0);
            erg.treffer.push(Treffer { pfad: format!("{rel}{name}"), kopf, geaendert });
        } else if meta.is_dir() && tiefe < 3 {
            scannen(&e.path(), &format!("{rel}{name}/"), tiefe + 1, erg);
        }
    }
}

#[tauri::command]
async fn html_scannen(ordner: String) -> ScanErgebnis {
    let mut erg = ScanErgebnis { treffer: Vec::new(), geprueft: 0 };
    scannen(Path::new(&ordner), "", 0, &mut erg);
    erg
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            konfig_lesen,
            konfig_speichern,
            ordner_existiert,
            datei_lesen,
            datei_lesen_base64,
            datei_schreiben,
            datei_loeschen,
            unterordner,
            pfad_schreiben,
            html_scannen,
            ordner_inhalt,
            datei_kopieren
        ])
        .run(tauri::generate_context!())
        .expect("ÖBB-Tool konnte nicht gestartet werden");
}
