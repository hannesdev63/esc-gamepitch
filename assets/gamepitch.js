(function ($) {
  'use strict';

  var scheduleDesktopColumns = [
    'scheduledDate',
    'scheduledTime',
    'homeTeamLongname',
    'homeTeamLogo',
    'homeTeamScore',
    'scoreDivider',
    'awayTeamScore',
    'scoreInfo',
    'awayTeamLogo',
    'awayTeamLongname'
  ];

  var scheduleMobileColumns = [
    'scheduledDate',
    'scheduledTime',
    'homeTeamShortname',
    'homeTeamLogo',
    'homeTeamScore',
    'scoreDivider',
    'awayTeamScore',
    'scoreInfo',
    'awayTeamLogo',
    'awayTeamShortname'
  ];

  var standingsDesktopColumns = [
    'tableRank',
    'teamLogo',
    'teamLongname',
    'gamesPlayed',
    'gamesWon',
    'gamesLost',
    'gamesWonInOt',
    'gamesLostInOt',
    'goalsFor',
    'goalsAgainst',
    'goalDifference',
    'points'
  ];

  var standingsMobileColumns = [
    'tableRank',
    'teamLogo',
    'teamShortname',
    'gamesPlayed',
    'gamesWon',
    'gamesLost',
    'gamesWonInOt',
    'gamesLostInOt',
    'goalsFor',
    'goalsAgainst',
    'goalDifference',
    'points'
  ];

  function getResponsiveColumns(widgetName) {
    var isDesktop = window.matchMedia && window.matchMedia('(min-width: 870px)').matches;

    if (widgetName === 'hockeydata.los.Schedule') {
      return isDesktop ? scheduleDesktopColumns : scheduleMobileColumns;
    }

    if (widgetName === 'hockeydata.los.Standings') {
      return isDesktop ? standingsDesktopColumns : standingsMobileColumns;
    }

    return null;
  }

  function applyWidgetDefaults(node, payload, options) {
    var columns;

    if (payload.widgetName === 'hockeydata.los.Team.FullPage') {
      node.classList.add('stats');
    }

    columns = getResponsiveColumns(payload.widgetName);
    if (columns && typeof options.columns === 'undefined') {
      options.columns = columns;
    }

    if ((payload.widgetName === 'hockeydata.los.Schedule' || payload.widgetName === 'hockeydata.los.Standings') && typeof options.enableSorting === 'undefined') {
      options.enableSorting = false;
    }
  }

  function isClientDebugEnabled() {
    try {
      return new window.URLSearchParams(window.location.search).get('esc_gamepitch_debug') === '1';
    } catch (err) {
      return false;
    }
  }

  function maskApiKey(value) {
    if (typeof value !== 'string') {
      return value;
    }

    if (value.length <= 8) {
      return new Array(value.length + 1).join('*');
    }

    return value.slice(0, 4) + new Array(value.length - 7).join('*') + value.slice(-4);
  }

  function buildDebugOptions(payload, options) {
    var out = {
      widgetName: payload.widgetName,
      options: {}
    };
    var key;

    for (key in options) {
      if (Object.prototype.hasOwnProperty.call(options, key)) {
        out.options[key] = key === 'apiKey' ? maskApiKey(options[key]) : options[key];
      }
    }

    return out;
  }

  function showFallback(node, message) {
    var text = message || 'Live game data is currently unavailable.';
    node.setAttribute('data-esc-gamepitch-initialized', '1');
    node.classList.add('esc-gamepitch-fallback');
    node.innerHTML = '';

    var fallback = document.createElement('p');
    fallback.className = 'esc-gamepitch-fallback-message';
    fallback.textContent = text;
    node.appendChild(fallback);
  }

  function tryInitWidget(node) {
    var raw = node.getAttribute('data-esc-gamepitch');
    if (!raw) {
      return;
    }

    var payload;
    try {
      payload = JSON.parse(raw);
    } catch (err) {
      console.error('ESC GamePitch: invalid widget payload.', err);
      showFallback(node);
      return;
    }

    if (!window.hockeydata || !window.hockeydata.util || !window.hockeydata.util.Widget) {
      console.error('ESC GamePitch: HockeyData API is not loaded.');
      showFallback(node, payload && payload.fallbackMessage);
      return;
    }

    var options = payload.widgetOptions || {};
  applyWidgetDefaults(node, payload, options);

    if (isClientDebugEnabled()) {
      try {
        console.info('ESC GamePitch client debug:', buildDebugOptions(payload, options));
      } catch (err) {
        console.info('ESC GamePitch client debug: failed to serialize debug payload.');
      }
    }

    options.$domNode = $(node);
    options.widgetName = payload.widgetName;

    try {
      // HockeyData widgets are instantiated via hockeydata.util.Widget(options).
      new window.hockeydata.util.Widget(options);
      node.setAttribute('data-esc-gamepitch-initialized', '1');
    } catch (err) {
      console.error('ESC GamePitch: widget initialization failed.', err);
      showFallback(node, payload.fallbackMessage);
    }
  }

  function initAll() {
    var nodes = document.querySelectorAll('.esc-gamepitch-widget[data-esc-gamepitch]');
    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i].getAttribute('data-esc-gamepitch-initialized') === '1') {
        continue;
      }
      tryInitWidget(nodes[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})(window.jQuery);
