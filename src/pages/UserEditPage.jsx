import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ApiError } from "../api/ApiError.js";
import {
  deleteUser as requestDeleteUser,
  updateUser as requestUpdateUser,
} from "../api/userApi.js";
import ConfirmModal from "../components/common/ConfirmModal.jsx";
import ProfileImage from "../components/common/ProfileImage.jsx";
import MyPageSidebar from "../components/mypage/MyPageSidebar.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { validateNickname } from "../utils/validation.js";
import "./user-edit-page.css";

const TOAST_DURATION = 1800;

function getUpdateErrorFeedback(error) {
  if (!(error instanceof ApiError)) {
    return { form: "회원정보를 수정하지 못했습니다. 다시 시도해주세요." };
  }

  switch (error.message) {
    case "nickname_already_exists":
      return { field: "nickname", message: "중복된 닉네임입니다." };
    case "nickname_blank":
      return { field: "nickname", message: "닉네임을 입력해주세요." };
    case "nickname_whitespace_not_allowed":
      return { field: "nickname", message: "띄어쓰기를 없애주세요." };
    case "nickname_too_long":
      return {
        field: "nickname",
        message: "닉네임은 최대 10자까지 작성 가능합니다.",
      };
    case "image_file_too_large":
      return {
        field: "profileImage",
        message: "프로필 이미지는 10MB 이하만 등록할 수 있습니다.",
      };
    case "image_type_not_allowed":
      return {
        field: "profileImage",
        message: "JPG, PNG, GIF, WEBP 이미지만 등록할 수 있습니다.",
      };
    case "invalid_image_file":
    case "image_file_empty":
      return {
        field: "profileImage",
        message: "선택한 이미지 파일을 확인해주세요.",
      };
    case "network_error":
      return { form: "서버와 연결할 수 없습니다." };
    default:
      return { form: "회원정보 수정에 실패했습니다. 다시 시도해주세요." };
  }
}

function getDeleteErrorMessage(error) {
  if (error instanceof ApiError && error.message === "network_error") {
    return "서버와 연결할 수 없습니다.";
  }

  return "회원탈퇴를 처리하지 못했습니다. 다시 시도해주세요.";
}

