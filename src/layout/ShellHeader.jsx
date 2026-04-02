import { SHELL_TAB } from "./shellTabs";

export default function ShellHeader({ activeTab, onTabChange }) {
  return (
    <header className="home-topbar">
      <div className="home-topbar-inner">
        <button
          type="button"
          className="home-topbar-logo"
          onClick={() => onTabChange(SHELL_TAB.HOME)}
        >
          POM
        </button>
        <nav className="home-topbar-nav" aria-label="주요 메뉴">
          <button
            type="button"
            className={"home-topbar-link" + (activeTab === SHELL_TAB.HOME ? " home-topbar-link--active" : "")}
            aria-current={activeTab === SHELL_TAB.HOME ? "page" : undefined}
            onClick={() => onTabChange(SHELL_TAB.HOME)}
          >
            홈
          </button>
          <button
            type="button"
            className={"home-topbar-link" + (activeTab === SHELL_TAB.PLACE ? " home-topbar-link--active" : "")}
            aria-current={activeTab === SHELL_TAB.PLACE ? "page" : undefined}
            onClick={() => onTabChange(SHELL_TAB.PLACE)}
          >
            플레이스
          </button>
          <button
            type="button"
            className={"home-topbar-link" + (activeTab === SHELL_TAB.MARKETING ? " home-topbar-link--active" : "")}
            aria-current={activeTab === SHELL_TAB.MARKETING ? "page" : undefined}
            onClick={() => onTabChange(SHELL_TAB.MARKETING)}
          >
            마케팅자동화
          </button>
          <button
            type="button"
            className={"home-topbar-link" + (activeTab === SHELL_TAB.ETC ? " home-topbar-link--active" : "")}
            aria-current={activeTab === SHELL_TAB.ETC ? "page" : undefined}
            onClick={() => onTabChange(SHELL_TAB.ETC)}
          >
            기타
          </button>
        </nav>
        <div className="home-topbar-actions" aria-label="계정">
          <button
            type="button"
            className={
              "home-topbar-admin-test" +
              (activeTab === SHELL_TAB.ADMIN_BLOG_IMAGE_TEST ? " home-topbar-admin-test--active" : "")
            }
            onClick={() => onTabChange(SHELL_TAB.ADMIN_BLOG_IMAGE_TEST)}
          >
            관리자테스트
          </button>
          <span className="home-topbar-muted">마이페이지</span>
          <span className="home-topbar-divider" aria-hidden>|</span>
          <span className="home-topbar-muted">로그아웃</span>
        </div>
      </div>
    </header>
  );
}
