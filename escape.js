// 공통 HTML 이스케이프 유틸 — innerHTML/속성에 사용자 입력을 넣기 전 반드시 거치게 한다.
// XSS 방지: 닉네임·리뷰·이메일 등 사용자 생성 콘텐츠는 다른 사용자에게도 노출되므로 필수.

// 텍스트/속성값 공용. 큰따옴표·작은따옴표까지 처리해 attribute 컨텍스트에서도 안전.
export function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// data:image 형식의 안전한 이미지 URL만 통과시킨다(프로필 사진 base64 등).
// 그 외(javascript:, 일반 텍스트 주입 등)는 빈 문자열로 차단.
export function safeImageSrc(src) {
  const s = String(src ?? "");
  return /^data:image\/(png|jpe?g|gif|webp|bmp);base64,/i.test(s) ? s : "";
}
