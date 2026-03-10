
const DEFAULT_LOCAL_API_BASE_URL = "http://localhost:8080";
const DEFAULT_PROD_API_BASE_URL = "https://place-backend-ismy.onrender.com";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? DEFAULT_PROD_API_BASE_URL : DEFAULT_LOCAL_API_BASE_URL);

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
  const controller = new AbortController();
  const timeoutMs = 65000;
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE_URL}/api/engine/health`, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}${text ? ": " + text : ""}`);
    }
    return res.json();
  } catch (e) {
    clearTimeout(id);
    const msg = e?.message || String(e);
    if (msg === "Load failed" || msg === "Failed to fetch" || e?.name === "AbortError") {
      throw new Error(
        "백엔드에 연결할 수 없습니다. 서버가 꺼져 있거나, 주소/CORS를 확인하세요. (무료 호스팅은 첫 요청 시 1분 가까이 걸릴 수 있습니다.)"
      );
    }
    throw e;
  }
}

/** 지도 모드: 네이버 로컬 검색 (업체 목록) */
export async function placeSearch(query) {
  const res = await fetch(
    `${API_BASE_URL}/api/engine/place-search?query=${encodeURIComponent(query)}`
  );
  return res.json();
}

/** 선택한 업체명으로 placeId/placeUrl 조회 (placeId 없을 때 크롤링 요청용) */
export async function placeResolve(title) {
  const res = await fetch(
    `${API_BASE_URL}/api/engine/place-resolve?title=${encodeURIComponent(title || "")}`
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
