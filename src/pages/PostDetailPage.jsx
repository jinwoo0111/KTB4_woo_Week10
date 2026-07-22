import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { ApiError } from "../api/ApiError.js";
import {
  createPostLike,
  deletePostLike,
  getPost,
  increasePostView,
} from "../api/postApi.js";
import ErrorState from "../components/common/ErrorState.jsx";
import LoadingState from "../components/common/LoadingState.jsx";
import ProfileImage from "../components/common/ProfileImage.jsx";
import { AUTH_STATUS } from "../contexts/AuthContext.js";
import { useAuth } from "../hooks/useAuth.js";
import { formatRelativeDate } from "../utils/dateTime.js";
import { resolveImageUrl } from "../utils/imageUrl.js";
import "./post-detail-page.css";

const viewedHistoryEntries = new Set();

function parsePostId(value) {
  const parsedValue = Number(value);

  return Number.isSafeInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : null;
}

async function increaseViewOnce(viewEntryKey, postId) {
  if (viewedHistoryEntries.has(viewEntryKey)) {
    return null;
  }

  viewedHistoryEntries.add(viewEntryKey);

  try {
    return await increasePostView(postId);
  } catch {
    viewedHistoryEntries.delete(viewEntryKey);
    return null;
  }
}

function getDetailErrorMessage(error) {
  if (error instanceof ApiError && error.status === 404) {
    return "존재하지 않거나 삭제된 게시글입니다.";
  }

  if (error instanceof ApiError && error.message === "network_error") {
    return "서버와 연결할 수 없습니다.";
  }

  return "게시글을 불러오지 못했습니다.";
}

function isSameUser(currentUserId, authorId) {
  return (
    currentUserId !== null &&
    currentUserId !== undefined &&
    authorId !== null &&
    authorId !== undefined &&
    String(currentUserId) === String(authorId)
  );
}

function getLikeErrorMessage(error) {
  if (error instanceof ApiError) {
    if (error.message === "network_error") {
      return "서버와 연결할 수 없습니다.";
    }

    if (error.status === 403) {
      return "좋아요를 처리할 권한이 없습니다.";
    }

    if (error.status === 404) {
      return "게시글을 찾을 수 없습니다.";
    }
  }

  return "좋아요를 처리하지 못했습니다. 다시 시도해주세요.";
}

function needsLikeStateRefresh(error) {
  return (
    error instanceof ApiError &&
    (
      error.message === "post_like_already_exists" ||
      error.message === "post_like_not_found"
    )
  );
}

function PostComment({ comment, isCurrentUser }) {
  return (
    <article className="post-detail-comment">
      <header className="post-detail-comment__header">
        <div className="post-detail-comment__author-info">
          <ProfileImage
            className="post-detail-comment__profile"
            src={comment.authorProfileImage}
            alt=""
          />
          <strong className="post-detail-comment__author">
            {comment.authorNickname || "작성자"}
          </strong>
          <time
            className="post-detail-comment__date"
            dateTime={comment.createdAt}
          >
            {formatRelativeDate(comment.createdAt)}
          </time>
        </div>

        {isCurrentUser && (
          <span className="post-detail-comment__mine">내 댓글</span>
        )}
      </header>

      <p className="post-detail-comment__content">{comment.content}</p>
    </article>
  );
}

