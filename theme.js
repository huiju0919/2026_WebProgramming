// theme.js — 모든 페이지 <head> 최상단에 포함
// localStorage에서 테마/폰트 설정을 읽어 즉시 적용 (FOUC 방지)
(function () {
  const stored   = localStorage.getItem("ff_theme") || "light";
  const fontSize = localStorage.getItem("ff_fontSize") || "md";

  // "auto"이면 시스템 다크모드 설정에 따라 결정
  const theme = stored === "auto"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : stored;

  document.documentElement.setAttribute("data-theme",     theme);
  document.documentElement.setAttribute("data-font-size", fontSize);
})();