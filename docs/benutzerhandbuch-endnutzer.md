# ESC GamePitch – Benutzerhandbuch (Endnutzer)

Dieses Handbuch richtet sich an Redakteure und Inhaltsverantwortliche, die HockeyData-Inhalte in WordPress-Seiten einbinden.

## 1. Was ist ESC GamePitch?

ESC GamePitch stellt HockeyData-Widgets über Shortcodes und Gutenberg-Blöcke dar, zum Beispiel:
1. Spielplan
2. Tabelle/Standings
3. Live-Spiele
4. GameTicker
5. Spielbericht/LiveBox

## 2. Inhalte einfügen: Zwei Wege

Du kannst Inhalte entweder über:
1. Gutenberg-Blöcke
2. Shortcodes

verwenden.

## 3. Schnellstart mit Shortcodes

Beispiele:

```text
[esc_schedule]
```

```text
[esc_standings]
```

```text
[esc_livegames]
```

```text
[esc_gameticker]
```

```text
[esc_game_livebox game_id="12345"]
```

## 4. Wichtige Parameter

Häufig genutzte Parameter je nach Widget:
1. division_id: Liga/Division
2. team_id: Teamfokus
3. limit: Maximale Anzahl Zeilen (z. B. im Schedule)
4. mode: all, past oder future (bei Schedule)
5. fallback_message: Meldung bei Ladefehler

Beispiele:

```text
[esc_schedule mode="future" limit="8"]
```

```text
[esc_standings team_id="27"]
```

```text
[esc_gameticker division_id="42"]
```

## 5. Division Picker verwenden

Mit dem Division Picker können Nutzer zwischen Wettbewerben/Saisons umschalten.

Minimal:

```text
[esc_divisionpicker]
```

Mit eigenen Divisionen (JSON):

```text
[esc_divisionpicker divisions='[{"divisionId":13,"divisionName":"Grunddurchgang"}]']
```

Hinweis:
- JSON muss gültig sein. Bei Formatfehlern kann das Widget leer bleiben.

## 6. Spielplan mit Link auf Spielbericht

Für einen Ablauf "Spielplan -> Spielbericht":

```text
[esc_division_schedule game_link="?game_id=%s"]
```

- Beim Klick auf ein Spiel wird die game_id in der URL gesetzt.
- Eine passende Seite/Vorlage kann dann den Bericht anzeigen.

## 7. Gutenberg-Blöcke

Im Block-Editor stehen passende ESC-Blöcke zur Verfügung, z. B.:
1. ESC Schedule
2. ESC Standings
3. ESC Live Games
4. ESC Game Ticker
5. ESC Division Picker

Empfehlung:
- Für Redakteure sind Blöcke oft einfacher als Shortcodes.

## 8. Typische Probleme

1. Widget lädt nicht
- Prüfen, ob API Key/Standardwerte vom Admin korrekt gesetzt sind.

2. Keine Spiele/Tabelle sichtbar
- division_id oder team_id prüfen.
- Testweise Parameter entfernen und Standardwerte nutzen.

3. Nur Fallback-Meldung sichtbar
- Externe HockeyData-Skripte konnten nicht geladen werden.
- Erneut laden und bei wiederholtem Fehler Support kontaktieren.

## 9. Wenn etwas fehlt

Bitte melde dich beim zuständigen Support mit:
1. Betroffene Seite/URL
2. Verwendeter Block/Shortcode
3. Uhrzeit des Fehlers
4. Sichtbare Meldung (inkl. Fallback-Text)

Zuständigkeiten:
1. WordPress-Admin: Plugin-Einstellungen, Seiteneinbindung, Parameter
2. HockeyData-/Sportdaten-Verantwortliche: Inhalte, API-Zugang, Datenqualität

## 10. Gute Praxis für Redaktion

1. Neue Shortcodes zuerst auf Testseite prüfen.
2. Änderungen dokumentieren (welcher Shortcode auf welcher Seite).
3. Bei komplexen JSON-Parametern kleine Schritte nutzen.
4. Fallback-Meldungen verständlich formulieren.
