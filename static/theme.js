/** 主题：浅色 / 深色 / 跟随系统 */
const Theme = (() => {
  const STORAGE_KEY = "theme";
  const MODES = ["light", "dark", "system"];
  const LABELS = { light: "浅色", dark: "深色", system: "跟随系统" };
  const ICONS = { light: "sun", dark: "moon", system: "monitor" };

  let mediaQuery = null;

  function getPreference() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return MODES.includes(saved) ? saved : "system";
  }

  function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function getEffectiveTheme(pref = getPreference()) {
    return pref === "system" ? getSystemTheme() : pref;
  }

  function updateMeta(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === "dark" ? "#070b12" : "#f4f7fb";
  }

  function apply(theme = getEffectiveTheme()) {
    document.documentElement.setAttribute("data-theme", theme);
    updateMeta(theme);
  }

  function setPreference(mode) {
    if (!MODES.includes(mode)) return;
    localStorage.setItem(STORAGE_KEY, mode);
    apply(getEffectiveTheme(mode));
    syncControls();
  }

  function syncControls() {
    const pref = getPreference();
    document.querySelectorAll("[data-theme-mode]").forEach((btn) => {
      const active = btn.dataset.themeMode === pref;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-checked", active ? "true" : "false");
    });
  }

  function mountSwitcher(container) {
    if (!container || container.dataset.mounted === "1") return;
    container.dataset.mounted = "1";
    container.classList.add("theme-switcher");
    container.setAttribute("role", "radiogroup");
    container.setAttribute("aria-label", "主题模式");

    MODES.forEach((mode) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "theme-switcher-btn";
      btn.dataset.themeMode = mode;
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-label", LABELS[mode]);
      btn.title = LABELS[mode];

      const iconSpan = document.createElement("span");
      iconSpan.className = "icon theme-switcher-icon";
      if (typeof setIcon === "function") setIcon(iconSpan, ICONS[mode]);
      btn.appendChild(iconSpan);

      const label = document.createElement("span");
      label.className = "theme-switcher-label";
      label.textContent = LABELS[mode];
      btn.appendChild(label);

      btn.addEventListener("click", () => setPreference(mode));
      container.appendChild(btn);
    });

    syncControls();
  }

  function init() {
    apply();
    mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (getPreference() === "system") apply(getSystemTheme());
    };
    if (mediaQuery.addEventListener) mediaQuery.addEventListener("change", onSystemChange);
    else mediaQuery.addListener(onSystemChange);

    mountSwitcher(document.getElementById("themeSwitcher"));
    mountSwitcher(document.getElementById("themeSwitcherMenu"));
  }

  return {
    init,
    getPreference,
    getEffectiveTheme,
    setPreference,
    mountSwitcher,
    syncControls,
  };
})();

Theme.init();
