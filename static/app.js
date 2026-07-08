const API = "";
let sessionId = localStorage.getItem("session_id") || null;
let deviceId = localStorage.getItem("device_id") || null;
let streaming = false;
window.__cityIntroStreaming = () => streaming;
let appConfig = { speech_enabled: true, image_gen_enabled: false, pwa_enabled: true };

const messagesEl = document.getElementById("messages");
const sessionListEl = document.getElementById("sessionList");
const chatTitleEl = document.getElementById("chatTitle");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const locationBtn = document.getElementById("locationBtn");
const voiceBtn = document.getElementById("voiceBtn");
const cameraBtn = document.getElementById("cameraBtn");
const imageInput = document.getElementById("imageInput");
const voiceHint = document.getElementById("voiceHint");
const suggestionChipsEl = document.getElementById("suggestionChips");
const clearProfileBtn = document.getElementById("clearProfileBtn");
const exportSessionBtn = document.getElementById("exportSessionBtn");
const locationPill = document.getElementById("locationPill");
const statusBar = document.getElementById("statusBar");
const statusText = document.getElementById("statusText");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const moreMenuBtn = document.getElementById("moreMenuBtn");
const moreMenu = document.getElementById("moreMenu");

let userLocation = CoordTransform.migrateStoredLocation() || localStorage.getItem("user_location") || null;
let userCity = localStorage.getItem("user_city") || "";
let locationLabel = localStorage.getItem("location_label") || "";
let locationSource = localStorage.getItem("location_source") || ""; // "gps" | "ip" | "city" | ""
// 坐标过期检查：超过 LOCATION_STALE_MS 视为失效，不自动恢复坐标
const LOCATION_STALE_MS = 6 * 60 * 60 * 1000; // 6 小时
(function expireStaleLocation() {
  if (!userLocation) return;
  const ts = Number(localStorage.getItem("user_location_ts") || 0);
  if (!ts || Date.now() - ts > LOCATION_STALE_MS) {
    // 坐标过期：清掉坐标，保留 city 供 UI 提示
    userLocation = null;
    locationLabel = "";
    locationSource = "";
    localStorage.removeItem("user_location");
    localStorage.removeItem("user_location_ts");
    localStorage.removeItem("location_label");
    localStorage.removeItem("location_source");
  }
})();

const SCENES = [
  {
    icon: "sparkles",
    title: "查天气",
    desc: "城市预报与出行建议",
    action: "weather",
    requiresLocation: true,
  },
  {
    icon: "route",
    title: "规划路线",
    desc: "驾车/步行/公交导航",
    action: "route",
    requiresLocation: true,
  },
  {
    icon: "mapPin",
    title: "周边推荐",
    desc: "美食与好玩的景区",
    action: "nearby",
    requiresLocation: true,
  },
  { icon: "compass", title: "半日游", desc: "根据位置智能规划", msg: "根据当前位置规划半日游", requiresLocation: true },
];

function ensureDeviceId() {
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : "dev-" + Date.now();
    localStorage.setItem("device_id", deviceId);
  }
  return deviceId;
}

function buildPayload(extra = {}) {
  const payload = { session_id: sessionId, device_id: ensureDeviceId(), ...extra };
  if (userLocation) {
    payload.location = userLocation;
    payload.location_label = locationLabel;
  }
  return payload;
}

function initIcons() {
  setIcon(document.getElementById("newChatIcon"), "plus");
  setIcon(document.getElementById("menuIcon"), "menu");
  setIcon(document.getElementById("mapIcon"), "map");
  setIcon(document.getElementById("compassIcon"), "compass");
  setIcon(document.getElementById("moreIcon"), "more");
  setIcon(document.getElementById("locIcon"), "mapPin");
  setIcon(document.getElementById("micIcon"), "mic");
  setIcon(document.getElementById("camIcon"), "camera");
  setIcon(document.getElementById("sendIcon"), "send");
  setIcon(document.getElementById("sidebarCloseIcon"), "x");
}

async function loadAppConfig() {
  try {
    const res = await fetch(`${API}/api/config`);
    if (res.ok) appConfig = await res.json();
  } catch (_) {}
}

function setStatus(text) {
  if (!text) {
    statusBar?.classList.add("hidden");
    return;
  }
  statusBar?.classList.remove("hidden");
  if (statusText) statusText.textContent = text;
}

function renderSuggestionChips(suggestions) {
  suggestionChipsEl.innerHTML = "";
  if (!suggestions?.length) return;
  suggestions.forEach((text) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = text;
    btn.onclick = () => sendMessage(text);
    suggestionChipsEl.appendChild(btn);
  });
}

