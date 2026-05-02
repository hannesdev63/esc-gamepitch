(function (blocks, element, components, blockEditor, i18n) {
  'use strict';

  var el = element.createElement;
  var __ = i18n.__;
  var ServerSideRender = window.wp.serverSideRender;

  function getOptionsError(optionsValue) {
    if (!optionsValue || optionsValue.trim() === '') {
      return null;
    }

    try {
      JSON.parse(optionsValue);
      return null;
    } catch (err) {
      return __('Options JSON is invalid. Please enter valid JSON.', 'esc-gamepitch');
    }
  }

  function normalizeModules(modulesValue) {
    if (!modulesValue) {
      return '';
    }

    return modulesValue
      .split('&')
      .map(function (part) { return part.trim(); })
      .map(function (part) { return part.replace(/[^a-z0-9_-]/gi, ''); })
      .filter(function (part) { return part.length > 0; })
      .join('&');
  }

  function buildAttributes(preset) {
    return {
      api_key: { type: 'string', default: '' },
      division_id: { type: 'string', default: '' },
      team_id: { type: 'string', default: '' },
      game_id: { type: 'string', default: '' },
      widget_name: { type: 'string', default: preset.widget_name || '' },
      js_modules: { type: 'string', default: preset.js_modules || '' },
      css_modules: { type: 'string', default: preset.css_modules || '' },
      options: { type: 'string', default: '{}' },
      class: { type: 'string', default: '' },
      fallback_message: { type: 'string', default: 'Live game data is currently unavailable.' }
    };
  }

  function registerEscBlock(config) {
    blocks.registerBlockType(config.name, {
      title: __(config.title, 'esc-gamepitch'),
      icon: config.icon || 'chart-line',
      category: 'widgets',
      description: __(config.description, 'esc-gamepitch'),
      attributes: buildAttributes(config.preset || {}),

      edit: function (props) {
        var attrs = props.attributes;
        var optionsError = getOptionsError(attrs.options || '{}');
        var showPrereqHint = !attrs.api_key && !attrs.division_id;

        var previewNode;
        if (optionsError) {
          previewNode = el(
            components.Notice,
            { status: 'error', isDismissible: false },
            optionsError
          );
        } else if (ServerSideRender) {
          previewNode = el(ServerSideRender, {
            block: config.name,
            attributes: attrs
          });
        } else {
          previewNode = el('p', null, __('Live preview is not available in this editor.', 'esc-gamepitch'));
        }

        return el(
          'div',
          { className: 'esc-gamepitch-block-editor' },
          el(
            blockEditor.InspectorControls,
            null,
            el(
              components.PanelBody,
              { title: __('Widget Settings', 'esc-gamepitch'), initialOpen: true },
              el(components.TextControl, {
                label: __('API Key Override', 'esc-gamepitch'),
                help: __('Optional. Leave empty to use plugin settings default.', 'esc-gamepitch'),
                value: attrs.api_key || '',
                onChange: function (value) { props.setAttributes({ api_key: value }); }
              }),
              el(components.TextControl, {
                label: __('Division ID Override', 'esc-gamepitch'),
                help: __('Optional. Leave empty to use plugin settings default.', 'esc-gamepitch'),
                value: attrs.division_id || '',
                onChange: function (value) { props.setAttributes({ division_id: value }); }
              }),
              el(components.TextControl, {
                label: __('Team ID Focus', 'esc-gamepitch'),
                help: __('Optional. Highlights/focuses a specific team when supported by the widget.', 'esc-gamepitch'),
                value: attrs.team_id || '',
                onChange: function (value) { props.setAttributes({ team_id: value }); }
              }),
              el(components.TextControl, {
                label: __('Game ID', 'esc-gamepitch'),
                value: attrs.game_id || '',
                onChange: function (value) { props.setAttributes({ game_id: value }); }
              }),
              el(components.TextControl, {
                label: __('Widget Class', 'esc-gamepitch'),
                help: __('Leave empty to use block default.', 'esc-gamepitch'),
                value: attrs.widget_name || '',
                onChange: function (value) { props.setAttributes({ widget_name: value }); }
              }),
              el(components.TextControl, {
                label: __('JS Modules', 'esc-gamepitch'),
                help: __('Example: los_schedule&los_configuration_icehockey', 'esc-gamepitch'),
                value: attrs.js_modules || '',
                onChange: function (value) { props.setAttributes({ js_modules: normalizeModules(value) }); }
              }),
              el(components.TextControl, {
                label: __('CSS Modules', 'esc-gamepitch'),
                help: __('Example: los_schedule', 'esc-gamepitch'),
                value: attrs.css_modules || '',
                onChange: function (value) { props.setAttributes({ css_modules: normalizeModules(value) }); }
              }),
              el(components.TextareaControl, {
                label: __('Options JSON', 'esc-gamepitch'),
                help: __('Optional JSON merged into widget options.', 'esc-gamepitch'),
                value: attrs.options || '{}',
                onChange: function (value) { props.setAttributes({ options: value }); }
              }),
              optionsError ? el(
                components.Notice,
                { status: 'error', isDismissible: false },
                optionsError
              ) : null,
              el(components.TextControl, {
                label: __('CSS Class', 'esc-gamepitch'),
                value: attrs.class || '',
                onChange: function (value) { props.setAttributes({ class: value }); }
              }),
              el(components.TextControl, {
                label: __('Fallback Message', 'esc-gamepitch'),
                help: __('Shown when HockeyData cannot be loaded.', 'esc-gamepitch'),
                value: attrs.fallback_message || '',
                onChange: function (value) { props.setAttributes({ fallback_message: value }); }
              })
            )
          ),
          showPrereqHint ? el(
            components.Notice,
            { status: 'warning', isDismissible: false },
            __('Preview needs API key and division ID from plugin settings or overrides. Sport is fixed to icehockey.', 'esc-gamepitch')
          ) : null,
          el('h4', null, __('Preview', 'esc-gamepitch')),
          previewNode,
          el('p', null, __('Shortcode equivalent:', 'esc-gamepitch')),
          el('code', null, '[' + config.shortcodeTag + (attrs.game_id ? ' game_id="' + attrs.game_id + '"' : '') + (attrs.team_id ? ' team_id="' + attrs.team_id + '"' : '') + ']')
        );
      },

      save: function () {
        return null;
      }
    });
  }

  registerEscBlock({
    name: 'esc/gamepitch',
    title: 'ESC GamePitch',
    description: 'Render a HockeyData GamePitch widget.',
    shortcodeTag: 'esc_gamepitch',
    preset: {
      widget_name: 'hockeydata.los.Game.LiveBox',
      js_modules: 'los_game_livebox',
      css_modules: 'los_game_livebox'
    }
  });

  registerEscBlock({
    name: 'esc/schedule',
    title: 'ESC Schedule',
    description: 'Render a HockeyData Schedule widget.',
    shortcodeTag: 'esc_schedule',
    icon: 'calendar-alt',
    preset: {
      widget_name: 'hockeydata.los.Schedule',
      js_modules: 'los_schedule&los_configuration_icehockey',
      css_modules: 'los_template_default'
    }
  });

  registerEscBlock({
    name: 'esc/standings',
    title: 'ESC Standings',
    description: 'Render a HockeyData Standings widget.',
    shortcodeTag: 'esc_standings',
    icon: 'list-view',
    preset: {
      widget_name: 'hockeydata.los.Standings',
      js_modules: 'los_standings&los_configuration_icehockey',
      css_modules: 'los_template_default'
    }
  });

  registerEscBlock({
    name: 'esc/game-livebox',
    title: 'ESC Game LiveBox',
    description: 'Compact live game report for a specific game.',
    shortcodeTag: 'esc_game_livebox',
    icon: 'superhero-alt',
    preset: {
      widget_name: 'hockeydata.los.Game.LiveBox',
      js_modules: 'los_game_livebox',
      css_modules: 'los_game_livebox'
    }
  });

  registerEscBlock({
    name: 'esc/divisionpicker',
    title: 'ESC Division Picker',
    description: 'Drop-down to select a division and reload linked widgets.',
    shortcodeTag: 'esc_divisionpicker',
    icon: 'filter',
    preset: {
      widget_name: 'hockeydata.los.DivisionPicker',
      js_modules: 'los_divisionpicker',
      css_modules: 'los_divisionpicker'
    }
  });

  registerEscBlock({
    name: 'esc/gameticker',
    title: 'ESC Game Ticker',
    description: 'Scrolling or rotating game ticker for a division.',
    shortcodeTag: 'esc_gameticker',
    icon: 'clock',
    preset: {
      widget_name: 'hockeydata.los.GameTicker',
      js_modules: 'los_gameticker',
      css_modules: 'los_gameticker'
    }
  });

  registerEscBlock({
    name: 'esc/gameslider',
    title: 'ESC Game Slider',
    description: 'Pageable game slider for a division, optionally filtered by team.',
    shortcodeTag: 'esc_gameslider',
    icon: 'slides',
    preset: {
      widget_name: 'hockeydata.los.GameSlider',
      js_modules: 'los_gameslider',
      css_modules: 'los_gameslider'
    }
  });

  registerEscBlock({
    name: 'esc/livegames',
    title: 'ESC Live Games',
    description: 'Shows current live games; falls back to upcoming schedule when none are live.',
    shortcodeTag: 'esc_livegames',
    icon: 'video-alt3',
    preset: {
      widget_name: 'hockeydata.los.LiveGames',
      js_modules: 'los_livegames',
      css_modules: 'los_livegames'
    }
  });

  // ── ESC Division Schedule (composite: DivisionPicker + Schedule + game links) ──
  (function () {
    var dsAttributes = {
      api_key: { type: 'string', default: '' },
      division_id: { type: 'string', default: '' },
      team_id: { type: 'string', default: '' },
      game_link: { type: 'string', default: '' },
      divisions: { type: 'string', default: '' },
      class: { type: 'string', default: '' },
      fallback_message: { type: 'string', default: 'Schedule is currently unavailable.' }
    };

    blocks.registerBlockType('esc/division-schedule', {
      title: __('ESC Division Schedule', 'esc-gamepitch'),
      icon: 'calendar-alt',
      category: 'widgets',
      description: __('Division picker with schedule and optional game-report links.', 'esc-gamepitch'),
      attributes: dsAttributes,

      edit: function (props) {
        var attrs = props.attributes;
        var showPrereqHint = !attrs.api_key && !attrs.division_id;

        var previewNode;
        if (ServerSideRender) {
          previewNode = el(ServerSideRender, { block: 'esc/division-schedule', attributes: attrs });
        } else {
          previewNode = el('p', null, __('Live preview is not available in this editor.', 'esc-gamepitch'));
        }

        return el(
          'div',
          { className: 'esc-gamepitch-block-editor' },
          el(
            blockEditor.InspectorControls,
            null,
            el(
              components.PanelBody,
              { title: __('Division & Schedule Settings', 'esc-gamepitch'), initialOpen: true },
              el(components.TextControl, {
                label: __('API Key Override', 'esc-gamepitch'),
                help: __('Optional. Leave empty to use plugin settings default.', 'esc-gamepitch'),
                value: attrs.api_key || '',
                onChange: function (v) { props.setAttributes({ api_key: v }); }
              }),
              el(components.TextControl, {
                label: __('Division ID Override', 'esc-gamepitch'),
                help: __('Optional pre-selected division. Leave empty to use plugin settings default.', 'esc-gamepitch'),
                value: attrs.division_id || '',
                onChange: function (v) { props.setAttributes({ division_id: v }); }
              }),
              el(components.TextControl, {
                label: __('Team ID Focus', 'esc-gamepitch'),
                help: __('Optional. Filters the schedule to highlight a specific team.', 'esc-gamepitch'),
                value: attrs.team_id || '',
                onChange: function (v) { props.setAttributes({ team_id: v }); }
              }),
              el(components.TextControl, {
                label: __('Game Report Link', 'esc-gamepitch'),
                help: __('Query-string pattern for game navigation. Use %s as placeholder for the game ID. Example: ?game_id=%s', 'esc-gamepitch'),
                value: attrs.game_link || '',
                onChange: function (v) { props.setAttributes({ game_link: v }); }
              }),
              el(components.TextareaControl, {
                label: __('Divisions JSON', 'esc-gamepitch'),
                help: __('Optional JSON array of {divisionId, divisionName} objects to populate the picker.', 'esc-gamepitch'),
                value: attrs.divisions || '',
                onChange: function (v) { props.setAttributes({ divisions: v }); }
              }),
              el(components.TextControl, {
                label: __('CSS Class', 'esc-gamepitch'),
                value: attrs.class || '',
                onChange: function (v) { props.setAttributes({ class: v }); }
              }),
              el(components.TextControl, {
                label: __('Fallback Message', 'esc-gamepitch'),
                value: attrs.fallback_message || '',
                onChange: function (v) { props.setAttributes({ fallback_message: v }); }
              })
            )
          ),
          showPrereqHint ? el(
            components.Notice,
            { status: 'warning', isDismissible: false },
            __('Preview needs API key and division ID from plugin settings or overrides.', 'esc-gamepitch')
          ) : null,
          el('h4', null, __('Preview', 'esc-gamepitch')),
          previewNode,
          el('p', null, __('Shortcode equivalent:', 'esc-gamepitch')),
          el('code', null, '[esc_division_schedule' +
            (attrs.game_link ? ' game_link="' + attrs.game_link + '"' : '') +
            (attrs.team_id ? ' team_id="' + attrs.team_id + '"' : '') +
            ']')
        );
      },

      save: function () { return null; }
    });
  }());
})(window.wp.blocks, window.wp.element, window.wp.components, window.wp.blockEditor || window.wp.editor, window.wp.i18n);
