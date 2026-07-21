import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router";
import { ApiError } from "../api/ApiError.js";
import { getPosts } from "../api/postApi.js";
import ErrorState from "../components/common/ErrorState.jsx";
import LoadingState from "../components/common/LoadingState.jsx";
import ProfileImage from "../components/common/ProfileImage.jsx";
import { AUTH_STATUS } from "../contexts/AuthContext.js";
import { useAuth } from "../hooks/useAuth.js";
import { resolveImageUrl } from "../utils/imageUrl.js";
import "./post-list-page.css";

const POST_PAGE_SIZE = 10;
const DEFAULT_VIEW_MODE = "list";
const VIEW_MODE_STORAGE_KEY = "communityPostViewMode";
const VIEW_MODES = new Set(["list", "card"]);

function getInitialViewMode() {
  try {
    const savedViewMode = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return VIEW_MODES.has(savedViewMode) ? savedViewMode : DEFAULT_VIEW_MODE;
  } catch {
    return DEFAULT_VIEW_MODE;
  }
}

function saveViewMode(viewMode) {
  try {
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  } catch {
    // 보기 방식 저장 실패가 게시글 조회와 화면 전환을 막지 않게 한다.
  }
}

function formatPostDate(createdAt) {
  if (!createdAt) {
    return "";
  }

  const originalDate = String(createdAt);
  const createdDate = new Date(originalDate.replace(" ", "T"));

  if (Number.isNaN(createdDate.getTime())) {
    return originalDate;
  }

  const differenceMinutes = Math.floor(
    (Date.now() - createdDate.getTime()) / 60000,
  );

  if (differenceMinutes < 1) {
    return "방금 전";
  }

  if (differenceMinutes < 60) {
    return `${differenceMinutes}분 전`;
  }

  const differenceHours = Math.floor(differenceMinutes / 60);

  if (differenceHours < 24) {
    return `${differenceHours}시간 전`;
  }

  const differenceDays = Math.floor(differenceHours / 24);

  if (differenceDays < 7) {
    return `${differenceDays}일 전`;
  }

  return originalDate.slice(0, 10);
}

function hasImage(imagePath) {
  return typeof imagePath === "string" && Boolean(imagePath.trim());
}

function PostContentImage({ className, src }) {
  const [hasFailed, setHasFailed] = useState(false);
  const resolvedSource = resolveImageUrl(src);

  if (!resolvedSource) {
    return null;
  }

  return (
    <div className={`${className}${hasFailed ? " has-failed" : ""}`}>
      {hasFailed ? (
        <span aria-label="게시글 이미지를 불러오지 못했습니다">IMAGE</span>
      ) : (
        <img
          src={resolvedSource}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setHasFailed(true)}
        />
      )}
    </div>
  );
}

function PostListItem({ post }) {
  const hasContentImage = hasImage(post.contentImage);

  return (
    <article className="post-list-row-wrapper">
      <Link
        className={`post-list-row${hasContentImage ? "" : " has-no-image"}`}
        to={`/posts/${post.postId}`}
      >
        <div className="post-list-row__text">
          <h2 className="post-list-row__title">{post.title}</h2>
          <div className="post-list-row__meta">
            <span>{post.author || "익명"}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.createdAt}>{formatPostDate(post.createdAt)}</time>
            <span aria-hidden="true">·</span>
            <span>조회수 {post.viewCount ?? 0}</span>
          </div>
        </div>

        {hasContentImage && (
          <PostContentImage
            className="post-list-row__thumbnail"
            src={post.contentImage}
          />
        )}
      </Link>
    </article>
  );
}

function PostCardItem({ post }) {
  const hasContentImage = hasImage(post.contentImage);

  return (
    <article className="post-card">
      <Link className="post-card__link" to={`/posts/${post.postId}`}>
        <div className="post-card__author-row">
          <ProfileImage
            className="post-card__author-image"
            src={post.authorProfileImage}
            alt=""
          />
          <strong className="post-card__author">{post.author || "익명"}</strong>
        </div>

        {hasContentImage && (
          <PostContentImage
            className="post-card__image"
            src={post.contentImage}
          />
        )}

        <h2 className="post-card__title">{post.title}</h2>
        <p className="post-card__body">{post.content || post.title}</p>
        <time className="post-card__date" dateTime={post.createdAt}>
          {formatPostDate(post.createdAt)}
        </time>

        <div className="post-card__stats">
          <span>♥ {post.likeCount ?? 0}</span>
          <span aria-hidden="true">·</span>
          <span>댓글 {post.commentCount ?? 0}</span>
          <span aria-hidden="true">·</span>
          <span>조회수 {post.viewCount ?? 0}</span>
        </div>
      </Link>
    </article>
  );
}

function getLoadErrorMessage(error) {
  if (error instanceof ApiError && error.message === "network_error") {
    return "서버와 연결할 수 없습니다.";
  }

  return "게시글 목록을 불러오지 못했습니다.";
}