async function loadSuggestions() {
  try {
    const params = new URLSearchParams({
      session_id: sessionId || "",
      device_id: ensureDeviceId(),
    });
    if (userLocation) {
      params.set("location", userLocation);
      params.set("location_label", locationLabel);
    }
    const res = await fetch(`${API}/api/suggestions?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    renderSuggestionChips(data.suggestions || []);
  } catch (e) {
    console.error("加载建议失败", e);
  }
}

function showWelcome() {
  const cards = SCENES.map(
    (s) => `
    <button type="button" class="scene-card" data-action="${s.action || ""}" data-msg="${(s.msg || "").replace(/"/g, "&quot;")}" data-loc="${s.requiresLocation ? "1" : ""}">
      <span class="icon">${Icons[s.icon] || ""}</span>
      <h4>${s.title}</h4>
      <p>${s.desc}</p>
    </button>`
  ).join("");

  messagesEl.innerHTML = `
    <div class="welcome-hero">
      <h2>探索城市，从这里开始</h2>
      <p>查天气、规划路线、发现美食与景点 — 支持语音、识景与个性化推荐</p>
      <div class="scene-grid">${cards}</div>
    </div>`;

  messagesEl.querySelectorAll(".scene-card").forEach((btn) => {
    btn.addEventListener("click", () => handleSceneClick(btn));
  });
  loadSuggestions();
}

async function handleSceneClick(btn) {
  const action = btn.dataset.action;
  const needsLoc = btn.dataset.loc === "1";
  if (action === "weather") {
    await startWeatherFromLocation();
    return;
  }
  if (action === "route") {
    await startRouteFromLocation();
    return;
  }
  if (action === "nearby") {
    await startNearbyFromLocation();
    return;
  }
  if (needsLoc && !userLocation) {
    try {
      await requestLocation({ reverseGeocode: true });
    } catch {
      alert("此功能需要先定位，请允许浏览器获取位置权限");
      return;
    }
  }
  if (btn.dataset.msg) sendMessage(btn.dataset.msg);
}

function appendMessage(role, text) {
  messagesEl.querySelector(".welcome-hero")?.remove();
  const div = document.createElement("div");
  div.className = `message ${role}`;
  if (role === "assistant" && text) {
    const textEl = document.createElement("div");
    textEl.className = "message-text";
    Markdown.setContent(textEl, text);
    div.appendChild(textEl);
  } else {
    div.textContent = text;
  }
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

function appendMessageFooter(msgEl, ctx) {
  Feedback.attachToMessageFooter(msgEl, { sessionId, ...ctx }, ensureDeviceId());
}

function createSummaryCard(type, title, meta, onClick, mapData) {
  const card = document.createElement("div");
  card.className = `summary-card ${type}`;
  card.innerHTML = `
    <div class="summary-card-head">
      <span class="badge badge-${type}">${type === "route" ? "路线" : type === "traffic" ? "路况" : "地点"}</span>
      <span class="summary-card-title">${title}</span>
    </div>
    <div class="summary-card-meta">${meta} · 点击查看地图</div>`;
  if (mapData) card._mapData = { type, data: mapData };
  card.addEventListener("click", onClick);

  if (type === "poi") Feedback.attachToSummaryCard(card, Feedback.targetsForPoiMap(mapData), ensureDeviceId());
  else if (type === "route") Feedback.attachToSummaryCard(card, Feedback.targetsForRoute(mapData), ensureDeviceId());
  else if (type === "traffic") {
    Feedback.attachToSummaryCard(
      card,
      [{ category: "traffic", target: mapData?.title || "周边路况" }],
      ensureDeviceId()
    );
  }

  return card;
}

function appendRouteSummary(msgEl, routeData, updateMap = true) {
  if (!routeData) return;
  if (!msgEl.querySelector(".summary-card.route")) {
    const mode = routeData.mode_label || routeData.mode || "路线";
    const from = routeData.origin?.name || "起点";
    const to = routeData.destination?.name || "终点";
    const meta = `${from} → ${to}${routeData.duration_text ? " · " + routeData.duration_text : ""}`;
    const cardTitle =
      routeData.trip_type === "halfday" ? "半日游路线" : `${mode}导航`;
    msgEl.appendChild(
      createSummaryCard("route", cardTitle, meta, () => MapPanel.showRoute(routeData), routeData)
    );
  }
  if (updateMap) MapPanel.showRoute(routeData);
}

function appendPoiSummary(msgEl, poiData, updateMap = true) {
  if (!poiData) return;
  if (!msgEl.querySelector(".summary-card.poi")) {
    const title = poiData.title || "地点推荐";
    const foodN = poiData.food_count;
    const sightN = poiData.sight_count;
    const meta =
      foodN != null && sightN != null
        ? `美食 ${foodN} · 景点 ${sightN}${poiData.offline ? " · 离线数据" : ""}`
        : `共 ${(poiData.pois || []).length} 个地点${poiData.offline ? " · 离线数据" : ""} · 点击 chip 看详情`;
    msgEl.appendChild(
      createSummaryCard("poi", title, meta, () => MapPanel.showPoi(poiData), poiData)
    );

    const chips = document.createElement("div");
    chips.className = "poi-chips";
    (poiData.pois || []).slice(0, 8).forEach((poi) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      const prefix = poi.category === "food" ? "🍜 " : poi.category === "sight" ? "🏛 " : "";
      const weight = poi.preference_weight || 0;
      if (weight > 0) chip.classList.add("chip-liked");
      if (weight < 0) chip.classList.add("chip-disliked");
      if (poi.has_guide) chip.classList.add("chip-has-guide");
      chip.textContent = prefix + (poi.display_name || poi.name);
      if (poi.culture_hint) chip.title = poi.culture_hint;
      chip.onclick = (e) => {
        e.stopPropagation();
        openPoiDetail(poi, poiData);
      };

      const askBtn = document.createElement("button");
      askBtn.type = "button";
      askBtn.className = "chip-fav";
      askBtn.title = "在对话中询问";
      askBtn.textContent = "?";
      askBtn.onclick = (e) => {
        e.stopPropagation();
        messageInput.value = `介绍一下${poi.name}，怎么去？`;
        messageInput.focus();
      };

      const favBtn = document.createElement("button");
      favBtn.type = "button";
      favBtn.className = "chip-fav";
      favBtn.title = "收藏地点";
      favBtn.textContent = FavoritesPanel.isFavorited?.(poi.name) ? "★" : "☆";
      if (FavoritesPanel.isFavorited?.(poi.name)) favBtn.classList.add("is-faved");
      favBtn.onclick = async (e) => {
        e.stopPropagation();
        const ok = await FavoritesPanel.favoritePoi(poi.name);
        if (ok) {
          favBtn.textContent = "★";
          favBtn.classList.add("is-faved");
        }
      };

      const wrap = document.createElement("span");
      wrap.className = "chip-wrap";
      wrap.appendChild(chip);
      wrap.appendChild(askBtn);
      wrap.appendChild(favBtn);
      chips.appendChild(wrap);
    });
    msgEl.appendChild(chips);
  }
  if (updateMap) MapPanel.showPoi(poiData);
}

function appendTrafficSummary(msgEl, trafficData, updateMap = true) {
  if (!trafficData) return;
  if (!msgEl.querySelector(".summary-card.traffic")) {
    const status = trafficData.status || "实时路况";
    const meta = trafficData.coverage_limited
      ? `${trafficData.local_area || "当前区域"} · 地图路况图层 · 半径 ${trafficData.radius || 1500}米`
      : `${status} · 半径 ${trafficData.radius || 1500}米`;
    msgEl.appendChild(
      createSummaryCard("traffic", "周边路况", meta, () => MapPanel.showTraffic(trafficData), trafficData)
    );
  }
  if (updateMap) MapPanel.showTraffic(trafficData);
}

function appendSystemNotice(text) {
  if (!text) return;
  const div = document.createElement("div");
  div.className = "message assistant system-notice";
  div.innerHTML = `<div class="message-text">${text}</div>`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendAssistantWithMaps(text, routeMap, poiMap, imageUrl, trafficMap, tripPlan, ttsUrl, ttsVoiceId) {
  const div = appendMessage("assistant", text || "");
  if (imageUrl) div.appendChild(Multimodal.createGeneratedImage(imageUrl, text));
  if (tripPlan) TripPanel.appendTripToMessage(div, tripPlan);
  if (poiMap) appendPoiSummary(div, poiMap, false);
  if (trafficMap) appendTrafficSummary(div, trafficMap, false);
  if (routeMap) appendRouteSummary(div, routeMap, true);
  else if (trafficMap) MapPanel.showTraffic(trafficMap);
  else if (poiMap) MapPanel.showPoi(poiMap);
  if (text || routeMap || poiMap || tripPlan) {
    appendMessageFooter(div, {
      text,
      routeMap,
      poiMap,
      tripPlan,
      tts_url: ttsUrl,
      tts_voice_id: ttsVoiceId,
    });
  }
  return div;
}

function syncMapFromHistory(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    if (m.route_map) {
      MapPanel.showRoute(m.route_map);
      return;
    }
    if (m.traffic_map) {
      MapPanel.showTraffic(m.traffic_map);
      return;
    }
    if (m.poi_map) {
      MapPanel.showPoi(m.poi_map);
      return;
    }
  }
  MapPanel.clear();
}

async function loadSessions() {
  try {
    const res = await fetch(`${API}/api/sessions`);
    const data = await res.json();
    sessionListEl.innerHTML = "";
    (data.sessions || []).forEach((s) => {
      const li = document.createElement("li");
      li.className = "session-item" + (s.session_id === sessionId ? " active" : "");
      li.dataset.sessionId = s.session_id;
      const title = document.createElement("span");
      title.className = "session-title";
      title.textContent = s.title || "未命名对话";
      const delBtn = document.createElement("button");
      delBtn.className = "session-delete";
      delBtn.type = "button";
      delBtn.textContent = "×";
      delBtn.onclick = (e) => {
        e.stopPropagation();
        deleteSession(s.session_id);
      };
      li.appendChild(title);
      li.appendChild(delBtn);
      li.onclick = () => {
        switchSession(s.session_id, s.title);
        closeSidebar();
      };
      sessionListEl.appendChild(li);
    });
  } catch (e) {
    console.error("加载会话列表失败", e);
  }
}

function updateSessionListActive(activeId) {
  sessionListEl.querySelectorAll(".session-item").forEach((li) => {
    li.classList.toggle("active", li.dataset.sessionId === activeId);
  });
}

async function deleteSession(id) {
  if (!confirm("确定删除该对话吗？")) return;
  try {
    const res = await fetch(`${API}/api/sessions/${id}`, { method: "DELETE" });
    if (!res.ok) return alert("删除失败");
    if (sessionId === id) {
      sessionId = null;
      localStorage.removeItem("session_id");
      const listRes = await fetch(`${API}/api/sessions`);
      const remaining = (await listRes.json()).sessions || [];
      if (remaining.length) await switchSession(remaining[0].session_id, remaining[0].title);
      else await createNewChat();
    } else await loadSessions();
  } catch (e) {
    alert("删除失败: " + e.message);
  }
}

async function switchSession(id, title) {
  sessionId = id;
  localStorage.setItem("session_id", id);
  chatTitleEl.textContent = title || "对话";
  MapPanel.hide();
  updateSessionListActive(id);
  await loadHistory();
  await loadSuggestions();
}

async function loadHistory() {
  if (!sessionId) {
    showWelcome();
    return;
  }
  try {
    const res = await fetch(`${API}/api/sessions/${sessionId}/history`);
    if (!res.ok) {
      showWelcome();
      return;
    }
    const data = await res.json();
    chatTitleEl.textContent = data.title || "对话";
    messagesEl.innerHTML = "";
    const msgs = data.messages || [];
    if (!msgs.length) {
      showWelcome();
      return;
    }
    msgs.forEach((m) => {
      const text = (m.content || "").trim();
      if (m.role === "user" && text) appendMessage("user", text);
      else if (m.role === "assistant" && (text || m.route_map || m.poi_map || m.traffic_map || m.image_url || m.trip_plan))
        appendAssistantWithMaps(
          text,
          m.route_map,
          m.poi_map,
          m.image_url,
          m.traffic_map,
          m.trip_plan,
          m.tts_url,
          m.tts_voice_id
        );
    });
    syncMapFromHistory(msgs);
  } catch {
    showWelcome();
  }
}

async function createNewChat() {
  const res = await fetch(`${API}/api/sessions`, { method: "POST" });
  const data = await res.json();
  sessionId = data.session_id;
  localStorage.setItem("session_id", sessionId);
  chatTitleEl.textContent = "新对话";
  MapPanel.hide();
  showWelcome();
  await loadSessions();
  closeSidebar();
}

function updateLocationPill() {
  if (!locationPill) return;
  if (userLocation) {
    const prefix = locationSource === "ip" ? "网络定位 · " : locationSource === "city" ? "城市定位 · " : "已定位 · ";
    locationPill.textContent = `${prefix}${locationLabel || userLocation}`;
    locationPill.classList.add("is-active");
    locationBtn?.classList.add("active");
  } else {
    locationPill.textContent = "未定位 · 点击获取周边推荐";
    locationPill.classList.remove("is-active");
    locationBtn?.classList.remove("active");
  }
}

function geolocationErrorMessage(err) {
  if (!err) return "无法获取位置";
  switch (err.code) {
    case 1:
      return "请允许浏览器定位权限（Safari：设置 → 隐私与安全性 → 定位服务）";
    case 2:
      return "设备暂时无法提供 GPS 信号，请确认已开启 Wi‑Fi/蓝牙或到窗边";
    case 3:
      return "GPS 定位超时，请到窗边或户外重试";
    default:
      return err.message || "无法获取位置";
  }
}

// GPS 精度分级阈值（米）
const GPS_ACCURACY_GOOD = 50;      // <= 立即采用
const GPS_ACCURACY_ACCEPTABLE = 150; // <= 临近超时可接受；超出则降级到网络定位

function getDevicePosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("您的浏览器不支持定位"));
      return;
    }
    let settled = false;
    let watchId = null;
    let bestPos = null;
    const deadline = Date.now() + 25000;

    const cleanup = () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    const fail = (err) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const succeed = (pos) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(pos);
    };

    const onSuccess = (pos) => {
      const acc = pos.coords.accuracy ?? Infinity;
      if (!bestPos || acc < (bestPos.coords.accuracy ?? Infinity)) {
        bestPos = pos;
      }
      // 高精度读到阈值内立即采用
      if (acc <= GPS_ACCURACY_GOOD) {
        succeed(bestPos);
      } else if (acc <= GPS_ACCURACY_ACCEPTABLE && Date.now() >= deadline - 1500) {
        // 中等精度：临近超时才接受
        succeed(bestPos);
      }
      // 超出 GPS_ACCURACY_ACCEPTABLE 的读数不主动采用，继续等更佳读数
    };

    const onError = (err) => {
      if (err && err.code === 1) {
        fail(err);
        return;
      }
      // 超时/信号不可用：若有可接受精度读数就用，否则附带 bestPos 报错交由降级
      if (bestPos && (bestPos.coords.accuracy ?? Infinity) <= GPS_ACCURACY_ACCEPTABLE) {
        succeed(bestPos);
      } else {
        const e = new Error("GPS 精度不足或信号不可用");
        e.code = err ? err.code : 2;
        e.bestPos = bestPos; // 附带粗略读数供降级参考
        fail(e);
      }
    };

    watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 25000,
      maximumAge: 0,
    });

    // 兜底超时：到点若有可接受读数则采用，否则附 bestPos 报错触发降级
    setTimeout(() => {
      if (settled) return;
      if (bestPos && (bestPos.coords.accuracy ?? Infinity) <= GPS_ACCURACY_ACCEPTABLE) {
        succeed(bestPos);
      } else {
        const e = new Error("GPS 定位超时，已切换到网络定位");
        e.code = 3;
        e.bestPos = bestPos;
        fail(e);
      }
    }, 25000);
  });
}

async function applyLocation(coords, { reverseGeocode = false, source = "gps" } = {}) {
  const { longitude, latitude, accuracy } = coords;
  const gcj = CoordTransform.wgs84ToGcj02(longitude, latitude);
  userLocation = `${gcj.lng.toFixed(6)},${gcj.lat.toFixed(6)}`;
  locationSource = source;
  locationLabel =
    source === "ip"
      ? `网络定位`
      : `当前位置(${gcj.lat.toFixed(4)}, ${gcj.lng.toFixed(4)})`;
  let city = "";
  if (reverseGeocode || source === "ip") {
    try {
      const res = await fetch(
        `${API}/api/location/city?location=${encodeURIComponent(userLocation)}&device_id=${encodeURIComponent(ensureDeviceId())}`
      );
      if (res.ok) {
        const data = await res.json();
        city = data.city || "";
        if (data.label) locationLabel = data.label;
      }
    } catch (_) {}
  }
  if (source === "ip") {
    locationLabel = locationLabel.includes("网络定位")
      ? locationLabel
      : `${locationLabel} · 网络定位`;
  } else if (accuracy > 200) {
    const hint = `精度约${Math.round(accuracy)}米`;
    locationLabel = locationLabel.includes("·")
      ? `${locationLabel} · ${hint}`
      : `${locationLabel} · ${hint}`;
  }
  localStorage.setItem("user_location", userLocation);
  localStorage.setItem("location_label", locationLabel);
  localStorage.setItem("location_coord_sys", "gcj02");
  localStorage.setItem("user_location_ts", String(Date.now()));
  localStorage.setItem("location_source", locationSource);
  if (city) {
    userCity = city;
    localStorage.setItem("user_city", city);
  }
  updateLocationPill();
  await loadSuggestions();
  await FavoritesPanel.refresh?.();
  return { location: userLocation, label: locationLabel, city, source };
}

async function fallbackCityLocation() {
  let city = userCity || localStorage.getItem("user_city") || "";
  if (!city) {
    try {
      const res = await fetch(`${API}/api/profile/${ensureDeviceId()}`);
      if (res.ok) {
        const data = await res.json();
        const cities = data.favorite_cities || [];
        if (cities.length) city = cities[0];
      }
    } catch (_) {}
  }
  if (!city) {
    throw new Error("无法自动定位，请允许浏览器定位权限，或在对话中直接输入城市名");
  }
  const params = new URLSearchParams({ keywords: city, city });
  const res = await fetch(`${API}/api/location/geocode?${params}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.error || `无法解析城市「${city}」`);
  }
  userLocation = data.location;
  locationLabel = `${city} · 城市中心（近似）`;
  locationSource = "city";
  userCity = city;
  localStorage.setItem("user_location", userLocation);
  localStorage.setItem("location_label", locationLabel);
  localStorage.setItem("user_city", city);
  localStorage.setItem("location_coord_sys", "gcj02");
  localStorage.setItem("user_location_ts", String(Date.now()));
  localStorage.setItem("location_source", locationSource);
  updateLocationPill();
  await loadSuggestions();
  await FavoritesPanel.refresh?.();
  return { location: userLocation, label: locationLabel, city, source: "city" };
}

