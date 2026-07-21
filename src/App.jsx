import { Route, Routes } from "react-router";
import {
  GuestOnlyRoute,
  RequireAuth,
} from "./components/auth/AuthRouteGuard.jsx";
import AppLayout from "./layouts/AppLayout.jsx";
import AuthLayout from "./layouts/AuthLayout.jsx";
import MyPageLayout from "./layouts/MyPageLayout.jsx";
import ArtistPage from "./pages/ArtistPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import PasswordEditPage from "./pages/PasswordEditPage.jsx";
import PostCreatePage from "./pages/PostCreatePage.jsx";
import PostDetailPage from "./pages/PostDetailPage.jsx";
import PostEditPage from "./pages/PostEditPage.jsx";
import PostListPage from "./pages/PostListPage.jsx";
import RoutePlaceholder from "./pages/RoutePlaceholder.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import UserEditPage from "./pages/UserEditPage.jsx";

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="artist" element={<ArtistPage />} />

        <Route element={<GuestOnlyRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
          </Route>
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="mypage" element={<MyPageLayout />}>
            <Route index element={<UserEditPage />} />
            <Route path="password" element={<PasswordEditPage />} />
          </Route>
        </Route>

        <Route path="posts">
          <Route index element={<PostListPage />} />
          <Route element={<RequireAuth />}>
            <Route path="new" element={<PostCreatePage />} />
            <Route path=":postId/edit" element={<PostEditPage />} />
          </Route>
          <Route path=":postId" element={<PostDetailPage />} />
        </Route>

        <Route
          path="*"
          element={(
            <RoutePlaceholder
              eyebrow="404"
              title="페이지를 찾을 수 없습니다"
              description="요청한 주소에 연결된 페이지가 없습니다."
            />
          )}
        />
      </Route>
    </Routes>
  );
}

export default App;
