// Desktop-Hülle für das ÖBB-Tool.
//
// Die Oberfläche ist dieselbe Web-App wie auf GitHub Pages. Statt der
// File System Access API des Browsers greift sie hier über die Befehle unten
// direkt auf Ordner zu (src/core/storage/tauri.js). Der Grundordner steht in
// oebb-konfig.txt – damit muss niemand mehr einen Ordner auswählen.
//
// oebb-konfig.txt wird gesucht:
//   1. neben dem Programm (z. B. von der IT für alle hinterlegt)
//   2. im Einstellungsordner des Benutzers (Windows: %APPDATA%\de.nettec.oebbtool\,
//      Ubuntu: ~/.config/de.nettec.oebbtool/) – legt die Einrichtung an
//   (Ubuntu zusätzlich zuerst: /etc/oebb-tool/oebb-konfig.txt)
// Inhalt:  Grundordner=\\server\Projekte\ÖBB

use base64::Engine;
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;
use std::time::UNIX_EPOCH;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

// ---------- Zugriffsschutz ----------
//
// Die Oberfläche (Web-Inhalt) darf NICHT auf beliebige Pfade zugreifen.
// Erlaubt sind nur:
//   - der Grundordner aus oebb-konfig.txt
//   - Ordner, die der Mensch in einem Ordner-Dialog gewählt hat (die Dialoge
//     öffnet dieses Programm selbst, nicht die Oberfläche) – Projektordner
//     werden dafür in projektordner.json gemerkt
//   - einzelne Dateien aus einem Datei-/Speichern-Dialog (Logo, Protokoll)
// So bleibt der Schaden begrenzt, selbst wenn fremder Code in die Oberfläche
// gelangen sollte.
#[derive(Default)]
struct Zugriff {
    wurzeln: Mutex<Vec<PathBuf>>,
    dateien: Mutex<Vec<PathBuf>>,
}

fn wurzel_merken(z: &Zugriff, pfad: &str) {
    let mut w = z.wurzeln.lock().unwrap();
    let roh = PathBuf::from(pfad);
    if let Ok(echt) = fs::canonicalize(&roh) {
        if !w.contains(&echt) {
            w.push(echt);
        }
    }
    if !w.contains(&roh) {
        w.push(roh);
    }
}

fn datei_merken(z: &Zugriff, pfad: &Path) {
    let mut d = z.dateien.lock().unwrap();
    if !d.contains(&pfad.to_path_buf()) {
        d.push(pfad.to_path_buf());
    }
}

fn ordner_erlaubt(z: &Zugriff, ordner: &str) -> Result<(), String> {
    let roh = Path::new(ordner);
    if roh.components().any(|c| matches!(c, Component::ParentDir)) {
        return Err("Ungültiger Pfad".into());
    }
    let w = z.wurzeln.lock().unwrap();
    // Wenn der Ordner erreichbar ist, zählt sein echter Pfad (Verknüpfungen
    // aufgelöst); sonst (z. B. Netzlaufwerk gerade weg) der angegebene.
    let ok = match fs::canonicalize(roh) {
        Ok(echt) => w.iter().any(|r| echt.starts_with(r)),
        Err(_) => w.iter().any(|r| roh.starts_with(r)),
    };
    if ok {
        Ok(())
    } else {
        Err(format!("Kein Zugriff auf {ordner} (Ordner ist nicht freigegeben)"))
    }
}

fn datei_erlaubt(z: &Zugriff, pfad: &str) -> Result<(), String> {
    if z.dateien.lock().unwrap().iter().any(|d| d == Path::new(pfad)) {
        Ok(())
    } else {
        Err(format!("Kein Zugriff auf {pfad} (Datei wurde nicht im Dialog gewählt)"))
    }
}

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
    // Linux: zentral für alle Benutzer des Rechners (vom Admin hinterlegt)
    #[cfg(target_os = "linux")]
    v.push(PathBuf::from("/etc/oebb-tool").join(KONFIG_DATEI));
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

