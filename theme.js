// theme.js — 모든 페이지 <head> 최상단에 포함
// localStorage에서 테마/폰트 설정을 읽어 즉시 적용 (FOUC 방지)
(function () {
  const stored   = localStorage.getItem("ff_theme") || "light";
  const fontSize = localStorage.getItem("ff_fontSize") || "md";
  const accent   = localStorage.getItem("ff_accent") || "orange";  // 대표색

  // "auto"이면 시스템 다크모드 설정에 따라 결정
  const theme = stored === "auto"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : stored;

  document.documentElement.setAttribute("data-theme",     theme);
  document.documentElement.setAttribute("data-font-size", fontSize);
  document.documentElement.setAttribute("data-accent",    accent);

  // 커스텀 색이면 inline 변수로 즉시 적용 (깜빡임 방지)
  if (accent === "custom") {
    const hex = localStorage.getItem("ff_accentCustom");
    if (hex) {
      const s = document.documentElement.style;
      s.setProperty("--color-primary", hex);
      s.setProperty("--color-primary-dark", hex);  // 정확한 어둠은 로그인 후 firebase.js가 보정
      s.setProperty("--color-primary-light", "color-mix(in srgb, " + hex + " 16%, transparent)");
      s.setProperty("--shadow-btn", "0 6px 18px " + hex + "52");
    }
  }
})();