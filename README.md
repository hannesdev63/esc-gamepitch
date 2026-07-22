# ESC GamePitch WordPress Plugin

Renders HockeyData GamePitch (or other HockeyData widget classes) through a shortcode using the HockeyData JavaScript API.

Also includes a Gutenberg block and a frontend fallback message when the HockeyData API cannot be loaded.

## Shortcode

The generic shortcode accepts any HockeyData widget class:

```text
[esc_gamepitch]
```

Dedicated shortcodes are available for every supported widget — they set the correct widget class, JS and CSS modules automatically. All accept the same optional overrides (`team_id`, `division_id`, `api_key`, `options`, `class`, `fallback_message`, `debug`).

### Dedicated shortcodes

| Shortcode | Widget class |
|---|---|
| `[esc_game_livebox]` | `hockeydata.los.Game.LiveBox` |
| `[esc_divisionpicker]` | `hockeydata.los.DivisionPicker` (default: tabs with Standings + Schedule) |
| `[esc_gameticker]` | `hockeydata.los.GameTicker` |
| `[esc_gameticker_current]` | `hockeydata.los.GameTicker` (only visible when current games are detected) |
| `[esc_gameslider]` | `hockeydata.los.GameSlider` |
| `[esc_livegames]` | `hockeydata.los.LiveGames` |
| `[esc_schedule]` | `hockeydata.los.Schedule` |
| `[esc_standings]` | `hockeydata.los.Standings` |
| `[esc_division_schedule]` | DivisionPicker + Schedule composite |

### esc_divisionpicker

`[esc_divisionpicker]` now supports season-aware division configuration and loads useful defaults for statistics across current and past seasons.

- Default output (if no custom `widget`/`widgets` provided):
  - `Standings` (long columns)
  - `Schedule`
  - `Game.FullReport` (reads `game_id` from URL)
  - rendered in tabs
- Optional `stats_preset="extended"` adds `TeamStats` and `Leaders` tabs.
- Supports `divisions` as JSON array or grouped JSON object (group keys can be season labels).

Examples:

```text
[esc_divisionpicker]
```

```text
[esc_divisionpicker
  divisions='{"2025/26":[{"divisionId":13,"divisionName":"Grunddurchgang"},{"divisionId":27,"divisionName":"Playoffs"}],"2024/25":[{"divisionId":44,"divisionName":"Grunddurchgang"},{"divisionId":52,"divisionName":"Playoffs"}]}'
  game_link="?game_id=%s&division_id=%s"
  team_id="27"]
```

```text
[esc_divisionpicker
  widgets='[{"title":"Standings","widget":"hockeydata.los.Standings","widgetOptions":{"columnSet":"long"}},{"title":"Schedule","widget":"hockeydata.los.Schedule","widgetOptions":{"rowLink":"?game_id=%s&division_id=%s"}},{"title":"Game Report","widget":"hockeydata.los.Game.FullReport","widgetOptions":{"gameIdUrlParameter":"game_id"}}]'
  tabs="1"]
```

```text
[esc_divisionpicker
  stats_preset="extended"
  divisions='{"2025/26":[{"divisionId":13,"divisionName":"Grunddurchgang"}],"2024/25":[{"divisionId":44,"divisionName":"Grunddurchgang"}]}'
  team_id="27"]
```

### esc_division_schedule

A single-shortcode solution that renders a **Division Picker** above a **Schedule** and optionally links each game row to a game-report page.

```text
[esc_division_schedule]
```

```text
[esc_division_schedule game_link="?game_id=%s"]
```

```text
[esc_division_schedule game_link="?game_id=%s" team_id="27"]
```

```text
[esc_division_schedule
  divisions='[{"divisionId":13,"divisionName":"Grunddurchgang"},{"divisionId":27,"divisionName":"Playoffs"}]'
  game_link="?game_id=%s"]
```

| Attribute | Default | Description |
|---|---|---|
| `api_key` | plugin setting | HockeyData API key |
| `division_id` | plugin setting | Pre-selected division (optional) |
| `team_id` | plugin setting | Focuses the schedule on one team (optional) |
| `game_link` | `?game_id=%s` | Query-string pattern for game navigation; `%s` is replaced with the game ID |
| `divisions` | *(none)* | JSON array `[{"divisionId":…,"divisionName":"…"},…]` to populate the picker |
| `class` | *(none)* | Extra CSS class on the wrapper div |
| `fallback_message` | *"Schedule is currently unavailable."* | Shown when the widget cannot load |
| `debug` | `0` | Set to `1` to enable debug output |

### Complete Example: esc_standings -> game report -> back

This example uses one WordPress page and branches by query string.

- Default view (`?`): show standings plus a schedule with game links.
- Report view (`?view=report&game_id=...`): show one game report and a back link.
- `division_id`, `team_id`, and `game_id` are read from the query string automatically by this plugin.

Create a page template, e.g. `page-standings-report.php`, and assign it to a page like `/tabelle/`:

```php
<?php
/**
 * Template Name: ESC Standings Report Flow
 */

get_header();

$view        = isset($_GET['view']) ? sanitize_text_field(wp_unslash($_GET['view'])) : '';
$game_id     = isset($_GET['game_id']) ? intval($_GET['game_id']) : 0;
$division_id = isset($_GET['division_id']) ? intval($_GET['division_id']) : 13;
$team_id     = isset($_GET['team_id']) ? intval($_GET['team_id']) : 27;

$base_url  = get_permalink();
$back_link = add_query_arg(
  array(
    'division_id' => $division_id,
    'team_id'     => $team_id,
  ),
  $base_url
);

if ($view === 'report' && $game_id > 0) {
  echo '<p><a href="' . esc_url($back_link) . '">← Back to standings</a></p>';
  echo do_shortcode('[esc_game_livebox fallback_message="Game report is currently unavailable."]');
} else {
  echo do_shortcode('[esc_standings fallback_message="Standings are currently unavailable."]');

  echo do_shortcode(
    '[esc_division_schedule '
    . 'game_link="?view=report&game_id=%s&division_id=' . $division_id . '&team_id=' . $team_id . '" '
    . 'fallback_message="Schedule is currently unavailable."]'
  );
}

get_footer();
```

Result:

- Users open `/tabelle/?division_id=13&team_id=27` and see standings + game list.
- Clicking a game opens `/tabelle/?view=report&game_id=12345&division_id=13&team_id=27`.
- The report page shows the game and a back link to the standings view.

### Common examples

```text
[esc_game_livebox game_id="12345"]
```

```text
[esc_gameslider team_id="27"]
```

```text
[esc_gameticker division_id="42" options='{"futureOnly":true}']
```

```text
[esc_gameticker_current division_id="42"]
```

```text
[esc_livegames]
```

```text
[esc_divisionpicker]
```

```text
[esc_schedule team_id="27"]
```

```text
[esc_standings team_id="27"]
```

```text
[esc_schedule debug="1"]
```

```text
[esc_gamepitch
  widget_name="hockeydata.los.Game.Info"
  js_modules="los_game_info&los_configuration_icehockey"
  css_modules="los_game_info"
  game_id="12345"]
```

```text
[esc_gamepitch
  game_id="12345"
  options='{"showHeader":true,"showShots":true}']
```

## Admin Settings

Open **Settings → ESC GamePitch** to configure defaults used by all shortcodes and blocks.

- **Settings tab** — API Key, Division ID, Default Team ID, Widget Class, JS/CSS Modules, Default Game ID, Debug Comments.
- **Help tab** — This README rendered inline.

The Default Team ID is applied automatically to any shortcode or block that does not supply a `team_id` attribute, on widgets that support `teamId` (e.g. GameSlider, Schedule, Standings).

## Gutenberg Blocks

Every widget has a matching Gutenberg block. Add them from the block inserter under **Widgets**.

| Block | Namespace | Shortcode equivalent |
|---|---|---|
| ESC GamePitch | `esc/gamepitch` | `[esc_gamepitch]` |
| ESC Game LiveBox | `esc/game-livebox` | `[esc_game_livebox]` |
| ESC Division Picker | `esc/divisionpicker` | `[esc_divisionpicker]` |
| ESC Game Ticker | `esc/gameticker` | `[esc_gameticker]` |
| ESC Game Slider | `esc/gameslider` | `[esc_gameslider]` |
| ESC Live Games | `esc/livegames` | `[esc_livegames]` |
| ESC Schedule | `esc/schedule` | `[esc_schedule]` |
| ESC Standings | `esc/standings` | `[esc_standings]` |
| ESC Division Schedule | `esc/division-schedule` | `[esc_division_schedule]` |

Each block shares the same sidebar controls:

- **API Key Override** / **Division ID Override** — leave empty to use plugin settings defaults.
- **Team ID Focus** — shown on widgets that support `teamId` (e.g. GameSlider, Schedule).
- **Game ID** — for game-specific widgets (e.g. Game LiveBox).
- **Widget Class**, **JS Modules**, **CSS Modules** — advanced overrides.
- **Options JSON** — arbitrary widget options merged into the payload.
- **CSS Class**, **Fallback Message**.

All blocks are server-rendered and produce the same output as their shortcode equivalents. A live server-side preview is shown directly in the block editor. Options JSON is validated and an error notice appears when the JSON is invalid.

For DivisionPicker blocks, additional inspector fields are available:

- `Divisions JSON` (array/object, including grouped seasons)
- `Widgets JSON`
- `Tabs`
- `Game Link Pattern`

## Failover Mode

If HockeyData JavaScript does not load, or widget initialization fails, the plugin now renders a fallback message in place of the widget container.

You can customize the message per shortcode:

```text
[esc_gamepitch game_id="12345" fallback_message="Game data is currently unavailable."]
```

The same fallback message can be configured directly in the Gutenberg block sidebar.

## Debug Mode

For troubleshooting, add `debug="1"` to a shortcode or open the page with `?esc_gamepitch_debug=1`.

This prints a masked HTML comment with the resolved widget payload and module list so you can inspect what the plugin is sending without exposing the full API key.

With `?esc_gamepitch_debug=1`, the frontend also writes a masked runtime payload to the browser console after responsive defaults are applied and before widget initialization.

You can also enable debug comments globally in **Settings -> ESC GamePitch**.

## Notes

- `icehockey` is fixed internally as the sport.
- `division_id` is optional for `DivisionPicker`, `GameSlider`, and `LiveGames` — those widgets can resolve it from the URL at runtime.
- If no `team_id` is set on a shortcode or block, the **Default Team ID** from plugin settings is used automatically.
- The HockeyData API script and CSS are enqueued automatically based on the resolved module names.
- If your target widget needs different module names, set them in plugin settings or as shortcode/block attributes.
