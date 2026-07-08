/** 用户反馈：结构化目标 + API 提交 + 按钮状态 */
const Feedback = (() => {
  function dedupeTargets(items) {
    const seen = new Set();
    return (items || []).filter((item) => {
      if (!item?.target) return false;
      const key = `${item.category || "poi"}:${item.target}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /** 从一条助手消息上下文提取可反馈目标 */
  function buildTargets(ctx = {}) {
    const { text, routeMap, poiMap, tripPlan } = ctx;
    const targets = [];

    (poiMap?.pois || []).slice(0, 8).forEach((p) => {
      if (p?.name) targets.push({ category: "poi", target: p.name });
    });

    const dest = routeMap?.destination?.name;
    if (dest) targets.push({ category: "route", target: dest });

    const tripLabel = tripPlan?.title || tripPlan?.city || tripPlan?.id;
    if (tripLabel) targets.push({ category: "trip", target: String(tripLabel) });

    const normalized = (text || "").trim().replace(/\s+/g, " ").slice(0, 80);
    if (normalized) targets.push({ category: "reply", target: normalized });

    return dedupeTargets(targets);
  }

  function targetsForPoiMap(poiData) {
    return dedupeTargets(
      (poiData?.pois || []).slice(0, 8).map((p) =>
        p?.name ? { category: "poi", target: p.name } : null
      ).filter(Boolean)
    );
  }

  function targetsForRoute(routeData) {
    const dest = routeData?.destination?.name;
    return dest ? [{ category: "route", target: dest }] : [];
  }

  function targetsForTrip(tripPlan) {
    const label = tripPlan?.title || tripPlan?.city || tripPlan?.id;
    return label ? [{ category: "trip", target: String(label) }] : [];
  }

  async function submit(targets, rating, deviceId) {
    const list = dedupeTargets(
      (targets || []).map((t) => ({ ...t, rating }))
    );
    if (!list.length) {
      throw new Error("没有可反馈的内容");
    }

    const res = await fetch(`${typeof API !== "undefined" ? API : ""}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id: deviceId,
        targets: list,
      }),
    });

    let data = {};
    try {
      data = await res.json();
    } catch (_) {}

    if (!res.ok) {
      const detail = data.detail;
      const msg =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail[0]?.msg
            : data.error || `HTTP ${res.status}`;
      throw new Error(msg || "反馈提交失败");
    }
    return data;
  }

  function effectiveRatingFromResults(data) {
    const results = data?.results || [];
    if (!results.length) return 0;
    const weights = results.map((r) => r.weight).filter((w) => w !== undefined);
    if (!weights.length) return 0;
    if (weights.every((w) => w > 0)) return 1;
    if (weights.every((w) => w < 0)) return -1;
    return 0;
  }

  function setButtonState(upBtn, downBtn, rating) {
    if (!upBtn || !downBtn) return;
    upBtn.classList.remove("active-like");
    downBtn.classList.remove("active-dislike");
    upBtn.disabled = false;
    downBtn.disabled = false;
    if (rating === 1) upBtn.classList.add("active-like");
    if (rating === -1) downBtn.classList.add("active-dislike");
  }

  function createThumbPair(onRate) {
    const up = document.createElement("button");
    up.type = "button";
    up.className = "btn-ghost feedback-up";
    up.setAttribute("aria-label", "有帮助");
    up.appendChild(typeof icon === "function" ? icon("thumbsUp", "icon") : document.createTextNode("👍"));

    const down = document.createElement("button");
    down.type = "button";
    down.className = "btn-ghost feedback-down";
    down.setAttribute("aria-label", "无帮助");
    down.appendChild(typeof icon === "function" ? icon("thumbsDown", "icon") : document.createTextNode("👎"));

    const handle = (rating) => async () => {
      up.disabled = true;
      down.disabled = true;
      try {
        const data = await onRate(rating);
        const effective = effectiveRatingFromResults(data);
        setButtonState(up, down, effective);
        if (typeof setStatus === "function") {
          const removed = (data?.results || []).some((r) => r.action === "removed");
          const msg =
            effective === 0
              ? "已取消反馈"
              : effective > 0
                ? "感谢反馈，已更新您的偏好"
                : "已记录，我们会改进推荐";
          setStatus(removed && effective === 0 ? "已取消反馈" : msg);
          setTimeout(() => setStatus(""), 2200);
        }
      } catch (e) {
        if (typeof setStatus === "function") setStatus("");
        alert(e.message || "反馈提交失败，请稍后重试");
      } finally {
        up.disabled = false;
        down.disabled = false;
      }
    };

    up.onclick = handle(1);
    down.onclick = handle(-1);
    return { up, down, setState: (r) => setButtonState(up, down, r) };
  }

  function attachToMessageFooter(msgEl, ctx, deviceId) {
    if (!msgEl || msgEl.querySelector(".message-footer")) return;
    const footer = document.createElement("div");
    footer.className = "message-footer";

    const text = ctx?.text || (typeof ctx === "string" ? ctx : "");
    if (typeof Voice !== "undefined" && Voice.isSupported?.() && text) {
      const play = document.createElement("button");
      play.type = "button";
      play.className = "btn-ghost tts-btn";
      play.appendChild(icon("volume", "icon"));
      const label = document.createElement("span");
      label.className = "tts-label";
      label.textContent = "朗读";
      play.appendChild(label);
      play.onclick = () =>
        Voice.toggleSpeak(text, play, label, {
          sessionId: ctx?.sessionId,
          cachedUrl: ctx?.tts_url,
          cachedVoiceId: ctx?.tts_voice_id,
        });
      footer.appendChild(play);
    }

    const targets = buildTargets(typeof ctx === "object" ? ctx : { text });
    const { up, down } = createThumbPair((rating) =>
      submit(targets, rating, deviceId)
    );
    footer.appendChild(up);
    footer.appendChild(down);
    msgEl.appendChild(footer);
  }

  function attachToSummaryCard(card, targets, deviceId) {
    if (!card || card.querySelector(".summary-card-feedback")) return;
    const row = document.createElement("div");
    row.className = "summary-card-feedback";
    const { up, down } = createThumbPair((rating) =>
      submit(targets, rating, deviceId)
    );
    row.appendChild(document.createTextNode("这条推荐"));
    row.appendChild(up);
    row.appendChild(down);
    card.appendChild(row);

    card.addEventListener("click", (e) => {
      if (e.target.closest(".summary-card-feedback")) e.stopPropagation();
    });
  }

  return {
    buildTargets,
    targetsForPoiMap,
    targetsForRoute,
    targetsForTrip,
    submit,
    attachToMessageFooter,
    attachToSummaryCard,
  };
})();
