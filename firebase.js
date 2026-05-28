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
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  increment,
  query,
  where,
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
    likes: [],
    recentViews: [],
    regulars: [],
    swipeCount: 0,
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

// 좋아요 추가
export async function addLike(uid, restaurantId) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { likes: arrayUnion(restaurantId) });
}

// 좋아요 제거
export async function removeLike(uid, restaurantId) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { likes: arrayRemove(restaurantId) });
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
    fontSize: "medium",
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

// 상단 네비 아바타(#navAvatar)에 프로필 사진 표시
// 우선순위: 커스텀 사진(photoBase64) → 구글 사진(photoURL) → 이름 이니셜
export function updateNavAvatar(user, userData) {
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

// 영업 상태 반환: "open" | "closed" | "break"
export function getOpenStatus(restaurant) {
  if (!restaurant.hours) return "open";
  try {
    const now    = new Date();
    const today  = ["일","월","화","수","목","금","토"][now.getDay()];
    const nowMin = now.getHours() * 60 + now.getMinutes();

    if (restaurant.closed_day && restaurant.closed_day !== "없음") {
      if (restaurant.closed_day.includes(today)) return "closed";
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