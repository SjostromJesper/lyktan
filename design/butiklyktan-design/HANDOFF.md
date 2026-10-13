# Butik Lyktan – designöverlämning till Claude Code

Den här mappen innehåller den nya designen för butiklyktan.se som statiska prototyper.
Varje fil i `project/` är en sida (en "artboard") från designverktyget i Claude.
Använd dem som **visuell och funktionell referens** – bygg om dem som riktiga Nuxt-komponenter,
kopiera inte in `.dc.html`-filerna rakt av.

## Så läser du prototypfilerna

- Allt utseende ligger som inline `style="…"` direkt i markupen.
- `{{namn}}` är en platshållare som fylls från `renderVals()` i `<script type="text/x-dc">` längst ner i varje fil.
- `<sc-for list="{{x}}" as="y">` = `v-for`, `<sc-if value="{{x}}">` = `v-if`.
- `onClick="{{fn}}"` = `@click`. `this.state` / `setState` = lokal reaktiv state (`ref`/`reactive`).
- Länkar som `href="Butik.dc.html"` visar vilken sida som länkas till (se route-tabellen nedan).
- `[Pris]`, `[Produktnamn]`, `[antal]` osv. är platshållare – ska komma från Shopify/data, inte hårdkodas.
- Priserna i kundkorgen (`Kundkorg*.dc.html`) är påhittade exempel för att summorna ska gå att räkna.

## Sidor → föreslagna Nuxt-routes

| Prototypfil | Mobilversion | Route |
|---|---|---|
| Main.dc.html | Mobil.dc.html | `/` |
| – | MobilMeny.dc.html | (mobilmeny, drawer/overlay) |
| Butik.dc.html | ButikMobil.dc.html | `/butik/[kategori]` |
| Event.dc.html | EventMobil.dc.html | `/events` |
| BokaBord.dc.html | BokaBordMobil.dc.html | `/bordsbokning` |
| Singlar.dc.html | SinglarMobil.dc.html | `/singlar` |
| SingelKort.dc.html | SingelKortMobil.dc.html | `/singlar/[kort]` |
| Kundkorg.dc.html | KundkorgMobil.dc.html | `/singlar/kundkorg` |

Desktop är ritad i 1440 px bredd, mobil i 390 px. Bygg responsivt (en komponent per sida, brytpunkt runt 768–1024 px), inte två separata sidor.

## Designtokens

### Ljusa sajten (butik, event, bokning)
- Typsnitt: **Figtree** 400/500/600/700/800 (Google Fonts)
- Text: `#1C2233` · Sekundärtext: `#6A6F7A` / `#3E4454`
- Mörkblå (topprad, footer, knappar): `#1F2A44`
- Accent (lyktgul): `#F2A93B` – mörk text på accent: `#1F2A44`
- Accent-text/länk på ljus bakgrund: `#8A5200`
- Krämfärgade ytor: `#FFF6E5` · Ljusgrå ytor: `#F5F3EF` · Linjer: `#ECE8E0`
- Rundningar: knappar helt runda (pill), kort 16–24 px
- Rubriker: 800 vikt, ofta VERSALER

### Singelkort (mörkt läge som standard)
- Typsnitt: **Figtree** + **IBM Plex Mono** (priser, setkoder, etiketter)
- Bakgrund: `#0D1015` · Ytor: `#12161C`, `#161B22`, `#1D232C` · Linjer: `#1E242D`, `#2A313C`
- Text: `#E8EAED` · Sekundär: `#9AA3AE` · Tertiär: `#6F7883`
- Accent: `#F2A93B` (mörk text `#0D1015` på accent)
- Skick (Cardmarket): NM `#56D364`, EX `#3CCFB8`, GD `#E3B341`, LP `#F0883E`, PL `#F47067`
- Sällsynthet: Common `#D9D9D9`, Uncommon `#8FB3D1`, Rare `#E0C063`, Mythic `#E8743B`
- Foil-märke: text `#C7B8FF`, kant `#4B3F7A`

## Återanvändbara komponenter att bygga

- `SiteHeader` – topprad, sök, logga i mitten, konto + varukorg, och menyrad där **Webbshop** är en dropdown (öppnas på hover och klick) med Brädspel, Kortspel, Miniatyrspel, Rollspel, Tillbehör + "Visa hela sortimentet". Event, Boka bord, Hitta hit är vanliga länkar.
- `MobileMenu` – utfälld meny med Webbshop-sektion (krämfärgad, rundad) + övriga länkar + butiksinfo.
- `ProductCard` – bild, märke, namn, pris, rund "+"-knapp.
- `EventCard`, `WeekSchedule` (7 dagar, dagens dag markerad, helg → länk till bordsbokning).
- `BookingCalendar` + `TimeSlots` (se regler nedan).
- Singelkort: `CardGridItem`, `CardListRow`, `ConditionBadge`, `FilterSidebar`, `OfferRow`, `PriceChart`, `CartZone` (Want/Maybe).

## Affärsregler som ska följas

### Bordsbokning
- Kalendern visar hel månad (måndag först), bakåt i tiden går inte att välja, max ~2 månader framåt.
- Öppettider: mån–fre 10–19, lör 11–19, sön 12–18.
- Starttider **endast hela timmar**, från öppning till **senast 18:00** (söndag: senast 17:00 eftersom butiken stänger 18).
- Varje bokning är **alltid 4 timmar** – inget val för längd.
- Väljer man sista starttiden visas en varning: risk att butiken stänger innan man hunnit spela klart.
- Sluttid i sammanfattningen kapas vid stängning.

### Event – veckoschema (från nuvarande sajt)
- Mån 18:00 Warhammer på måndag (dagspass/medlem)
- Tis 18:00 Sorcery (50/200/350 kr)
- Ons 18:00 Commander (dagspass/medlem) · One Piece (50 kr)
- Tor 18:00 Riftbound (50 kr) · Pokémon (50 kr)
- Fre 18:00 Friday Night Magic (250 kr)
- Lör–sön: inga fasta event

### Singelkort – kundkorg
- Två listor: **Want** (går till kassan) och **Maybe** (sparas, ingår inte i summan).
- Desktop: kort dras mellan listorna med drag-and-drop, plus pilknappar som alternativ.
- Mobil: flikar Want/Maybe och knappar "Till Maybe" / "← Want" (drag fungerar dåligt på touch).
- Antal kan inte överstiga lagersaldo; "Sista exemplaret i lager" visas när man tagit allt.
- Leverans: Hämta i butik (gratis), PostNord brev, PostNord spårbart.
- Korten reserveras en tid när man går till kassan (tid bestäms).

## Förslag på arbetsordning

1. Lägg in tokens (CSS-variabler / Tailwind-tema) och typsnitt.
2. Bygg `SiteHeader`, `MobileMenu` och footer.
3. Startsidan → butik/kategori → event → bordsbokning.
4. Singelkort (mörkt tema) som egen layout: lista → kortsida → kundkorg.
