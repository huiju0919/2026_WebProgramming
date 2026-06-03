// Firebase 초기화 및 공통 함수
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  increment,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase 앱 초기화
const app = initializeApp(CONFIG.FIREBASE);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ─────────────────────────────────────────
// 식당 데이터
// ─────────────────────────────────────────

// 전체 식당 목록 불러오기
export async function getRestaurants() {
  const snapshot = await getDocs(collection(db, "restaurants"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// 특정 식당 불러오기
export async function getRestaurant(id) {
  const docRef = doc(db, "restaurants", id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() };
  return null;
}

// ─────────────────────────────────────────
// 메뉴 데이터
// ─────────────────────────────────────────

// 특정 식당 메뉴 불러오기
export async function getMenusByRestaurant(restaurantId) {
  const q = query(collection(db, "menus"), where("restaurantId", "==", restaurantId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// 전체 메뉴 목록 불러오기
export async function getAllMenus() {
  const snapshot = await getDocs(collection(db, "menus"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// ─────────────────────────────────────────
// 사용자 데이터
// ─────────────────────────────────────────

// 사용자 문서 가져오기 (없으면 생성, 기존 문서는 누락 필드 자동 추가)
export async function getUserDoc(uid) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  // 기본 스키마 정의
  const defaultData = {
    menuLikes: [],                // 메뉴 좋아요 (메뉴 ID 배열)
    recentViews: [],
    regulars: [],
    swipeCount: 0,
    friends: [],                  // 수락된 친구 uid 목록
    friendRequestsReceived: [],   // 받은 친구 요청 (보낸 사람 uid)
    friendRequestsSent: [],       // 보낸 친구 요청 (받는 사람 uid)
    notifications: [],            // 영구 알림 기록 (최근 20개)
  };

  // 문서가 없으면 새로 생성
  if (!userSnap.exists()) {
    await setDoc(userRef, defaultData);
    return defaultData;
  }

  // 기존 문서가 있으면 누락된 필드 자동으로 추가
  const currentData = userSnap.data();
  const mergedData = {
    ...defaultData,   
    ...currentData,    
  };

  // 새로운 필드가 추가됐으면 Firestore에 저장
  if (JSON.stringify(mergedData) !== JSON.stringify(currentData)) {
    await updateDoc(userRef, mergedData);
  }

  return mergedData;
}

// 메뉴 좋아요 추가
export async function addMenuLike(uid, menuId) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { menuLikes: arrayUnion(menuId) });
}

// 메뉴 좋아요 제거
export async function removeMenuLike(uid, menuId) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { menuLikes: arrayRemove(menuId) });
}

// 최근 본 식당 추가 (최대 30개 유지)
export async function addRecentView(uid, restaurantId) {
  const userData = await getUserDoc(uid);
  let recent = userData.recentViews || [];
  recent = [restaurantId, ...recent.filter((id) => id !== restaurantId)].slice(0, 30);
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { recentViews: recent });
}

// 최근 본 식당 개별 삭제
export async function removeRecentView(uid, restaurantId) {
  const userData = await getUserDoc(uid);
  const recent = (userData.recentViews || []).filter((id) => id !== restaurantId);
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { recentViews: recent });
}

// 최근 본 식당 전체 삭제
export async function clearRecentViews(uid) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { recentViews: [] });
}

// 스와이프 횟수 증가
export async function incrementSwipeCount(uid) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { swipeCount: increment(1) });
}

// ─────────────────────────────────────────
// 단골 식당
// ─────────────────────────────────────────

// 단골 추가
export async function addRegular(uid, restaurantId) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { regulars: arrayUnion(restaurantId) });
  logActivity(uid, "regular", restaurantId);
}

// 단골 제거
export async function removeRegular(uid, restaurantId) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { regulars: arrayRemove(restaurantId) });
}

// ─────────────────────────────────────────
// 프로필 (닉네임 / 사진)
// ─────────────────────────────────────────

