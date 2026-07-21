import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ApiError } from "../api/ApiError.js";
import {
  getPost,
  updatePost as requestUpdatePost,
} from "../api/postApi.js";
import { uploadPostImage } from "../api/uploadApi.js";
import ErrorState from "../components/common/ErrorState.jsx";
import LoadingState from "../components/common/LoadingState.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { resolveImageUrl } from "../utils/imageUrl.js";
import {
  POST_TITLE_MAX_LENGTH,
  validatePostContent,
  validatePostImage,
  validatePostTitle,
} from "../utils/postFormValidation.js";
import "./post-form-page.css";

function parsePostId(value) {
  const parsedValue = Number(value);

  return Number.isSafeInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : null;
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

function getLoadErrorMessage(error) {
  if (error instanceof ApiError && error.status === 404) {
    return "존재하지 않거나 삭제된 게시글입니다.";
  }

  if (error instanceof ApiError && error.message === "network_error") {
    return "서버와 연결할 수 없습니다.";
  }

  return "게시글을 불러오지 못했습니다.";
}

function getUpdateErrorMessage(error, phase) {
  if (!(error instanceof ApiError)) {
    return phase === "upload"
      ? "이미지를 업로드하지 못했습니다. 다시 시도해주세요."
      : "게시글을 수정하지 못했습니다. 다시 시도해주세요.";
  }

  if (error.status === 403) {
    return "게시글을 수정할 권한이 없습니다.";
  }

  if (error.status === 404) {
    return "존재하지 않거나 삭제된 게시글입니다.";
  }

  switch (error.message) {
    case "image_file_too_large":
      return "게시글 이미지는 10MB 이하만 등록할 수 있습니다.";
    case "image_type_not_allowed":
      return "JPG, PNG, GIF, WEBP 이미지만 등록할 수 있습니다.";
    case "invalid_image_file":
    case "image_file_empty":
      return "선택한 이미지 파일을 확인해주세요.";
    case "title_blank":
      return "제목을 입력해주세요.";
    case "content_blank":
      return "내용을 입력해주세요.";
    case "content_image_update_conflict":
      return "이미지 교체와 삭제를 동시에 요청할 수 없습니다.";
    case "network_error":
      return "서버와 연결할 수 없습니다.";
    default:
      return phase === "upload"
        ? "이미지 업로드에 실패했습니다. 다시 시도해주세요."
        : "게시글 수정에 실패했습니다. 다시 시도해주세요.";
  }
}

function hasValidUpdatedPost(updatedPost, postId) {
  return updatedPost?.postId === postId;
}

function PostEditPage() {
  const { postId: postIdParam } = useParams();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const postId = useMemo(() => parsePostId(postIdParam), [postIdParam]);
  const formRef = useRef(null);
  const imageInputRef = useRef(null);
  const previewUrlRef = useRef(null);
  const uploadedImageRef = useRef(null);
  const submittingRef = useRef(false);
  const [post, setPost] = useState(null);
  const [loadState, setLoadState] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [removeContentImage, setRemoveContentImage] = useState(false);
  const [hasExistingImageFailed, setHasExistingImageFailed] = useState(false);
  const [imageError, setImageError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [touched, setTouched] = useState({ title: false, content: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearPreviewUrl = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  useEffect(() => () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
  }, []);

  useEffect(() => {
    if (postId === null) {
      return undefined;
    }

    const controller = new AbortController();
    const loadTimer = window.setTimeout(async () => {
      setLoadState("loading");
      setLoadError("");
      setPost(null);

      try {
        const postDetail = await getPost(postId, { signal: controller.signal });

        if (controller.signal.aborted) {
          return;
        }

        if (!postDetail) {
          throw new ApiError({ message: "invalid_post_detail_response" });
        }

        clearPreviewUrl();
        uploadedImageRef.current = null;
        setPost(postDetail);
        setTitle(postDetail.title ?? "");
        setContent(postDetail.content ?? "");
        setImageFile(null);
        setPreviewUrl("");
        setRemoveContentImage(false);
        setHasExistingImageFailed(false);
        setImageError("");
        setSubmitError("");
        setTouched({ title: false, content: false });
        setLoadState("success");

        if (imageInputRef.current) {
          imageInputRef.current.value = "";
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setLoadError(getLoadErrorMessage(error));
        setLoadState("error");
      }
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
      controller.abort();
    };
  }, [postId, retryCount]);

  const fieldErrors = useMemo(() => ({
    title: validatePostTitle(title),
    content: validatePostContent(content),
  }), [content, title]);
  const isFormValid = !fieldErrors.title && !fieldErrors.content && !imageError;
  const isPostAuthor = isSameUser(currentUser?.userId, post?.authorId);
  const existingImageUrl = removeContentImage || imageFile
    ? null
    : resolveImageUrl(post?.contentImage);

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    const nextImageError = validatePostImage(file);

    clearPreviewUrl();
    uploadedImageRef.current = null;
    setSubmitError("");

    if (!file || nextImageError) {
      setImageFile(null);
      setPreviewUrl("");
      setImageError(nextImageError);

      if (nextImageError) {
        event.target.value = "";
      }

      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextPreviewUrl;
    setImageFile(file);
    setPreviewUrl(nextPreviewUrl);
    setRemoveContentImage(false);
    setImageError("");
  };

  const handleImageRemove = () => {
    clearPreviewUrl();
    uploadedImageRef.current = null;
    setImageFile(null);
    setPreviewUrl("");
    setRemoveContentImage(Boolean(post?.contentImage));
    setImageError("");
    setSubmitError("");

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const focusFirstInvalidField = () => {
    const firstInvalidField = ["title", "content"].find(
      (field) => fieldErrors[field],
    );

    if (firstInvalidField) {
      window.requestAnimationFrame(() => {
        formRef.current?.elements.namedItem(firstInvalidField)?.focus();
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched({ title: true, content: true });
    setSubmitError("");

    if (!isFormValid || submittingRef.current) {
      if (!isFormValid) {
        focusFirstInvalidField();
      }
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    let requestPhase = imageFile ? "upload" : "update";

    try {
      let contentImage;

      if (imageFile) {
        const cachedUpload = uploadedImageRef.current;

        if (cachedUpload?.file === imageFile) {
          contentImage = cachedUpload.path;
        } else {
          contentImage = await uploadPostImage(imageFile);

          if (!contentImage) {
            throw new Error("업로드된 이미지 경로가 없습니다.");
          }

          uploadedImageRef.current = { file: imageFile, path: contentImage };
        }
      }

      requestPhase = "update";
      const updatedPost = await requestUpdatePost(postId, {
        title: title.trim(),
        content: content.trim(),
        contentImage,
        removeContentImage,
      });

      if (!hasValidUpdatedPost(updatedPost, postId)) {
        setSubmitError(
          "게시글 수정 응답을 확인할 수 없습니다. 상세 페이지에서 변경 여부를 확인해주세요.",
        );
        return;
      }

      navigate(`/posts/${postId}`, { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      setSubmitError(getUpdateErrorMessage(error, requestPhase));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (postId === null) {
    return (
      <div className="post-form-page post-form-page--feedback">
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
      <div className="post-form-page post-form-page--feedback">
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
      <div className="post-form-page post-form-page--feedback">
        <LoadingState message="수정할 게시글을 불러오는 중입니다." />
      </div>
    );
  }

  if (!isPostAuthor) {
    return (
      <div className="post-form-page post-form-page--feedback">
        <ErrorState
          message="게시글 작성자만 수정할 수 있습니다."
          retryText="게시글로 돌아가기"
          onRetry={() => navigate(`/posts/${postId}`, { replace: true })}
        />
      </div>
    );
  }

  return (
    <section className="post-form-page" aria-labelledby="post-edit-title">
      <header className="post-form-page__header">
        <p className="post-form-page__eyebrow">COMMUNITY / EDIT</p>
        <h1 id="post-edit-title">게시글 수정</h1>
        <p>작성한 게시글의 제목, 내용과 이미지를 수정할 수 있습니다.</p>
      </header>

      <form
        ref={formRef}
        className="post-form-card"
        noValidate
        onSubmit={handleSubmit}
      >
        <div className="post-form-field">
          <div className="post-form-field__label-row">
            <label htmlFor="post-title">제목</label>
            <span aria-live="polite">
              {title.length}/{POST_TITLE_MAX_LENGTH}
            </span>
          </div>
          <input
            id="post-title"
            name="title"
            type="text"
            maxLength={POST_TITLE_MAX_LENGTH}
            placeholder="제목을 입력해주세요. (최대 26자)"
            value={title}
            aria-describedby="post-title-error"
            aria-invalid={touched.title && Boolean(fieldErrors.title)}
            disabled={isSubmitting}
            onBlur={() => setTouched((current) => ({ ...current, title: true }))}
            onChange={(event) => {
              setTitle(event.target.value);
              setSubmitError("");
            }}
          />
          <p className="post-form-field__helper" id="post-title-error" aria-live="polite">
            {touched.title ? fieldErrors.title : ""}
          </p>
        </div>

        <div className="post-form-field">
          <label htmlFor="post-content">내용</label>
          <textarea
            id="post-content"
            name="content"
            placeholder="내용을 입력해주세요."
            value={content}
            aria-describedby="post-content-error"
            aria-invalid={touched.content && Boolean(fieldErrors.content)}
            disabled={isSubmitting}
            onBlur={() => setTouched((current) => ({ ...current, content: true }))}
            onChange={(event) => {
              setContent(event.target.value);
              setSubmitError("");
            }}
          />
          <p className="post-form-field__helper" id="post-content-error" aria-live="polite">
            {touched.content ? fieldErrors.content : ""}
          </p>
        </div>

        <div className="post-form-image">
          <label htmlFor="post-image">이미지</label>
          <p className="post-form-image__description">
            이미지를 선택하지 않으면 기존 이미지를 유지합니다.
          </p>

          <div className="post-form-image__controls">
            <input
              ref={imageInputRef}
              id="post-image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              aria-describedby="post-image-message"
              aria-invalid={Boolean(imageError)}
              disabled={isSubmitting}
              onChange={handleImageChange}
            />
            {(imageFile || existingImageUrl) && (
              <button
                className="post-form-image__remove"
                type="button"
                disabled={isSubmitting}
                onClick={handleImageRemove}
              >
                이미지 삭제
              </button>
            )}
          </div>

          <p
            className={`post-form-image__message${imageError ? " is-error" : ""}`}
            id="post-image-message"
            aria-live="polite"
          >
            {imageError || (
              imageFile
                ? imageFile.name
                : existingImageUrl
                  ? "기존 이미지가 등록되어 있습니다."
                  : removeContentImage
                    ? "수정하면 기존 이미지가 삭제됩니다."
                    : "등록된 이미지가 없습니다."
            )}
          </p>

          {previewUrl && (
            <div className="post-form-image__preview">
              <img src={previewUrl} alt="새로 선택한 게시글 이미지 미리보기" />
            </div>
          )}

          {existingImageUrl && !hasExistingImageFailed && (
            <div className="post-form-image__preview">
              <img
                src={existingImageUrl}
                alt="기존 게시글 이미지 미리보기"
                onError={() => setHasExistingImageFailed(true)}
              />
            </div>
          )}
        </div>

        <p className="post-form-card__submit-error" role="alert">
          {submitError}
        </p>

        <div className="post-form-card__actions">
          <button
            className="post-form-card__cancel"
            type="button"
            disabled={isSubmitting}
            onClick={() => navigate(`/posts/${postId}`)}
          >
            취소
          </button>
          <button
            className="post-form-card__submit"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "수정 중..." : "수정하기"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default PostEditPage;
