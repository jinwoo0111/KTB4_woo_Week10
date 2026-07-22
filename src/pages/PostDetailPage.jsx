import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { ApiError } from "../api/ApiError.js";
import {
  createComment,
  deleteComment,
  updateComment,
} from "../api/commentApi.js";
import {
  createPostLike,
  deletePost,
  deletePostLike,
  getPost,
  increasePostView,
} from "../api/postApi.js";
import ErrorState from "../components/common/ErrorState.jsx";
import ConfirmModal from "../components/common/ConfirmModal.jsx";
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

function getPostDeleteErrorMessage(error) {
  if (error instanceof ApiError) {
    if (error.message === "network_error") {
      return "서버와 연결할 수 없습니다.";
    }

    if (error.status === 403) {
      return "게시글을 삭제할 권한이 없습니다.";
    }

    if (error.status === 409) {
      return "게시글 삭제 요청이 충돌했습니다.";
    }
  }

  return "게시글을 삭제하지 못했습니다. 다시 시도해주세요.";
}

function getCommentErrorMessage(error, action) {
  if (error instanceof ApiError) {
    if (error.message === "network_error") {
      return "서버와 연결할 수 없습니다.";
    }

    if (error.status === 403) {
      return `댓글을 ${action}할 권한이 없습니다.`;
    }

    if (error.status === 404) {
      return error.message === "comment_not_found"
        ? "댓글을 찾을 수 없습니다."
        : "게시글을 찾을 수 없습니다.";
    }

    if (error.status === 409) {
      return `댓글 ${action} 요청이 충돌했습니다.`;
    }
  }

  return `댓글을 ${action}하지 못했습니다. 다시 시도해주세요.`;
}

function isValidComment(comment) {
  return (
    comment !== null &&
    comment !== undefined &&
    comment.commentId !== null &&
    comment.commentId !== undefined &&
    typeof comment.content === "string"
  );
}