async function fallbackIpLocation({ reverseGeocode = true } = {}) {
  const res = await fetch(
    `${API}/api/location/ip?device_id=${encodeURIComponent(ensureDeviceId())}`
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.detail;
    throw new Error(
      typeof detail === "string" ? detail : "网络定位失败，请检查网络连接"
    );
  }
  userLocation = data.location;
  locationLabel = data.label || "网络定位";
  locationSource = "ip";
  let city = data.city || "";
  if (reverseGeocode && userLocation) {
    try {
      const geoRes = await fetch(
        `${API}/api/location/city?location=${encodeURIComponent(userLocation)}&device_id=${encodeURIComponent(ensureDeviceId())}`
      );
      if (geoRes.ok) {
        const geo = await geoRes.json();
        city = geo.city || city;
        if (geo.label) locationLabel = `${geo.label} · 网络定位`;
      }
    } catch (_) {}
  }
  localStorage.setItem("user_location", userLocation);
  localStorage.setItem("location_label", locationLabel);
  localStorage.setItem("location_coord_sys", "gcj02");
  localStorage.setItem("user_location_ts", String(Date.now()));
  localStorage.setItem("location_source", locationSource);
  if (city) {
    userCity = city;
    localStorage.setItem("user_city", city);
  }
  updateLocationPill();
  await loadSuggestions();
  await FavoritesPanel.refresh?.();
  return { location: userLocation, label: locationLabel, city, source: "ip" };
}

