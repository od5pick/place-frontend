
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

async function jsonFetch(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${text ? ": " + text : ""}`);
  }
  return res.json();
}

export async function diagnoseFree(placeUrl, industry = "hairshop") {
  return jsonFetch("/api/engine/diagnose/free", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ placeUrl, industry }),
  });
}

export async function diagnosePaid(placeUrl, industry = "hairshop", searchQuery = "") {
  return jsonFetch("/api/engine/diagnose/paid", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ placeUrl, industry, searchQuery }),
  });
}

export async function engineHealth() {
  return jsonFetch("/api/engine/health");
}

/** 지도 모드: 네이버 로컬 검색 (업체 목록) */
export async function placeSearch(query) {
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"}/api/engine/place-search?query=${encodeURIComponent(query)}`
  );
  return res.json();
}

/** 선택한 업체명으로 placeId/placeUrl 조회 (placeId 없을 때 크롤링 요청용) */
export async function placeResolve(title) {
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"}/api/engine/place-resolve?title=${encodeURIComponent(title || "")}`
  );
  return res.json();
}

export async function saveResult(payload) {
  return jsonFetch("/api/results", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(payload),
  });
}