// 사용자 프로필 업데이트 (닉네임, 사진 base64)
export async function updateUserProfile(uid, { displayName, photoBase64 }) {
  const userRef = doc(db, "users", uid);
  const updates = {};
  if (displayName !== undefined) updates.displayName = displayName;
  if (photoBase64 !== undefined) updates.photoBase64 = photoBase64;
  await updateDoc(userRef, updates);
}

// ─────────────────────────────────────────
// 사용자 설정
// ─────────────────────────────────────────

// 사용자 설정 업데이트
export async function updateUserSettings(uid, settings) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    settings: {
      ...settings,
      updatedAt: new Date().toISOString(),
    },
  });
}

// 사용자 설정 불러오기
export async function getUserSettings(uid) {
  const userData = await getUserDoc(uid);
  return userData.settings || {
    emailNotification: false,
    theme: "light",
    fontSize: "md",
    accentColor: "orange",
    privateProfile: false,
    marketingEmail: false,
  };
}

// 취향 누적 데이터
export async function getTasteProfile(uid) {
  const ref  = doc(db, "tasteProfiles", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

// 취향 데이터 초기화
export async function resetTasteProfile(uid) {
  const ref = doc(db, "tasteProfiles", uid);
  await setDoc(ref, {
    tagScore:     {},
    sessionCount: 0,
    updatedAt:    new Date().toISOString(),
  });
}

// 세션 완료 후 호출 — 현재 세션 tagScore(raw)만 누적 저장
export async function saveTasteProfile(uid, { tagScore }) {
  const ref  = doc(db, "tasteProfiles", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      tagScore,
      sessionCount: 1,
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  const prev = snap.data();

  // raw 누적 합산
  const mergedTagScore = { ...(prev.tagScore || {}) };
  for (const [tag, score] of Object.entries(tagScore)) {
    mergedTagScore[tag] = (mergedTagScore[tag] || 0) + score;
  }

  await setDoc(ref, {
    tagScore:     mergedTagScore,
    sessionCount: (prev.sessionCount || 1) + 1,
    updatedAt:    new Date().toISOString(),
  });
}


// 차단 메뉴 ("다시 보지 않기")

export async function getBlockedMenus(uid) {
  const ref  = doc(db, "blockedMenus", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return [];
  return snap.data().menus || [];
}

// 메뉴 차단 추가
export async function blockMenu(uid, { menuId, menuName, restaurantName }) {
  const ref  = doc(db, "blockedMenus", uid);
  const snap = await getDoc(ref);

  const entry = { menuId, menuName, restaurantName };

  if (!snap.exists()) {
    await setDoc(ref, { menus: [entry] });
    return;
  }

  // 이미 있으면 중복 추가 안 함
  const existing = snap.data().menus || [];
  if (existing.some(m => m.menuId === menuId)) return;

  await updateDoc(ref, { menus: arrayUnion(entry) });
}

// 메뉴 차단 해제
export async function unblockMenu(uid, menuId) {
  const ref  = doc(db, "blockedMenus", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const menus = (snap.data().menus || []).filter(m => m.menuId !== menuId);
  await setDoc(ref, { menus });
}

// 차단 메뉴 전체 초기화
export async function clearBlockedMenus(uid) {
  const ref = doc(db, "blockedMenus", uid);
  await setDoc(ref, { menus: [] });
}

// ─────────────────────────────────────────
// 회원 탈퇴 — Firestore 데이터 전체 삭제
// ─────────────────────────────────────────
// 삭제 대상 컬렉션:
//   users/{uid}            — 좋아요, 최근 본 목록, 단골, 설정 등
//   tasteProfiles/{uid}    — 취향 누적 데이터
//   blockedMenus/{uid}     — 차단 메뉴 목록

export async function deleteUserData(uid) {
  await Promise.all([
    deleteDoc(doc(db, "users",         uid)),
    deleteDoc(doc(db, "tasteProfiles", uid)),
    deleteDoc(doc(db, "blockedMenus",  uid)),
  ]);
}

// Firebase Storage 이미지 URL 생성
export function getStorageUrl(photoId) {
  if (!photoId) return null;
  const id     = String(photoId).padStart(4, "0");
  const bucket = CONFIG.FIREBASE.storageBucket;
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/images%2F${id}.webp?alt=media`;
}

// 식당 대표 사진 결정
// 식당 사진은 수집하지 않고 메뉴 사진만 있으므로,
// 식당 자체 photo가 없으면 해당 식당의 첫 번째 메뉴 사진으로 폴백한다.
export function getRestaurantPhoto(restaurant, menus = []) {
  if (restaurant?.photo) return restaurant.photo;
  const rid = String(restaurant?.id ?? "");
  const own = menus
    .filter(m => String(m.restaurantId) === rid)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const withPhoto = own.find(m => m.photo);
  return withPhoto ? withPhoto.photo : null;
}

// ─────────────────────────────────────────
// 대표색(Accent) 적용
// ─────────────────────────────────────────
// 선택 가능한 대표색 id 목록 (CSS의 data-accent 값과 1:1 대응)
export const ACCENT_COLORS = ["orange", "red", "amber", "green", "blue", "purple", "pink"];

// hex(#RRGGBB)를 어둡게 — 커스텀 색의 primary-dark(눌림 상태) 계산용
function _darken(hex, ratio = 0.18) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 255) * (1 - ratio));
  const g = Math.round(((n >> 8) & 255) * (1 - ratio));
  const b = Math.round((n & 255) * (1 - ratio));
  return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
}

// 대표색을 화면(html)에 즉시 적용하고 localStorage에 캐시
// accent: "orange"~"pink" 프리셋 또는 "custom"
// customHex: accent가 "custom"일 때 적용할 #RRGGBB
export function applyAccent(accent, customHex) {
  const root = document.documentElement;
  const s = root.style;

  if (accent === "custom" && customHex) {
    root.setAttribute("data-accent", "custom");
    s.setProperty("--color-primary", customHex);
    s.setProperty("--color-primary-dark", _darken(customHex, 0.18));
    // 연한배경: 반투명 톤 → 라이트/다크 양쪽에 자연스럽게 깔림
    s.setProperty("--color-primary-light", `color-mix(in srgb, ${customHex} 16%, transparent)`);
    s.setProperty("--shadow-btn", `0 6px 18px ${customHex}52`);
    try {
      localStorage.setItem("ff_accent", "custom");
      localStorage.setItem("ff_accentCustom", customHex);
    } catch (e) {}
    return;
  }

  // 프리셋: inline 커스텀 변수 제거 후 data-accent만 지정 (CSS 팔레트가 적용)
  ["--color-primary", "--color-primary-light", "--color-primary-dark", "--shadow-btn"]
    .forEach(p => s.removeProperty(p));
  const a = ACCENT_COLORS.includes(accent) ? accent : "orange";
  root.setAttribute("data-accent", a);
  try {
    localStorage.setItem("ff_accent", a);
    localStorage.removeItem("ff_accentCustom");
  } catch (e) {}
}

// ─────────────────────────────────────────
// 친구 기능
// ─────────────────────────────────────────

// 로그인 시 호출: 이메일/이름을 문서에 저장(이메일로 친구 검색 가능하게)
// 단, 사용자가 직접 정한 닉네임(displayName)이 이미 있으면 덮어쓰지 않는다.
export async function saveUserIdentity(uid, email, displayName) {
  const userRef = doc(db, "users", uid);
  const updates = {};
  if (email) updates.email = String(email).toLowerCase();
  if (displayName) {
    try {
      const snap = await getDoc(userRef);
      const existing = snap.exists() ? snap.data().displayName : "";
      if (!existing) updates.displayName = displayName;  // 닉네임 없을 때만 구글 이름으로 채움
    } catch (e) {
      updates.displayName = displayName;
    }
  }
  if (Object.keys(updates).length) {
    try { await updateDoc(userRef, updates); } catch (e) { /* 문서 없으면 getUserDoc이 먼저 생성 */ }
  }
}

// 이메일로 사용자 찾기 → { uid, ...data } | null
export async function findUserByEmail(email) {
  const q = query(collection(db, "users"), where("email", "==", String(email).toLowerCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { uid: d.id, ...d.data() };
}

// 친구 요청 보내기 (이메일 기준)
export async function sendFriendRequest(myUid, targetEmail) {
  const me = await getUserDoc(myUid);
  const target = await findUserByEmail(targetEmail);
  if (!target) throw new Error("해당 이메일의 사용자를 찾을 수 없어요");
  if (target.uid === myUid) throw new Error("자기 자신에게는 보낼 수 없어요");
  if (target.settings?.privateProfile) throw new Error("비공개 프로필이라 친구 요청을 보낼 수 없어요");
  if ((me.friends || []).includes(target.uid)) throw new Error("이미 친구예요");
  if ((me.friendRequestsSent || []).includes(target.uid)) throw new Error("이미 요청을 보냈어요");
  if ((me.friendRequestsReceived || []).includes(target.uid)) throw new Error("상대가 이미 나에게 요청을 보냈어요. 받은 요청에서 수락하세요");

  await updateDoc(doc(db, "users", target.uid), { friendRequestsReceived: arrayUnion(myUid) });
  await updateDoc(doc(db, "users", myUid),       { friendRequestsSent:     arrayUnion(target.uid) });
  return target;
}

// 영구 알림 1건 추가 (최근 20개만 보관)
export async function pushNotification(uid, notif) {
  const ref = doc(db, "users", uid);
  try {
    const snap = await getDoc(ref);
    const cur = (snap.exists() && snap.data().notifications) || [];
    const entry = { id: `${Date.now()}_${Math.random().toString(36).slice(2,7)}`, ts: Date.now(), ...notif };
    const next = [...cur, entry].slice(-20);
    await updateDoc(ref, { notifications: next });
  } catch (e) {}
}

// 받은 요청 수락 → 양쪽에 영구 알림 기록
export async function acceptFriendRequest(myUid, requesterUid) {
  const [me, requester] = await Promise.all([getUserDoc(myUid), getUserDoc(requesterUid)]);
  const myName  = me.displayName || "친구";
  const reqName = requester.displayName || "친구";
  await updateDoc(doc(db, "users", myUid), {
    friends: arrayUnion(requesterUid),
    friendRequestsReceived: arrayRemove(requesterUid),
  });
  await updateDoc(doc(db, "users", requesterUid), {
    friends: arrayUnion(myUid),
    friendRequestsSent: arrayRemove(myUid),
  });
  await pushNotification(myUid,        { type: "friend", text: `${reqName}님과 친구가 되었어요` });
  await pushNotification(requesterUid, { type: "friend", text: `${myName}님과 친구가 되었어요` });
}

// (구버전 호환용 — 더 이상 사용 안 함)
export async function clearFriendAccepted(uid, acceptedUids) {
  if (!acceptedUids || !acceptedUids.length) return;
  try { await updateDoc(doc(db, "users", uid), { friendAcceptedBy: arrayRemove(...acceptedUids) }); } catch (e) {}
}

// 받은 요청 거절
export async function rejectFriendRequest(myUid, requesterUid) {
  await updateDoc(doc(db, "users", myUid),        { friendRequestsReceived: arrayRemove(requesterUid) });
  await updateDoc(doc(db, "users", requesterUid), { friendRequestsSent:     arrayRemove(myUid) });
}

// 보낸 요청 취소
export async function cancelFriendRequest(myUid, targetUid) {
  await updateDoc(doc(db, "users", myUid),     { friendRequestsSent:     arrayRemove(targetUid) });
  await updateDoc(doc(db, "users", targetUid), { friendRequestsReceived: arrayRemove(myUid) });
}

// 친구 삭제
export async function removeFriend(myUid, friendUid) {
  await updateDoc(doc(db, "users", myUid),     { friends: arrayRemove(friendUid) });
  await updateDoc(doc(db, "users", friendUid), { friends: arrayRemove(myUid) });
}

// 여러 uid의 사용자 정보 한 번에 가져오기 → [{ uid, displayName, email, photoBase64, likes }]
export async function getUsersByIds(uids) {
  if (!uids || !uids.length) return [];
  const results = await Promise.all(uids.map(async (uid) => {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (!snap.exists()) return null;
      const d = snap.data();
      return {
        uid,
        displayName: d.displayName || "",
        email: d.email || "",
        photoBase64: d.photoBase64 || "",
        menuLikes: d.menuLikes || [],
        regulars: d.regulars || [],
        shareLikes:    d.settings?.shareLikes    !== false,
        shareRegulars: d.settings?.shareRegulars !== false,
        shareReviews:  d.settings?.shareReviews  !== false,
      };
    } catch (e) { return null; }
  }));
  return results.filter(Boolean);
}

// ─────────────────────────────────────────
// 리뷰 (별점 + 한 줄 평)
// ─────────────────────────────────────────
// visibility: "public"(전체공개) | "friends"(친구만) | "private"(나만)
// 한 사람당 식당 1개 리뷰 (문서 id = restaurantId_uid → 수정 시 덮어씀)

export async function setReview(uid, displayName, photoBase64, restaurantId, { rating, text, visibility }) {
  const id = `${restaurantId}_${uid}`;
  const r = Math.max(1, Math.min(5, Number(rating) || 0));
  await setDoc(doc(db, "reviews", id), {
    restaurantId,
    uid,
    displayName: displayName || "",
    photoBase64: photoBase64 || "",
    rating: r,
    text: (text || "").slice(0, 100),
    visibility: visibility || "friends",
    ts: Date.now(),
  });
  logActivity(uid, "review", restaurantId, { rating: r, text: (text||"").slice(0,100), visibility: visibility || "friends" });
}

export async function deleteReview(uid, restaurantId) {
  await deleteDoc(doc(db, "reviews", `${restaurantId}_${uid}`));
}

export async function getMyReview(uid, restaurantId) {
  const snap = await getDoc(doc(db, "reviews", `${restaurantId}_${uid}`));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// 식당의 리뷰 목록 (공개 범위 필터링) → 최신순
export async function getRestaurantReviews(restaurantId, viewerUid, friendUids = []) {
  const q = query(collection(db, "reviews"), where("restaurantId", "==", restaurantId));
  const snap = await getDocs(q);
  const friends = new Set(friendUids);
  const list = [];
  snap.forEach(d => {
    const r = { id: d.id, ...d.data() };
    const vis = r.visibility || "friends";
    if (r.uid === viewerUid) list.push(r);                                  // 내 리뷰는 항상
    else if (vis === "private") { /* 나만 → 남에게 안 보임 */ }
    else if (friends.has(r.uid)) list.push(r);                              // 친구만(+레거시 public)은 친구일 때
  });
  list.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  return list;
}

// ── 활동 로그 (친구 활동 피드용) ──
async function logActivity(uid, type, restaurantId, extra = {}) {
  try {
    await addDoc(collection(db, "activities"), { uid, type, restaurantId, ts: Date.now(), ...extra });
  } catch (e) {}
}

// 친구들의 활동 피드 (좋아요·단골·리뷰) → 최신순
// friendUids: 목록 공개(shareLists)한 친구만 넘겨주세요
export async function getFriendsFeed(friendUids = [], limitN = 30) {
  if (!friendUids.length) return [];
  // Firestore in 쿼리는 10개 제한 → 10개씩 나눠 조회
  const chunks = [];
  for (let i = 0; i < friendUids.length; i += 10) chunks.push(friendUids.slice(i, i + 10));
  const all = [];
  for (const c of chunks) {
    try {
      const snap = await getDocs(query(collection(db, "activities"), where("uid", "in", c)));
      snap.forEach(d => all.push({ id: d.id, ...d.data() }));
    } catch (e) {}
  }
  // 비공개 리뷰는 제외
  const visible = all.filter(a => !(a.type === "review" && a.visibility === "private"));
  visible.sort((x, y) => (y.ts || 0) - (x.ts || 0));
  return visible.slice(0, limitN);
}

// 내가 남긴 리뷰 목록 → 최신순
export async function getMyReviews(uid) {
  const snap = await getDocs(query(collection(db, "reviews"), where("uid", "==", uid)));
  const list = [];
  snap.forEach(d => list.push({ id: d.id, ...d.data() }));
  list.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  return list;
}

// 테마/폰트 즉시 적용 + localStorage 캐시(다음 로드 깜빡임 방지)
function _applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t || "light");
  try { localStorage.setItem("ff_theme", t || "light"); } catch (e) {}
}
function _applyFontSize(f) {
  document.documentElement.setAttribute("data-font-size", f || "md");
  try { localStorage.setItem("ff_fontSize", f || "md"); } catch (e) {}
}

// 상단 네비 아바타(#navAvatar)에 프로필 사진 표시
// 우선순위: 커스텀 사진(photoBase64) → 구글 사진(photoURL) → 이름 이니셜
export function updateNavAvatar(user, userData) {
  // 대표색 동기화: 모든 페이지가 로그인 후 이 함수를 호출하므로 여기서 일괄 적용
  // - 로그아웃: 기본색(orange)으로
  // - 로그인 + 설정 있음: 그 계정에 저장된 색으로 (없으면 orange)
  // - userData 없이 호출될 땐 기존 캐시 유지 (건드리지 않음)
  // 외형(대표색·테마·폰트) 계정별 동기화
  // - 로그아웃/게스트: 기본값 + 캐시 정리
  // - 로그인: 캐시(localStorage)가 비어 있을 때만 계정 설정으로 시드
  //   (세션 중 토글한 값은 유지 / 로그아웃 시 캐시를 비우므로 계정 전환 누수는 없음)
  const _ls = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  try {
    if (!user) {
      applyAccent("orange");
      _applyTheme("light");
      _applyFontSize("md");
      try { ["ff_theme","ff_fontSize","ff_accent","ff_accentCustom","ff_accentCustomList"].forEach(k=>localStorage.removeItem(k)); } catch (e) {}
    } else if (userData) {
      const st = userData.settings || {};
      // 테마
      _applyTheme(_ls("ff_theme") != null ? _ls("ff_theme") : (st.theme || "light"));
      // 폰트
      _applyFontSize(_ls("ff_fontSize") != null ? _ls("ff_fontSize") : (st.fontSize || "md"));
      // 대표색
      if (_ls("ff_accent") == null) {
        applyAccent(st.accentColor || "orange", st.accentCustom);
      } else if (_ls("ff_accent") === "custom") {
        applyAccent("custom", _ls("ff_accentCustom") || st.accentCustom);
      } else {
        applyAccent(_ls("ff_accent"));
      }
      // 커스텀 색 목록: 캐시 없을 때만 계정 값으로 시드
      try {
        if (_ls("ff_accentCustomList") == null && Array.isArray(st.accentCustomList)) {
          localStorage.setItem("ff_accentCustomList", JSON.stringify(st.accentCustomList));
        }
      } catch (e) {}
    }
  } catch (e) {}

  const el = document.getElementById("navAvatar");
  // 비로그인: 캐시 제거 후 "나"
  if (!user) {
    try { localStorage.removeItem("ff_navAvatar"); } catch (e) {}
    if (el) el.textContent = "나";
    return;
  }
  const initial = (String((userData && userData.displayName) || user.displayName || user.email || "나").trim().charAt(0) || "나").toUpperCase();
  const photo = (userData && userData.photoBase64) || user.photoURL || "";
  // 다음 페이지 로드 때 즉시 적용할 수 있도록 캐시 저장
  try { localStorage.setItem("ff_navAvatar", photo ? photo : "text:" + initial); } catch (e) {}
  if (!el) return;
  if (photo) {
    el.textContent = "";
    const img = document.createElement("img");
    img.src = photo;
    img.alt = "프로필";
    img.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:50%;display:block";
    img.onerror = () => { el.textContent = initial; };
    el.appendChild(img);
  } else {
    el.textContent = initial;
  }
}

// 현재 시각을 서울(KST) 기준으로 반환 — 디바이스 타임존과 무관하게 영업상태 계산
export function seoulNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
}

// 영업 상태 반환: "open" | "closed" | "break" | "dayoff"
// - "dayoff" : 오늘이 정기휴무일
// - "closed"  : 영업시간 외 (오늘은 영업하나 현재 시각이 영업시간 밖)
export function getOpenStatus(restaurant) {
  if (!restaurant.hours) return "open";
  try {
    const now    = seoulNow();
    const today  = ["일","월","화","수","목","금","토"][now.getDay()];
    const nowMin = now.getHours() * 60 + now.getMinutes();

    if (restaurant.closed_day && restaurant.closed_day !== "없음") {
      if (restaurant.closed_day.includes(today)) return "dayoff";
    }

    const sep = restaurant.hours.includes("~") ? "~" : "-";
    const [startStr, endStr] = restaurant.hours.split(sep);
    const [sh, sm_] = startStr.trim().split(":").map(Number);
    const [eh, em]  = endStr.trim().split(":").map(Number);
    const startMin  = sh * 60 + sm_;
    const endMin    = eh * 60 + em;

    const withinHours = endMin > startMin
      ? nowMin >= startMin && nowMin < endMin
      : nowMin >= startMin || nowMin < endMin;

    if (!withinHours) return "closed";

    if (restaurant.break_time && restaurant.break_time !== "없음") {
      const [bStartStr, bEndStr] = restaurant.break_time.split(sep);
      if (bStartStr && bEndStr) {
        const [bsh, bsm] = bStartStr.trim().split(":").map(Number);
        const [beh, bem] = bEndStr.trim().split(":").map(Number);
        const bStart = bsh * 60 + bsm;
        const bEnd   = beh * 60 + bem;
        if (nowMin >= bStart && nowMin < bEnd) return "break";
      }
    }
    return "open";
  } catch { return "open"; }
}

// 거리 계산
export function calcDistanceM(lat1, lng1, lat2, lng2) {
  const R   = 6371000;
  const toR = d => d * Math.PI / 180;
  const a   = Math.sin(toR(lat2 - lat1) / 2) ** 2
            + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(toR(lng2 - lng1) / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 거리 포맷 문자열 반환: "350m" | "1.2km" (표시용)
export function formatDistance(lat1, lng1, lat2, lng2) {
  const m = calcDistanceM(lat1, lng1, lat2, lng2);
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
}

// ─────────────────────────────────────────
// 식당 데이터 캐시 로드 (localStorage, TTL 1시간)
// withMenus: true  → { restaurants, menus }  (swipe/result용)
// withMenus: false → { restaurants }          (index용)
// ─────────────────────────────────────────
const RESTAURANT_CACHE_KEY    = "restaurantCache";
const RESTAURANT_CACHE_TTL_MS = 60 * 60 * 1000;

export async function loadRestaurantData(withMenus = true) {
  try {
    const raw = localStorage.getItem(RESTAURANT_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      const fresh  = Date.now() - cached.ts < RESTAURANT_CACHE_TTL_MS;
      if (fresh) {
        if (!withMenus) return { restaurants: cached.restaurants };
        if (Array.isArray(cached.menus)) return { restaurants: cached.restaurants, menus: cached.menus };
      }
    }
  } catch (e) { /* 캐시 파싱 실패 시 무시 */ }

  if (withMenus) {
    const [restaurants, menus] = await Promise.all([getRestaurants(), getAllMenus()]);
    try {
      localStorage.setItem(RESTAURANT_CACHE_KEY, JSON.stringify({ ts: Date.now(), restaurants, menus }));
    } catch (e) { /* 용량 초과 무시 */ }
    return { restaurants, menus };
  } else {
    const restaurants = await getRestaurants();
    try {
      // menus가 이미 캐시에 있으면 유지, 없으면 restaurants만 저장
      const raw    = localStorage.getItem(RESTAURANT_CACHE_KEY);
      const cached = raw ? JSON.parse(raw) : {};
      localStorage.setItem(RESTAURANT_CACHE_KEY, JSON.stringify({
        ts: Date.now(), restaurants, menus: cached.menus || undefined,
      }));
    } catch (e) { /* 용량 초과 무시 */ }
    return { restaurants };
  }
}