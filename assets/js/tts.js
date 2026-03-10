(function () {
  var SUPPORTS_TTS = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  if (!SUPPORTS_TTS) return;

  var KEY_AUTOPLAY = 'gc_tts_autoplay';
  var synth = window.speechSynthesis;

  function readAutoplayPref() {
    try {
      return localStorage.getItem(KEY_AUTOPLAY) === '1';
    } catch (e) {
      return false;
    }
  }

  function saveAutoplayPref(enabled) {
    try {
      localStorage.setItem(KEY_AUTOPLAY, enabled ? '1' : '0');
    } catch (e) {}
  }

  function getPostText(article) {
    var clone = article.cloneNode(true);
    var skip = clone.querySelectorAll('.backlink, script, style, noscript');
    skip.forEach(function (el) { el.remove(); });

    var text = clone.innerText || clone.textContent || '';
    return text.replace(/\s+/g, ' ').trim();
  }

  function buildUI() {
    var box = document.createElement('aside');
    box.className = 'tts-player';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', 'Listen controls');

    box.innerHTML = '' +
      '<div class="tts-player__title">Listen</div>' +
      '<div class="tts-player__controls">' +
        '<button type="button" class="tts-btn" data-tts-play aria-label="Play article audio">Play</button>' +
        '<button type="button" class="tts-btn" data-tts-pause aria-label="Pause or resume article audio" aria-pressed="false">Pause</button>' +
        '<button type="button" class="tts-btn" data-tts-stop aria-label="Stop article audio">Stop</button>' +
      '</div>' +
      '<label class="tts-player__autoplay">' +
        '<input type="checkbox" data-tts-autoplay />' +
        'Autoplay on page open' +
      '</label>' +
      '<p class="tts-player__status" aria-live="polite" data-tts-status>Ready</p>';

    return box;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var article = document.querySelector('article.post');
    if (!article) return;

    var text = getPostText(article);
    if (!text) return;

    var ui = buildUI();
    document.body.appendChild(ui);

    var playBtn = ui.querySelector('[data-tts-play]');
    var pauseBtn = ui.querySelector('[data-tts-pause]');
    var stopBtn = ui.querySelector('[data-tts-stop]');
    var autoplayInput = ui.querySelector('[data-tts-autoplay]');
    var status = ui.querySelector('[data-tts-status]');

    var utterance = null;

    function setStatus(msg) {
      status.textContent = msg;
    }

    function resetPauseButton() {
      pauseBtn.textContent = 'Pause';
      pauseBtn.setAttribute('aria-pressed', 'false');
    }

    function stopPlayback() {
      synth.cancel();
      utterance = null;
      resetPauseButton();
      setStatus('Stopped');
    }

    function startPlayback() {
      if (synth.speaking) synth.cancel();

      utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = function () { setStatus('Playing'); };
      utterance.onend = function () {
        utterance = null;
        resetPauseButton();
        setStatus('Finished');
      };
      utterance.onerror = function () {
        utterance = null;
        resetPauseButton();
        setStatus('Unable to play audio in this browser.');
      };

      synth.speak(utterance);
    }

    playBtn.addEventListener('click', function () {
      if (synth.paused) {
        synth.resume();
        pauseBtn.textContent = 'Pause';
        pauseBtn.setAttribute('aria-pressed', 'false');
        setStatus('Playing');
        return;
      }

      if (synth.speaking) {
        startPlayback();
        return;
      }

      startPlayback();
    });

    pauseBtn.addEventListener('click', function () {
      if (!synth.speaking && !synth.paused) return;

      if (synth.paused) {
        synth.resume();
        pauseBtn.textContent = 'Pause';
        pauseBtn.setAttribute('aria-pressed', 'false');
        setStatus('Playing');
      } else {
        synth.pause();
        pauseBtn.textContent = 'Resume';
        pauseBtn.setAttribute('aria-pressed', 'true');
        setStatus('Paused');
      }
    });

    stopBtn.addEventListener('click', stopPlayback);

    autoplayInput.checked = readAutoplayPref();
    autoplayInput.addEventListener('change', function () {
      saveAutoplayPref(autoplayInput.checked);
      setStatus(autoplayInput.checked ? 'Autoplay enabled' : 'Autoplay disabled');
    });

    window.addEventListener('beforeunload', function () {
      if (synth.speaking || synth.paused) synth.cancel();
    });

    if (autoplayInput.checked) {
      setTimeout(startPlayback, 300);
    }
  });
})();
