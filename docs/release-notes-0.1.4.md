Topologi Studio 0.1.4 er usignert og finnes for macOS og Windows. Tegningen, skriften og eksporten er de samme på begge: DejaVu Sans følger med i programmet.

## macOS

1. Last ned universal-diskfilen (`.dmg`).
2. Åpne den og dra **Topologi Studio** til Programmer.
3. Første gang: høyreklikk appen og velg **Åpne**, og bekreft. Et vanlig dobbeltklikk blir stoppet av Gatekeeper fordi appen ikke er signert.
4. Hvis macOS fortsatt avviser appen, fjern karantenen i Terminal:

```bash
xattr -dr com.apple.quarantine "/Applications/Topologi Studio.app"
```

Filen er en universal binær for Apple Silicon og Intel. Tastatursnarveiene bruker Cmd.

## Windows

Last ned installasjonsprogrammet som passer maskinen:

- **x64** for vanlige Intel- og AMD-PC-er: NSIS-programmet (`.exe`) eller Windows Installer-pakken (`.msi`).
- **ARM64** for Windows på ARM, med egne `.exe`- og `.msi`-filer.

NSIS-installasjonen legger programmet hos den påloggede brukeren og trenger ikke administrator. MSI-pakken kan be om administrator. Begge installerer WebView2 med den innebygde bootstrapperen hvis Windows ikke allerede har kjøretiden. Installasjonen knytter `.topo` til Topologi Studio, så en fil kan åpnes med dobbeltklikk. Tastatursnarveiene bruker Ctrl.

SmartScreen advarer fordi installasjonsfilen ikke er signert. Velg **Mer informasjon** (More info) og deretter **Kjør likevel** (Run anyway).

## Med i 0.1.4

- Rader og kolonner kan legges til og fjernes i brannmurmatriser og i tabeller. Pluss og minus sitter på kanten, og høyreklikk på en overskrift eller celle setter inn foran eller bak, sletter og gir nytt navn.
- Cellene kan fortsatt redigeres. Endringene inngår i angre, autolagring, filen og eksport til PNG, SVG og PDF.
- Ny mal: MikroTik-topologi – Lars sitt nett 22.10.2026. Fargede soner og knekkede linjer følger med.
- Malen Perfekt topologi er oppdatert til hEX PoE, med PoE-kolonne i portkartet.
- Eksport av store ark på macOS er fortsatt fliset, så PNG og PDF ikke avslutter programmet.

PDF-eksporten legger et bilde inn i PDF-en, så teksten kan ikke merkes. Ortogonal ruting knekker i rett vinkel og går ikke rundt andre elementer.
