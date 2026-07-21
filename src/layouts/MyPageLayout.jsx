import { Outlet } from "react-router";

function MyPageLayout() {
  return (
    <div className="my-page-layout">
      <div className="my-page-layout__content">
        <Outlet />
      </div>
    </div>
  );
}

export default MyPageLayout;
