import { useCallback, useEffect, useRef, useState } from "react";
import jenaImage from "../assets/member-images/jena.jpeg";
import liveImage from "../assets/member-images/live.webp";
import mayImage from "../assets/member-images/may.webp";
import minamiImage from "../assets/member-images/minami.webp";
import woniImage from "../assets/member-images/woni.webp";
import defaultProfileImage from "../assets/rescene-default-profile.jpg";
import "./artist-page.css";

const MEMBERS = [
  {
    id: "woni",
    number: "01",
    name: "원이",
    role: "리더",
    image: woniImage,
    details: [
      ["본명", "정원이"],
      ["출생", "2004.05.25"],
      ["국적", "🇰🇷 대한민국"],
      ["포지션", "리더"],
      ["MBTI", "ESFP"],
      ["별명", "파이리, 거제 굴 톤"],
    ],
  },
  {
    id: "live",
    number: "02",
    name: "리브",
    role: "패트",
    image: liveImage,
    details: [
      ["본명", "진경은"],
      ["출생", "2026.10.11"],
      ["국적", "🇰🇷 대한민국"],
      ["포지션", "패트"],
      ["MBTI", "ESFP"],
      ["별명", "리트, 무리브"],
    ],
  },
  {
    id: "minami",
    number: "03",
    name: "미나미",
    role: "갸루",
    image: minamiImage,
    details: [
      ["본명", "이토 미나미"],
      ["출생", "2026.11.29"],
      ["국적", "🇯🇵 일본"],
      ["포지션", "갸루"],
      ["MBTI", "ENFP"],
      ["별명", "갸루귀신, 미남이"],
    ],
  },
  {
    id: "may",
    number: "04",
    name: "메이",
    role: "매트",
    image: mayImage,
    details: [
      ["본명", "이예빈"],
      ["출생", "2008.08.19"],
      ["국적", "🇰🇷 대한민국"],
      ["포지션", "매트"],
      ["MBTI", "INTP"],
      ["별명", "메트, 연습생2"],
    ],
  },
  {
    id: "jena",
    number: "05",
    name: "제나",
    role: "막내",
    image: jenaImage,
    details: [
      ["본명", "김가영"],
      ["출생", "2008.11.27"],
      ["국적", "🇰🇷 대한민국"],
      ["포지션", "막내"],
      ["MBTI", "INFP"],
      ["별명", "신라공주, 까엉이"],
    ],
  },
];

function replaceBrokenImage(event) {
  event.currentTarget.onerror = null;
  event.currentTarget.src = defaultProfileImage;
}

function MemberDetails({ details }) {
  return (
    <dl className="member-details">
      {details.map(([term, description]) => (
        <div key={term} className="member-details__row">
          <dt>{term}</dt>
          <dd>{description}</dd>
        </div>
      ))}
    </dl>
  );
}

function MemberCard({ member, isActive, onEnter, onLeave }) {
  return (
    <article
      className={`member-card${isActive ? " is-active" : ""}`}
      onMouseEnter={() => onEnter(member)}
      onMouseLeave={onLeave}
    >
      <button
        className="member-card__toggle"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isActive}
        onFocus={() => onEnter(member)}
        onBlur={onLeave}
      >
        <span className="member-card__image-wrap">
          <img
            className="member-card__image"
            src={member.image}
            alt={`${member.name} 대표 이미지`}
            onError={replaceBrokenImage}
          />
          <span className="member-card__number">{member.number}</span>
        </span>

        <span className="member-card__summary">
          <span className="member-card__name">{member.name}</span>
          <span className="member-card__role">{member.role}</span>
          <span className="member-card__open-label">VIEW PROFILE</span>
        </span>
      </button>
    </article>
  );
}

function ArtistFocusPanel({ member, onEnter, onLeave }) {
  const titleId = `artist-focus-${member.id}`;

  return (
    <div className="artist-focus-overlay" aria-hidden="false">
      <section
        key={member.id}
        className="artist-focus-panel"
        role="dialog"
        aria-labelledby={titleId}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        <img
          className="artist-focus-panel__image"
          src={member.image}
          alt={`${member.name} 대표 이미지`}
          onError={replaceBrokenImage}
        />

        <div className="artist-focus-panel__content">
          <p className="artist-focus-panel__role">{member.role}</p>
          <h2 id={titleId} className="artist-focus-panel__name">
            {member.name}
          </h2>
          <MemberDetails details={member.details} />
        </div>
      </section>
    </div>
  );
}

function ArtistPage() {
  const [selectedMember, setSelectedMember] = useState(null);
  const hideTimerRef = useRef(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const showMember = useCallback((member) => {
    clearHideTimer();
    setSelectedMember(member);
  }, [clearHideTimer]);

  const hideMember = useCallback(() => {
    clearHideTimer();
    setSelectedMember(null);
  }, [clearHideTimer]);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(hideMember, 80);
  }, [clearHideTimer, hideMember]);

  useEffect(() => {
    if (!selectedMember) {
      return undefined;
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        hideMember();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [hideMember, selectedMember]);

  useEffect(() => clearHideTimer, [clearHideTimer]);

  return (
    <div className="artist-page">
      <section className="artist-page__heading" aria-labelledby="artist-title">
        <p className="artist-page__eyebrow">01 / RESCENE</p>
        <h1 id="artist-title" className="artist-page__title">
          ARTIST
        </h1>
      </section>

      <section className="member-grid" aria-label="RESCENE 멤버 목록">
        {MEMBERS.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            isActive={selectedMember?.id === member.id}
            onEnter={showMember}
            onLeave={scheduleHide}
          />
        ))}
      </section>

      {selectedMember && (
        <ArtistFocusPanel
          member={selectedMember}
          onEnter={clearHideTimer}
          onLeave={hideMember}
        />
      )}
    </div>
  );
}

export default ArtistPage;
