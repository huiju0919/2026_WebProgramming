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

// 사용자 문서 가져오기 (없으면 생성)
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

// 좋아요 추가
export async function addLike(uid, restaurantId) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    likes: arrayUnion(restaurantId),
  });
}

// 좋아요 제거
export async function removeLike(uid, restaurantId) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    likes: arrayRemove(restaurantId),
  });
}

// 좋아요 여부 확인
export async function isLiked(uid, restaurantId) {
  const userData = await getUserDoc(uid);
  return userData.likes.includes(restaurantId);
}

// 최근 본 식당 추가 (최대 10개 유지)
export async function addRecentView(uid, restaurantId) {
  const userData = await getUserDoc(uid);
  let recent = userData.recentViews || [];
  recent = [restaurantId, ...recent.filter((id) => id !== restaurantId)].slice(0, 10);
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { recentViews: recent });
}

// 스와이프 횟수 증가
export async function incrementSwipeCount(uid) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { swipeCount: increment(1) });
}
