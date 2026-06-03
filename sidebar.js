(function () {
  function init() {
    const nav = document.querySelector('.bottom-nav');
    if (!nav) return;

    // 사이드바 토글 탭 (항상 사이드바 오른쪽 끝에 삐쭉)
    const toggleTab = document.createElement('button');
    toggleTab.className = 'sidebar-reopen-btn';
    toggleTab.addEventListener('click', toggleSidebar);
    document.body.appendChild(toggleTab);

    // 저장된 상태 복원
    if (localStorage.getItem('ff_sidebar') === 'collapsed') {
      document.body.classList.add('sidebar-collapsed');
    }
    updateTabIcon(toggleTab);
  }

  function updateTabIcon(btn) {
    const collapsed = document.body.classList.contains('sidebar-collapsed');
    btn = btn || document.querySelector('.sidebar-reopen-btn');
    if (!btn) return;
    btn.innerHTML = collapsed ? '›' : '‹';
    btn.title = collapsed ? '사이드바 열기' : '사이드바 닫기';
  }

  function toggleSidebar() {
    document.body.classList.toggle('sidebar-collapsed');
    const collapsed = document.body.classList.contains('sidebar-collapsed');
    localStorage.setItem('ff_sidebar', collapsed ? 'collapsed' : 'open');
    updateTabIcon();
  }

  window.toggleSidebar = toggleSidebar;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