function PostDetailPage() {
  const { postId: postIdParam } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { authStatus, currentUser, logout } = useAuth();
  const postId = useMemo(() => parsePostId(postIdParam), [postIdParam]);
  const likeRequestRef = useRef(false);
  const [post, setPost] = useState(null);
  const [loadState, setLoadState] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [hasImageFailed, setHasImageFailed] = useState(false);
  const [isLikeSubmitting, setIsLikeSubmitting] = useState(false);
  const [likeError, setLikeError] = useState("");

  useEffect(() => {
    if (postId === null) {
      return undefined;
    }

    const controller = new AbortController();
    const viewEntryKey = `${location.key}:${postId}`;
    const loadTimer = window.setTimeout(async () => {
      setLoadState("loading");
      setLoadError("");
      setPost(null);
      setHasImageFailed(false);

      try {
        const postDetail = await getPost(postId, {
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        if (!postDetail) {
          throw new ApiError({ message: "invalid_post_detail_response" });
        }

        setPost(postDetail);
        setLoadState("success");

        const viewResult = await increaseViewOnce(viewEntryKey, postId);

        if (controller.signal.aborted || !viewResult) {
          return;
        }

        setPost((currentPost) => (
          currentPost?.postId === postId
            ? { ...currentPost, viewCount: viewResult.viewCount }
            : currentPost
        ));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setLoadError(getDetailErrorMessage(error));
        setLoadState("error");
      }
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
      controller.abort();
    };
  }, [location.key, postId, retryCount]);

  const handleLikeToggle = async () => {
    if (authStatus !== AUTH_STATUS.AUTHENTICATED || !currentUser) {
      navigate("/login");
      return;
    }

    if (likeRequestRef.current || !post) {
      return;
    }

    const wasLiked = post.likedByMe === true;
    likeRequestRef.current = true;
    setIsLikeSubmitting(true);
    setLikeError("");

    try {
      if (wasLiked) {
        await deletePostLike(postId);
      } else {
        await createPostLike(postId);
      }

      setPost((currentPost) => {
        if (currentPost?.postId !== postId) {
          return currentPost;
        }

        const currentLikeCount = Number(currentPost.likeCount) || 0;

        return {
          ...currentPost,
          likedByMe: !wasLiked,
          likeCount: Math.max(0, currentLikeCount + (wasLiked ? -1 : 1)),
        };
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      if (needsLikeStateRefresh(error)) {
        setLikeError("좋아요 상태가 달라 최신 정보로 다시 불러왔습니다.");
        setRetryCount((currentCount) => currentCount + 1);
      } else {
        setLikeError(getLikeErrorMessage(error));
      }
    } finally {
      likeRequestRef.current = false;
      setIsLikeSubmitting(false);
    }
  };

  if (postId === null) {
    return (
      <div className="post-detail-page post-detail-page--feedback">
        <ErrorState
          message="올바르지 않은 게시글 주소입니다."
          retryText="목록으로 이동"
          onRetry={() => navigate("/posts", { replace: true })}
        />
      </div>
    );
  }

  if (loadState === "error") {
    const isMissingPost = loadError === "존재하지 않거나 삭제된 게시글입니다.";

    return (
      <div className="post-detail-page post-detail-page--feedback">
        <ErrorState
          message={loadError}
          retryText={isMissingPost ? "목록으로 이동" : "다시 시도"}
          onRetry={() => {
            if (isMissingPost) {
              navigate("/posts", { replace: true });
            } else {
              setRetryCount((currentCount) => currentCount + 1);
            }
          }}
        />
      </div>
    );
  }

  if (loadState === "loading" || post?.postId !== postId) {
    return (
      <div className="post-detail-page post-detail-page--feedback">
        <LoadingState message="게시글을 불러오는 중입니다." />
      </div>
    );
  }

  const isPostAuthor = isSameUser(currentUser?.userId, post.authorId);
  const resolvedContentImage = resolveImageUrl(post.contentImage);

  return (
    <div className="post-detail-page">
      <article className="post-detail-article">
        <header className="post-detail-article__header">
          <h1 className="post-detail-article__title">{post.title}</h1>

          {isPostAuthor && (
            <div className="post-detail-article__actions">
              <Link to={`/posts/${post.postId}/edit`}>수정</Link>
            </div>
          )}
        </header>

        <div className="post-detail-article__meta">
          <div className="post-detail-article__author-info">
            <ProfileImage
              className="post-detail-article__author-profile"
              src={post.authorProfileImage}
              alt=""
            />
            <strong>{post.author || "작성자"}</strong>
          </div>

          <time dateTime={post.createdAt}>
            {formatRelativeDate(post.createdAt)}
          </time>
        </div>

        <div className="post-detail-article__divider" />

        {resolvedContentImage && !hasImageFailed && (
          <img
            className="post-detail-article__image"
            src={resolvedContentImage}
            alt="게시글 첨부 이미지"
            decoding="async"
            onError={() => setHasImageFailed(true)}
          />
        )}

        <p className="post-detail-article__content">{post.content}</p>

        <div className="post-detail-counts" aria-label="게시글 통계">
          <button
            className={`post-detail-counts__item post-detail-counts__like${post.likedByMe ? " is-liked" : ""}`}
            type="button"
            aria-label={post.likedByMe ? "좋아요 취소" : "좋아요 추가"}
            aria-pressed={post.likedByMe === true}
            disabled={
              authStatus === AUTH_STATUS.CHECKING ||
              isLikeSubmitting
            }
            onClick={handleLikeToggle}
          >
            <strong>{post.likeCount ?? 0}</strong>
            <span>
              {isLikeSubmitting
                ? "처리 중"
                : post.likedByMe
                  ? "좋아요 취소"
                  : "좋아요"}
            </span>
          </button>
          <div className="post-detail-counts__item">
            <strong>{post.viewCount ?? 0}</strong>
            <span>조회수</span>
          </div>
          <div className="post-detail-counts__item">
            <strong>{post.commentCount ?? post.comments.length}</strong>
            <span>댓글</span>
          </div>
        </div>

        <p className="post-detail-like-error" role="alert">
          {likeError}
        </p>
      </article>

      <section className="post-detail-comments" aria-labelledby="comment-list-title">
        <div className="post-detail-comments__heading">
          <h2 id="comment-list-title">댓글</h2>
          <span>{post.comments.length}</span>
        </div>

        {post.comments.length === 0 ? (
          <p className="post-detail-comments__empty">아직 댓글이 없습니다.</p>
        ) : (
          <div className="post-detail-comments__list">
            {post.comments.map((comment) => (
              <PostComment
                key={comment.commentId}
                comment={comment}
                isCurrentUser={isSameUser(currentUser?.userId, comment.authorId)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default PostDetailPage;
