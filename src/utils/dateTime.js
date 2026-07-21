export function formatRelativeDate(createdAt) {
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