function requestLocation(options = {}) {
  const { reverseGeocode = false, forceGps = false, silent = false } = options;
  const setPill = (text) => {
    if (!silent && locationPill) locationPill.textContent = text;
  };
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      setPill("浏览器不支持定位");
      reject(new Error("您的浏览器不支持定位"));
      return;
    }
    setPill("正在获取 GPS 位置（可能需要数秒）...");
    let elapsed = 0;
    const ticker = setInterval(() => {
      elapsed += 2;
      if (elapsed < 25) {
        setPill(`正在获取 GPS 位置... ${elapsed}s`);
      }
    }, 2000);

    getDevicePosition()
      .then((pos) => applyLocation(pos.coords, { reverseGeocode, source: "gps" }))
      .then((loc) => {
        clearInterval(ticker);
        if (silent) updateLocationPill();
        resolve(loc);
      })
      .catch(async (err) => {
        clearInterval(ticker);
        // 权限被拒绝时不自动降级（IP 定位仍可能泄露大致位置，让用户知情）
        if (err && err.code === 1) {
          const reason = geolocationErrorMessage(err);
          setPill(`定位失败 · ${reason}`);
          reject(new Error(reason));
          return;
        }
        // 其他失败（超时/精度不足/信号不可用）：自动降级到网络定位
        if (forceGps) {
          const reason = geolocationErrorMessage(err);
          setPill(`定位失败 · ${reason}`);
          reject(new Error(reason));
          return;
        }
        try {
          setPill("GPS 精度不足，正在切换到网络定位...");
          const loc = await fallbackIpLocation({ reverseGeocode });
          setPill(`已用网络定位 · ${loc.label} · 精度较低，点击重新 GPS`);
          resolve(loc);
        } catch (ipErr) {
          const reason = geolocationErrorMessage(err);
          setPill(`定位失败 · ${reason}`);
          reject(new Error(reason));
        }
      });
  });
}

