/** Web Speech API 语音识别与合成 */
const Voice = (() => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let listening = false;
  let onResultCallback = null;
  let onEndCallback = null;

  function isSupported() {
    return !!(SpeechRecognition && window.speechSynthesis);
  }

  function initRecognition() {
    if (!SpeechRecognition) return null;
    if (recognition) return recognition;
    recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (onResultCallback) onResultCallback(final || interim, !!final);
    };
    recognition.onend = () => {
      listening = false;
      if (onEndCallback) onEndCallback();
    };
    recognition.onerror = (e) => {
      listening = false;
      if (onEndCallback) onEndCallback(e.error);
    };
    return recognition;
  }

  function startListening(onResult, onEnd) {
    const rec = initRecognition();
    if (!rec) {
      if (onEnd) onEnd("unsupported");
      return false;
    }
    if (listening) {
      rec.stop();
      return false;
    }
    onResultCallback = onResult;
    onEndCallback = onEnd;
    listening = true;
    try {
      rec.start();
      return true;
    } catch (e) {
      listening = false;
      if (onEnd) onEnd(e.message);
      return false;
    }
  }

  function stopListening() {
    if (recognition && listening) recognition.stop();
    listening = false;
  }

  function isListening() {
    return listening;
  }

  function prepareSpeechText(text) {
    if (typeof Markdown !== "undefined" && Markdown.toSpeechText) {
      return Markdown.toSpeechText(text);
    }
    return String(text || "")
      .replace(/[#*_~`>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 800);
  }

  function speak(text, onEnd) {
    if (!text || !window.speechSynthesis) {
      if (onEnd) onEnd();
      return;
    }
    const plain = prepareSpeechText(text);
    if (!plain) {
      if (onEnd) onEnd();
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(plain);
    utter.lang = "zh-CN";
    utter.rate = 1.0;
    if (onEnd) utter.onend = onEnd;
    window.speechSynthesis.speak(utter);
  }

  let currentAudio = null;
  let activeButton = null;
  let activeLabel = null;
  let playing = false;
  let previewBtn = null;
  let previewVoiceId = null;

  const PLAY_LABEL = "朗读";
  const STOP_LABEL = "停止";
  const PREVIEW_TEXT = "你好，我是你的城市导览助手，很高兴为你服务。";
  const VOICE_STORAGE_KEY = "tts_voice_id";
  const DEFAULT_VOICE_ID = "female-shaonv";

  /** 常用普通话音色（MiniMax voice_id） */
  const VOICE_OPTIONS = [
    { id: "female-shaonv", label: "少女音色（默认）" },
    { id: "female-yujie", label: "御姐音色" },
    { id: "female-chengshu", label: "成熟女性" },
    { id: "female-tianmei", label: "甜美女性" },
    { id: "male-qn-qingse", label: "青涩青年" },
    { id: "male-qn-jingying", label: "精英青年" },
    { id: "male-qn-badao", label: "霸道青年" },
    { id: "male-qn-daxuesheng", label: "青年大学生" },
    { id: "Chinese (Mandarin)_Gentleman", label: "温润男声" },
    { id: "Chinese (Mandarin)_Male_Announcer", label: "播报男声" },
    { id: "Chinese (Mandarin)_News_Anchor", label: "新闻女声" },
    { id: "Chinese (Mandarin)_Reliable_Executive", label: "沉稳高管" },
    { id: "Chinese (Mandarin)_Sweet_Lady", label: "甜美女声" },
    { id: "Chinese (Mandarin)_Radio_Host", label: "电台男主播" },
    { id: "Chinese (Mandarin)_Humorous_Elder", label: "搞笑大爷" },
    { id: "Chinese (Mandarin)_Kind-hearted_Antie", label: "热心大婶" },
    { id: "Chinese (Mandarin)_HK_Flight_Attendant", label: "港普空姐" },
    { id: "junlang_nanyou", label: "俊朗男友" },
    { id: "wumei_yujie", label: "妩媚御姐" },
    { id: "cute_boy", label: "可爱男童" },
    { id: "lovely_girl", label: "萌萌女童" },
    { id: "Robot_Armor", label: "机械战甲" },
  ];

  function getVoiceId() {
    const saved = localStorage.getItem(VOICE_STORAGE_KEY);
    if (saved && VOICE_OPTIONS.some((v) => v.id === saved)) return saved;
    return DEFAULT_VOICE_ID;
  }

  function setVoiceId(voiceId) {
    if (VOICE_OPTIONS.some((v) => v.id === voiceId)) {
      localStorage.setItem(VOICE_STORAGE_KEY, voiceId);
    }
  }

  function getVoiceOptions() {
    return VOICE_OPTIONS.slice();
  }

  function _clearPreviewBtn() {
    if (previewBtn) {
      previewBtn.classList.remove("playing");
      previewBtn.textContent = "试听";
      previewBtn.disabled = false;
      previewBtn = null;
    }
    previewVoiceId = null;
  }

  function _setButtonState(btn, label, isPlaying) {
    if (btn) btn.classList.toggle("playing", isPlaying);
    if (label) label.textContent = isPlaying ? STOP_LABEL : PLAY_LABEL;
  }

  function _clearActive() {
    if (activeButton) _setButtonState(activeButton, activeLabel, false);
    activeButton = null;
    activeLabel = null;
    playing = false;
  }

  async function _speakWithVoice(text, voiceId, sessionId, onEnd) {
    const plain = prepareSpeechText(text);
    if (!plain) {
      if (onEnd) onEnd();
      return false;
    }
    try {
      const payload = { text: plain, voice_id: voiceId || getVoiceId() };
      if (sessionId) payload.session_id = sessionId;
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          const audio = new Audio(data.url);
          if (onEnd) audio.onended = onEnd;
          currentAudio = audio;
          await audio.play();
          return data;
        }
      }
    } catch (_) {
      currentAudio = null;
    }
    speak(text, onEnd);
    return false;
  }

  async function speakWithBackend(text, onEnd, sessionId) {
    return _speakWithVoice(text, getVoiceId(), sessionId, onEnd);
  }

  function _playAudioUrl(url, onEnd) {
    const audio = new Audio(url);
    if (onEnd) audio.onended = onEnd;
    currentAudio = audio;
    return audio.play();
  }

  // 朗读按钮的播放/暂停切换：同一按钮再点一次=停止；
  // 若已有本地缓存且音色一致则直接播放，不再请求 API。
  function toggleSpeak(text, btn, label, opts = {}) {
    const { sessionId, cachedUrl, cachedVoiceId } = opts;
    const voiceId = getVoiceId();
    const localUrl = cachedUrl || btn?.dataset?.ttsUrl;
    const localVoice = cachedVoiceId || btn?.dataset?.ttsVoiceId;
    if (playing && activeButton === btn) {
      stopSpeaking();
      return;
    }
    stopSpeaking();
    activeButton = btn;
    activeLabel = label;
    playing = true;
    _setButtonState(btn, label, true);
    const done = () => {
      if (activeButton === btn) {
        currentAudio = null;
        _clearActive();
      }
    };
    const onGenerated = (data) => {
      if (data?.url && btn) {
        btn.dataset.ttsUrl = data.url;
        btn.dataset.ttsVoiceId = voiceId;
      }
    };
    if (localUrl && (!localVoice || localVoice === voiceId)) {
      _playAudioUrl(localUrl, done).catch(() => {
        _speakWithVoice(text, voiceId, sessionId, done).then(onGenerated);
      });
      return;
    }
    _speakWithVoice(text, voiceId, sessionId, done).then(onGenerated);
  }

  function stopSpeaking() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.onended = null;
      currentAudio = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    _clearActive();
    _clearPreviewBtn();
  }

  /** 设置面板试听：不传 session_id，不写入对话缓存 */
  async function previewVoice(voiceId, btn) {
    const id = voiceId || getVoiceId();
    if (playing && previewBtn === btn && previewVoiceId === id) {
      stopSpeaking();
      return;
    }
    stopSpeaking();
    previewBtn = btn || null;
    previewVoiceId = id;
    playing = true;
    if (btn) {
      btn.textContent = "加载中...";
      btn.disabled = true;
    }
    const done = () => {
      if (previewVoiceId === id) {
        currentAudio = null;
        playing = false;
        _clearPreviewBtn();
      }
    };
    if (btn) {
      btn.textContent = "停止";
      btn.classList.add("playing");
      btn.disabled = false;
    }
    await _speakWithVoice(PREVIEW_TEXT, id, null, done);
  }

  function isSpeaking() {
    return playing;
  }

  return {
    isSupported,
    startListening,
    stopListening,
    isListening,
    speak,
    speakWithBackend,
    stopSpeaking,
    toggleSpeak,
    isSpeaking,
    getVoiceId,
    setVoiceId,
    getVoiceOptions,
    previewVoice,
  };
})();
