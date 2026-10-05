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

    function looksLikeGameEntry(candidate) {
      if (!candidate || typeof candidate !== 'object') {
        return false;
      }

      var direct = getNestedValue(candidate, [
        'gameId', 'game_id', 'id', 'matchId', 'idGame',
        'homeTeamId', 'awayTeamId', 'teamId',
        'scheduledDateTime', 'dateTime', 'startDateTime',
        'gameState', 'state', 'status', 'statusCode'
      ]);
      if (direct) {
        return true;
      }

      if (candidate.game && typeof candidate.game === 'object') {
        var nested = getNestedValue(candidate.game, [
          'gameId', 'game_id', 'id', 'matchId', 'idGame',
          'homeTeamId', 'awayTeamId', 'teamId',
          'scheduledDateTime', 'dateTime', 'startDateTime',
          'gameState', 'state', 'status', 'statusCode'
        ]);
        if (nested) {
          return true;
        }
      }

      return false;
    }

    function addIfGameLike(target, candidate) {
      if (looksLikeGameEntry(candidate)) {
        target.push(candidate);
      }
    }

    function collectObjectsFromArray(source) {
      if (!Array.isArray(source)) {
        return [];
      }

      var out = [];
      for (var i = 0; i < source.length; i += 1) {
        if (source[i] && typeof source[i] === 'object') {
          addIfGameLike(out, source[i]);
        }
      }

      return out;
    }

    if (Array.isArray(result)) {
      return collectObjectsFromArray(result);
    }

    if (Array.isArray(result.data)) {
      return collectObjectsFromArray(result.data);
    }

    if (result.data && Array.isArray(result.data.games)) {
      return collectObjectsFromArray(result.data.games);
    }

    if (result.data && Array.isArray(result.data.items)) {
      return collectObjectsFromArray(result.data.items);
    }

    if (Array.isArray(result.games)) {
      return collectObjectsFromArray(result.games);
    }

    if (Array.isArray(result.items)) {
      return collectObjectsFromArray(result.items);
    }

    if (Array.isArray(result.matches)) {
      return collectObjectsFromArray(result.matches);
    }

    if (result.data && typeof result.data === 'object') {
      var objectItems = [];
      var key;
      for (key in result.data) {
        if (!Object.prototype.hasOwnProperty.call(result.data, key) || !result.data[key]) {
          continue;
        }

        if (Array.isArray(result.data[key])) {
          objectItems = objectItems.concat(collectObjectsFromArray(result.data[key]));
          continue;
        }

        if (typeof result.data[key] === 'object') {
          addIfGameLike(objectItems, result.data[key]);
        }
      }

      if (objectItems.length > 0) {
        return objectItems;
      }
    }

    var rootFallback = [];
    addIfGameLike(rootFallback, result);
    return rootFallback;
  }

  function getNestedValue(obj, keys) {
    if (!obj || typeof obj !== 'object') {
      return '';
    }

    for (var i = 0; i < keys.length; i += 1) {
      var value = obj[keys[i]];
      if (typeof value !== 'undefined' && value !== null && String(value).trim() !== '') {
        return String(value).trim();
      }
    }

    return '';
  }

  function getEntryGameId(entry) {
    if (!entry || typeof entry !== 'object') {
      return '';
    }

    var keys = ['gameId', 'game_id', 'id', 'gameID', 'matchId', 'match_id', 'idGame', 'gamePk', 'gameKey'];
    function normalizeGameIdValue(raw) {
      if (typeof raw === 'undefined' || raw === null) {
        return '';
      }

      var text = String(raw).trim();
      if (!text) {
        return '';
      }

      if (text.indexOf(',') !== -1) {
        text = text.split(',')[0].trim();
      }

      return text;
    }

    var gameId = getNestedValue(entry, keys);
    if (gameId) {
      return normalizeGameIdValue(gameId);
    }

    if (entry.game && typeof entry.game === 'object') {
      return normalizeGameIdValue(getNestedValue(entry.game, keys));
    }

    if (entry.match && typeof entry.match === 'object') {
      return normalizeGameIdValue(getNestedValue(entry.match, keys));
    }

    return '';
  }

  function getEntryStartTimestamp(entry) {
    if (!entry || typeof entry !== 'object') {
      return null;
    }

    var nested = entry.game && typeof entry.game === 'object' ? entry.game : {};
    var dateCandidate = getNestedValue(entry, ['scheduledDateTime', 'dateTime', 'startDateTime', 'date', 'plannedStart', 'startTime'])
      || getNestedValue(nested, ['scheduledDateTime', 'dateTime', 'startDateTime', 'date', 'plannedStart', 'startTime'])
      || '';

    if (!dateCandidate) {
      return null;
    }

    var timestamp = Date.parse(dateCandidate);
    if (isNaN(timestamp)) {
      return null;
    }

    return timestamp;
  }

  function entryMatchesTeam(entry, teamId) {
    if (!entry || typeof entry !== 'object' || !teamId) {
      return true;
    }

    var idValue = String(teamId).trim();

    function valuesEqual(left, right) {
      var l = String(left).trim();
      var r = String(right).trim();
      if (l === r) {
        return true;
      }

      var lNum = parseInt(l, 10);
      var rNum = parseInt(r, 10);
      if (!isNaN(lNum) && !isNaN(rNum) && lNum === rNum) {
        return true;
      }

      return false;
    }

    var candidates = [
      entry.homeTeamId,
      entry.awayTeamId,
      entry.teamId,
      entry.homeTeamID,
      entry.awayTeamID,
      entry.teamID,
      entry.homeId,
      entry.awayId,
      entry.homeClubId,
      entry.awayClubId,
      entry.homeCompetitorId,
      entry.awayCompetitorId,
      entry.homeTeam && entry.homeTeam.teamId,
      entry.awayTeam && entry.awayTeam.teamId,
      entry.homeTeam && entry.homeTeam.id,
      entry.awayTeam && entry.awayTeam.id,
      entry.homeTeam && entry.homeTeam.teamID,
      entry.awayTeam && entry.awayTeam.teamID,
      entry.homeTeam && entry.homeTeam.clubId,
      entry.awayTeam && entry.awayTeam.clubId,
      entry.home && entry.home.teamId,
      entry.away && entry.away.teamId,
      entry.home && entry.home.id,
      entry.away && entry.away.id
    ];

    if (entry.game && typeof entry.game === 'object') {
      candidates = candidates.concat([
        entry.game.homeTeamId,
        entry.game.awayTeamId,
        entry.game.teamId,
        entry.game.homeTeamID,
        entry.game.awayTeamID,
        entry.game.teamID,
        entry.game.homeId,
        entry.game.awayId,
        entry.game.homeClubId,
        entry.game.awayClubId,
        entry.game.homeCompetitorId,
        entry.game.awayCompetitorId,
        entry.game.homeTeam && entry.game.homeTeam.teamId,
        entry.game.awayTeam && entry.game.awayTeam.teamId,
        entry.game.homeTeam && entry.game.homeTeam.id,
        entry.game.awayTeam && entry.game.awayTeam.id,
        entry.game.homeTeam && entry.game.homeTeam.teamID,
        entry.game.awayTeam && entry.game.awayTeam.teamID,
        entry.game.homeTeam && entry.game.homeTeam.clubId,
        entry.game.awayTeam && entry.game.awayTeam.clubId,
        entry.game.home && entry.game.home.teamId,
        entry.game.away && entry.game.away.teamId,
        entry.game.home && entry.game.home.id,
        entry.game.away && entry.game.away.id
      ]);
    }

    for (var i = 0; i < candidates.length; i += 1) {
      if (typeof candidates[i] !== 'undefined' && candidates[i] !== null && valuesEqual(candidates[i], idValue)) {
        return true;
      }
    }

    function deepContainsTeamId(value, normalizedTeamId, depth) {
      if (depth > 5 || value === null || typeof value === 'undefined') {
        return false;
      }

      if (typeof value === 'string' || typeof value === 'number') {
        return valuesEqual(value, normalizedTeamId);
      }

      if (Array.isArray(value)) {
        for (var ai = 0; ai < value.length; ai += 1) {
          if (deepContainsTeamId(value[ai], normalizedTeamId, depth + 1)) {
            return true;
          }
        }
        return false;
      }

      if (typeof value !== 'object') {
        return false;
      }

      var keys = Object.keys(value);
      for (var ki = 0; ki < keys.length; ki += 1) {
        var key = keys[ki];
        var keyLower = key.toLowerCase();
        var child = value[key];

        // Prefer ID-like keys to avoid accidental matches in unrelated text fields.
        if ((keyLower.indexOf('team') !== -1 || keyLower.indexOf('club') !== -1 || keyLower.indexOf('competitor') !== -1 || keyLower === 'id')
          && keyLower.indexOf('id') !== -1
          && (typeof child === 'string' || typeof child === 'number')
          && valuesEqual(child, normalizedTeamId)) {
          return true;
        }

        if (deepContainsTeamId(child, normalizedTeamId, depth + 1)) {
          return true;
        }
      }

      return false;
    }

    if (deepContainsTeamId(entry, idValue, 0)) {
      return true;
    }

    return false;
  }

  function resolveLiveGameId(result, teamId) {
    var items = normalizeTickerItems(result);
    for (var i = 0; i < items.length; i += 1) {
      if (!isCurrentTickerEntry(items[i])) {
        continue;
      }

      if (!entryMatchesTeam(items[i], teamId)) {
        continue;
      }

      var gameId = getEntryGameId(items[i]);
      if (gameId) {
        return gameId;
      }
    }

    // Team-specific fallback: some feeds mark an active team game with state=1
    // even when generic current-state markers are not present.
    if (teamId) {
      var stateOneTeamGameId = '';
      for (var t = 0; t < items.length; t += 1) {
        if (!entryMatchesTeam(items[t], teamId)) {
          continue;
        }

        var teamGameId = getEntryGameId(items[t]);
        if (!teamGameId) {
          continue;
        }

        var nested = items[t].game && typeof items[t].game === 'object' ? items[t].game : {};
        var stateValue = getNestedValue(items[t], ['gameState', 'state', 'status', 'statusMsg', 'statusMessage', 'currentState', 'gameStatus'])
          || getNestedValue(nested, ['gameState', 'state', 'status', 'statusMsg', 'statusMessage', 'currentState', 'gameStatus'])
          || '';

        var numericState = parseInt(String(stateValue).trim(), 10);
        if (isNaN(numericState) || numericState !== 1) {
          continue;
        }

        if (stateOneTeamGameId && stateOneTeamGameId !== teamGameId) {
          stateOneTeamGameId = '';
          break;
        }

        stateOneTeamGameId = teamGameId;
      }

      if (stateOneTeamGameId) {
        return stateOneTeamGameId;
      }
    }

    // Some feeds expose current games but omit team fields in ticker entries.
    // Use this deterministic fallback only when no team filter is configured.
    if (!teamId) {
      var singleCurrentGameId = '';
      for (var c = 0; c < items.length; c += 1) {
        if (!isCurrentTickerEntry(items[c])) {
          continue;
        }

        var currentGameId = getEntryGameId(items[c]);
        if (!currentGameId) {
          continue;
        }

        if (singleCurrentGameId && singleCurrentGameId !== currentGameId) {
          singleCurrentGameId = '';
          break;
        }

        singleCurrentGameId = currentGameId;
      }

      if (singleCurrentGameId) {
        return singleCurrentGameId;
      }
    }

    var fallbackMatchId = '';
    for (var j = 0; j < items.length; j += 1) {
      if (!entryMatchesTeam(items[j], teamId)) {
        continue;
      }

      var candidateId = getEntryGameId(items[j]);
      if (!candidateId) {
        continue;
      }

      var startedAt = getEntryStartTimestamp(items[j]);
      if (startedAt === null) {
        continue;
      }

      var elapsed = Date.now() - startedAt;
      if (elapsed >= 0 && elapsed <= (6 * 60 * 60 * 1000)) {
        if (fallbackMatchId && fallbackMatchId !== candidateId) {
          return '';
        }
        fallbackMatchId = candidateId;
      }
    }

    if (fallbackMatchId) {
      return fallbackMatchId;
    }

    return '';
  }

  function hasLikelyCurrentGame(items, teamId) {
    if (!Array.isArray(items)) {
      return false;
    }

    for (var i = 0; i < items.length; i += 1) {
      if (!entryMatchesTeam(items[i], teamId)) {
        continue;
      }

      if (isCurrentTickerEntry(items[i])) {
        return true;
      }

      var startedAt = getEntryStartTimestamp(items[i]);
      if (startedAt === null) {
        continue;
      }

      var elapsed = Date.now() - startedAt;
      if (elapsed >= 0 && elapsed <= (6 * 60 * 60 * 1000)) {
        return true;
      }
    }

    return false;
  }

  function buildEntryDebugSummary(entry, teamId) {
    var nested = entry && entry.game && typeof entry.game === 'object' ? entry.game : {};
    return {
      gameId: getEntryGameId(entry),
      teamMatch: entryMatchesTeam(entry, teamId),
      isCurrent: isCurrentTickerEntry(entry),
      startTime: getNestedValue(entry, ['scheduledDateTime', 'dateTime', 'startDateTime', 'date']) || getNestedValue(nested, ['scheduledDateTime', 'dateTime', 'startDateTime', 'date']) || '',
      state: getNestedValue(entry, ['gameState', 'state', 'status', 'statusMsg', 'statusMessage', 'currentState', 'gameStatus']) || getNestedValue(nested, ['gameState', 'state', 'status', 'statusMsg', 'statusMessage', 'currentState', 'gameStatus']) || '',
      statusCode: getNestedValue(entry, ['statusCode', 'gameStatusCode', 'stateCode']) || getNestedValue(nested, ['statusCode', 'gameStatusCode', 'stateCode']) || '',
      homeTeamId: getNestedValue(entry, ['homeTeamId', 'homeTeamID', 'homeId', 'homeClubId']) || getNestedValue(nested, ['homeTeamId', 'homeTeamID', 'homeId', 'homeClubId']) || '',
      awayTeamId: getNestedValue(entry, ['awayTeamId', 'awayTeamID', 'awayId', 'awayClubId']) || getNestedValue(nested, ['awayTeamId', 'awayTeamID', 'awayId', 'awayClubId']) || ''
    };
  }

  function buildResultDebugSummary(result) {
    var out = {
      resultType: typeof result,
      isArray: Array.isArray(result),
      arrayLength: Array.isArray(result) ? result.length : 0,
      resultKeys: [],
      dataKeys: []
    };

    if (result && typeof result === 'object') {
      out.resultKeys = Object.keys(result).slice(0, 20);
      if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
        out.dataKeys = Object.keys(result.data).slice(0, 20);
      }
    }

    return out;
  }

  function boolFromValue(value) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    if (typeof value === 'string') {
      var normalized = value.trim().toLowerCase();
      if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
        return true;
      }
      if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
        return false;
      }
    }

    return null;
  }

  function extractBoolish(entry, nested, keys) {
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (entry && Object.prototype.hasOwnProperty.call(entry, key)) {
        return boolFromValue(entry[key]);
      }
      if (nested && Object.prototype.hasOwnProperty.call(nested, key)) {
        return boolFromValue(nested[key]);
      }
    }

    return null;
  }

  function applyLiveGameResolver(node, payload, options) {
    if ((payload.widgetName !== 'hockeydata.los.Game.LiveBox' && payload.widgetName !== 'hockeydata.los.GameSlider') || payload.liveResolver !== true) {
      return false;
    }

    if (options && (options.gameId || payload.gameId)) {
      return false;
    }

    node.setAttribute('data-esc-gamepitch-initialized', 'pending');

    var teamId = payload && payload.widgetOptions && payload.widgetOptions.teamId
      ? payload.widgetOptions.teamId
      : null;
    var targetWidgetInitialized = false;

    if (payload.widgetName === 'hockeydata.los.GameSlider') {
      var sliderProbeOptions = $.extend(true, {}, options);
      sliderProbeOptions.widgetName = 'hockeydata.los.GameTicker';
      sliderProbeOptions.$domNode = $('<div style="display:none"></div>');

      sliderProbeOptions.paint = function (result) {
        if (targetWidgetInitialized || node.getAttribute('data-esc-gamepitch-initialized') === '1') {
          return;
        }

        var items = normalizeTickerItems(result);
        var hasLiveGames = hasLikelyCurrentGame(items, teamId);

        if (!hasLiveGames && isClientDebugEnabled(payload)) {
          var sliderSamples = [];
          for (var s = 0; s < items.length && s < 5; s += 1) {
            sliderSamples.push(buildEntryDebugSummary(items[s], teamId));
          }
          debugLog(payload, 'info', 'ESC GamePitch: slider resolver diagnostics', {
            teamId: teamId,
            itemCount: items.length,
            resultSummary: buildResultDebugSummary(result),
            samples: sliderSamples
          });
        }

        if (!hasLiveGames) {
          debugLog(payload, 'info', 'ESC GamePitch: no live games detected for GameSlider resolver.');
          node.setAttribute('data-esc-gamepitch-initialized', '1');
          node.style.display = 'none';
          node.innerHTML = '';
          return;
        }

        var resolvedOptions = $.extend(true, {}, options);
        resolvedOptions.widgetName = 'hockeydata.los.GameSlider';
        resolvedOptions.$domNode = $(node);
        node.setAttribute('data-esc-gamepitch-initialized', '1');

        try {
          new window.hockeydata.util.Widget(resolvedOptions);
          targetWidgetInitialized = true;
          node.setAttribute('data-esc-gamepitch-initialized', '1');
          return;
        } catch (err) {
          debugLog(payload, 'error', 'ESC GamePitch: GameSlider resolver failed.', err);
          node.setAttribute('data-esc-gamepitch-initialized', '1');
          node.style.display = 'none';
          node.innerHTML = '';
        }
      };

      sliderProbeOptions.error = function () {
        debugLog(payload, 'info', 'ESC GamePitch: GameSlider live-game probe returned an error.');
        node.setAttribute('data-esc-gamepitch-initialized', '1');
        node.style.display = 'none';
        node.innerHTML = '';
      };

      try {
        new window.hockeydata.util.Widget(sliderProbeOptions);
      } catch (err) {
        debugLog(payload, 'error', 'ESC GamePitch: GameSlider live-game probe failed.', err);
        node.setAttribute('data-esc-gamepitch-initialized', '1');
        node.style.display = 'none';
        node.innerHTML = '';
      }

      return true;
    }

    var finalWidgetName = payload.widgetName;
    var noLiveMessage = payload && typeof payload.fallbackMessage !== 'undefined' ? payload.fallbackMessage : '';

    var probeOptions = $.extend(true, {}, options);
    probeOptions.widgetName = 'hockeydata.los.GameTicker';
    probeOptions.$domNode = $('<div style="display:none"></div>');

    probeOptions.paint = function (result) {
      if (targetWidgetInitialized || node.getAttribute('data-esc-gamepitch-initialized') === '1') {
        return;
      }

      var resolvedGameId = resolveLiveGameId(result, teamId);
      if (resolvedGameId) {
        var resolvedOptions = $.extend(true, {}, options);
        resolvedOptions.widgetName = finalWidgetName;
        resolvedOptions.gameId = resolvedGameId;
        resolvedOptions.$domNode = $(node);
        node.setAttribute('data-esc-gamepitch-initialized', '1');

        try {
          new window.hockeydata.util.Widget(resolvedOptions);
          targetWidgetInitialized = true;
          node.setAttribute('data-esc-gamepitch-initialized', '1');
          return;
        } catch (err) {
          debugLog(payload, 'error', 'ESC GamePitch: live game resolver failed.', err);
          if (noLiveMessage) {
            showFallback(node, noLiveMessage);
          } else {
            node.setAttribute('data-esc-gamepitch-initialized', '1');
            node.style.display = 'none';
            node.innerHTML = '';
          }
          return;
        }
      }

      if (isClientDebugEnabled(payload)) {
        var liveItems = normalizeTickerItems(result);
        var liveSamples = [];
        var teamMatchCount = 0;
        var currentCount = 0;
        var currentTeamMatchCount = 0;
        var currentGames = [];
        var teamMatchedGames = [];
        for (var m = 0; m < liveItems.length; m += 1) {
          var matchesTeam = entryMatchesTeam(liveItems[m], teamId);
          var isCurrent = isCurrentTickerEntry(liveItems[m]);
          var gameSummary = buildEntryDebugSummary(liveItems[m], teamId);
          if (matchesTeam) {
            teamMatchCount += 1;
            if (teamMatchedGames.length < 10) {
              teamMatchedGames.push({
                gameId: gameSummary.gameId,
                state: gameSummary.state,
                statusCode: gameSummary.statusCode,
                isCurrent: gameSummary.isCurrent,
                homeTeamId: gameSummary.homeTeamId,
                awayTeamId: gameSummary.awayTeamId
              });
            }
          }
          if (isCurrent) {
            currentCount += 1;
            if (currentGames.length < 10) {
              currentGames.push({
                gameId: gameSummary.gameId,
                state: gameSummary.state,
                statusCode: gameSummary.statusCode,
                homeTeamId: gameSummary.homeTeamId,
                awayTeamId: gameSummary.awayTeamId
              });
            }
          }
          if (matchesTeam && isCurrent) {
            currentTeamMatchCount += 1;
          }
        }
        for (var n = 0; n < liveItems.length && n < 5; n += 1) {
          liveSamples.push(buildEntryDebugSummary(liveItems[n], teamId));
        }
        debugLog(payload, 'info', 'ESC GamePitch: live resolver diagnostics', {
          teamId: teamId,
          itemCount: liveItems.length,
          resolvedGameId: resolvedGameId,
          teamMatchCount: teamMatchCount,
          currentCount: currentCount,
          currentTeamMatchCount: currentTeamMatchCount,
          currentGames: currentGames,
          teamMatchedGames: teamMatchedGames,
          resultSummary: buildResultDebugSummary(result),
          samples: liveSamples
        });
      }

      debugLog(payload, 'info', 'ESC GamePitch: no live game detected for resolver.');
      if (noLiveMessage) {
        showFallback(node, noLiveMessage);
      } else {
        node.setAttribute('data-esc-gamepitch-initialized', '1');
        node.style.display = 'none';
        node.innerHTML = '';
      }
    };

    probeOptions.error = function () {
      debugLog(payload, 'info', 'ESC GamePitch: live game probe returned an error.');
      if (noLiveMessage) {
        showFallback(node, noLiveMessage);
      } else {
        node.setAttribute('data-esc-gamepitch-initialized', '1');
        node.style.display = 'none';
        node.innerHTML = '';
      }
    };

    try {
      new window.hockeydata.util.Widget(probeOptions);
    } catch (err) {
      debugLog(payload, 'error', 'ESC GamePitch: live game probe failed.', err);
      if (noLiveMessage) {
        showFallback(node, noLiveMessage);
      } else {
        node.setAttribute('data-esc-gamepitch-initialized', '1');
        node.style.display = 'none';
        node.innerHTML = '';
      }
    }

    return true;
  }

  function isCurrentTickerEntry(entry) {
    if (!entry || typeof entry !== 'object') {
      return false;
    }

    var nested = entry.game && typeof entry.game === 'object' ? entry.game : {};
    var stateValue = getNestedValue(entry, ['gameState', 'state', 'status', 'statusMsg', 'statusMessage', 'currentState', 'gameStatus'])
      || getNestedValue(nested, ['gameState', 'state', 'status', 'statusMsg', 'statusMessage', 'currentState', 'gameStatus'])
      || '';

    var isLiveFlag = extractBoolish(entry, nested, ['isLive', 'live', 'isRunning', 'running', 'isCurrent', 'current']);
    var isEndedFlag = extractBoolish(entry, nested, ['isEnded', 'ended', 'isFinished', 'finished', 'isFinal', 'final']);
    var hasStartedFlag = extractBoolish(entry, nested, ['hasStarted', 'started']);
    var periodValue = getNestedValue(entry, ['period', 'periodNumber', 'currentPeriod']) || getNestedValue(nested, ['period', 'periodNumber', 'currentPeriod']) || '';
    var statusCodeValue = getNestedValue(entry, ['statusCode', 'gameStatusCode', 'stateCode']) || getNestedValue(nested, ['statusCode', 'gameStatusCode', 'stateCode']) || '';

    if (isEndedFlag === true) {
      return false;
    }

    if (isLiveFlag === true) {
      return true;
    }

    if (hasStartedFlag === true && isEndedFlag === false) {
      return true;
    }

    if (periodValue !== '') {
      var periodNumber = parseInt(periodValue, 10);
      if (!isNaN(periodNumber) && periodNumber > 0 && isEndedFlag !== true) {
        return true;
      }
    }

    if (statusCodeValue !== '') {
      var statusCodeNumber = parseInt(statusCodeValue, 10);
      if (!isNaN(statusCodeNumber) && statusCodeNumber > 0 && statusCodeNumber < 90 && isEndedFlag !== true) {
        var startedAtCode = getEntryStartTimestamp(entry);
        if (startedAtCode !== null) {
          var nowForCode = Date.now();
          var elapsedCode = nowForCode - startedAtCode;
          if (elapsedCode >= 0 && elapsedCode <= (8 * 60 * 60 * 1000)) {
            return true;
          }
        }
      }
    }

    if (stateValue !== '') {
      var trimmedState = String(stateValue).trim();
      var numericState = parseInt(trimmedState, 10);
      if (!isNaN(numericState) && String(numericState) === trimmedState) {
        // HockeyData feeds can use numeric game-state enums.
        // Observed mapping in this environment: 1=pre-game, 4=current/live.
        if (numericState === 4 || numericState === 3 || numericState === 2) {
          return true;
        }

        if (numericState === 1 || numericState === 0 || numericState >= 90) {
          return false;
        }
      }
    }

    if (stateValue) {
      stateValue = stateValue.toLowerCase();
      if (
        stateValue.indexOf('live') !== -1
        || stateValue.indexOf('running') !== -1
        || stateValue.indexOf('ongoing') !== -1
        || stateValue.indexOf('started') !== -1
        || stateValue.indexOf('playing') !== -1
        || stateValue.indexOf('in_progress') !== -1
        || stateValue.indexOf('in progress') !== -1
        || stateValue.indexOf('period') !== -1
        || stateValue.indexOf('overtime') !== -1
        || stateValue.indexOf('shootout') !== -1
      ) {
        return true;
      }

      if (
        stateValue.indexOf('scheduled') !== -1
        || stateValue.indexOf('not started') !== -1
        || stateValue.indexOf('upcoming') !== -1
        || stateValue.indexOf('postponed') !== -1
        || stateValue.indexOf('cancelled') !== -1
        || stateValue.indexOf('abgesagt') !== -1
        || stateValue.indexOf('verschoben') !== -1
        || stateValue.indexOf('end') !== -1
        || stateValue.indexOf('final') !== -1
        || stateValue.indexOf('finished') !== -1
        || stateValue.indexOf('beendet') !== -1
      ) {
        return false;
      }
    }

    var startedAt = getEntryStartTimestamp(entry);
    if (startedAt !== null && isEndedFlag !== true) {
      var now = Date.now();
      var elapsed = now - startedAt;

      // Fallback only when the game should already be running but explicit state fields are missing.
      if (elapsed >= 0 && elapsed <= (6 * 60 * 60 * 1000)) {
        return true;
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

  function applySliderScrollClass(node, payload) {
    if (!payload || payload.widgetName !== 'hockeydata.los.GameSlider') {
      return;
    }

    var scrollEnabled = payload.sliderScroll !== false;
    if (scrollEnabled) {
      node.classList.add('esc-gamepitch-slider-scroll');
      node.classList.remove('esc-gamepitch-slider-no-scroll');
      return;
    }

    node.classList.remove('esc-gamepitch-slider-scroll');
    node.classList.add('esc-gamepitch-slider-no-scroll');
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
    applySliderScrollClass(node, payload);

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
    var liveResolverHandled = applyLiveGameResolver(node, payload, options);
    if (liveResolverHandled) {
      return;
    }
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
      var initState = nodes[i].getAttribute('data-esc-gamepitch-initialized');
      if (initState === '1' || initState === 'pending') {
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
