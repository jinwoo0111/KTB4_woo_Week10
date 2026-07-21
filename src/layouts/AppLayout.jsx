import { Outlet } from "react-router";
import GlobalHeader from "../components/common/GlobalHeader.jsx";
import "./layouts.css";

function AppLayout() {
  return (
    <div className="app-layout">
      <GlobalHeader />
      <main id="main-content" className="app-layout__main">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