async function startNearbyFromLocation() {
  try {
    if (!userLocation) {
      setStatus("正在定位并搜索周边美食与景点...");
      await requestLocation({ reverseGeocode: true });
    } else {
      setStatus("正在搜索周边美食与景点...");
    }
    setStatus("");
    sendMessage("附近有什么好吃的和好玩的景点？");
  } catch {
    setStatus("");
    alert("周边推荐需要先定位，请允许浏览器获取位置权限");
  }
}

async function startRouteFromLocation() {
  try {
    setStatus("正在定位，准备路线导航...");
    const loc = await requestLocation({ reverseGeocode: true });
    setStatus("");
    RoutePlanner.open(loc);
  } catch {
    setStatus("");
    alert("规划路线需要先定位，请允许浏览器获取位置权限");
  }
}

async function startWeatherFromLocation() {
  try {
    setStatus("正在定位并识别当前城市...");
    const loc = await requestLocation({ reverseGeocode: true });
    setStatus("");
    if (!loc.city) {
      alert("未能识别当前城市，请稍后重试或手动输入城市名");
      return;
    }
    const prompt = `${loc.city}今天天气怎么样？请根据实时预报给出穿衣、是否带伞和今日出行建议。`;
    sendMessage(prompt);
  } catch (e) {
    setStatus("");
    alert("查天气需要先定位，请允许浏览器获取位置权限");
  }
}

