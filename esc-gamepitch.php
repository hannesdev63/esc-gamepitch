<?php
/**
 * Plugin Name: ESC GamePitch
 * Description: Renders HockeyData GamePitch widgets via shortcode using the HockeyData JavaScript API.
 * Version: 1.0.0
 * Author: ESC
 */

if (! defined('ABSPATH')) {
    exit;
}

final class ESC_GamePitch_Plugin
{
    const OPTION_KEY = 'esc_gamepitch_settings';

    private static $instance = null;

    private function __construct()
    {
        add_action('init', array($this, 'register_block'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('admin_menu', array($this, 'register_settings_page'));
        add_action('wp_enqueue_scripts', array($this, 'register_assets'));
        add_action('enqueue_block_editor_assets', array($this, 'register_block_editor_assets'));

        add_shortcode('esc_gamepitch', array($this, 'render_shortcode'));
        add_shortcode('esc_schedule', array($this, 'render_schedule_shortcode'));
        add_shortcode('esc_standings', array($this, 'render_standings_shortcode'));
        add_shortcode('esc_game_livebox', array($this, 'render_game_livebox_shortcode'));
        add_shortcode('esc_divisionpicker', array($this, 'render_divisionpicker_shortcode'));
        add_shortcode('esc_gameticker', array($this, 'render_gameticker_shortcode'));
        add_shortcode('esc_gameslider', array($this, 'render_gameslider_shortcode'));
        add_shortcode('esc_livegames', array($this, 'render_livegames_shortcode'));
        add_shortcode('esc_division_schedule', array($this, 'render_division_schedule_shortcode'));
    }

    public static function instance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    public function register_assets()
    {
        wp_register_script(
            'esc-gamepitch-init',
            plugin_dir_url(__FILE__) . 'assets/gamepitch.js',
            array('jquery'),
            '1.0.0',
            true
        );

        wp_register_style(
            'esc-gamepitch-local',
            plugin_dir_url(__FILE__) . 'assets/gamepitch.css',
            array(),
            '1.0.0'
        );
    }

    public function register_block_editor_assets()
    {
        wp_register_script(
            'esc-gamepitch-block-editor',
            plugin_dir_url(__FILE__) . 'assets/block.js',
            array('wp-blocks', 'wp-element', 'wp-editor', 'wp-components', 'wp-i18n', 'wp-block-editor', 'wp-server-side-render'),
            '1.2.0',
            true
        );

        wp_enqueue_script('esc-gamepitch-block-editor');
    }

    public function register_block()
    {
        if (! function_exists('register_block_type')) {
            return;
        }

        $attributes = array(
            'api_key' => array('type' => 'string', 'default' => ''),
            'division_id' => array('type' => 'string', 'default' => ''),
            'team_id' => array('type' => 'string', 'default' => ''),
            'game_id' => array('type' => 'string', 'default' => ''),
            'widget_name' => array('type' => 'string', 'default' => ''),
            'js_modules' => array('type' => 'string', 'default' => ''),
            'css_modules' => array('type' => 'string', 'default' => ''),
            'class' => array('type' => 'string', 'default' => ''),
            'options' => array('type' => 'string', 'default' => '{}'),
            'fallback_message' => array('type' => 'string', 'default' => 'Live game data is currently unavailable.'),
        );

        register_block_type('esc/gamepitch', array(
            'render_callback' => array($this, 'render_block'),
            'attributes' => $attributes,
        ));

        register_block_type('esc/schedule', array(
            'render_callback' => array($this, 'render_block'),
            'attributes' => $attributes,
        ));

        register_block_type('esc/standings', array(
            'render_callback' => array($this, 'render_block'),
            'attributes' => $attributes,
        ));

        register_block_type('esc/game-livebox', array(
            'render_callback' => array($this, 'render_block'),
            'attributes' => $attributes,
        ));

        register_block_type('esc/divisionpicker', array(
            'render_callback' => array($this, 'render_block'),
            'attributes' => $attributes,
        ));

        register_block_type('esc/gameticker', array(
            'render_callback' => array($this, 'render_block'),
            'attributes' => $attributes,
        ));

        register_block_type('esc/gameslider', array(
            'render_callback' => array($this, 'render_block'),
            'attributes' => $attributes,
        ));

        register_block_type('esc/livegames', array(
            'render_callback' => array($this, 'render_block'),
            'attributes' => $attributes,
        ));

        $division_schedule_attributes = array_merge($attributes, array(
            'game_link' => array('type' => 'string', 'default' => ''),
            'divisions' => array('type' => 'string', 'default' => ''),
        ));

        register_block_type('esc/division-schedule', array(
            'render_callback' => array($this, 'render_block'),
            'attributes' => $division_schedule_attributes,
        ));
    }

    public function render_block($attributes, $content = '', $block = null)
    {
        $atts = array();
        if (is_array($attributes)) {
            $atts = $attributes;
        }

        $block_name = '';
        if (is_object($block) && isset($block->name)) {
            $block_name = (string) $block->name;
        }

        if ($block_name === 'esc/schedule') {
            $atts = wp_parse_args($atts, array(
                'sport' => 'icehockey',
                'widget_name' => 'hockeydata.los.Schedule',
                'js_modules' => 'los_schedule&los_configuration_icehockey',
                'css_modules' => 'los_template_default',
            ));
        } elseif ($block_name === 'esc/standings') {
            $atts = wp_parse_args($atts, array(
                'sport' => 'icehockey',
                'widget_name' => 'hockeydata.los.Standings',
                'js_modules' => 'los_standings&los_configuration_icehockey',
                'css_modules' => 'los_template_default',
            ));
        } elseif ($block_name === 'esc/game-livebox') {
            $atts = wp_parse_args($atts, array(
                'widget_name' => 'hockeydata.los.Game.LiveBox',
                'js_modules' => 'los_game_livebox',
                'css_modules' => 'los_game_livebox',
            ));
        } elseif ($block_name === 'esc/divisionpicker') {
            $atts = wp_parse_args($atts, array(
                'widget_name' => 'hockeydata.los.DivisionPicker',
                'js_modules' => 'los_divisionpicker',
                'css_modules' => 'los_divisionpicker',
            ));
        } elseif ($block_name === 'esc/gameticker') {
            $atts = wp_parse_args($atts, array(
                'widget_name' => 'hockeydata.los.GameTicker',
                'js_modules' => 'los_gameticker',
                'css_modules' => 'los_gameticker',
            ));
        } elseif ($block_name === 'esc/gameslider') {
            $atts = wp_parse_args($atts, array(
                'widget_name' => 'hockeydata.los.GameSlider',
                'js_modules' => 'los_gameslider',
                'css_modules' => 'los_gameslider',
            ));
        } elseif ($block_name === 'esc/livegames') {
            $atts = wp_parse_args($atts, array(
                'widget_name' => 'hockeydata.los.LiveGames',
                'js_modules' => 'los_livegames',
                'css_modules' => 'los_livegames',
            ));
        } elseif ($block_name === 'esc/division-schedule') {
            return $this->render_division_schedule_shortcode($atts);
        }

        return $this->render_shortcode($atts);
    }

    public function register_settings()
    {
        register_setting(
            'esc_gamepitch_settings_group',
            self::OPTION_KEY,
            array($this, 'sanitize_settings')
        );

        add_settings_section(
            'esc_gamepitch_main',
            'Default Widget Configuration',
            '__return_false',
            'esc-gamepitch-settings'
        );

        $fields = array(
            'api_key' => 'API Key',
            'division_id' => 'Division ID',
            'default_team_id' => 'Default Team ID (optional)',
            'debug_comments' => 'Debug Comments',
            'widget_name' => 'Widget Class (default: hockeydata.los.Game.LiveBox)',
            'js_modules' => 'JS Modules (ampersand-separated)',
            'css_modules' => 'CSS Modules (ampersand-separated)',
            'default_game_id' => 'Default Game ID (optional)',
        );

        foreach ($fields as $key => $label) {
            add_settings_field(
                $key,
                $label,
                array($this, 'render_settings_field'),
                'esc-gamepitch-settings',
                'esc_gamepitch_main',
                array('key' => $key)
            );
        }
    }

    public function sanitize_settings($input)
    {
        $out = array();

        $out['api_key'] = isset($input['api_key']) ? sanitize_text_field($input['api_key']) : '';
        $out['division_id'] = isset($input['division_id']) ? intval($input['division_id']) : 0;
        $out['default_team_id'] = isset($input['default_team_id']) ? intval($input['default_team_id']) : 0;
        $out['sport'] = 'icehockey';
        $out['debug_comments'] = isset($input['debug_comments']) ? 1 : 0;
        $out['widget_name'] = isset($input['widget_name']) ? sanitize_text_field($input['widget_name']) : 'hockeydata.los.Game.LiveBox';
        $out['js_modules'] = isset($input['js_modules']) ? sanitize_text_field($input['js_modules']) : 'los_game_livebox';
        $out['css_modules'] = isset($input['css_modules']) ? sanitize_text_field($input['css_modules']) : 'los_game_livebox';
        $out['default_game_id'] = isset($input['default_game_id']) ? intval($input['default_game_id']) : 0;

        return $out;
    }

    public function register_settings_page()
    {
        add_options_page(
            'ESC GamePitch',
            'ESC GamePitch',
            'manage_options',
            'esc-gamepitch-settings',
            array($this, 'render_settings_page')
        );
    }

    public function render_settings_field($args)
    {
        $key = $args['key'];
        $settings = $this->get_settings();
        $value = isset($settings[$key]) ? $settings[$key] : '';

        if ($key === 'debug_comments') {
            ?>
            <label>
                <input
                    type="checkbox"
                    name="<?php echo esc_attr(self::OPTION_KEY); ?>[debug_comments]"
                    value="1"
                    <?php checked(! empty($value)); ?>
                />
                Output masked widget payloads as HTML comments for troubleshooting.
            </label>
            <p class="description">You can still override this per request with <code>?esc_gamepitch_debug=1</code> or per shortcode with <code>debug="1"</code>.</p>
            <?php
            return;
        }

        ?>
        <input
            type="text"
            name="<?php echo esc_attr(self::OPTION_KEY); ?>[<?php echo esc_attr($key); ?>]"
            value="<?php echo esc_attr($value); ?>"
            class="regular-text"
        />
        <?php
        if ($key === 'division_id' || $key === 'default_team_id') {
            echo '<p class="description">'
                . 'Find your Division ID and Team ID using the '
                . '<a href="https://apidocs.hockeydata.net/division-finder/" target="_blank" rel="noopener">HockeyData Division Finder</a>.'
                . '</p>';
        }
        if ($key === 'widget_name') {
            echo '<p class="description">'
                . 'Must be a valid widget class from the '
                . '<a href="https://apidocs.hockeydata.net/javascript-api/" target="_blank" rel="noopener">HockeyData JavaScript API</a>. '
                . 'E.g. <code>hockeydata.los.Game.LiveBox</code>, <code>hockeydata.los.GameSlider</code>, '
                . '<code>hockeydata.los.Schedule</code>, <code>hockeydata.los.Standings</code>.'
                . '</p>';
        }
    }

    public function render_settings_page()
    {
        $active_tab = (isset($_GET['tab']) && $_GET['tab'] === 'help') ? 'help' : 'settings';
        $settings_url = esc_url(admin_url('options-general.php?page=esc-gamepitch-settings&tab=settings'));
        $help_url     = esc_url(admin_url('options-general.php?page=esc-gamepitch-settings&tab=help'));
        ?>
        <div class="wrap">
            <h1>ESC GamePitch</h1>
            <nav class="nav-tab-wrapper" style="margin-bottom:0">
                <a href="<?php echo $settings_url; ?>" class="nav-tab <?php echo $active_tab === 'settings' ? 'nav-tab-active' : ''; ?>">
                    <?php esc_html_e('Settings', 'esc-gamepitch'); ?>
                </a>
                <a href="<?php echo $help_url; ?>" class="nav-tab <?php echo $active_tab === 'help' ? 'nav-tab-active' : ''; ?>">
                    <?php esc_html_e('Help', 'esc-gamepitch'); ?>
                </a>
            </nav>
            <div class="tab-content" style="padding-top:1.5em">
            <?php if ($active_tab === 'help') : ?>
                <?php $this->render_help_tab(); ?>
            <?php else : ?>
                <p>Configure default values used by the shortcode <code>[esc_gamepitch]</code>.</p>
                <form action="options.php" method="post">
                    <?php
                    settings_fields('esc_gamepitch_settings_group');
                    do_settings_sections('esc-gamepitch-settings');
                    submit_button();
                    ?>
                </form>
                <h2>Shortcode Example</h2>
                <p><code>[esc_gamepitch game_id="12345"]</code></p>
            <?php endif; ?>
            </div>
        </div>
        <?php
    }

    private function render_help_tab()
    {
        $readme_path = plugin_dir_path(__FILE__) . 'README.md';
        if (! file_exists($readme_path)) {
            echo '<p>README.md not found.</p>';
            return;
        }
        $content = file_get_contents($readme_path);
        if ($content === false) {
            echo '<p>Could not read README.md.</p>';
            return;
        }
        $allowed = wp_kses_allowed_html('post');
        $allowed['pre']  = array('style' => array());
        $allowed['code'] = array();
        $allowed['hr']   = array();
        echo '<div style="max-width:860px">';
        echo wp_kses($this->markdown_to_html($content), $allowed);
        echo '</div>';
    }

    private function markdown_to_html($text)
    {
        $lines    = explode("\n", str_replace("\r\n", "\n", $text));
        $out      = '';
        $in_code  = false;
        $code_buf = '';
        $in_list  = false;
        $para     = array();

        $close_list = function () use (&$in_list, &$out) {
            if ($in_list) { $out .= "</ul>\n"; $in_list = false; }
        };
        $flush_para = function () use (&$para, &$out) {
            if ($para) { $out .= '<p>' . implode(' ', $para) . "</p>\n"; $para = array(); }
        };

        foreach ($lines as $line) {
            if (preg_match('/^```/', $line)) {
                if ($in_code) {
                    $in_code  = false;
                    $out     .= '<pre style="background:#f6f7f7;padding:12px 16px;overflow:auto"><code>'
                        . esc_html(rtrim($code_buf, "\n")) . "</code></pre>\n";
                    $code_buf = '';
                } else {
                    $close_list(); $flush_para();
                    $in_code = true;
                }
                continue;
            }
            if ($in_code) { $code_buf .= $line . "\n"; continue; }

            if (preg_match('/^(#{1,4}) (.+)/', $line, $m)) {
                $close_list(); $flush_para();
                $lv   = strlen($m[1]);
                $out .= "<h{$lv}>" . $this->md_inline($m[2]) . "</h{$lv}>\n";
                continue;
            }
            if (preg_match('/^-{3,}$/', trim($line))) {
                $close_list(); $flush_para();
                $out .= "<hr />\n";
                continue;
            }
            if (preg_match('/^\s*[-*] (.+)/', $line, $m)) {
                $flush_para();
                if (! $in_list) { $out .= "<ul>\n"; $in_list = true; }
                $out .= '<li>' . $this->md_inline($m[1]) . "</li>\n";
                continue;
            }
            if (trim($line) === '') {
                $close_list(); $flush_para();
                continue;
            }
            $close_list();
            $para[] = $this->md_inline($line);
        }
        $close_list(); $flush_para();
        return $out;
    }

    private function md_inline($text)
    {
        // Split on inline code spans — process their interiors separately.
        $parts  = preg_split('/(`[^`]+`)/', $text, -1, PREG_SPLIT_DELIM_CAPTURE);
        $result = '';
        foreach ($parts as $part) {
            if ($part !== '' && $part[0] === '`') {
                $result .= '<code>' . esc_html(substr($part, 1, -1)) . '</code>';
                continue;
            }
            // Escape HTML special chars first; **, [ ] ( ) are unaffected.
            $part = esc_html($part);
            // Bold
            $part = preg_replace('/\*\*(.+?)\*\*/', '<strong>$1</strong>', $part);
            // Links
            $part = preg_replace_callback(
                '/\[([^\]]+)\]\((https?:[^)]+)\)/',
                function ($m) {
                    return '<a href="' . esc_url($m[2]) . '" target="_blank" rel="noopener">' . $m[1] . '</a>';
                },
                $part
            );
            $result .= $part;
        }
        return $result;
    }

    public function render_shortcode($atts)
    {
        $settings = $this->get_settings();

        $defaults = array(
            'api_key' => $settings['api_key'],
            'division_id' => $settings['division_id'],
            'sport' => 'icehockey',
            'team_id' => $settings['default_team_id'],
            'widget_name' => $settings['widget_name'],
            'js_modules' => $settings['js_modules'],
            'css_modules' => $settings['css_modules'],
            'game_id' => $settings['default_game_id'],
            'options' => '{}',
            'class' => '',
            'debug' => '0',
            'fallback_message' => 'Live game data is currently unavailable.',
        );

        $atts = shortcode_atts($defaults, $atts, 'esc_gamepitch');

        $api_key = sanitize_text_field((string) $atts['api_key']);
        $division_id = intval($atts['division_id']);
        $sport = 'icehockey';
        $team_id = intval($atts['team_id']);
        $widget_name = sanitize_text_field((string) $atts['widget_name']);
        $game_id = intval($atts['game_id']);
        $js_modules = $this->sanitize_modules((string) $atts['js_modules']);
        $css_modules = $this->sanitize_modules((string) $atts['css_modules']);
        $debug_enabled = $this->is_debug_enabled($atts, $settings);
        $fallback_message = sanitize_text_field((string) $atts['fallback_message']);

        // DivisionPicker, GameSlider and LiveGames can resolve divisionId from the URL at runtime.
        $division_optional = in_array($widget_name, array(
            'hockeydata.los.DivisionPicker',
            'hockeydata.los.GameSlider',
            'hockeydata.los.LiveGames',
        ), true);

        if ($api_key === '' || (! $division_optional && $division_id <= 0) || $sport === '') {
            return '<p class="esc-gamepitch-error">ESC GamePitch: missing api_key, division_id or sport.</p>';
        }

        if ($widget_name === '') {
            $widget_name = 'hockeydata.los.Game.LiveBox';
        }

        $custom_options = json_decode((string) $atts['options'], true);
        if (! is_array($custom_options)) {
            $custom_options = array();
        }

        $base_options = array(
            'apiKey' => $api_key,
            'sport' => $sport,
        );

        if ($division_id > 0) {
            $base_options['divisionId'] = $division_id;
        }

        $widget_options = array_merge($base_options, $custom_options);

        if ($game_id > 0) {
            $widget_options['gameId'] = $game_id;
        }

        if ($team_id > 0) {
            $widget_options['teamId'] = $team_id;
        }

        $this->enqueue_hockeydata_assets($js_modules, $css_modules);

        wp_enqueue_script('esc-gamepitch-init');
        wp_enqueue_style('esc-gamepitch-local');

        $dom_id = 'esc-gamepitch-' . wp_rand(1000, 999999);
        $class_name = sanitize_html_class((string) $atts['class']);

        $payload = array(
            'domId' => $dom_id,
            'widgetName' => $widget_name,
            'widgetOptions' => $widget_options,
            'fallbackMessage' => $fallback_message,
        );

        $json_payload = wp_json_encode($payload);
        if ($json_payload === false) {
            return '<p class="esc-gamepitch-error">ESC GamePitch: could not encode widget options.</p>';
        }

        ob_start();
        if ($debug_enabled) {
            echo "\n<!-- ESC GamePitch Debug: " . esc_html(wp_json_encode($this->build_debug_payload($payload, $js_modules, $css_modules))) . " -->\n";
        }
        ?>
        <div
            id="<?php echo esc_attr($dom_id); ?>"
            class="esc-gamepitch-widget <?php echo esc_attr($class_name); ?>"
            data-esc-gamepitch="<?php echo esc_attr($json_payload); ?>"
        ></div>
        <?php

        return (string) ob_get_clean();
    }

    public function render_game_livebox_shortcode($atts)
    {
        return $this->render_preset_shortcode($atts, array(
            'widget_name' => 'hockeydata.los.Game.LiveBox',
            'js_modules' => 'los_game_livebox',
            'css_modules' => 'los_game_livebox',
        ));
    }

    public function render_divisionpicker_shortcode($atts)
    {
        return $this->render_preset_shortcode($atts, array(
            'widget_name' => 'hockeydata.los.DivisionPicker',
            'js_modules' => 'los_divisionpicker',
            'css_modules' => 'los_divisionpicker',
        ));
    }

    public function render_gameticker_shortcode($atts)
    {
        return $this->render_preset_shortcode($atts, array(
            'widget_name' => 'hockeydata.los.GameTicker',
            'js_modules' => 'los_gameticker',
            'css_modules' => 'los_gameticker',
        ));
    }

    public function render_gameslider_shortcode($atts)
    {
        return $this->render_preset_shortcode($atts, array(
            'widget_name' => 'hockeydata.los.GameSlider',
            'js_modules' => 'los_gameslider',
            'css_modules' => 'los_gameslider',
        ));
    }

    public function render_livegames_shortcode($atts)
    {
        return $this->render_preset_shortcode($atts, array(
            'widget_name' => 'hockeydata.los.LiveGames',
            'js_modules' => 'los_livegames',
            'css_modules' => 'los_livegames',
        ));
    }

    /**
     * Composite shortcode: DivisionPicker + Schedule + optional game-report links.
     *
     * [esc_division_schedule]
     * [esc_division_schedule game_link="/spielbericht/%s/" team_id="27"]
     * [esc_division_schedule divisions='[{"divisionId":13,"divisionName":"Grunddurchgang"},{"divisionId":27,"divisionName":"Playoffs"}]']
     */
    public function render_division_schedule_shortcode($atts)
    {
        $settings = $this->get_settings();

        $defaults = array(
            'api_key'          => $settings['api_key'],
            'division_id'      => $settings['division_id'],
            'team_id'          => $settings['default_team_id'],
            'game_link'        => '',
            'divisions'        => '',
            'class'            => '',
            'debug'            => '0',
            'fallback_message' => 'Schedule is currently unavailable.',
        );

        $atts = shortcode_atts($defaults, $atts, 'esc_division_schedule');

        $api_key          = sanitize_text_field((string) $atts['api_key']);
        $division_id      = intval($atts['division_id']);
        $team_id          = intval($atts['team_id']);
        $game_link        = sanitize_text_field((string) $atts['game_link']);
        $debug_enabled    = $this->is_debug_enabled($atts, $settings);
        $fallback_message = sanitize_text_field((string) $atts['fallback_message']);

        if ($api_key === '') {
            return '<p class="esc-gamepitch-error">ESC GamePitch: missing api_key.</p>';
        }

        // Build inner Schedule widget options.
        $inner_options = array();
        if ($team_id > 0) {
            $inner_options['teamId'] = $team_id;
        }
        if ($game_link !== '') {
            $inner_options['gameLink'] = $game_link;
        }

        // Build the DivisionPicker widget options.
        $widget_options = array(
            'apiKey'  => $api_key,
            'sport'   => 'icehockey',
            'widget'  => 'hockeydata.los.Schedule',
        );

        if ($division_id > 0) {
            $widget_options['divisionId'] = $division_id;
        }

        if (! empty($inner_options)) {
            $widget_options['widgetOptions'] = $inner_options;
        }

        if ($atts['divisions'] !== '') {
            $divisions_decoded = json_decode($atts['divisions'], true);
            if (is_array($divisions_decoded)) {
                $widget_options['divisions'] = $divisions_decoded;
            }
        }

        $js_modules  = 'los_divisionpicker&los_schedule&los_configuration_icehockey';
        $css_modules = 'los_divisionpicker&los_template_default';

        $this->enqueue_hockeydata_assets($js_modules, $css_modules);
        wp_enqueue_script('esc-gamepitch-init');
        wp_enqueue_style('esc-gamepitch-local');

        $dom_id     = 'esc-gamepitch-' . wp_rand(1000, 999999);
        $class_name = sanitize_html_class((string) $atts['class']);

        $payload = array(
            'domId'           => $dom_id,
            'widgetName'      => 'hockeydata.los.DivisionPicker',
            'widgetOptions'   => $widget_options,
            'fallbackMessage' => $fallback_message,
        );

        $json_payload = wp_json_encode($payload);
        if ($json_payload === false) {
            return '<p class="esc-gamepitch-error">ESC GamePitch: could not encode widget options.</p>';
        }

        ob_start();
        if ($debug_enabled) {
            echo "\n<!-- ESC GamePitch Debug: " . esc_html(wp_json_encode($this->build_debug_payload($payload, $js_modules, $css_modules))) . " -->\n";
        }
        ?>
        <div
            id="<?php echo esc_attr($dom_id); ?>"
            class="esc-gamepitch-widget <?php echo esc_attr($class_name); ?>"
            data-esc-gamepitch="<?php echo esc_attr($json_payload); ?>"
        ></div>
        <?php

        return (string) ob_get_clean();
    }

    public function render_schedule_shortcode($atts)
    {
        return $this->render_preset_shortcode($atts, array(
            'sport' => 'icehockey',
            'widget_name' => 'hockeydata.los.Schedule',
            'js_modules' => 'los_schedule&los_configuration_icehockey',
            'css_modules' => 'los_template_default',
        ));
    }

    public function render_standings_shortcode($atts)
    {
        return $this->render_preset_shortcode($atts, array(
            'sport' => 'icehockey',
            'widget_name' => 'hockeydata.los.Standings',
            'js_modules' => 'los_standings&los_configuration_icehockey',
            'css_modules' => 'los_template_default',
        ));
    }

    private function render_preset_shortcode($atts, $preset)
    {
        if (! is_array($atts)) {
            $atts = array();
        }

        return $this->render_shortcode(wp_parse_args($atts, $preset));
    }

    private function enqueue_hockeydata_assets($js_modules, $css_modules)
    {
        $js_handle = 'esc-gamepitch-api-' . md5($js_modules);
        $css_handle = 'esc-gamepitch-api-css-' . md5($css_modules);

        if (! wp_script_is($js_handle, 'registered')) {
            wp_register_script(
                $js_handle,
                $this->build_hockeydata_url('https://api.hockeydata.net/js/', $js_modules),
                array('jquery'),
                null,
                true
            );
        }

        if (! wp_style_is($css_handle, 'registered')) {
            wp_register_style(
                $css_handle,
                $this->build_hockeydata_url('https://api.hockeydata.net/css/', $css_modules),
                array(),
                null
            );
        }

        wp_enqueue_script($js_handle);
        wp_enqueue_style($css_handle);
    }

    private function build_hockeydata_url($base, $modules)
    {
        $parts = array_filter(array_map('trim', explode('&', $modules)));
        $encoded = array();

        foreach ($parts as $part) {
            if ($part === '') {
                continue;
            }
            $encoded[] = rawurlencode($part);
        }

        $query = implode('&', $encoded);
        if ($query === '') {
            return $base;
        }

        return $base . '?' . $query;
    }

    private function sanitize_modules($modules)
    {
        $parts = array_filter(array_map('trim', explode('&', $modules)));
        $clean = array();

        foreach ($parts as $part) {
            $clean[] = preg_replace('/[^a-z0-9_\-]/i', '', $part);
        }

        return implode('&', array_filter($clean));
    }

    private function is_debug_enabled($atts, $settings)
    {
        if (isset($_GET['esc_gamepitch_debug']) && $_GET['esc_gamepitch_debug'] === '1') {
            return true;
        }

        if (! empty($atts['debug']) && $atts['debug'] !== '0') {
            return true;
        }

        return ! empty($settings['debug_comments']);
    }

    private function build_debug_payload($payload, $js_modules, $css_modules)
    {
        $debug_payload = $payload;

        if (isset($debug_payload['widgetOptions']['apiKey'])) {
            $debug_payload['widgetOptions']['apiKey'] = $this->mask_api_key((string) $debug_payload['widgetOptions']['apiKey']);
        }

        $debug_payload['jsModules'] = $js_modules;
        $debug_payload['cssModules'] = $css_modules;

        return $debug_payload;
    }

    private function mask_api_key($api_key)
    {
        $length = strlen($api_key);
        if ($length <= 8) {
            return str_repeat('*', $length);
        }

        return substr($api_key, 0, 4) . str_repeat('*', $length - 8) . substr($api_key, -4);
    }

    private function get_settings()
    {
        $defaults = array(
            'api_key' => '',
            'division_id' => 0,
            'default_team_id' => 0,
            'sport' => 'icehockey',
            'debug_comments' => 0,
            'widget_name' => 'hockeydata.los.Game.LiveBox',
            'js_modules' => 'los_game_livebox',
            'css_modules' => 'los_game_livebox',
            'default_game_id' => 0,
        );

        $settings = get_option(self::OPTION_KEY, array());
        if (! is_array($settings)) {
            $settings = array();
        }

        return wp_parse_args($settings, $defaults);
    }
}

ESC_GamePitch_Plugin::instance();
