import { Link, NavLink } from "react-router";
import HeaderProfileButton from "./HeaderProfileButton.jsx";
import "./global-header.css";

const NAVIGATION_ITEMS = [
  { label: "HOME", to: "/", end: true },
  { label: "ARTIST", to: "/artist", end: true },
  { label: "COMMUNITY", to: "/posts", end: false },
];

function getNavigationClassName({ isActive }) {
  return ["global-header__nav-link", isActive ? "is-active" : ""]
    .filter(Boolean)
    .join(" ");
}

function GlobalHeader() {
  return (
    <header className="global-header">
      <div className="global-header__inner">
        <Link className="global-header__logo" to="/">
          RESCENE FAN COMMUNITY
        </Link>

        <nav className="global-header__navigation" aria-label="주요 메뉴">
          {NAVIGATION_ITEMS.map(({ label, to, end }) => (
            <NavLink
              key={to}
              className={getNavigationClassName}
              to={to}
              end={end}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <HeaderProfileButton />
      </div>
    </header>
  );
}

export default GlobalHeader;
