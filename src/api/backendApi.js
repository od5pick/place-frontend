
const DEFAULT_LOCAL_API_BASE_URL = "http://localhost:8080";
const DEFAULT_PROD_API_BASE_URL = "https://place-backend-ismy.onrender.com";

/** Spring 백엔드 베이스 URL (Vite 프록시 없음 → 반드시 전체 URL 사용) */
export const API_BASE_URL =
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

export async function diagnosePaid(placeUrl, industry = "hairshop", searchQuery = "", name = "", address = "", x = null, y = null, diagnosticData = null) {
  const payload = { 
    placeUrl, 
    industry, 
    searchQuery, 
    name, 
    address, 
    x, 
    y 
  };
  
  // ✅ 일반진단 데이터가 있으면 함께 전달
  if (diagnosticData) {
    console.log("[API] diagnosticData 수신:", diagnosticData);
    
    // ✅ 구조: diagnosticData.data.data.placeData
    const nodeResponse = diagnosticData?.data?.data || {};
    const placeData = nodeResponse?.placeData || {};
    const scores = nodeResponse?.scores || {};
    const totalScore = nodeResponse?.totalScore;
    const totalGrade = nodeResponse?.totalGrade;
    
    console.log("[API] nodeResponse 구조:", Object.keys(nodeResponse));
    console.log("[API] placeData 구조:", Object.keys(placeData));
    console.log("[API] scores 구조:", Object.keys(scores));
    
    // ✅ placeData에서 정보 추출
    if (placeData.description) {
      payload.description = placeData.description;
      console.log("[API] ✅ description 추출:", placeData.description.substring(0, 50) + "...");
    } else {
      console.log("[API] ⚠️  description 없음");
    }
    
    if (placeData.directions) {
      payload.directions = placeData.directions;
      console.log("[API] ✅ directions 추출:", placeData.directions.substring(0, 50) + "...");
    } else {
      console.log("[API] ⚠️  directions 없음");
    }
    
    if (placeData.keywords && Array.isArray(placeData.keywords)) {
      payload.keywords = placeData.keywords;
      console.log("[API] ✅ keywords 추출:", placeData.keywords);
    } else {
      console.log("[API] ⚠️  keywords 없음");
    }
    
    if (placeData.reviewCount != null) {
      payload.reviews = placeData.reviewCount;
      console.log("[API] ✅ reviews 추출:", placeData.reviewCount);
    }
    
    if (placeData.photoCount != null) {
      payload.photos = placeData.photoCount;
      console.log("[API] ✅ photos 추출:", placeData.photoCount);
    }
    
    if (placeData.menuCount != null) {
      payload.price = placeData.menuCount;
      console.log("[API] ✅ price/menu 추출:", placeData.menuCount);
    }
    
    // ✅ scores에서 점수 정보 추출
    if (scores && Object.keys(scores).length > 0) {
      payload.scores = scores;
      console.log("[API] ✅ scores 추출:", Object.keys(scores));
    } else {
      console.log("[API] ⚠️  scores 없음");
    }
    
    if (totalScore != null) {
      payload.totalScore = totalScore;
      console.log("[API] ✅ totalScore 추출:", totalScore);
    }
    
    if (totalGrade) {
      payload.totalGrade = totalGrade;
      console.log("[API] ✅ totalGrade 추출:", totalGrade);
    }
    
    console.log("[API] 최종 payload 키:", Object.keys(payload));
    console.log("[API] 최종 payload 데이터 확인:");
    console.log("[API]   - description:", payload.description ? "있음" : "없음");
    console.log("[API]   - directions:", payload.directions ? "있음" : "없음");
    console.log("[API]   - keywords:", payload.keywords ? payload.keywords.length + "개" : "없음");
    console.log("[API]   - reviews:", payload.reviews);
    console.log("[API]   - photos:", payload.photos);
    console.log("[API]   - totalScore:", payload.totalScore);
  } else {
    console.log("[API] diagnosticData 없음");
  }
  
  return jsonFetch("/api/engine/diagnose/paid", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(payload),
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
