#!/bin/sh
# Ubuntu: nach "apt remove"/"apt purge" vermerken, dass deinstalliert wurde.
# Die Einrichtung liegt im Home-Ordner (~/.config/de.nettec.oebbtool/), an
# den das Paket nicht herankommt – das Programm vergleicht deshalb beim
# Start: ist diese Marke neuer als die Einrichtung, startet die Einrichtung
# neu. Bei Updates ("upgrade") passiert nichts.
case "$1" in
  remove|purge)
    mkdir -p /var/lib/oebb-tool
    touch /var/lib/oebb-tool/deinstalliert
    ;;
esac
exit 0