function closeSidebar() {
  sidebar?.classList.remove("open");
  sidebarOverlay?.classList.remove("open");
}

const SIDEBAR_COLLAPSED_KEY = "cityintro_sidebar_collapsed";
const DESKTOP_BREAKPOINT = 900;

function isDesktop() {
  return window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT + 1}px)`).matches;
}

function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle("sidebar-collapsed", collapsed);
  const btn = document.getElementById("sidebarToggle");
  if (btn) {
    btn.classList.toggle("active", collapsed);
    btn.setAttribute("aria-label", collapsed ? "展开侧栏" : "收起侧栏");
  }
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
}

function restoreSidebarState() {
  if (isDesktop()) {
    const collapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
    setSidebarCollapsed(collapsed);
  } else {
    document.body.classList.remove("sidebar-collapsed");
  }
}

async function consumeChatStream(response, ctx) {
  await ChatStream.consume(response, {
    ...ctx,
    messagesEl,
    setStatus,
    appendMessage,
    appendPoiSummary,
    appendRouteSummary,
    appendTrafficSummary,
    appendMessageFooter,
    onConfirmRequired: async (event) => {
      const prompt = event.content?.prompt || event.content || "";
      const ok = confirm(`即将生成「${prompt}」效果图，是否继续？`);
      if (!ok) {
        appendMessage("assistant", "已取消图像生成。");
        return;
      }
      setStatus("正在生成效果图...");
      const res = await fetch(`${API}/api/chat/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          device_id: ensureDeviceId(),
          confirm: true,
        }),
      });
      await ChatStream.consume(res, {
        ...ctx,
        messagesEl,
        setStatus,
        appendMessage,
        appendPoiSummary,
        appendRouteSummary,
        appendTrafficSummary,
        appendMessageFooter,
        onConfirmRequired: async () => {},
      });
    },
  });
}

