#!/usr/bin/env bash
# Baut ein eigenes F-Droid-Repository aus den APKs der letzten Releases.
# Aufruf:  scripts/fdroid-repo.sh ZIELORDNER [ORDNER_MIT_APKS]
# Ergebnis: ZIELORDNER/repo (Index + APKs) und ZIELORDNER/index.html (Anleitung)
# -> https://maltinho96.github.io/OEBB_TOOL_Lite/fdroid/repo
#
# Braucht den Android-Schlüsselbund (Alias "fdroid" signiert den Index):
#   KS_FILE (Pfad) und KS_PASS – in der CI aus den Secrets
#   ANDROID_KEYSTORE_BASE64 / ANDROID_KEYSTORE_PASSWORD.
set -euo pipefail
ZIEL="$(mkdir -p "$1" && cd "$1" && pwd)"
APKS="${2:-}"
URL="https://maltinho96.github.io/OEBB_TOOL_Lite/fdroid/repo"

if [ -z "${KS_FILE:-}" ] || [ ! -s "$KS_FILE" ]; then
  echo "Kein Android-Schlüssel – F-Droid-Repo wird ausgelassen."
  rmdir "$ZIEL" 2>/dev/null || true
  exit 0
fi

ARBEIT="$(mktemp -d)"
mkdir -p "$ARBEIT/repo"
if [ -n "$APKS" ]; then
  cp "$APKS"/*.apk "$ARBEIT/repo/"
else
  gh release list --repo "$GITHUB_REPOSITORY" --limit 20 --json tagName -q '.[].tagName' \
    | grep '^desktop-v' | head -3 | while read -r tag; do
      gh release download "$tag" --repo "$GITHUB_REPOSITORY" --pattern '*.apk' --dir "$ARBEIT/repo" --skip-existing || true
    done
fi
if ! ls "$ARBEIT/repo"/*.apk >/dev/null 2>&1; then
  echo "Noch keine APK – F-Droid-Repo wird ausgelassen."
  rmdir "$ZIEL" 2>/dev/null || true
  exit 0
fi

cd "$ARBEIT"
cp "$(dirname "$0")/../public/icons/icon-512.png" icon.png 2>/dev/null || true
cat > config.yml <<KONFIG
repo_url: $URL
repo_name: ÖBB-Tool
repo_description: Protokolle der ökologischen Baubegleitung – Android-App des ÖBB-Tools.
repo_icon: icon.png
keystore: $KS_FILE
keystorepass: "$KS_PASS"
keypass: "$KS_PASS"
repo_keyalias: fdroid
keydname: CN=OEBB-Tool, O=Malte Lenzen, C=DE
KONFIG
[ -n "${ANDROID_HOME:-}" ] && echo "sdk_path: $ANDROID_HOME" >> config.yml
chmod 600 config.yml

mkdir -p metadata
cat > metadata/de.nettec.oebbtool.yml <<'META'
Categories:
  - Office
License: Unknown
AuthorName: Malte Lenzen
Name: ÖBB-Tool
Summary: Protokolle der ökologischen Baubegleitung
Description: |-
  Begehungs-, Vorbegehungs- und Belehrungsprotokolle mit Fotos direkt von
  der Kamera oder aus der Galerie, Karte der Fotostandorte, Speichern als
  HTML/PDF. Auch ohne Netz nutzbar.
WebSite: https://maltinho96.github.io/OEBB_TOOL_Lite/
SourceCode: https://github.com/maltinho96/OEBB_TOOL_Lite
META

fdroid update --verbose 2>&1 | tail -15

rm -rf "$ZIEL/repo"
cp -r repo "$ZIEL/repo"

# Fingerabdruck des Repo-Schlüssels (für den Ein-Klick-Link)
FP=$(keytool -list -v -keystore "$KS_FILE" -storepass "$KS_PASS" -alias fdroid 2>/dev/null \
  | grep 'SHA256:' | head -1 | sed 's/.*SHA256: //; s/://g')
cat > "$ZIEL/index.html" <<SEITE
<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>ÖBB-Tool für Android (F-Droid)</title>
<body style="font-family:system-ui,sans-serif;max-width:640px;margin:24px auto;padding:0 16px;line-height:1.5">
<h1>ÖBB-Tool für Android</h1>
<ol>
<li><a href="https://f-droid.org/">F-Droid</a> installieren (falls noch nicht da).</li>
<li>Auf dem Handy diesen Knopf antippen:<br>
<a style="display:inline-block;margin:10px 0;padding:12px 18px;background:#1f3a5f;color:#fff;border-radius:8px;text-decoration:none"
 href="fdroidrepos://maltinho96.github.io/OEBB_TOOL_Lite/fdroid/repo?fingerprint=$FP">Paketquelle zu F-Droid hinzufügen</a><br>
oder in F-Droid unter <b>Einstellungen → Paketquellen → +</b> eintragen:<br>
<code>$URL</code></li>
<li>In F-Droid nach <b>ÖBB-Tool</b> suchen und installieren. Updates kommen danach automatisch.</li>
</ol>
<p style="color:#666;font-size:13px">Die App braucht Chrome (oder einen anderen aktuellen Browser) auf dem Handy.<br>
Fingerabdruck der Paketquelle: <code style="word-break:break-all">$FP</code></p>
</body></html>
SEITE
ls -la "$ZIEL/repo" | head -20
