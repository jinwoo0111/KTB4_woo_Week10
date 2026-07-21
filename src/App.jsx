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
            <Route
              path="password"
              element={(
                <RoutePlaceholder
                  eyebrow="MY PAGE / 02"
                  title="비밀번호 수정"
                  description="비밀번호 수정 화면이 이 위치에 연결됩니다."
                />
              )}
            />
          </Route>
        </Route>

        <Route path="posts">
          <Route
            index
            element={(
              <RoutePlaceholder
                eyebrow="COMMUNITY"
                title="게시글 목록"
                description="커뮤니티 게시글 목록이 이 위치에 연결됩니다."
              />
            )}
          />
          <Route element={<RequireAuth />}>
            <Route
              path="new"
              element={(
                <RoutePlaceholder
                  eyebrow="COMMUNITY"
                  title="게시글 작성"
                  description="게시글 작성 폼이 이 위치에 연결됩니다."
                />
              )}
            />
            <Route
              path=":postId/edit"
              element={(
                <RoutePlaceholder
                  eyebrow="COMMUNITY"
                  title="게시글 수정"
                  description="선택한 게시글의 수정 폼이 이 위치에 연결됩니다."
                />
              )}
            />
          </Route>
          <Route
            path=":postId"
            element={(
              <RoutePlaceholder
                eyebrow="COMMUNITY"
                title="게시글 상세"
                description="선택한 게시글의 상세 화면이 이 위치에 연결됩니다."
              />
            )}
          />
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
