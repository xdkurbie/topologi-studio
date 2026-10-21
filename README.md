# Topologi Studio

Topologi Studio er et program for macOS og Windows for å tegne nettverkstopologi. Det er laget med Tauri 2 og en TypeScript-frontend som tegner på et SVG-lerret. Standardutseendet er mørkt. To innebygde maler gjenskaper UniFi-skisser: den opprinnelige fra 19.10.2026, og «UniFi UDM SE – Mathias/Lars/Harry VLAN (21.10.2026)».

Grensesnittet er på norsk bokmål.

![Redigering av UniFi-malen](docs/screenshots/redigering.png)

## Installere

Versjon 0.1.2 er usignert. Last ned filene fra [GitHub-utgivelsen v0.1.2](https://github.com/xdkurbie/topologi-studio/releases/tag/v0.1.2). Skriften DejaVu Sans følger med, så tegningen og eksport til PNG, SVG og PDF er lik på macOS og Windows.

### macOS

1. Åpne universal-diskfilen (`.dmg`) for Apple Silicon og Intel.
2. Dra **Topologi Studio** til Programmer.
3. Første gang må du høyreklikke appen og velge **Åpne**, og deretter bekrefte. Et vanlig dobbeltklikk blir stoppet av Gatekeeper.
4. Hvis macOS fortsatt avviser appen, fjern karantenen:

```bash
xattr -dr com.apple.quarantine "/Applications/Topologi Studio.app"
```

Appen krever macOS 11 eller nyere. Snarveiene bruker Cmd.

### Windows

Velg x64 for en vanlig Intel- eller AMD-PC, eller ARM64 for Windows på ARM. Hver arkitektur har et NSIS-installasjonsprogram (`.exe`) og en Windows Installer-pakke (`.msi`).

1. Start installasjonsfilen. NSIS installerer for den påloggede brukeren. MSI kan be om administrator.
2. SmartScreen advarer fordi filen ikke er signert. Velg **Mer informasjon** (More info) og deretter **Kjør likevel** (Run anyway).
3. Installasjonen legger inn WebView2 med en innebygd bootstrapper hvis Windows mangler kjøretiden, og knytter `.topo` til programmet.

Snarveiene bruker Ctrl. Filvinduene er Windows sine egne.

## Slik ser malen ut

Bildene under er UniFi-malen fra 19.10.2026. Malen fra 21.10.2026, med eiere Mathias, Lars og Harry, ligger i samme velger.

Øverste del av UniFi-malen, med gateway, ONT og VLAN-tagger:

![Øvre del av malen](docs/screenshots/mal-topp.png)

VLAN-tabell og brannmurmatrise:

![VLAN og brannmur](docs/screenshots/vlan.png)

Inspektøren for et valgt kort:

![Inspektør](docs/screenshots/inspektor.png)

Eksportert PNG av malen, 1×:

![Eksportert PNG](docs/screenshots/eksport.png)

## Bruke programmet

Biblioteket til venstre har kort, tekst, piller, tabell, matrise, bilde og enhetsikoner. Klikk eller dra et element inn på arket. Koblinger tegnes ved å klikke to porter, eller ved å dra fra en port til en annen. En kobling blir hengende på elementet når det flyttes. Slettes elementet, fryses endepunktet der det sto.

Inspektøren til høyre endrer tekst, skrift, farger, radius og linjestil. Matriseceller veksler mellom Allow All, Block All og Allow Return. Lag-fanen viser rekkefølgen. Rutenett, festing og justeringshjelpelinjer kan slås av. Hold Alt nede mens du drar for å slippe festingen.

Filer lagres som `.topo` (JSON, format `topologi-studio`, versjon 1). Bilder du tar inn, ligger inne i filen. Programmet husker nylige filer og autolagrer til én gjenopprettingsplass. Eksporter PNG (1×, 2× eller 3×), SVG eller PDF. I nettleseren under utvikling lastes filer ned. I appen brukes de innebygde filvinduene på macOS og Windows. En installert app åpner `.topo` når du dobbeltklikker filen.

Menylinjen er systemets egen. På macOS står snarveiene med Cmd, på Windows med Ctrl. Når du kjører frontend alene, ligger de samme menyene inne i vinduet og følger plattformen nettleseren kjører på.

## Tastatursnarveier

| macOS | Windows | Handling |
| --- | --- | --- |
| V, H, K | V, H, K | Velg, hånd, kobling |
| Mellomrom og dra | Mellomrom og dra | Panorer |
| Rullehjul | Rullehjul | Panorer |
| Klyp, eller Cmd og rull | Ctrl og rull | Zoom mot pekeren |
| Cmd +, Cmd −, Cmd 0, Cmd 1 | Ctrl +, Ctrl −, Ctrl 0, Ctrl 1 | Zoom inn, ut, 100 %, tilpass |
| Shift-klikk | Shift-klikk | Legg til i markeringen |
| Dra på tomt område | Dra på tomt område | Marker flere |
| Piltaster | Piltaster | Flytt 1 px, Shift flytter 10 px |
| Cmd Z, Cmd Shift Z | Ctrl Z, Ctrl Shift Z | Angre, gjør om |
| Cmd C, X, V, D | Ctrl C, X, V, D | Kopier, klipp ut, lim inn, dupliser |
| Delete | Delete | Slett |
| Cmd A | Ctrl A | Merk alt |
| Cmd ] og Cmd [ | Ctrl ] og Ctrl [ | Flytt foran eller bak |
| Cmd S, Cmd Shift S, Cmd O, Cmd N | Ctrl S, Ctrl Shift S, Ctrl O, Ctrl N | Lagre, lagre som, åpne, ny |
| Cmd Shift E | Ctrl Shift E | Eksporter PNG |
| Dobbeltklikk | Dobbeltklikk | Rediger tekst |
| Alt-klikk i en matrise | Alt-klikk i en matrise | Bytt Allow / Block / Return |
| Escape | Escape | Avbryt kobling eller markering |

## Inspirasjon

Ideene under er bare arbeidsmønstre. Koden, ikonene og grafikken i Topologi Studio er laget for dette programmet og er ikke kopiert fra prosjektene.

| Prosjekt | Mønster som er brukt som idé |
| --- | --- |
| [draw.io](https://github.com/jgraph/drawio) (Apache-2.0) | Formbibliotek, porter, ortogonal koblingsruting og inspektør |
| [Excalidraw](https://github.com/excalidraw/excalidraw) | Angre og gjør om via øyeblikksbilder av dokumentet |
| [tldraw](https://github.com/tldraw/tldraw) | Justeringshjelpelinjer, panorering og zoom |
| [React Flow / xyflow](https://github.com/xyflow/xyflow) | Koblinger som blir hengende på nodene når de flyttes |
| [JointJS](https://github.com/clientIO/joint) og [maxGraph](https://github.com/maxGraph/maxGraph) | Festing til porter og Visio-lignende nettverksdiagram |

Avhengigheter hentes inn via npm og Cargo. Skriften på lerretet er DejaVu Sans, som følger med under sin egen lisens i `src/assets/fonts/LICENSE`.

## Begrensninger

- Appen er ikke signert eller notarisert. macOS bruker Gatekeeper, Windows bruker SmartScreen.
- PDF-eksporten er et bilde i en PDF. Teksten kan ikke merkes.
- Ortogonal ruting knekker i rett vinkel og går ikke rundt andre elementer.
- Autolagring har én plass, ikke en historikk.
- Installasjonsfilene lages på GitHub Actions. Denne maskinen kan ikke pakke macOS- eller Windows-installere lokalt.

## Utvikling

```bash
npm install
npm test
npm run dev
```

Frontend kjører på `http://127.0.0.1:1420`. `?doc=unifi` åpner malen fra 19.10.2026, og `?doc=udm-vlan` åpner malen fra 21.10.2026. På en Mac bygges diskfilen med `npm run tauri build -- --target universal-apple-darwin --bundles app,dmg`. På Windows bygges installerne med `npm run tauri build -- --bundles nsis,msi`. Utgivelsen v0.1.2 lages av `.github/workflows/release.yml` når `main` oppdateres.
