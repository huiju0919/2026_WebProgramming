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

export async function getRestaurants() {
  const snapshot = await getDocs(collection(db, "restaurants"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getRestaurant(id) {
  const docRef = doc(db, "restaurants", id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() };
  return null;
}

// ─────────────────────────────────────────
// 메뉴 데이터
// ─────────────────────────────────────────

export async function getMenusByRestaurant(restaurantId) {
  const q = query(collection(db, "menus"), where("restaurantId", "==", restaurantId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getAllMenus() {
  const snapshot = await getDocs(collection(db, "menus"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// ─────────────────────────────────────────
// 사용자 데이터
// ─────────────────────────────────────────

export async function getUserDoc(uid) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      likes: [],
      recentViews: [],
      swipeCount: 0,
    });
    return { likes: [], recentViews: [], swipeCount: 0 };
  }
  return userSnap.data();
}

export async function addLike(uid, restaurantId) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { likes: arrayUnion(restaurantId) });
}

export async function removeLike(uid, restaurantId) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { likes: arrayRemove(restaurantId) });
}

export async function isLiked(uid, restaurantId) {
  const userData = await getUserDoc(uid);
  return userData.likes.includes(restaurantId);
}

export async function addRecentView(uid, restaurantId) {
  const userData = await getUserDoc(uid);
  let recent = userData.recentViews || [];
  recent = [restaurantId, ...recent.filter((id) => id !== restaurantId)].slice(0, 10);
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { recentViews: recent });
}

export async function incrementSwipeCount(uid) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { swipeCount: increment(1) });
}

// ─────────────────────────────────────────
// 취향 누적 데이터
// ─────────────────────────────────────────
// 저장 구조:
//   tagScore: { 태그명: raw 누적 횟수 } — 정규화 없이 raw 합산
//   sessionCount: 누적 세션 수
//
// dislikeOnlyTags / dislikedAttrs / dislikedRests 는
// 세션 내에만 사용하고 Firebase에는 저장하지 않음

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

  // raw 누적 합산 (정규화 없이)
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

// ─────────────────────────────────────────
// 차단 메뉴 (명시적 "다시 보지 않기")
// ─────────────────────────────────────────

// 차단 메뉴 목록 불러오기 → [{ menuId, menuName, restaurantName }]
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