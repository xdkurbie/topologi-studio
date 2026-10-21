Topologi Studio 0.1.3 er usignert og finnes for macOS og Windows. Tegningen, skriften og eksporten er de samme på begge: DejaVu Sans følger med i programmet.

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

## Med i 0.1.3

- Eksport til PNG og PDF på macOS avslutter ikke lenger programmet. Lagre-dialogen kjører utenfor hovedtråden, og store dokumenter tegnes i fliser på 2048 piksler.
- Feil under eksport vises som en melding nederst i vinduet.
- Ny innebygd mal: Perfekt topologi – UDM SE + MikroTik (Lars) 21.10.2026. Kort, ikoner, porttabeller, IP-plan, 5×5-brannmur og Segment-kolonnen på VLAN-radene kan redigeres.
- Malene fra 19.10.2026 og UniFi UDM SE – Mathias/Lars/Harry VLAN (21.10.2026) ligger fortsatt i velgeren.

PDF-eksporten legger et bilde inn i PDF-en, så teksten kan ikke merkes. Ortogonal ruting knekker i rett vinkel og går ikke rundt andre elementer.