function UserEditPage() {
  const navigate = useNavigate();
  const {
    currentUser,
    logout,
    updateCurrentUser,
  } = useAuth();
  const profileInputRef = useRef(null);
  const previewUrlRef = useRef(null);
  const toastTimerRef = useRef(null);
  const [nickname, setNickname] = useState(currentUser.nickname ?? "");
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState(null);
  const [removeProfileImage, setRemoveProfileImage] = useState(false);
  const [isNicknameTouched, setIsNicknameTouched] = useState(false);
  const [nicknameServerError, setNicknameServerError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    window.clearTimeout(toastTimerRef.current);
  }, []);

  const nicknameValidationError = useMemo(
    () => validateNickname(nickname),
    [nickname],
  );
  const displayedNicknameError = nicknameServerError || (
    isNicknameTouched ? nicknameValidationError : ""
  );
  const hasNicknameChanged = nickname.trim() !== currentUser.nickname;
  const hasProfileChanged = Boolean(profileImageFile) || removeProfileImage;
  const hasChanges = hasNicknameChanged || hasProfileChanged;
  const canSubmit = hasChanges && !nicknameValidationError && !isSubmitting;
  const displayedProfileSource = removeProfileImage
    ? null
    : profilePreviewUrl || currentUser.profileImage;

  const showToast = (message) => {
    window.clearTimeout(toastTimerRef.current);
    setToastMessage(message);

    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage("");
    }, TOAST_DURATION);
  };

  const clearPreviewUrl = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  const handleNicknameChange = (event) => {
    setNickname(event.target.value);
    setNicknameServerError("");
    setSubmitError("");
  };

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0] ?? null;

    clearPreviewUrl();
    setProfileImageFile(file);
    setRemoveProfileImage(false);
    setProfileError("");
    setSubmitError("");

    if (!file) {
      setProfilePreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setProfilePreviewUrl(previewUrl);
  };

  const handleProfileImageRemove = () => {
    clearPreviewUrl();
    setProfileImageFile(null);
    setProfilePreviewUrl(null);
    setRemoveProfileImage(Boolean(currentUser.profileImage));
    setProfileError("");
    setSubmitError("");

    if (profileInputRef.current) {
      profileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsNicknameTouched(true);
    setNicknameServerError("");
    setProfileError("");
    setSubmitError("");

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedUser = await requestUpdateUser(currentUser.userId, {
        nickname: nickname.trim(),
        profileImageFile,
        removeProfileImage,
      });

      updateCurrentUser(updatedUser);
      clearPreviewUrl();
      setNickname(updatedUser.nickname);
      setProfileImageFile(null);
      setProfilePreviewUrl(null);
      setRemoveProfileImage(false);
      setIsNicknameTouched(false);

      if (profileInputRef.current) {
        profileInputRef.current.value = "";
      }

      showToast("회원정보가 수정되었습니다.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      const feedback = getUpdateErrorFeedback(error);

      if (feedback.field === "nickname") {
        setNicknameServerError(feedback.message);
      } else if (feedback.field === "profileImage") {
        setProfileError(feedback.message);
      } else {
        setSubmitError(feedback.form);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const openDeleteModal = () => {
    setDeleteError("");
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (!isDeleting) {
      setIsDeleteModalOpen(false);
      setDeleteError("");
    }
  };

  const handleDeleteUser = async () => {
    setIsDeleting(true);
    setDeleteError("");

    try {
      await requestDeleteUser(currentUser.userId);
      logout();
      navigate("/login", { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      setDeleteError(getDeleteErrorMessage(error));
      setIsDeleting(false);
    }
  };

  return (
    <div className="user-edit-page">
      <header className="user-edit-page__intro">
        <h1 className="user-edit-page__title">MY PAGE</h1>
      </header>

      <div className="user-edit-page__layout">
        <MyPageSidebar
          isBusy={isSubmitting || isDeleting}
          onLogout={handleLogout}
        />

        <section className="user-edit-card" aria-labelledby="user-edit-title">
          <div className="user-edit-card__topline">
            <span>PROFILE / 01</span>
            <span className="user-edit-card__status">RESCENE</span>
          </div>

          <div className="user-edit-card__summary">
            <div className="user-edit-card__profile-area">
              <label
                className="user-edit-card__profile-button"
                htmlFor="user-profile-image"
                aria-label="프로필 이미지 변경"
              >
                <ProfileImage
                  className="user-edit-card__profile-image"
                  src={displayedProfileSource}
                  alt="현재 프로필 이미지"
                />
                <span className="user-edit-card__edit-badge">EDIT</span>
              </label>
              <input
                ref={profileInputRef}
                className="user-edit-card__profile-input"
                id="user-profile-image"
                name="profileImage"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                aria-describedby="user-profile-error"
                disabled={isSubmitting}
                onChange={handleProfileImageChange}
              />
              {(currentUser.profileImage || profileImageFile) && (
                <button
                  className="user-edit-card__profile-remove"
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleProfileImageRemove}
                >
                  기본 이미지로 변경
                </button>
              )}
              <p
                className="user-edit-card__profile-error"
                id="user-profile-error"
                aria-live="polite"
              >
                {profileError}
              </p>
            </div>

            <div className="user-edit-card__identity">
              <p className="user-edit-card__identity-label">INFO</p>
              <h2 className="user-edit-card__display-name" id="user-edit-title">
                {nickname.trim() || "회원님"}
              </h2>
              <p className="user-edit-card__email">{currentUser.email}</p>
            </div>
          </div>

          <div className="user-edit-card__divider" />

          <form className="user-edit-form" noValidate onSubmit={handleSubmit}>
            <div className="user-edit-form__heading">
              <p>PERSONAL INFO</p>
              <span>01 / 02</span>
            </div>

            <div className="user-edit-form__field">
              <span className="user-edit-form__label">이메일</span>
              <p className="user-edit-form__readonly">{currentUser.email}</p>
            </div>

            <div className="user-edit-form__field">
              <label className="user-edit-form__label" htmlFor="user-nickname">
                닉네임
              </label>
              <input
                className="user-edit-form__input"
                id="user-nickname"
                name="nickname"
                type="text"
                autoComplete="nickname"
                value={nickname}
                aria-describedby="user-nickname-error"
                aria-invalid={Boolean(displayedNicknameError)}
                disabled={isSubmitting}
                onBlur={() => setIsNicknameTouched(true)}
                onChange={handleNicknameChange}
              />
              <p
                className="user-edit-form__helper"
                id="user-nickname-error"
                aria-live="polite"
              >
                {displayedNicknameError}
              </p>
            </div>

            <p
              className="user-edit-form__submit-error"
              role={submitError ? "alert" : undefined}
            >
              {submitError}
            </p>

            <button
              className="user-edit-form__submit"
              type="submit"
              disabled={!canSubmit}
            >
              {isSubmitting ? "저장 중..." : "회원정보 저장"}
            </button>

            <button
              className="user-edit-form__delete"
              type="button"
              disabled={isSubmitting}
              onClick={openDeleteModal}
            >
              회원 탈퇴
            </button>
          </form>
        </section>
      </div>

      <div
        className={`user-edit-toast${toastMessage ? " is-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toastMessage}
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="회원탈퇴 하시겠습니까?"
        description="계정이 비활성화되며 다시 로그인할 수 없습니다."
        confirmText="회원탈퇴"
        errorMessage={deleteError}
        isConfirming={isDeleting}
        onConfirm={handleDeleteUser}
        onCancel={closeDeleteModal}
      />
    </div>
  );
}

export default UserEditPage;
