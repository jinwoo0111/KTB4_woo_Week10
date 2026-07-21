import { Link } from "react-router";
import resceneHomeImage from "../assets/rescene-home-page.jpeg";
import { AUTH_STATUS } from "../contexts/AuthContext.js";
import { useAuth } from "../hooks/useAuth.js";
import "./home-page.css";

const OFFICIAL_CHANNELS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/rescene_official/",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@RESCENE_official",
  },
  {
    label: "X",
    href: "https://x.com/RESCENEofficial",
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@rescene_official",
  },
];

function HomeHeroActions({ authStatus }) {
  if (authStatus === AUTH_STATUS.CHECKING) {
    return (
      <p className="home-page__auth-check" role="status" aria-live="polite">
        로그인 상태 확인 중
      </p>
    );
  }

  if (authStatus === AUTH_STATUS.AUTHENTICATED) {
    return (
      <div className="home-page__hero-actions">
        <Link className="home-page__secondary-link" to="/posts">
          COMMUNITY
        </Link>
      </div>
    );
  }

  return (
    <div className="home-page__hero-actions">
      <Link className="home-page__primary-link" to="/login">
        LOGIN
      </Link>
      <Link className="home-page__secondary-link" to="/signup">
        SIGN UP
      </Link>
    </div>
  );
}

function HomePage() {
  const { authStatus } = useAuth();

  return (
    <div className="home-page">
      <section
        className="home-page__hero"
        aria-labelledby="home-hero-title"
        style={{ "--home-hero-image": `url(${resceneHomeImage})` }}
      >
        <div className="home-page__hero-content">
          <h1 id="home-hero-title" className="home-page__hero-title">
            RESCENE
          </h1>
          <HomeHeroActions authStatus={authStatus} />
        </div>
      </section>

      <section
        className="home-page__social-section"
        aria-labelledby="home-social-title"
      >
        <div>
          <p className="home-page__section-label">SOCIAL</p>
          <h2 id="home-social-title" className="home-page__section-title">
            공식 채널 링크
          </h2>
        </div>

        <nav className="home-page__social-links" aria-label="리센느 공식 채널">
          {OFFICIAL_CHANNELS.map(({ label, href }) => (
            <a
              key={label}
              className="home-page__social-link"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {label}
            </a>
          ))}
        </nav>
      </section>

      <footer className="home-page__footer">
        This is an unofficial fan-made portfolio project and is not affiliated
        with RESCENE or its agency.
      </footer>
    </div>
  );
}

export default HomePage;