async function sendMessage(text) {
  if (!text.trim() || streaming) return;
  streaming = true;
  sendBtn.disabled = true;
  suggestionChipsEl.innerHTML = "";
  appendMessage("user", text);
  messageInput.value = "";
  autoResizeInput();

  let assistantEl = null;
  let assistantTextEl = null;
  let fullText = "";
  let pendingRouteMap = null;
  let pendingPoiMap = null;
  let pendingTrafficMap = null;
  let pendingTripPlan = null;
  let mapUpdatedThisTurn = false;

  MapPanel.prepareNewTurn();

  const streamCtx = {
    assistantEl: null,
    assistantTextEl: null,
    fullText: "",
    pendingRouteMap: null,
    pendingPoiMap: null,
    pendingTrafficMap: null,
    pendingTripPlan: null,
    mapUpdatedThisTurn: false,
    sessionId,
    ensureAssistantShell() {
      if (!streamCtx.assistantEl) {
        messagesEl.querySelector(".welcome-hero")?.remove();
        streamCtx.assistantEl = document.createElement("div");
        streamCtx.assistantEl.className = "message assistant";
        messagesEl.appendChild(streamCtx.assistantEl);
      }
      return streamCtx.assistantEl;
    },
    ensureAssistantText() {
      const shell = streamCtx.ensureAssistantShell();
      if (!streamCtx.assistantTextEl) {
        streamCtx.assistantTextEl = document.createElement("div");
        streamCtx.assistantTextEl.className = "message-text";
        shell.appendChild(streamCtx.assistantTextEl);
      }
      return streamCtx.assistantTextEl;
    },
  };

  try {
    const res = await fetch(`${API}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload({ message: text })),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    await consumeChatStream(res, streamCtx);
    if (streamCtx.sessionId) sessionId = streamCtx.sessionId;

    await loadSessions();
    await loadSuggestions();
  } catch (e) {
    appendMessage("assistant", "请求失败: " + e.message);
  } finally {
    streaming = false;
    sendBtn.disabled = false;
    setStatus("");
    messageInput.focus();
  }
}

function autoResizeInput() {
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px";
}

async function handleImageUpload(file) {
  if (!file || streaming) return;
  try {
    setStatus("正在识别图片...");
    const base64 = await Multimodal.readFileAsBase64(file);
    appendMessage("user", "[上传图片识景]");
    const result = await Multimodal.analyzeImage(base64, userLocation, sessionId, ensureDeviceId());
    setStatus("");
    if (result.reply)
      appendAssistantWithMaps(
        result.reply,
        result.route_map,
        result.poi_map,
        result.image_url,
        result.traffic_map
      );
    await loadSuggestions();
  } catch (e) {
    setStatus("");
    appendMessage("assistant", "图片识别失败: " + e.message);
  }
}

function toggleVoiceInput() {
  if (!Voice.isSupported()) {
    voiceHint.textContent = "当前浏览器不支持语音识别";
    return;
  }
  if (Voice.isListening()) {
    Voice.stopListening();
    voiceBtn.classList.remove("active");
    voiceHint.textContent = "";
    return;
  }
  voiceBtn.classList.add("active");
  voiceHint.textContent = "正在聆听...";
  Voice.startListening(
    (text, isFinal) => {
      messageInput.value = text;
      autoResizeInput();
      if (isFinal && text.trim()) {
        Voice.stopListening();
        voiceBtn.classList.remove("active");
        voiceHint.textContent = "";
        sendMessage(text.trim());
      }
    },
    () => {
      voiceBtn.classList.remove("active");
      voiceHint.textContent = "";
    }
  );
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage(messageInput.value);
});

messageInput.addEventListener("input", autoResizeInput);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.requestSubmit();
  }
});

newChatBtn.addEventListener("click", createNewChat);
locationBtn?.addEventListener("click", () => {
  const forceGps = locationSource === "ip" || locationSource === "city";
  requestLocation({ reverseGeocode: true, forceGps }).catch((e) =>
    alert(e.message || "定位失败，请检查定位权限或网络")
  );
});
locationPill?.addEventListener("click", () => {
  const forceGps = locationSource === "ip" || locationSource === "city";
  requestLocation({ reverseGeocode: true, forceGps }).catch((e) =>
    alert(e.message || "定位失败，请检查定位权限或网络")
  );
});
voiceBtn.addEventListener("click", toggleVoiceInput);
cameraBtn.addEventListener("click", async () => {
  if (streaming) return;
  try {
    setStatus("正在打开摄像头...");
    const base64 = await Multimodal.captureFromCamera();
    setStatus("正在识别图片...");
    appendMessage("user", "[拍照识景]");
    const result = await Multimodal.analyzeImage(base64, userLocation, sessionId, ensureDeviceId());
    setStatus("");
    if (result.reply) {
      appendAssistantWithMaps(
        result.reply,
        result.route_map,
        result.poi_map,
        result.image_url,
        result.traffic_map,
        result.trip_plan
      );
    }
    if (result.session_id) {
      sessionId = result.session_id;
      localStorage.setItem("session_id", sessionId);
    }
    await loadSessions();
  } catch (e) {
    setStatus("");
    imageInput?.click();
  }
});
imageInput?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) handleImageUpload(file);
  e.target.value = "";
});

document.getElementById("sidebarToggle")?.addEventListener("click", () => {
  if (isDesktop()) {
    setSidebarCollapsed(!document.body.classList.contains("sidebar-collapsed"));
  } else {
    sidebar?.classList.toggle("open");
    sidebarOverlay?.classList.toggle("open");
  }
});
sidebarOverlay?.addEventListener("click", closeSidebar);
document.getElementById("sidebarClose")?.addEventListener("click", closeSidebar);
window.addEventListener("resize", () => {
  // 切换断点时同步侧栏状态，避免桌面收起态在移动端残留
  if (!isDesktop()) {
    document.body.classList.remove("sidebar-collapsed");
  } else {
    restoreSidebarState();
  }
});
restoreSidebarState();

moreMenuBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  moreMenu?.classList.toggle("hidden");
});
document.addEventListener("click", () => moreMenu?.classList.add("hidden"));

// 运行监控：统一打开函数，弹窗被拦截时降级到当前页跳转
function openAdminMonitor() {
  moreMenu?.classList.add("hidden");
  const w = window.open("/admin", "_blank");
  if (!w) {
    // 弹窗被拦截：当前页跳转
    window.location.href = "/admin";
  }
}
document.getElementById("adminOpenBtn")?.addEventListener("click", (e) => {
  e.stopPropagation();
  openAdminMonitor();
});

clearProfileBtn?.addEventListener("click", async () => {
  if (!confirm("确定清除个性化记忆吗？将同时停止全程伴游跟踪。")) return;
  await fetch(`${API}/api/profile/${ensureDeviceId()}`, { method: "DELETE" });
  TripPanel.clearActiveTrip?.();
  setStatus("");
  await loadSuggestions();
  await FavoritesPanel.refresh?.();
  alert("记忆已清除");
});

exportSessionBtn?.addEventListener("click", () => {
  if (!sessionId) return alert("请先开始对话");
  window.open(`${API}/api/export/session/${sessionId}`, "_blank");
});

document.getElementById("companionBtn")?.addEventListener("click", async () => {
  if (!userLocation) return alert("请先定位");
  try {
    const params = new URLSearchParams({ location: userLocation, device_id: ensureDeviceId() });
    const res = await fetch(`${API}/api/companion/next?${params}`);
    const data = await res.json();
    if (data.suggestion) sendMessage(data.suggestion);
  } catch {
    alert("获取下一站建议失败");
  }
});

(async function init() {
  initIcons();
  MapPanel.init();
  await TripPanel.init();
  PanelResize.init();
  ensureDeviceId();
  await loadAppConfig();
  updateLocationPill();
  if ("serviceWorker" in navigator && appConfig.pwa_enabled) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
  if (!Voice.isSupported()) voiceBtn.title = "不支持语音";
  if (!sessionId) await createNewChat();
  else {
    await loadSessions();
    await loadHistory();
  }
  await FavoritesPanel.load();
  await loadSuggestions();
})();
