import { Outlet } from "react-router";
import "./layouts.css";

function AppLayout() {
  return (
    <div className="app-layout">
      <main id="main-content" className="app-layout__main">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
