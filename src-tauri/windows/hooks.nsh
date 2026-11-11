; NSIS-Hooks für den Windows-Installer des ÖBB-Tools.
;
; Beim Deinstallieren die Einrichtung (oebb-konfig.txt im Benutzer-
; Einstellungsordner) löschen – eine neue Installation startet dann wieder
; mit der Einrichtung (Grundordner, Firmen). NICHT bei Updates: der Updater
; ruft das Deinstallationsprogramm mit /UPDATE auf ($UpdateMode = 1).
!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $UpdateMode <> 1
    Delete "$APPDATA\de.nettec.oebbtool\oebb-konfig.txt"
    Delete "$APPDATA\de.nettec.oebbtool\projektordner.json"
  ${EndIf}
!macroend
