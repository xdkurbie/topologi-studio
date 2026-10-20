Topologi Studio 0.1.0 er et usignert macOS-program for å tegne nettverkstopologi.

## Installere

1. Last ned `Topologi.Studio_0.1.0_universal.dmg`.
2. Åpne diskfilen og dra **Topologi Studio** til Programmer.
3. Første gang: høyreklikk appen og velg **Åpne**, og bekreft i dialogen. Et vanlig dobbeltklikk blir stoppet av Gatekeeper fordi appen ikke er signert.
4. Hvis macOS fortsatt sier at appen er skadet eller fra en uidentifisert utvikler, fjern karantenen i Terminal:

```bash
xattr -dr com.apple.quarantine "/Applications/Topologi Studio.app"
```

Filen er en universal binær for Apple Silicon og Intel.

## Med i 0.1.0

- Mørkt og lyst tema, bibliotek, inspektør, lag, rutenett og festing
- Kort, tekst, piller, enhetsikoner, tabell, brannmurmatrise og egne bilder
- Koblinger som følger portene, med rett, ortogonal og fri linje
- Angre og gjør om, kopier, lim inn, juster og fordel
- Malen UniFi Dream Machine SE og tomt dokument
- Lagring som `.topo`, nylige filer og autolagring
- Eksport til PNG, SVG og PDF

PDF-eksporten legger et bilde inn i PDF-en, så teksten kan ikke merkes. Ortogonal ruting knekker i rett vinkel og går ikke rundt andre elementer.
