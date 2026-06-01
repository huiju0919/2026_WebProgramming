// 상단 네비 아바타: 이전에 본 프로필 사진(localStorage 캐시)을 즉시 적용해
// 로그인 확인 전 "나"가 잠깐 보이는 깜빡임을 방지한다.
// 실제 사진/이니셜은 로그인 확인 후 firebase.js의 updateNavAvatar에서 다시 확정한다.
(function () {
  var el = document.getElementById("navAvatar");
  if (!el) return;
  var c;
  try { c = localStorage.getItem("ff_navAvatar"); } catch (e) { return; }
  if (!c) return;
  if (c.slice(0, 5) === "text:") { el.textContent = c.slice(5); return; }
  el.textContent = "";
  var img = document.createElement("img");
  img.src = c;
  img.alt = "프로필";
  img.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:50%;display:block";
  img.onerror = function () { el.textContent = "나"; };
  el.appendChild(img);
})();