// Ubuntu: wurde das Paket seit der Einrichtung deinstalliert (Marke aus
// postrm.sh neuer als die Einrichtungsdatei), gilt die alte Einrichtung
// nicht mehr – sie wird entfernt und die Einrichtung startet neu.
#[cfg(target_os = "linux")]
fn veraltet(k: &Path) -> bool {
    let marke = Path::new("/var/lib/oebb-tool/deinstalliert");
    let zeit = |p: &Path| fs::metadata(p).and_then(|m| m.modified()).ok();
    match (zeit(marke), zeit(k)) {
        (Some(m), Some(z)) => m > z,
        _ => false,
    }
}
#[cfg(not(target_os = "linux"))]
fn veraltet(_k: &Path) -> bool {
    false
}

#[tauri::command]
fn konfig_lesen(app: tauri::AppHandle, z: tauri::State<Zugriff>) -> Konfig {
    let kandidaten = konfig_kandidaten(&app);
    let benutzer_datei = kandidaten.last().map(|p| p.display().to_string()).unwrap_or_default();
    if let Some(eigene) = kandidaten.last() {
        if veraltet(eigene) {
            let _ = fs::remove_file(eigene);
            if let Some(d) = eigene.parent() {
                let _ = fs::remove_file(d.join(PROJEKTORDNER_DATEI));
            }
        }
    }
    for k in &kandidaten {
        if let Ok(t) = fs::read_to_string(k) {
            if let Some(p) = pfad_aus_konfig(&t) {
                wurzel_merken(&z, &p);
                return Konfig { grundordner: Some(p), datei: Some(k.display().to_string()), benutzer_datei };
            }
        }
    }
    Konfig { grundordner: None, datei: None, benutzer_datei }
}

#[tauri::command]
fn konfig_speichern(app: tauri::AppHandle, z: tauri::State<Zugriff>, grundordner: String) -> Result<String, String> {
    // Nur ein Ordner, den der Mensch gerade im Dialog gewählt hat.
    ordner_erlaubt(&z, &grundordner)?;
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
fn ordner_existiert(z: tauri::State<Zugriff>, pfad: String) -> bool {
    ordner_erlaubt(&z, &pfad).is_ok() && Path::new(&pfad).is_dir()
}

// ---------- Dialoge (öffnet das Programm, nicht die Oberfläche) ----------

#[tauri::command]
async fn ordner_waehlen(
    app: tauri::AppHandle,
    z: tauri::State<'_, Zugriff>,
    titel: String,
    start: Option<String>,
) -> Result<Option<String>, String> {
    let mut d = app.dialog().file().set_title(&titel);
    if let Some(s) = start {
        d = d.set_directory(s);
    }
    match d.blocking_pick_folder().and_then(|f| f.into_path().ok()) {
        Some(p) => {
            let s = p.display().to_string();
            wurzel_merken(&z, &s);
            Ok(Some(s))
        }
        None => Ok(None),
    }
}

#[tauri::command]
async fn datei_waehlen(
    app: tauri::AppHandle,
    z: tauri::State<'_, Zugriff>,
    titel: String,
    name: String,
    endungen: Vec<String>,
) -> Result<Option<String>, String> {
    let e: Vec<&str> = endungen.iter().map(|s| s.as_str()).collect();
    let wahl = app.dialog().file().set_title(&titel).add_filter(&name, &e).blocking_pick_file();
    match wahl.and_then(|f| f.into_path().ok()) {
        Some(p) => {
            datei_merken(&z, &p);
            Ok(Some(p.display().to_string()))
        }
        None => Ok(None),
    }
}

#[tauri::command]
async fn speicherort_waehlen(
    app: tauri::AppHandle,
    z: tauri::State<'_, Zugriff>,
    vorschlag: String,
    start: Option<String>,
    name: String,
    endungen: Vec<String>,
) -> Result<Option<String>, String> {
    let e: Vec<&str> = endungen.iter().map(|s| s.as_str()).collect();
    let mut d = app.dialog().file().set_file_name(&vorschlag).add_filter(&name, &e);
    if let Some(s) = start {
        d = d.set_directory(s);
    }
    match d.blocking_save_file().and_then(|f| f.into_path().ok()) {
        Some(p) => {
            datei_merken(&z, &p);
            Ok(Some(p.display().to_string()))
        }
        None => Ok(None),
    }
}

// ---------- Projektordner (je Projekt-ID ein gewählter Ordner) ----------

const PROJEKTORDNER_DATEI: &str = "projektordner.json";

fn projektordner_pfad(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app.path().app_config_dir().map_err(fehler)?.join(PROJEKTORDNER_DATEI))
}

