// 구글 로그인 / 로그아웃 / 상태 감지
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth, getUserDoc } from "./firebase.js";

const provider = new GoogleAuthProvider();

// 구글 로그인
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  // 사용자 문서 없으면 생성
  await getUserDoc(user.uid);
  return user;
}

// 로그아웃
export async function logout() {
  await signOut(auth);
}

// 현재 로그인된 사용자 가져오기
export function getCurrentUser() {
  return auth.currentUser;
}

// 로그인 상태 감지 (페이지 로드 시 사용)
// callback: (user) => {} — user가 null이면 비로그인
export function onAuthChanged(callback) {
  onAuthStateChanged(auth, callback);
}

// 로그인 필요 페이지에서 비로그인 시 로그인 페이지로 이동
export function requireAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = "./login.html";
      } else {
        resolve(user);
      }
    });
  });
}
