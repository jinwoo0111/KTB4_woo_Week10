import { Outlet } from "react-router";
import GlobalHeader from "../components/common/GlobalHeader.jsx";
import "./layouts.css";

function AppLayout() {
  return (
    <div className="app-layout">
      <a className="skip-link" href="#main-content">
        본문 바로가기
      </a>
      <GlobalHeader />
      <main id="main-content" className="app-layout__main" tabIndex="-1">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
