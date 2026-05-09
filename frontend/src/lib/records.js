export function fileLabel(record) {
  if (record.download_status === "failed") return "Failed";
  if (!record.media_type) return "Source listed";
  if (record.media_type === "application/pdf") return "PDF";
  if (record.media_type.startsWith("image/")) return "Image";
  if (record.media_type.startsWith("video/")) return "Video";
  if (record.media_type.startsWith("audio/")) return "Audio";
  if (record.media_type.startsWith("text/")) return "Text";
  return record.media_type;
}

export function recordAgency(record) {
  return record.source_metadata?.Agency || "Unknown agency";
}

export function shortHash(hash) {
  if (!hash) return "";
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}
