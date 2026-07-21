import { Link } from "react-router";
import ProfileImage from "./ProfileImage.jsx";
import "./header-profile-button.css";

function HeaderProfileButton({
  isAuthenticated = false,
  profileImage = null,
  nickname = "",
}) {
  const destination = isAuthenticated ? "/mypage" : "/login";
  const accessibleLabel = isAuthenticated
    ? `${nickname ? `${nickname}님의 ` : ""}마이페이지로 이동`
    : "로그인 페이지로 이동";

  return (
    <Link
      className="header-profile-button"
      to={destination}
      aria-label={accessibleLabel}
    >
      <ProfileImage src={profileImage} />
    </Link>
  );
}

export default HeaderProfileButton;