fn projektordner_laden(app: &tauri::AppHandle) -> HashMap<String, String> {
    projektordner_pfad(app)
        .ok()
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|t| serde_json::from_str(&t).ok())
        .unwrap_or_default()
}

#[tauri::command]
fn projektordner_lesen(app: tauri::AppHandle, z: tauri::State<Zugriff>) -> HashMap<String, String> {
    let m = projektordner_laden(&app);
    for p in m.values() {
        wurzel_merken(&z, p);
    }
    m
}

#[tauri::command]
fn projektordner_setzen(app: tauri::AppHandle, z: tauri::State<Zugriff>, id: String, pfad: String) -> Result<(), String> {
    ordner_erlaubt(&z, &pfad)?; // muss gerade im Dialog gewählt worden sein
    let mut m = projektordner_laden(&app);
    m.insert(id, pfad);
    let datei = projektordner_pfad(&app)?;
    if let Some(d) = datei.parent() {
        fs::create_dir_all(d).map_err(fehler)?;
    }
    fs::write(datei, serde_json::to_string_pretty(&m).map_err(fehler)?).map_err(fehler)
}

#[tauri::command]
fn datei_lesen(z: tauri::State<Zugriff>, ordner: String, name: String) -> Result<Option<String>, String> {
    ordner_erlaubt(&z, &ordner)?;
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
fn datei_lesen_base64(z: tauri::State<Zugriff>, ordner: String, name: String) -> Result<Option<String>, String> {
    ordner_erlaubt(&z, &ordner)?;
    let p = pfad_in(&ordner, &name)?;
    match fs::read(&p) {
        Ok(b) => Ok(Some(base64::engine::general_purpose::STANDARD.encode(b))),
        Err(_) => Ok(None),
    }
}

#[tauri::command]
fn datei_schreiben(z: tauri::State<Zugriff>, ordner: String, name: String, text: String) -> Result<(), String> {
    ordner_erlaubt(&z, &ordner)?;
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
fn datei_loeschen(z: tauri::State<Zugriff>, ordner: String, name: String) -> Result<(), String> {
    ordner_erlaubt(&z, &ordner)?;
    let p = pfad_in(&ordner, &name)?;
    let _ = fs::remove_file(p);
    Ok(())
}

#[tauri::command]
fn unterordner(z: tauri::State<Zugriff>, ordner: String, name: String) -> Result<String, String> {
    ordner_erlaubt(&z, &ordner)?;
    let p = pfad_in(&ordner, &name)?;
    fs::create_dir_all(&p).map_err(fehler)?;
    Ok(p.display().to_string())
}

// Speichern-Dialog-Ziel: ganzer Pfad (kommt aus dem Speichern-Dialog).
#[tauri::command]
fn pfad_schreiben(z: tauri::State<Zugriff>, pfad: String, text: Option<String>, base64: Option<String>) -> Result<(), String> {
    datei_erlaubt(&z, &pfad)?; // nur ein Ziel aus dem Speichern-Dialog
    let daten = match (text, base64) {
        (Some(t), _) => t.into_bytes(),
        (None, Some(b)) => base64::engine::general_purpose::STANDARD.decode(b).map_err(fehler)?,
        _ => return Err("Kein Inhalt".into()),
    };
    // Erst in eine Hilfsdatei, dann umbenennen – so bleibt bei einem Abbruch
    // (Netz weg, Platte voll) keine halbe oder leere Protokolldatei zurück.
    let ziel = PathBuf::from(&pfad);
    let tmp = PathBuf::from(format!("{pfad}.schreiben"));
    fs::write(&tmp, &daten).map_err(fehler)?;
    if fs::rename(&tmp, &ziel).is_err() {
        let ergebnis = fs::write(&ziel, &daten).map_err(fehler);
        let _ = fs::remove_file(&tmp);
        ergebnis?;
    }
    Ok(())
}

// Namen im Ordner (eine Ebene) – für die Einrichtung: leer, bestehender
// Grundordner oder fremder Ordner?
#[tauri::command]
fn ordner_inhalt(z: tauri::State<Zugriff>, pfad: String) -> Result<Vec<String>, String> {
    ordner_erlaubt(&z, &pfad)?;
    let mut namen = Vec::new();
    for e in fs::read_dir(&pfad).map_err(fehler)?.flatten() {
        namen.push(e.file_name().to_string_lossy().into_owned());
    }
    Ok(namen)
}

// Logo bei der Einrichtung in den Grundordner kopieren.
#[tauri::command]
fn datei_kopieren(z: tauri::State<Zugriff>, quelle: String, ordner: String, name: String) -> Result<(), String> {
    datei_erlaubt(&z, &quelle)?; // Quelle kommt aus dem Datei-Dialog
    ordner_erlaubt(&z, &ordner)?;
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
async fn html_scannen(z: tauri::State<'_, Zugriff>, ordner: String) -> Result<ScanErgebnis, String> {
    ordner_erlaubt(&z, &ordner)?;
    let mut erg = ScanErgebnis { treffer: Vec::new(), geprueft: 0 };
    scannen(Path::new(&ordner), "", 0, &mut erg);
    Ok(erg)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Zugriff::default())
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
            datei_kopieren,
            ordner_waehlen,
            datei_waehlen,
            speicherort_waehlen,
            projektordner_lesen,
            projektordner_setzen
        ])
        .run(tauri::generate_context!())
        .expect("ÖBB-Tool konnte nicht gestartet werden");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn zugriff_nur_in_freigegebenen_ordnern() {
        let basis = std::env::temp_dir().join(format!("oebb-test-{}", std::process::id()));
        let frei = basis.join("grund");
        let fremd = basis.join("fremd");
        fs::create_dir_all(frei.join("logos")).unwrap();
        fs::create_dir_all(&fremd).unwrap();
        let z = Zugriff::default();
        wurzel_merken(&z, frei.to_str().unwrap());

        assert!(ordner_erlaubt(&z, frei.to_str().unwrap()).is_ok());
        assert!(ordner_erlaubt(&z, frei.join("logos").to_str().unwrap()).is_ok());
        // noch nicht vorhandener Unterordner im freigegebenen Ordner
        assert!(ordner_erlaubt(&z, frei.join("backups").to_str().unwrap()).is_ok());
        // fremder Ordner, ".."-Trick, Namensvetter ("grund2")
        assert!(ordner_erlaubt(&z, fremd.to_str().unwrap()).is_err());
        assert!(ordner_erlaubt(&z, frei.join("..").join("fremd").to_str().unwrap()).is_err());
        assert!(ordner_erlaubt(&z, basis.join("grund2").to_str().unwrap()).is_err());
        assert!(ordner_erlaubt(&z, "/etc").is_err());

        // Verknüpfung im freigegebenen Ordner, die nach draußen zeigt
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(&fremd, frei.join("raus")).unwrap();
            assert!(ordner_erlaubt(&z, frei.join("raus").to_str().unwrap()).is_err());
        }

        // Dateien: nur aus dem Dialog
        assert!(datei_erlaubt(&z, fremd.join("x.html").to_str().unwrap()).is_err());
        datei_merken(&z, &fremd.join("x.html"));
        assert!(datei_erlaubt(&z, fremd.join("x.html").to_str().unwrap()).is_ok());
        assert!(datei_erlaubt(&z, fremd.join("y.html").to_str().unwrap()).is_err());

        // Dateinamen ohne Pfadanteile
        assert!(pfad_in("/a", "ok.txt").is_ok());
        assert!(pfad_in("/a", "../x").is_err());
        assert!(pfad_in("/a", "b/c").is_err());
        let _ = fs::remove_dir_all(basis);
    }

    #[test]
    fn konfig_zeile_lesen() {
        assert_eq!(pfad_aus_konfig("# x\nGrundordner=\\\\srv\\a b\n"), Some("\\\\srv\\a b".to_string()));
        assert_eq!(pfad_aus_konfig("Pfad = \"/mnt/x\""), Some("/mnt/x".to_string()));
        assert_eq!(pfad_aus_konfig("# nur Kommentar"), None);
    }
}
