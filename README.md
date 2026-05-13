# QR Shortener für GitHub Pages

Diese Vorlage enthält:

- Weiterleitung per `?qrid=CODE`
- kurze Pfade wie `/CODE` über `404.html`
- Admin-Seite zum Anlegen, Ändern, Löschen und Auflisten
- automatische Code-Erzeugung
- QR-Code-Vorschau
- QR-Code-Download als PNG und SVG
- Klickzähler
- zwei Betriebsarten:
  - GitHub Pages + separates Daten-Repository
  - Cloudflare Worker + KV

GitHub Pages ist ein statischer Hosting-Dienst für HTML, CSS und JavaScript aus einem Repository. Du kannst eine eigene `404.html` verwenden und die Publishing-Source auf einen Branch setzen. Für Schreibzugriffe auf Dateien ist die GitHub Contents API vorgesehen; sie erstellt, ändert und löscht Base64-kodierte Inhalte. Fine-grained Tokens brauchen dafür die Berechtigung `Contents: write`. citeturn889324search0turn889324search4turn889324search8turn889324search1turn889324search5

Cloudflare Workers sind für schnelle Redirects gut geeignet, und Workers KV ist ein global replizierter Key-Value-Speicher. citeturn889324search2turn889324search3turn889324search19turn889324search11

## Ordnerstruktur

```text
.
├── 404.html
├── admin.html
├── index.html
├── style.css
├── README.md
├── data/
│   └── .gitkeep
├── js/
│   ├── config.example.js
│   ├── config.js
│   ├── redirect.js
│   ├── redirect-404.js
│   └── admin.js
└── worker/
    ├── package.json
    ├── wrangler.toml
    └── src/
        └── index.js
```

## GitHub-Pages-Modus

Empfohlen für den Start:

- Website im Pages-Repo
- Daten in separatem Repo
- jede Weiterleitung als eigene JSON-Datei in `codes/<code>.json`

Beispiel:

```json
{
  "code": "abc123",
  "url": "https://example.com",
  "title": "Beispiel",
  "clicks": 0,
  "createdAt": "2026-05-13T12:00:00.000Z",
  "updatedAt": "2026-05-13T12:00:00.000Z"
}
```

Die Admin-Seite schreibt diese Dateien per GitHub API. Für Read/Write auf Repository-Inhalte braucht das Token `Contents: write`. citeturn889324search1turn889324search5

### Einrichtung

1. Zwei Repositories anlegen:
   - `qr-shortener-site`
   - `qr-shortener-data`
2. Im Site-Repo unter **Settings → Pages**:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
3. Im Daten-Repo einen Fine-Grained Token nur für dieses Repo anlegen.
4. Berechtigung:
   - `Contents: write`
5. `js/config.js` ausfüllen.

GitHub Pages kann von einem Branch veröffentlicht werden und unterstützt statische Dateien direkt aus dem Repository. citeturn889324search8turn889324search16turn889324search0

## Cloudflare-Worker-Modus

Für maximale Geschwindigkeit:

- Worker liefert Redirects direkt
- KV speichert die Codes und Zähler
- Admin-Seite spricht den Worker per API an

Cloudflare Workers können Redirects ausführen, und KV ist ein global verteilter Speicher. citeturn889324search2turn889324search3turn889324search19turn889324search11

### Einrichtung

```bash
cd worker
npm install
npx wrangler secret put ADMIN_TOKEN
npx wrangler deploy
```

Dann `js/config.js` auf `mode: "worker"` setzen und die Worker-API-URL eintragen.

## URLs

Normal:
`https://dein-user.github.io/dein-repo/?qrid=abc123`

Kurz:
`https://dein-user.github.io/dein-repo/abc123`

## Tipp

Wenn du die schnellste Variante willst, nutze den Worker-Modus. Wenn du bei GitHub Pages bleiben willst, ist die separate Daten-Repo-Variante die beste Mischung aus Einfachheit und Tempo.
