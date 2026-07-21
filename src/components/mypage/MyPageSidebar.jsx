import { NavLink } from "react-router";
import "./my-page-sidebar.css";

function getMenuClassName({ isActive }) {
  return `my-page-sidebar__menu${isActive ? " is-active" : ""}`;
}

function MyPageSidebar({ isBusy = false, onLogout }) {
  return (
    <aside className="my-page-sidebar" aria-label="마이페이지 메뉴">
      <p className="my-page-sidebar__label">ACCOUNT</p>

      <NavLink className={getMenuClassName} end to="/mypage">
        <span className="my-page-sidebar__number">01</span>
        <span>회원정보 변경</span>
      </NavLink>

      <NavLink className={getMenuClassName} to="/mypage/password">
        <span className="my-page-sidebar__number">02</span>
        <span>비밀번호 변경</span>
      </NavLink>

      <button
        className="my-page-sidebar__logout"
        type="button"
        disabled={isBusy}
        onClick={onLogout}
      >
        <span className="my-page-sidebar__number">03</span>
        <span>로그아웃</span>
      </button>
    </aside>
  );
}

export default MyPageSidebar;
