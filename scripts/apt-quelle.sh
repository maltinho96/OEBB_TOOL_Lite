#!/usr/bin/env bash
# Baut aus den .deb-Dateien der letzten Desktop-Releases eine apt-Paketquelle
# (flaches Repository) im Ordner $1 – wird von deploy-pages.yml aufgerufen und
# landet unter https://maltinho96.github.io/OEBB_TOOL_Lite/apt/
#
# Signiert, wenn das Secret APT_GPG_PRIVATE_KEY gesetzt ist; sonst muss die
# Quelle mit [trusted=yes] eingetragen werden (macht install.sh automatisch).
set -euo pipefail
ZIEL="$1"
URL="https://maltinho96.github.io/OEBB_TOOL_Lite/apt"
mkdir -p "$ZIEL"

# .deb der letzten 3 Desktop-Versionen holen
# Die neuesten 3 Releases MIT .deb (es gibt zeitweise reine Windows-Releases –
# die apt-Quelle soll dann die letzten Ubuntu-Pakete behalten).
gefunden=0
for tag in $(gh release list --repo "$GITHUB_REPOSITORY" --limit 100 --json tagName -q '.[].tagName' | grep '^desktop-v'); do
  if [ "$gefunden" -ge 3 ]; then break; fi
  vorher=$(ls "$ZIEL"/*.deb 2>/dev/null | wc -l)
  gh release download "$tag" --repo "$GITHUB_REPOSITORY" --pattern '*.deb' --dir "$ZIEL" --skip-existing 2>/dev/null || true
  if [ "$(ls "$ZIEL"/*.deb 2>/dev/null | wc -l)" -gt "$vorher" ]; then gefunden=$((gefunden + 1)); fi
done

if ! ls "$ZIEL"/*.deb >/dev/null 2>&1; then
  echo "Noch keine .deb-Pakete – apt-Quelle wird ausgelassen."
  rmdir "$ZIEL" 2>/dev/null || true
  exit 0
fi

cd "$ZIEL"
dpkg-scanpackages --multiversion . /dev/null > Packages
gzip -k -9 Packages
# Erst außerhalb schreiben – sonst listet Release sich selbst (leer) mit.
apt-ftparchive -o APT::FTPArchive::Release::Origin="OEBB-Tool" \
  -o APT::FTPArchive::Release::Label="OEBB-Tool" release . > ../Release.neu
mv ../Release.neu Release

if [ -n "${APT_GPG_PRIVATE_KEY:-}" ]; then
  echo "$APT_GPG_PRIVATE_KEY" | gpg --batch --import
  gpg --batch --yes --clearsign -o InRelease Release
  gpg --batch --yes -abs -o Release.gpg Release
  gpg --export > oebb-tool.gpg
  QUELLE="deb [signed-by=/usr/share/keyrings/oebb-tool.gpg] $URL ./"
  SCHLUESSEL="curl -fsSL $URL/oebb-tool.gpg | sudo tee /usr/share/keyrings/oebb-tool.gpg >/dev/null"
else
  QUELLE="deb [trusted=yes] $URL ./"
  SCHLUESSEL=":"
fi

cat > install.sh <<SKRIPT
#!/bin/sh
# ÖBB-Tool unter Ubuntu installieren (danach Updates mit: sudo apt update && sudo apt upgrade)
set -e
$SCHLUESSEL
echo "$QUELLE" | sudo tee /etc/apt/sources.list.d/oebb-tool.list >/dev/null
sudo apt-get update
sudo apt-get install -y oebb-tool
echo "Fertig – das ÖBB-Tool ist im Anwendungsmenü."
SKRIPT
chmod +x install.sh
ls -la