function PostListPage() {
  const navigate = useNavigate();
  const { authStatus } = useAuth();
  const sentinelRef = useRef(null);
  const requestAbortRef = useRef(null);
  const requestSequenceRef = useRef(0);
  const loadingRef = useRef(false);
  const hasNextRef = useRef(true);
  const nextCursorRef = useRef(null);
  const [posts, setPosts] = useState([]);
  const [viewMode, setViewMode] = useState(getInitialViewMode);
  const [hasNext, setHasNext] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isScrollTopVisible, setIsScrollTopVisible] = useState(false);

  const loadPosts = useCallback(async ({ reset = false } = {}) => {
    if (loadingRef.current || (!reset && !hasNextRef.current)) {
      return;
    }

    if (reset) {
      requestAbortRef.current?.abort();
    }

    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    const controller = new AbortController();
    requestAbortRef.current = controller;
    loadingRef.current = true;
    setLoadError("");

    if (reset) {
      setIsInitialLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const result = await getPosts({
        cursor: reset ? null : nextCursorRef.current,
        size: POST_PAGE_SIZE,
        signal: controller.signal,
      });

      if (requestSequence !== requestSequenceRef.current) {
        return;
      }

      setPosts((currentPosts) => {
        if (reset) {
          return result.posts;
        }

        const existingPostIds = new Set(
          currentPosts.map((post) => post.postId),
        );
        const newPosts = result.posts.filter(
          (post) => !existingPostIds.has(post.postId),
        );

        return [...currentPosts, ...newPosts];
      });

      hasNextRef.current = result.hasNext;
      nextCursorRef.current = result.nextCursor;
      setHasNext(result.hasNext);
    } catch (error) {
      if (
        controller.signal.aborted ||
        requestSequence !== requestSequenceRef.current
      ) {
        return;
      }

      setLoadError(getLoadErrorMessage(error));
    } finally {
      if (requestSequence === requestSequenceRef.current) {
        loadingRef.current = false;
        setIsInitialLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      loadPosts({ reset: true });
    }, 0);

    return () => {
      window.clearTimeout(initialLoadTimer);
      requestSequenceRef.current += 1;
      loadingRef.current = false;
      requestAbortRef.current?.abort();
    };
  }, [loadPosts]);

  useEffect(() => {
    if (
      !sentinelRef.current ||
      isInitialLoading ||
      isLoadingMore ||
      loadError ||
      !hasNext
    ) {
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        loadPosts();
      }
    }, { rootMargin: "400px 0px" });

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [hasNext, isInitialLoading, isLoadingMore, loadError, loadPosts]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrollTopVisible(window.scrollY > 420);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleViewModeChange = (nextViewMode) => {
    if (!VIEW_MODES.has(nextViewMode)) {
      return;
    }

    setViewMode(nextViewMode);
    saveViewMode(nextViewMode);
  };

  const handleWritePost = () => {
    if (authStatus === AUTH_STATUS.AUTHENTICATED) {
      navigate("/posts/new");
      return;
    }

    navigate("/login");
  };

  const handleRetry = () => {
    loadPosts({ reset: posts.length === 0 });
  };

  return (
    <div className="post-list-page">
      <section className="post-list-page__heading" aria-labelledby="community-title">
        <div className="post-list-page__title-row">
          <span className="post-list-page__document-icon" aria-hidden="true" />
          <h1 id="community-title">Community</h1>
        </div>
      </section>

      <section className="post-list-toolbar" aria-label="게시글 보기 설정">
        <div className="post-list-toolbar__actions">
          <button
            className="post-list-toolbar__write"
            type="button"
            disabled={authStatus === AUTH_STATUS.CHECKING}
            onClick={handleWritePost}
          >
            글쓰기
          </button>

          <div className="post-view-toggle" role="group" aria-label="게시글 보기 방식">
            <button
              className="post-view-toggle__button"
              type="button"
              aria-label="줄글형으로 보기"
              aria-pressed={viewMode === "list"}
              onClick={() => handleViewModeChange("list")}
            >
              <span className="post-view-toggle__list-icon" aria-hidden="true" />
            </button>
            <span className="post-view-toggle__divider" aria-hidden="true" />
            <button
              className="post-view-toggle__button"
              type="button"
              aria-label="카드형으로 보기"
              aria-pressed={viewMode === "card"}
              onClick={() => handleViewModeChange("card")}
            >
              <span className="post-view-toggle__card-icon" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {isInitialLoading ? (
        <LoadingState message="게시글을 불러오는 중입니다." />
      ) : loadError && posts.length === 0 ? (
        <ErrorState message={loadError} onRetry={handleRetry} />
      ) : posts.length === 0 ? (
        <p className="post-list-page__empty">아직 작성된 게시글이 없습니다.</p>
      ) : (
        <section
          className={`post-list-content is-${viewMode}-view`}
          aria-label="게시글 목록"
        >
          {posts.map((post) => (
            viewMode === "card" ? (
              <PostCardItem key={post.postId} post={post} />
            ) : (
              <PostListItem key={post.postId} post={post} />
            )
          ))}
        </section>
      )}

      <div className="post-list-page__load-state" role="status" aria-live="polite">
        {isLoadingMore && <span>다음 게시글을 불러오는 중입니다.</span>}
        {!isInitialLoading && !isLoadingMore && loadError && posts.length > 0 && (
          <>
            <span>{loadError}</span>
            <button type="button" onClick={handleRetry}>다시 시도</button>
          </>
        )}
        {!isInitialLoading && !isLoadingMore && !loadError && posts.length > 0 && (
          <span>
            {hasNext
              ? "스크롤하면 다음 게시글을 불러옵니다."
              : "마지막 게시글입니다."}
          </span>
        )}
      </div>

      <div ref={sentinelRef} className="post-list-page__sentinel" aria-hidden="true" />

      <button
        className={`post-list-page__scroll-top${isScrollTopVisible ? " is-visible" : ""}`}
        type="button"
        aria-label="맨 위로 이동"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        ↑
      </button>
    </div>
  );
}

export default PostListPage;
