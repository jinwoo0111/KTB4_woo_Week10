import { Outlet } from "react-router";

function AuthLayout() {
  return (
    <div className="auth-layout">
      <div className="auth-layout__content">
        <Outlet />
      </div>
    </div>
  );
}

export default AuthLayout;
