import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ApiError } from "../api/ApiError.js";
import { createPost as requestCreatePost } from "../api/postApi.js";
import { uploadPostImage } from "../api/uploadApi.js";
import { useAuth } from "../hooks/useAuth.js";
import {
  POST_TITLE_MAX_LENGTH,
  validatePostContent,
  validatePostImage,
  validatePostTitle,
} from "../utils/postFormValidation.js";
import "./post-form-page.css";

function getRequestErrorMessage(error, phase) {
  if (!(error instanceof ApiError)) {
    return phase === "upload"
      ? "이미지를 업로드하지 못했습니다. 다시 시도해주세요."
      : "게시글을 등록하지 못했습니다. 다시 시도해주세요.";
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
    case "network_error":
      return "서버와 연결할 수 없습니다.";
    default:
      return phase === "upload"
        ? "이미지 업로드에 실패했습니다. 다시 시도해주세요."
        : "게시글 등록에 실패했습니다. 다시 시도해주세요.";
  }
}

function hasValidPostId(post) {
  return Number.isSafeInteger(post?.postId) && post.postId > 0;
}

function PostCreatePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const formRef = useRef(null);
  const imageInputRef = useRef(null);
  const previewUrlRef = useRef(null);
  const uploadedImageRef = useRef(null);
  const submittingRef = useRef(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageError, setImageError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [touched, setTouched] = useState({ title: false, content: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
  }, []);

  const fieldErrors = useMemo(() => ({
    title: validatePostTitle(title),
    content: validatePostContent(content),
  }), [content, title]);
  const isFormValid = !fieldErrors.title && !fieldErrors.content && !imageError;

  const clearPreviewUrl = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  const handleTitleChange = (event) => {
    setTitle(event.target.value);
    setSubmitError("");
  };

  const handleContentChange = (event) => {
    setContent(event.target.value);
    setSubmitError("");
  };

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
    setImageError("");
  };

  const handleImageRemove = () => {
    clearPreviewUrl();
    uploadedImageRef.current = null;
    setImageFile(null);
    setPreviewUrl("");
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
    let requestPhase = imageFile ? "upload" : "create";

    try {
      let contentImage = null;

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

      requestPhase = "create";
      const createdPost = await requestCreatePost({
        title: title.trim(),
        content: content.trim(),
        contentImage,
      });

      if (!hasValidPostId(createdPost)) {
        setSubmitError(
          "게시글 등록 응답을 확인할 수 없습니다. 목록에서 등록 여부를 확인해주세요.",
        );
        return;
      }

      navigate(`/posts/${createdPost.postId}`, { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      setSubmitError(getRequestErrorMessage(error, requestPhase));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <section className="post-form-page" aria-labelledby="post-create-title">
      <header className="post-form-page__header">
        <p className="post-form-page__eyebrow">COMMUNITY / WRITE</p>
        <h1 id="post-create-title">게시글 작성</h1>
        <p>Remine과 나누고 싶은 이야기를 작성해주세요.</p>
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
            onChange={handleTitleChange}
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
            onChange={handleContentChange}
          />
          <p className="post-form-field__helper" id="post-content-error" aria-live="polite">
            {touched.content ? fieldErrors.content : ""}
          </p>
        </div>

        <div className="post-form-image">
          <label htmlFor="post-image">이미지</label>
          <p className="post-form-image__description">
            JPG, PNG, GIF, WEBP 형식의 10MB 이하 이미지를 등록할 수 있습니다.
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
            {imageFile && (
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
            {imageError || (imageFile ? imageFile.name : "이미지는 선택사항입니다.")}
          </p>

          {previewUrl && (
            <div className="post-form-image__preview">
              <img src={previewUrl} alt="선택한 게시글 이미지 미리보기" />
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
            onClick={() => navigate("/posts")}
          >
            취소
          </button>
          <button
            className="post-form-card__submit"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "등록 중..." : "완료"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default PostCreatePage;
