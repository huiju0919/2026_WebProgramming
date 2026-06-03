// 공통 알림 벨 — 모든 페이지 상단 네비에 자동 삽입
// 알림 종류: (1) 받은 친구 요청  (2) AI 오늘의 추천(하루 1회 생성, 캐시)
import {
  auth, getUserDoc, getUsersByIds, getTasteProfile,
  acceptFriendRequest, rejectFriendRequest, clearFriendAccepted,
  loadRestaurantData, getUserSettings, updateUserSettings, pushNotification,
} from "./firebase.js";
import { onAuthChanged } from "./auth.js";

const BELL_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;

let _uid = null;
let _restaurants = [];
let _open = false;
let _pendingAcceptedClear = [];   // (구버전 호환, 미사용)

// 토스트 팝업 상태
let _lastToastTs = 0;             // 이 시각 이후 ts만 토스트로 띄움
let _seenReqUids = new Set();     // 이미 본 친구 요청 uid
let _firstRender = true;          // 첫 로드엔 토스트 안 띄움(기존 알림 폭탄 방지)
let _toastQueue = [];
let _toastShowing = false;

function _esc(s){ return String(s||"").replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function _today(){ const d = new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }

// 테마/폰트 FAB가 계정(Firebase)에도 저장하도록 노출 (로그인 상태에서만)
window.__persistAppearance = async function(patch){
  if (!_uid) return;
  try {
    const s = await getUserSettings(_uid);
    await updateUserSettings(_uid, { ...s, ...patch });
  } catch (e) {}
};

// ── 벨 + 드롭다운 DOM 주입 ──
function injectBell() {
  const navRight = document.querySelector(".nav-right");
  if (!navRight || document.getElementById("notifBell")) return;

  const wrap = document.createElement("div");
  wrap.className = "notif-wrap";
  wrap.innerHTML = `
    <button class="notif-bell" id="notifBell" aria-label="알림">
      ${BELL_SVG}
      <span class="notif-badge" id="notifBadge" style="display:none">0</span>
    </button>
    <div class="notif-panel" id="notifPanel">
      <div class="notif-head">알림</div>
      <div class="notif-body" id="notifBody"><div class="notif-empty">불러오는 중…</div></div>
    </div>`;
  // 아바타 왼쪽에 삽입
  const avatar = navRight.querySelector("#navAvatar");
  if (avatar) navRight.insertBefore(wrap, avatar);
  else navRight.appendChild(wrap);

  document.getElementById("notifBell").addEventListener("click", (e) => {
    e.stopPropagation();
    requestNotifPermission();   // 사용자 클릭 시 알림 권한 요청
    togglePanel();
  });
  document.addEventListener("click", (e) => {
    if (_open && !wrap.contains(e.target)) closePanel();
  });
}

function togglePanel(){ _open ? closePanel() : openPanel(); }
function openPanel(){
  _open = true;
  document.getElementById("notifPanel").classList.add("open");
  // 모든 알림 '봤음' 처리 (배지 0으로) — 알림 항목 자체는 계속 보관됨
  try { localStorage.setItem(`ff_notif_seen_${_uid}`, String(Date.now())); } catch(e){}
  refreshBadge();
}
function closePanel(){
  _open = false;
  const p = document.getElementById("notifPanel");
  if (p) p.classList.remove("open");
}

// ── 데이터 로드 ──
async function loadFriendRequests() {
  const u = await getUserDoc(_uid);
  const ids = u.friendRequestsReceived || [];
  if (!ids.length) return [];
  return await getUsersByIds(ids);
}

// AI 추천: 일정 주기마다 새로 만들어 알림 목록에 추가(쌓임)
const AI_TTL = 24 * 60 * 60 * 1000;   // 24시간 (하루 1회)
async function ensureAiRec(displayName) {
  const tsKey = `ff_notif_aits_${_uid}`;
  try {
    const last = +localStorage.getItem(tsKey) || 0;
    if (Date.now() - last < AI_TTL) return;   // 아직 주기 안 됨
  } catch(e){}

  // 추천 후보: 취향 상위 태그와 맞고, 아직 좋아요 안 한 식당
  const u = await getUserDoc(_uid);
  const liked = new Set(u.likes || []);
  const taste = await getTasteProfile(_uid).catch(()=>null);
  const topTags = taste?.tagScore
    ? Object.entries(taste.tagScore).sort((a,b)=>b[1]-a[1]).map(([t])=>t)
    : [];

  const candidates = _restaurants.filter(r => !liked.has(r.id));
  if (!candidates.length) return;

  let pick = null;
  for (const tag of topTags) {
    const m = candidates.filter(r => (r.tags||"").includes(tag) || r.category === tag);
    if (m.length) { pick = m[Math.floor(Math.random()*m.length)]; break; }
  }
  if (!pick) pick = candidates[Math.floor(Math.random()*candidates.length)];

  let text = await groqLine(displayName, pick, topTags).catch(()=>null);
  if (!text) {
    const tagPart = topTags[0] ? `${topTags[0]} 좋아하시죠? ` : "";
    text = `${displayName}님, ${tagPart}'${pick.name}' 어때요?`;
  }

  // 주기 기록 먼저(중복 생성 방지) 후 알림 추가
  try { localStorage.setItem(tsKey, String(Date.now())); } catch(e){}
  await pushNotification(_uid, { type: "ai", text, restaurantId: pick.id, restaurantName: pick.name });
}

async function groqLine(displayName, restaurant, topTags) {
  if (!window.CONFIG || !CONFIG.GROQ_API_KEY) return null;
  const prompt = `너는 음식 추천 앱의 친근한 도우미야. 아래 정보로 사용자에게 보낼 알림 문구 1개를 만들어.
- 사용자 이름: ${displayName}
- 취향 키워드: ${topTags.slice(0,3).join(", ") || "없음"}
- 추천 식당: ${restaurant.name} (${restaurant.category||""})
규칙: 한국어 한 문장, 40자 이내, 식당 이름 '${restaurant.name}'을 반드시 포함, 가볍고 친근하게. JSON만 출력: {"text":"문구"}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${CONFIG.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "Respond with valid JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 120,
    }),
  });
  const data = await res.json();
  if (data.error) return null;
  const raw = data.choices?.[0]?.message?.content || "";
  const obj = JSON.parse(raw.replace(/```json|```/g, "").trim());
  return (obj.text || "").trim() || null;
}

// ── 시스템(브라우저) 알림 ── 다른 탭/창을 보고 있어도 OS 구석에 뜸
function requestNotifPermission() {
  try {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(()=>{});
    }
  } catch(e){}
}

function fireSystemNotification(title, body, href) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    // 보고 있는 탭이면 페이지 토스트로 충분하니 시스템 알림은 생략
    if (document.visibilityState === "visible" && document.hasFocus()) return;
    const n = new Notification(title, { body, tag: "foodfirst", renotify: true });
    n.onclick = () => { window.focus(); if (href) location.href = href; n.close(); };
  } catch(e){}
}

// ── 토스트 팝업 ──
function _ensureToastHost() {
  let host = document.getElementById("notifToastHost");
  if (!host) {
    host = document.createElement("div");
    host.id = "notifToastHost";
    host.className = "notif-toast-host";
    document.body.appendChild(host);
  }
  return host;
}

function enqueueToast(icon, text, href) {
  _toastQueue.push({ icon, text, href });
  if (!_toastShowing) _showNextToast();
}

function _showNextToast() {
  if (!_toastQueue.length) { _toastShowing = false; return; }
  _toastShowing = true;
  const { icon, text, href } = _toastQueue.shift();
  const host = _ensureToastHost();
  const el = document.createElement("div");
  el.className = "notif-toast";
  el.innerHTML = `<span class="notif-toast-ic">${icon}</span><span class="notif-toast-text">${_esc(text)}</span>`;
  el.onclick = () => {
    if (href) location.href = href;
    else openPanel();
  };
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => { el.remove(); _showNextToast(); }, 250);
  }, 3500);
}

// 새로 생긴 알림을 토스트로 띄움
function maybeToast(reqs, notifs) {
  const events = [];
  notifs.forEach(n => {
    if ((n.ts || 0) > _lastToastTs) {
      const isAi = n.type === "ai";
      events.push({
        ts: n.ts,
        icon: isAi ? "✨" : "🔔",
        text: n.text,
        href: isAi && n.restaurantId ? `./index.html?restaurant=${encodeURIComponent(n.restaurantId)}` : null,
      });
    }
  });
  // 새 친구 요청 (ts 없음 → uid로 추적)
  reqs.forEach(r => {
    if (!_seenReqUids.has(r.uid)) {
      events.push({ ts: Date.now(), icon: "👋", text: `${r.displayName || "누군가"}님이 친구 요청을 보냈어요` });
    }
  });
  _seenReqUids = new Set(reqs.map(r => r.uid));

  // 기준 시각 갱신 (실제 알림 ts만)
  _lastToastTs = Math.max(_lastToastTs, ...notifs.map(n => n.ts || 0), 0);

  if (_firstRender) { _firstRender = false; return; }   // 첫 로드엔 안 띄움
  events.sort((a, b) => a.ts - b.ts).forEach(e => {
    enqueueToast(e.icon, e.text, e.href);                          // 보고 있을 때: 페이지 토스트
    fireSystemNotification("FOOD FIRST", e.text, e.href);          // 딴짓 중일 때: OS 알림
  });
}



// ── 렌더 ──
let _lastRec = null;
let _lastNotifs = [];

function _seenTs(){ try { return +localStorage.getItem(`ff_notif_seen_${_uid}`) || 0; } catch(e){ return 0; } }

async function render(displayName) {
  const body = document.getElementById("notifBody");
  if (!body) return;

  await ensureAiRec(displayName);   // 새 AI 추천이면 notifications에 먼저 추가(쌓임)

  const u = await getUserDoc(_uid);
  const reqIds = u.friendRequestsReceived || [];
  const notifs = [...(u.notifications || [])].sort((a,b)=>(b.ts||0)-(a.ts||0));  // 최신순
  _lastNotifs = notifs;

  const reqs = reqIds.length ? await getUsersByIds(reqIds) : [];

  let html = "";

  // 1) 받은 친구 요청 (수락/거절)
  if (reqs.length) {
    html += reqs.map(u2 => `
      <div class="notif-item" id="notif-fr-${u2.uid}" data-name="${_esc(u2.displayName||"이름 없음")}">
        <div class="notif-ic notif-ic-fr">${_esc((u2.displayName||u2.email||"?").charAt(0).toUpperCase())}</div>
        <div class="notif-text"><b>${_esc(u2.displayName||"이름 없음")}</b>님이 친구 요청을 보냈어요</div>
        <div class="notif-acts">
          <button class="notif-btn accept" onclick="event.stopPropagation();__notifAccept('${u2.uid}')">수락</button>
          <button class="notif-btn reject" onclick="event.stopPropagation();__notifReject('${u2.uid}')">거절</button>
        </div>
      </div>`).join("");
  }

  // 2) 알림 기록 (AI 추천 + 친구 됨 등) — 최신순, 쌓임
  if (notifs.length) {
    html += notifs.map(n => {
      const isAi = n.type === "ai";
      const icon = isAi ? "✨" : (n.text||"?").charAt(0);
      const click = isAi && n.restaurantId
        ? `onclick="location.href='./index.html?restaurant=${encodeURIComponent(n.restaurantId)}'" style="cursor:pointer"`
        : "";
      return `
      <div class="notif-item notif-done" ${click}>
        <div class="notif-ic ${isAi ? "notif-ic-ai" : "notif-ic-fr"}" style="${isAi?"":"opacity:.7"}">${_esc(icon)}</div>
        <div class="notif-text">${_esc(n.text)}</div>
      </div>`;
    }).join("");
  }

  if (!html) html = `<div class="notif-empty">새 알림이 없어요</div>`;
  body.innerHTML = html;
  maybeToast(reqs, notifs);
  refreshBadge();
}

// 배지: 받은 요청 + 안 본 알림(ts>seen)
function refreshBadge() {
  const badge = document.getElementById("notifBadge");
  if (!badge) return;
  const seen = _seenTs();
  const reqCount = document.querySelectorAll("#notifBody .notif-acts").length;
  const unreadNotifs = _lastNotifs.filter(n => (n.ts||0) > seen).length;
  const n = reqCount + unreadNotifs;
  if (n > 0) { badge.style.display = ""; badge.textContent = n > 9 ? "9+" : String(n); }
  else badge.style.display = "none";
}
const recountBadge = refreshBadge;

// 친구 요청 처리 (벨에서 바로) — 처리 후 다시 그려서 영구 알림 반영
window.__notifAccept = async function(uid){
  try {
    await acceptFriendRequest(_uid, uid);
    await render(_displayName);
    window.refreshFriendsUI?.();   // 마이페이지면 친구 카드도 갱신
  } catch(e){}
};
window.__notifReject = async function(uid){
  try {
    await rejectFriendRequest(_uid, uid);
    await render(_displayName);
    window.refreshFriendsUI?.();
  } catch(e){}
};

let _displayName = "회원";

onAuthChanged(async (user) => {
  injectBell();
  const bell = document.getElementById("notifBell");
  const wrap = bell?.closest(".notif-wrap");
  if (!user) { if (wrap) wrap.style.display = "none"; _uid = null; return; }
  if (wrap) wrap.style.display = "";
  _uid = user.uid;

  // 식당 데이터 (AI 추천용)
  try {
    const { restaurants } = await loadRestaurantData(true);
    _restaurants = restaurants;
  } catch(e){ _restaurants = []; }

  const u = await getUserDoc(_uid).catch(()=>({}));
  _displayName = u.displayName || user.displayName || "회원";

  // 토스트 알림 비허용이면 벨 숨김
  if (u.settings && u.settings.toastNotification === false) {
    if (wrap) wrap.style.display = "none";
    return;
  }

  render(_displayName);
  requestNotifPermission();   // 알림 권한 요청 (허용하면 딴짓 중에도 OS 알림)

  // 5분마다 새 AI 추천 갱신 (중복 타이머 방지)
  if (!window.__notifTimer) {
    window.__notifTimer = setInterval(() => {
      if (_uid) render(_displayName);
    }, AI_TTL);
  }
});