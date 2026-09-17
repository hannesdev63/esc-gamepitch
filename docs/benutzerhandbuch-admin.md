# ESC GamePitch – Administratorhandbuch

Dieses Handbuch richtet sich an Administratoren für Installation, Konfiguration und Betrieb von ESC GamePitch.

## 1. Zweck und Architektur

ESC GamePitch bindet HockeyData-Widgets über JavaScript-Module in WordPress ein.

Bereitgestellt werden:
1. Shortcodes für einzelne Widget-Typen
2. Gutenberg-Blöcke je Widget
3. Fallback-Meldungen bei Ladeproblemen
4. Zentrale Default-Konfiguration in den Plugin-Einstellungen

## 2. Voraussetzungen

1. WordPress ab 5.9
2. PHP ab 7.4
3. Gültiger HockeyData API Key
4. Netzwerkzugriff auf die HockeyData-JavaScript-API

## 3. Installation und Aktivierung

1. Plugin in wp-content/plugins/esc-gamepitch bereitstellen.
2. In WordPress aktivieren.
3. Einstellungen unter Settings -> ESC GamePitch öffnen.

Optionales Packaging:

```bash
./bin/package-plugin.sh
```

Ausgabe in der Regel im dist-Ordner.

## 4. Konfiguration im Detail

In Settings -> ESC GamePitch stehen zentrale Defaults, die von Shortcodes/Blöcken genutzt werden, wenn dort keine Overrides gesetzt sind.

### 4.1 API Key

Bedeutung:
- Authentifiziert Anfragen gegen HockeyData.

Empfehlung:
1. Key nur für berechtigte Admins sichtbar verwalten.
2. Schlüsselrotation dokumentieren.

### 4.2 Division ID

Bedeutung:
- Voreinstellung für Widgets mit Divisionsbezug.

Praxis:
- Kann pro Shortcode/Block mit division_id überschrieben werden.

### 4.3 Default Team ID

Bedeutung:
- Standard-Teamfokus für Widgets, die teamId unterstützen (z. B. Schedule, Standings, GameSlider).

### 4.4 Widget Class

Bedeutung:
- Standard-Widgetklasse für den generischen Shortcode [esc_gamepitch].

Beispiel:
- hockeydata.los.Schedule

### 4.5 JS Modules / CSS Modules

Bedeutung:
- Steuern, welche HockeyData-Module geladen werden.

Wichtig:
1. Module müssen zur Widgetklasse passen.
2. Falsche Kombinationen führen oft zu leerer Ausgabe oder JS-Fehlern.

### 4.6 Default Game ID

Bedeutung:
- Voreinstellung für Widgets, die eine game_id benötigen (z. B. LiveBox/Report).

### 4.7 Debug Comments

Bedeutung:
- Aktiviert zusätzliche Debug-Ausgaben (je nach Implementierung als HTML-Kommentar oder Hilfstext).

Einsatz:
- Nur temporär aktivieren, nicht dauerhaft im Produktivbetrieb.

## 5. Unterstützte Shortcodes und Einsatz

Wichtige Shortcodes:
1. [esc_schedule]
2. [esc_standings]
3. [esc_livegames]
4. [esc_gameticker]
5. [esc_gameticker_current]
6. [esc_gameslider]
7. [esc_game_livebox]
8. [esc_divisionpicker]
9. [esc_division_schedule]
10. [esc_gamepitch] (generisch)

Hinweis:
- Spezialisierte Shortcodes setzen passende Widget-/Moduldefaults automatisch.

## 6. Gutenberg-Blöcke

Jeder zentrale Widgettyp hat einen passenden Block.

Vorteile:
1. Redakteursfreundliche Pflege
2. Weniger Syntaxfehler als bei manuellen Shortcodes

Empfehlung:
- Für Standardseiten primär Blöcke verwenden, Shortcodes für Spezialfälle.

## 7. Konfigurationsstrategien für stabile Seiten

1. Möglichst viele Defaults zentral in den Plugin-Settings pflegen.
2. Pro Seite nur notwendige Overrides setzen.
3. Einheitliche fallback_message verwenden.
4. JSON-Optionen versioniert dokumentieren.

## 8. Typische Fehler und Troubleshooting

### 8.1 Leeres Widget / nur Fallback

Prüfen:
1. API Key korrekt?
2. Widgetklasse und Module passend?
3. Externe Skripte blockiert (CSP/Firewall/Adblocker)?

### 8.2 Falsche oder keine Spiele

Prüfen:
1. division_id korrekt?
2. team_id korrekt?
3. mode und limit sinnvoll gesetzt?

### 8.3 JSON-Fehler bei divisions/widgets/options

Prüfen:
1. Gültiges JSON (Anführungszeichen, Kommas, Klammern).
2. Erst mit Minimalbeispiel testen, dann erweitern.

## 9. Sicherheits- und Betriebsaspekte

1. API Key als sensiblen Wert behandeln.
2. Adminrechte für Plugin-Einstellungen einschränken.
3. Änderungen an Einstellungen dokumentieren.
4. Nach Updates mindestens eine Referenzseite je Widgettyp testen.

## 10. Support- und Eskalationsprozess

Bei Vorfällen sollte ein Ticket enthalten:
1. Betroffene URL
2. Betroffener Shortcode/Block
3. Verwendete Parameter
4. Uhrzeit und sichtbare Fehlermeldung
5. Browser-Konsole (falls verfügbar)

Zuständigkeiten:
1. WordPress-Admin: Plugin-Konfiguration, Einbindung, Rechte
2. HockeyData-Verantwortliche: API-Key, Datenfeed, fachliche Datenqualität
3. Redaktion: Inhaltskontext und gewünschte Darstellung

## 11. Änderungs-Checkliste nach Release

Nach Plugin-Update oder Setting-Änderung:
1. Startseite mit mindestens einem Widget prüfen.
2. Schedule + Standings testen.
3. DivisionPicker testen (inkl. Umschalten).
4. Mindestens einen Spielbericht/LiveBox-Link testen.
5. Mobile Darstellung prüfen.

Wenn alle Checks erfolgreich sind, kann die Änderung als stabil betrachtet werden.
