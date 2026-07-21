import { useState } from "react";
import defaultProfileImage from "../../assets/rescene-default-profile.jpg";
import { resolveImageUrl } from "../../utils/imageUrl.js";
import "./profile-image.css";

function ProfileImage({ src = null, alt = "", className = "" }) {
  const resolvedSource = resolveImageUrl(src);
  const [failedSource, setFailedSource] = useState(null);
  const shouldUseFallback = !resolvedSource || resolvedSource === failedSource;
  const imageSource = shouldUseFallback ? defaultProfileImage : resolvedSource;
  const classes = ["profile-image", className].filter(Boolean).join(" ");

  function handleImageError() {
    if (!shouldUseFallback) {
      setFailedSource(resolvedSource);
    }
  }

  return (
    <img
      className={classes}
      src={imageSource}
      alt={alt}
      decoding="async"
      onError={handleImageError}
    />
  );
}

export default ProfileImage;