function PostComment({
  comment,
  isCurrentUser,
  isBusy,
  isEditing,
  onEdit,
  onDelete,
}) {
  return (
    <article
      className={`post-detail-comment${isEditing ? " is-editing" : ""}`}
    >
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
          <div className="post-detail-comment__actions">
            <span className="post-detail-comment__mine">내 댓글</span>
            <button type="button" disabled={isBusy} onClick={onEdit}>
              수정
            </button>
            <button type="button" disabled={isBusy} onClick={onDelete}>
              삭제
            </button>
          </div>
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
  const postDeleteRequestRef = useRef(false);
  const commentRequestRef = useRef(false);
  const commentDeleteRequestRef = useRef(false);
  const commentInputRef = useRef(null);
  const [post, setPost] = useState(null);
  const [loadState, setLoadState] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [hasImageFailed, setHasImageFailed] = useState(false);
  const [isLikeSubmitting, setIsLikeSubmitting] = useState(false);
  const [likeError, setLikeError] = useState("");
  const [isPostDeleteOpen, setIsPostDeleteOpen] = useState(false);
  const [postDeleteError, setPostDeleteError] = useState("");
  const [isPostDeleting, setIsPostDeleting] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentError, setCommentError] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [deleteTargetComment, setDeleteTargetComment] = useState(null);
  const [commentDeleteError, setCommentDeleteError] = useState("");
  const [isCommentDeleting, setIsCommentDeleting] = useState(false);

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

  const handleOpenPostDelete = () => {
    setPostDeleteError("");
    setIsPostDeleteOpen(true);
  };

  const handleClosePostDelete = () => {
    if (isPostDeleting) {
      return;
    }

    setIsPostDeleteOpen(false);
    setPostDeleteError("");
  };

  const handleConfirmPostDelete = async () => {
    if (
      postDeleteRequestRef.current ||
      !post ||
      authStatus !== AUTH_STATUS.AUTHENTICATED ||
      !currentUser
    ) {
      return;
    }

    postDeleteRequestRef.current = true;
    setIsPostDeleting(true);
    setPostDeleteError("");

    try {
      await deletePost(postId);
      navigate("/posts", { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      if (
        error instanceof ApiError &&
        error.message === "post_not_found"
      ) {
        navigate("/posts", { replace: true });
        return;
      }

      setPostDeleteError(getPostDeleteErrorMessage(error));
    } finally {
      postDeleteRequestRef.current = false;
      setIsPostDeleting(false);
    }
  };

  const resetCommentForm = () => {
    setCommentDraft("");
    setCommentError("");
    setEditingCommentId(null);
  };

  const removeCommentFromPost = (commentId) => {
    setPost((currentPost) => {
      if (currentPost?.postId !== postId) {
        return currentPost;
      }

      const comments = currentPost.comments.filter(
        (comment) => String(comment.commentId) !== String(commentId),
      );

      if (comments.length === currentPost.comments.length) {
        return currentPost;
      }

      return {
        ...currentPost,
        comments,
        commentCount: Math.max(0, (Number(currentPost.commentCount) || 0) - 1),
      };
    });

    if (String(editingCommentId) === String(commentId)) {
      resetCommentForm();
    }
  };

  const handleCommentSubmit = async (event) => {
    event.preventDefault();

    if (authStatus !== AUTH_STATUS.AUTHENTICATED || !currentUser) {
      navigate("/login");
      return;
    }

    const content = commentDraft.trim();

    if (!content) {
      setCommentError("댓글을 입력해주세요.");
      commentInputRef.current?.focus();
      return;
    }

    if (commentRequestRef.current || !post) {
      return;
    }

    const submittedCommentId = editingCommentId;
    commentRequestRef.current = true;
    setIsCommentSubmitting(true);
    setCommentError("");

    try {
      const savedComment = submittedCommentId === null
        ? await createComment(postId, { content })
        : await updateComment(postId, submittedCommentId, { content });

      if (!isValidComment(savedComment)) {
        throw new ApiError({ message: "invalid_comment_response" });
      }

      setPost((currentPost) => {
        if (currentPost?.postId !== postId) {
          return currentPost;
        }

        if (submittedCommentId === null) {
          return {
            ...currentPost,
            comments: [...currentPost.comments, savedComment],
            commentCount: (Number(currentPost.commentCount) || 0) + 1,
          };
        }

        return {
          ...currentPost,
          comments: currentPost.comments.map((comment) => (
            String(comment.commentId) === String(submittedCommentId)
              ? savedComment
              : comment
          )),
        };
      });

      resetCommentForm();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      if (
        submittedCommentId !== null &&
        error instanceof ApiError &&
        error.message === "comment_not_found"
      ) {
        removeCommentFromPost(submittedCommentId);
        setCommentError("이미 삭제된 댓글이라 목록에서 제거했습니다.");
      } else if (
        error instanceof ApiError &&
        error.message === "post_not_found"
      ) {
        setRetryCount((currentCount) => currentCount + 1);
      } else {
        setCommentError(
          getCommentErrorMessage(error, submittedCommentId === null ? "등록" : "수정"),
        );
      }
    } finally {
      commentRequestRef.current = false;
      setIsCommentSubmitting(false);
    }
  };

  const handleStartCommentEdit = (comment) => {
    setEditingCommentId(comment.commentId);
    setCommentDraft(comment.content);
    setCommentError("");
    commentInputRef.current?.focus();
  };

  const handleOpenCommentDelete = (comment) => {
    setDeleteTargetComment(comment);
    setCommentDeleteError("");
  };

  const handleCloseCommentDelete = () => {
    if (isCommentDeleting) {
      return;
    }

    setDeleteTargetComment(null);
    setCommentDeleteError("");
  };

  const handleConfirmCommentDelete = async () => {
    if (
      !deleteTargetComment ||
      commentDeleteRequestRef.current ||
      authStatus !== AUTH_STATUS.AUTHENTICATED ||
      !currentUser
    ) {
      return;
    }

    const deletedCommentId = deleteTargetComment.commentId;
    commentDeleteRequestRef.current = true;
    setIsCommentDeleting(true);
    setCommentDeleteError("");

    try {
      await deleteComment(postId, deletedCommentId);
      removeCommentFromPost(deletedCommentId);
      setDeleteTargetComment(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      if (
        error instanceof ApiError &&
        error.message === "comment_not_found"
      ) {
        removeCommentFromPost(deletedCommentId);
        setDeleteTargetComment(null);
        setCommentError("이미 삭제된 댓글이라 목록에서 제거했습니다.");
      } else if (
        error instanceof ApiError &&
        error.message === "post_not_found"
      ) {
        setDeleteTargetComment(null);
        setRetryCount((currentCount) => currentCount + 1);
      } else {
        setCommentDeleteError(getCommentErrorMessage(error, "삭제"));
      }
    } finally {
      commentDeleteRequestRef.current = false;
      setIsCommentDeleting(false);
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
              <button
                className="post-detail-article__delete"
                type="button"
                onClick={handleOpenPostDelete}
              >
                삭제
              </button>
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

        <form className="post-detail-comment-form" onSubmit={handleCommentSubmit}>
          <label htmlFor="post-detail-comment-input">
            {editingCommentId === null ? "댓글 작성" : "댓글 수정"}
          </label>
          <textarea
            ref={commentInputRef}
            id="post-detail-comment-input"
            value={commentDraft}
            placeholder={
              authStatus === AUTH_STATUS.GUEST
                ? "로그인 후 댓글을 작성할 수 있습니다."
                : "댓글을 입력해주세요."
            }
            aria-invalid={Boolean(commentError)}
            aria-describedby="post-detail-comment-error"
            disabled={isCommentSubmitting}
            onChange={(event) => {
              setCommentDraft(event.target.value);
              if (event.target.value.trim()) {
                setCommentError("");
              }
            }}
          />
          <div className="post-detail-comment-form__footer">
            <p id="post-detail-comment-error" role="alert">
              {commentError}
            </p>
            <div className="post-detail-comment-form__actions">
              {editingCommentId !== null && (
                <button
                  className="post-detail-comment-form__cancel"
                  type="button"
                  disabled={isCommentSubmitting}
                  onClick={resetCommentForm}
                >
                  취소
                </button>
              )}
              <button
                className="post-detail-comment-form__submit"
                type="submit"
                disabled={
                  authStatus === AUTH_STATUS.CHECKING ||
                  isCommentSubmitting
                }
              >
                {isCommentSubmitting
                  ? "처리 중..."
                  : editingCommentId === null
                    ? "댓글 등록"
                    : "댓글 수정"}
              </button>
            </div>
          </div>
        </form>

        {post.comments.length === 0 ? (
          <p className="post-detail-comments__empty">아직 댓글이 없습니다.</p>
        ) : (
          <div className="post-detail-comments__list">
            {post.comments.map((comment) => (
              <PostComment
                key={comment.commentId}
                comment={comment}
                isCurrentUser={isSameUser(currentUser?.userId, comment.authorId)}
                isBusy={isCommentSubmitting || isCommentDeleting}
                isEditing={String(editingCommentId) === String(comment.commentId)}
                onEdit={() => handleStartCommentEdit(comment)}
                onDelete={() => handleOpenCommentDelete(comment)}
              />
            ))}
          </div>
        )}
      </section>

      <ConfirmModal
        isOpen={isPostDeleteOpen}
        title="게시글을 삭제하시겠습니까?"
        description="게시글과 댓글이 모두 삭제되며 다시 복구할 수 없습니다."
        confirmText="삭제"
        errorMessage={postDeleteError}
        isConfirming={isPostDeleting}
        onConfirm={handleConfirmPostDelete}
        onCancel={handleClosePostDelete}
      />

      <ConfirmModal
        isOpen={deleteTargetComment !== null}
        title="댓글을 삭제하시겠습니까?"
        description="삭제한 댓글은 다시 복구할 수 없습니다."
        confirmText="삭제"
        errorMessage={commentDeleteError}
        isConfirming={isCommentDeleting}
        onConfirm={handleConfirmCommentDelete}
        onCancel={handleCloseCommentDelete}
      />
    </div>
  );
}

export default PostDetailPage;
