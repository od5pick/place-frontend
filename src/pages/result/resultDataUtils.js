import { KEY_TO_KOREAN } from "./resultConstants";

export function pick(obj, ...keys) {
  for (const key of keys) {
    if (obj && obj[key] != null) return obj[key];
  }
  return undefined;
}

// payload 추출: { data: apiResponse, placeUrl, industry } 이면 payload = apiResponse.data
export function getInner(data) {
  if (!data) return {};
  if (data?.data?.data) return data.data.data;
  return data?.data || data || {};
}

export function getLogs(data) {
  if (Array.isArray(data?.data?.logs)) return data.data.logs;
  if (Array.isArray(data?.logs)) return data.logs;
  return [];
}

export function getScoreFromScores(scores, key, index) {
  if (!scores || typeof scores !== "object") return 0;
  const v = scores[key] ?? scores[KEY_TO_KOREAN[key]];
  if (v != null) return typeof v === "number" ? v : (v.score ?? 0);
  if (Array.isArray(scores) && typeof index === "number" && scores[index] != null) {
    const n = scores[index];
    return typeof n === "number" ? n : (n?.score ?? 0);
  }
  return 0;
}

export function scoreValue(data, key, index) {
  const inner = getInner(data);
  const scores = inner.scores || {};
  return getScoreFromScores(scores, key, index);
}

export function totalValue(data) {
  const inner = getInner(data);
  const scores = inner.scores || {};
  const scores_array = [
    getScoreFromScores(scores, "description", 0),
    getScoreFromScores(scores, "directions", 1),
    getScoreFromScores(scores, "keywords", 2),
    getScoreFromScores(scores, "reviews", 3),
    getScoreFromScores(scores, "price", 4),
  ];
  const total = scores_array.reduce((a, b) => a + b, 0);
  const average = Math.round(total / 5);
  return average || 0;
}

export function gradeValue(data) {
  const inner = getInner(data);
  return pick(inner, "totalGrade", "grade") ?? "";
}

export function sectionExplain(data, key, index) {
  const inner = getInner(data);
  const explain = inner.scoreExplain || {};
  const byKey = explain[key] || explain[KEY_TO_KOREAN[key]];
  if (byKey) return byKey;
  if (Array.isArray(explain) && typeof index === "number" && explain[index]) return explain[index];
  return {};
}

export function getPlaceDisplayName(data) {
  const inner = getInner(data);
  return data?.mapPlaceInfo?.name || inner.placeData?.name || "";
}

export function placeAddress(data) {
  const inner = getInner(data);
  return data?.mapPlaceInfo?.address || inner.placeData?.address || "";
}

/** 항목별 유료 컨설팅 API 응답 → 전체 유료진단 `data`와 동일한 필드로 해석 */
export function normalizeItemConsultingEntry(entry) {
  if (!entry || entry.error || entry.success === false) return null;
  const inner = entry.data;
  if (!inner || typeof inner !== "object") return null;
  const imp = inner.improvements;
  const out = {
    keywords: [],
    description: "",
    directions: "",
    priceText: "",
  };
  if (Array.isArray(inner.recommendedKeywords) && inner.recommendedKeywords.length) {
    out.keywords = inner.recommendedKeywords.filter((k) => typeof k === "string");
  }
  if (imp && typeof imp === "object" && !Array.isArray(imp)) {
    if (Array.isArray(imp.keywords)) {
      out.keywords = imp.keywords.filter((k) => typeof k === "string");
    }
    if (typeof imp.description === "string") out.description = imp.description;
    if (typeof imp.directions === "string") out.directions = imp.directions;
    if (typeof imp.price === "string") out.priceText = imp.price;
  }
  return out;
}
