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

  function splitCombinedGameValue(gameValue) {
    var raw = typeof gameValue === 'string' ? gameValue.trim() : '';
    if (!raw) {
      return { gameId: '', divisionId: '' };
    }

    var parts = raw.split(',');
    var gameId = parts[0] ? parts[0].trim() : '';
    var divisionId = parts.length > 1 && parts[1] ? parts[1].trim() : '';

    return { gameId: gameId, divisionId: divisionId };
  }

  function normalizeLegacyGameIdInUrl() {
    try {
      var url = new window.URL(window.location.href);
      var changed = false;
      var key = '';

      if (url.searchParams.has('game_id')) {
        key = 'game_id';
      } else if (url.searchParams.has('gameId')) {
        key = 'gameId';
      }

      if (!key) {
        return;
      }

      var parsed = splitCombinedGameValue(url.searchParams.get(key) || '');
      if (!parsed.gameId) {
        return;
      }

      if (url.searchParams.get(key) !== parsed.gameId) {
        url.searchParams.set(key, parsed.gameId);
        changed = true;
      }

      if (parsed.divisionId && !url.searchParams.has('division_id')) {
        url.searchParams.set('division_id', parsed.divisionId);
        changed = true;
      }

      if (changed) {
        window.history.replaceState(window.history.state, '', url.toString());
      }
    } catch (err) {
      // Ignore URL parsing failures.
    }
  }

  function isClientDebugRequested() {
    try {
      return new window.URLSearchParams(window.location.search).get('esc_gamepitch_debug') === '1';
    } catch (err) {
      return false;
    }
  }

  function isClientDebugAllowed(payload) {
    if (payload && payload.debugAllowed === true) {
      return true;
    }

    return !!(window.escGamePitchConfig && window.escGamePitchConfig.debugAllowed === 1);
  }

  function isClientDebugEnabled(payload) {
    return isClientDebugRequested() && isClientDebugAllowed(payload);
  }

  function debugLog(payload, level, message, data) {
    if (!isClientDebugEnabled(payload)) {
      return;
    }

    var logger = window.console && typeof window.console[level] === 'function'
      ? window.console[level]
      : (window.console && typeof window.console.log === 'function' ? window.console.log : null);

    if (!logger) {
      return;
    }

    if (typeof data === 'undefined') {
      logger.call(window.console, message);
      return;
    }

    logger.call(window.console, message, data);
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

  function getSeasonStorageKey(node, payload) {
    var domId = payload && payload.domId ? payload.domId : (node.id || 'default');
    return 'esc_gamepitch_season:' + window.location.pathname + ':' + domId;
  }

  function readSeasonFromUrl() {
    try {
      var params = new window.URLSearchParams(window.location.search);
      return params.get('esc_season') || '';
    } catch (err) {
      return '';
    }
  }

  function readPersistedSeason(node, payload) {
    var fromUrl = readSeasonFromUrl();
    if (fromUrl) {
      return fromUrl;
    }

    try {
      if (!window.localStorage) {
        return '';
      }
      return window.localStorage.getItem(getSeasonStorageKey(node, payload)) || '';
    } catch (err) {
      return '';
    }
  }

  function writePersistedSeason(node, payload, seasonValue) {
    var value = typeof seasonValue === 'string' ? seasonValue : '';
    if (!value) {
      return;
    }

    try {
      if (window.localStorage) {
        window.localStorage.setItem(getSeasonStorageKey(node, payload), value);
      }
    } catch (err) {
      // Ignore storage failures.
    }

    try {
      var url = new window.URL(window.location.href);
      url.searchParams.set('esc_season', value);
      window.history.replaceState(window.history.state, '', url.toString());
    } catch (err) {
      // Ignore history API failures.
    }
  }

  function reorderSeasonDivisions(divisions, selectedSeason) {
    if (!divisions || Array.isArray(divisions) || typeof divisions !== 'object' || !selectedSeason || !Object.prototype.hasOwnProperty.call(divisions, selectedSeason)) {
      return divisions;
    }

    var reordered = {};
    var key;
    reordered[selectedSeason] = divisions[selectedSeason];

    for (key in divisions) {
      if (Object.prototype.hasOwnProperty.call(divisions, key) && key !== selectedSeason) {
        reordered[key] = divisions[key];
      }
    }

    return reordered;
  }

  function appendQueryParam(url, key, value) {
    var hashIndex = url.indexOf('#');
    var hash = '';
    var base = url;

    if (hashIndex >= 0) {
      base = url.slice(0, hashIndex);
      hash = url.slice(hashIndex);
    }

    var pattern = new RegExp('([?&])' + key + '=([^&#]*)');
    if (pattern.test(base)) {
      base = base.replace(pattern, '$1' + key + '=' + encodeURIComponent(value));
      return base + hash;
    }

    var separator = base.indexOf('?') === -1 ? '?' : '&';
    return base + separator + key + '=' + encodeURIComponent(value) + hash;
  }

  function clearGameNavigationState() {
    try {
      var url = new window.URL(window.location.href);
      var changed = false;

      if (url.searchParams.has('game_id')) {
        url.searchParams.delete('game_id');
        changed = true;
      }

      if (url.searchParams.has('gameId')) {
        url.searchParams.delete('gameId');
        changed = true;
      }

      if (url.searchParams.get('view') === 'report') {
        url.searchParams.delete('view');
        changed = true;
      }

      if (changed) {
        window.history.replaceState(window.history.state, '', url.toString());
      }
    } catch (err) {
      // Ignore history API failures.
    }
  }

  function applyTemplateRowLink(template, gameId, divisionId) {
    var normalized = splitCombinedGameValue(String(gameId || ''));
    var safeGameId = normalized.gameId || String(gameId || '');
    var safeDivisionId = divisionId;

    if ((!safeDivisionId || String(safeDivisionId).trim() === '') && normalized.divisionId) {
      safeDivisionId = normalized.divisionId;
    }

    var link = String(template || '');

    if (link.indexOf('%s') !== -1) {
      link = link.replace('%s', encodeURIComponent(String(safeGameId)));
    }
    if (link.indexOf('%s') !== -1) {
      link = link.replace('%s', encodeURIComponent(String(safeDivisionId || '')));
    }

    return link;
  }

  function applyDivisionPickerSeasonEnhancements(node, payload, options) {
    var divisions = options.divisions;
    var hasSeasonObject = divisions && !Array.isArray(divisions) && typeof divisions === 'object';
    var selectedSeason = hasSeasonObject ? readPersistedSeason(node, payload) : '';

    if (hasSeasonObject && selectedSeason) {
      options.divisions = reorderSeasonDivisions(divisions, selectedSeason);
    }

    if (Array.isArray(options.widgets)) {
      for (var i = 0; i < options.widgets.length; i += 1) {
        var widget = options.widgets[i];
        if (!widget || widget.widget !== 'hockeydata.los.Schedule') {
          continue;
        }

        if (!widget.widgetOptions || typeof widget.widgetOptions !== 'object') {
          widget.widgetOptions = {};
        }

        var template = widget.widgetOptions.rowLink;
        if (typeof template !== 'string' || template.trim() === '') {
          template = '?game_id=%s&division_id=%s';
        }

        widget.widgetOptions.rowLink = (function (rowLinkTemplate) {
          return function (gameId, divisionId) {
            var out = applyTemplateRowLink(rowLinkTemplate, gameId, divisionId);
            var season = readPersistedSeason(node, payload);
            if (season) {
              out = appendQueryParam(out, 'esc_season', season);
            }
            return out;
          };
        })(template);
      }
    }

    if (!hasSeasonObject) {
      return;
    }

    var originalPaintComplete = typeof options.paintComplete === 'function' ? options.paintComplete : null;
    options.paintComplete = function () {
      try {
        var selects = node.querySelectorAll('select');
        if (selects && selects.length > 0) {
          var seasonSelect = selects[0];

          if (seasonSelect.value) {
            writePersistedSeason(node, payload, seasonSelect.value);
          }

          for (var s = 0; s < selects.length; s += 1) {
            if (selects[s].getAttribute('data-esc-gamepitch-change-bound') === '1') {
              continue;
            }

            selects[s].setAttribute('data-esc-gamepitch-change-bound', '1');
            selects[s].addEventListener('change', function () {
              writePersistedSeason(node, payload, seasonSelect.value || '');
              clearGameNavigationState();
            });
          }
        }
      } catch (err) {
        debugLog(payload, 'info', 'ESC GamePitch: season persistence binding failed.');
      }

      if (originalPaintComplete) {
        try {
          originalPaintComplete.apply(this, arguments);
        } catch (err) {
          // Ignore callback errors from third-party/custom callbacks.
        }
      }
    };
  }

  function applySafeErrorHandling(node, payload, options) {
    var originalError = typeof options.error === 'function' ? options.error : null;

    options.error = function () {
      try {
        if (originalError) {
          originalError.apply(this, arguments);
        }
      } catch (err) {
        // Ignore callback errors from third-party/custom error handlers.
      }

      // Do not expose raw provider error details in the public UI.
      showFallback(node, payload && payload.fallbackMessage);
    };
  }

  function normalizeTickerItems(result) {
    if (!result || typeof result !== 'object') {
      return [];
    }

    if (Array.isArray(result.data)) {
      return result.data;
    }

    if (result.data && Array.isArray(result.data.games)) {
      return result.data.games;
    }

    if (result.data && Array.isArray(result.data.items)) {
      return result.data.items;
    }

    if (result.data && typeof result.data === 'object') {
      var objectItems = [];
      var key;
      for (key in result.data) {
        if (Object.prototype.hasOwnProperty.call(result.data, key) && result.data[key] && typeof result.data[key] === 'object') {
          objectItems.push(result.data[key]);
        }
      }
      return objectItems;
    }

    return [];
  }

  function isCurrentTickerEntry(entry) {
    if (!entry || typeof entry !== 'object') {
      return false;
    }

    var stateValue = '';
    if (typeof entry.gameState === 'string') {
      stateValue = entry.gameState;
    } else if (typeof entry.state === 'string') {
      stateValue = entry.state;
    } else if (typeof entry.status === 'string') {
      stateValue = entry.status;
    } else if (typeof entry.statusMsg === 'string') {
      stateValue = entry.statusMsg;
    }

    if (stateValue) {
      stateValue = stateValue.toLowerCase();
      if (
        stateValue.indexOf('live') !== -1
        || stateValue.indexOf('running') !== -1
        || stateValue.indexOf('ongoing') !== -1
        || stateValue.indexOf('started') !== -1
        || stateValue.indexOf('playing') !== -1
      ) {
        return true;
      }

      if (
        stateValue.indexOf('end') !== -1
        || stateValue.indexOf('final') !== -1
        || stateValue.indexOf('finished') !== -1
        || stateValue.indexOf('beendet') !== -1
      ) {
        return false;
      }
    }

    var dateCandidate = entry.scheduledDateTime || entry.dateTime || entry.startDateTime || entry.date;
    if (typeof dateCandidate === 'string' && dateCandidate) {
      var startTime = Date.parse(dateCandidate);
      if (!isNaN(startTime)) {
        var now = Date.now();
        var withinToday = Math.abs(startTime - now) <= (24 * 60 * 60 * 1000);
        if (withinToday) {
          return true;
        }
      }
    }

    return false;
  }

  function applyGameTickerCurrentOnly(node, payload, options) {
    if (payload.widgetName !== 'hockeydata.los.GameTicker' || payload.onlyWhenCurrent !== true) {
      return;
    }

    var originalPaint = typeof options.paint === 'function' ? options.paint : null;

    options.paint = function (result) {
      var items = normalizeTickerItems(result);
      var hasCurrentGames = false;

      for (var i = 0; i < items.length; i += 1) {
        if (isCurrentTickerEntry(items[i])) {
          hasCurrentGames = true;
          break;
        }
      }

      node.style.display = hasCurrentGames ? '' : 'none';

      if (originalPaint) {
        try {
          originalPaint.apply(this, arguments);
        } catch (err) {
          // Ignore callback errors from third-party/custom paint callbacks.
        }
      }
    };
  }

  function getScheduleEntryTime(entry) {
    if (!entry || typeof entry !== 'object') {
      return null;
    }

    var dateCandidate = entry.scheduledDateTime || entry.dateTime || entry.startDateTime || entry.date;
    if (typeof dateCandidate !== 'string' || !dateCandidate) {
      return null;
    }

    var timestamp = Date.parse(dateCandidate);
    if (isNaN(timestamp)) {
      return null;
    }

    return timestamp;
  }

  function filterScheduleEntries(entries, mode) {
    if (!Array.isArray(entries)) {
      return entries;
    }

    var normalizedMode = typeof mode === 'string' ? mode.toLowerCase() : 'all';
    if (normalizedMode !== 'past' && normalizedMode !== 'future') {
      return entries;
    }

    var todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    var dayStartMs = todayStart.getTime();

    return entries.filter(function (entry) {
      var entryTime = getScheduleEntryTime(entry);

      // Keep entries with unknown/invalid date to avoid dropping data accidentally.
      if (entryTime === null) {
        return true;
      }

      if (normalizedMode === 'past') {
        return entryTime < dayStartMs;
      }

      // future mode includes the current gameday (today).
      return entryTime >= dayStartMs;
    });
  }

  function applyScheduleLimit(entries, limit) {
    if (!Array.isArray(entries) || !Number.isFinite(limit) || limit <= 0) {
      return entries;
    }

    return entries.slice(0, limit);
  }

  function applyScheduleModeFilter(node, payload, options) {
    if (payload.widgetName !== 'hockeydata.los.Schedule') {
      return;
    }

    var mode = typeof payload.scheduleMode === 'string' ? payload.scheduleMode.toLowerCase() : 'all';
    var limit = Number(payload.scheduleLimit);
    if ((mode !== 'past' && mode !== 'future') && !(Number.isFinite(limit) && limit > 0)) {
      return;
    }

    var originalPaint = typeof options.paint === 'function' ? options.paint : null;

    options.paint = function (result) {
      try {
        if (result && typeof result === 'object') {
          if (Array.isArray(result.data)) {
            result.data = applyScheduleLimit(filterScheduleEntries(result.data, mode), limit);
          } else if (result.data && typeof result.data === 'object') {
            if (Array.isArray(result.data.items)) {
              result.data.items = applyScheduleLimit(filterScheduleEntries(result.data.items, mode), limit);
            } else if (Array.isArray(result.data.games)) {
              result.data.games = applyScheduleLimit(filterScheduleEntries(result.data.games, mode), limit);
            }
          }
        }
      } catch (err) {
        // Never break widget rendering because of filtering.
      }

      if (originalPaint) {
        try {
          originalPaint.apply(this, arguments);
        } catch (err) {
          // Ignore callback errors from third-party/custom paint callbacks.
        }
      }
    };
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
      debugLog(null, 'error', 'ESC GamePitch: invalid widget payload.', err);
      showFallback(node);
      return;
    }

    if (!window.hockeydata || !window.hockeydata.util || !window.hockeydata.util.Widget) {
      debugLog(payload, 'info', 'ESC GamePitch: HockeyData API is not loaded yet; initialization will retry.');
      return;
    }

    var options = payload.widgetOptions || {};
    applyWidgetDefaults(node, payload, options);

    if (payload.widgetName === 'hockeydata.los.DivisionPicker') {
      applyDivisionPickerSeasonEnhancements(node, payload, options);
    }

    if (isClientDebugEnabled(payload)) {
      try {
        debugLog(payload, 'info', 'ESC GamePitch client debug:', buildDebugOptions(payload, options));
      } catch (err) {
        debugLog(payload, 'info', 'ESC GamePitch client debug: failed to serialize debug payload.');
      }
    }

    options.$domNode = $(node);
    options.widgetName = payload.widgetName;
    applySafeErrorHandling(node, payload, options);
    applyGameTickerCurrentOnly(node, payload, options);
    applyScheduleModeFilter(node, payload, options);

    try {
      // HockeyData widgets are instantiated via hockeydata.util.Widget(options).
      new window.hockeydata.util.Widget(options);
      node.setAttribute('data-esc-gamepitch-initialized', '1');
    } catch (err) {
      debugLog(payload, 'error', 'ESC GamePitch: widget initialization failed.', err);
      showFallback(node, payload.fallbackMessage);
    }
  }

  function initAll() {
    normalizeLegacyGameIdInUrl();

    var nodes = document.querySelectorAll('.esc-gamepitch-widget[data-esc-gamepitch]');
    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i].getAttribute('data-esc-gamepitch-initialized') === '1') {
        continue;
      }
      tryInitWidget(nodes[i]);
    }
  }

  var initScheduled = false;

  function queueInitAll() {
    if (initScheduled) {
      return;
    }

    initScheduled = true;
    window.setTimeout(function () {
      initScheduled = false;
      initAll();
    }, 30);
  }

  function watchForEscGamePitchNodes() {
    if (!window.MutationObserver || !document.body) {
      return;
    }

    var observer = new window.MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i += 1) {
        var mutation = mutations[i];

        if (mutation.type === 'attributes') {
          if (mutation.target && mutation.target.matches && mutation.target.matches('.esc-gamepitch-widget[data-esc-gamepitch]')) {
            queueInitAll();
            return;
          }
          continue;
        }

        if (!mutation.addedNodes || mutation.addedNodes.length === 0) {
          continue;
        }

        for (var j = 0; j < mutation.addedNodes.length; j += 1) {
          var addedNode = mutation.addedNodes[j];
          if (!addedNode || addedNode.nodeType !== 1) {
            continue;
          }

          if (addedNode.matches && addedNode.matches('.esc-gamepitch-widget[data-esc-gamepitch]')) {
            queueInitAll();
            return;
          }

          if (addedNode.querySelector && addedNode.querySelector('.esc-gamepitch-widget[data-esc-gamepitch]')) {
            queueInitAll();
            return;
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-esc-gamepitch']
    });
  }

  window.escGamePitchInitAll = initAll;
  window.escGamePitchQueueInit = queueInitAll;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAll();
      watchForEscGamePitchNodes();
    });
  } else {
    initAll();
    watchForEscGamePitchNodes();
  }
})(window.jQuery);
