
import React, { useState, useMemo } from "react";
import ScoreCard from "../components/ScoreCard";
import { diagnosePaid } from "../api/backendApi";
import "./result.css";

function defaultSearchQuery(industry) {
  const v = String(industry || "hairshop").toLowerCase();
  if (v === "cafe") return "서대문역 카페";
  if (v === "restaurant") return "서대문역 맛집";
  return "서대문역 미용실";
}

function pick(obj, ...keys) {
  for (const key of keys) {
    if (obj && obj[key] != null) return obj[key];
  }
  return undefined;
}

// payload 추출: { data: apiResponse, placeUrl, industry } 이면 payload = apiResponse.data
function getInner(data) {
  if (!data) return {};
  if (data?.data?.data) return data.data.data; // Result가 받는 새 형태
  return data?.data || data || {};
}

function getLogs(data) {
  if (Array.isArray(data?.data?.logs)) return data.data.logs;
  if (Array.isArray(data?.logs)) return data.logs;
  return [];
}

// 백엔드 영문 키 ↔ 한글 키
const KEY_TO_KOREAN = {
  description: "상세설명",
  directions: "오시는길",
  keywords: "대표키워드",
  reviews: "리뷰",
  price: "가격/메뉴",
};

function getScoreFromScores(scores, key, index) {
  if (!scores || typeof scores !== "object") return 0;
  // 객체인 경우: 영문/한글 키로 조회
  const v = scores[key] ?? scores[KEY_TO_KOREAN[key]];
  if (v != null) return typeof v === "number" ? v : (v.score ?? 0);
  // 배열로 내려준 경우(순서: description, directions, keywords, reviews, photos, price)
  if (Array.isArray(scores) && typeof index === "number" && scores[index] != null) {
    const n = scores[index];
    return typeof n === "number" ? n : (n?.score ?? 0);
  }
  return 0;
}

function scoreValue(data, key, index) {
  const inner = getInner(data);
  const scores = inner.scores || {};
  return getScoreFromScores(scores, key, index);
}

function totalValue(data) {
  const inner = getInner(data);
  
  // ✅ 5개 항목(사진 제외)으로 항상 평균 계산
  const scores = inner.scores || {};
  const scores_array = [
    getScoreFromScores(scores, "description", 0),  // 상세설명
    getScoreFromScores(scores, "directions", 1),   // 오시는길
    getScoreFromScores(scores, "keywords", 2),     // 대표키워드
    getScoreFromScores(scores, "reviews", 3),      // 리뷰
    getScoreFromScores(scores, "price", 4),        // 가격/메뉴
  ];
  
  // 평균 계산
  const total = scores_array.reduce((a, b) => a + b, 0);
  const average = Math.round(total / 5);
  
  return average || 0;
}

function gradeValue(data) {
  const inner = getInner(data);
  return pick(inner, "totalGrade", "grade") ?? "";
}

function sectionExplain(data, key, index) {
  const inner = getInner(data);
  const explain = inner.scoreExplain || {};
  const byKey = explain[key] || explain[KEY_TO_KOREAN[key]];
  if (byKey) return byKey;
  if (Array.isArray(explain) && typeof index === "number" && explain[index]) return explain[index];
  return {};
}

function placeName(data) {
  const inner = getInner(data);
  // ✅ 지도에서 전달받은 이름 우선, 없으면 무료 진단 결과에서
  return data?.mapPlaceInfo?.name || inner.placeData?.name || "";
}

function placeAddress(data) {
  const inner = getInner(data);
  // ✅ 지도에서 전달받은 주소 우선, 없으면 무료 진단 결과에서
  return data?.mapPlaceInfo?.address || inner.placeData?.address || "";
}

// 백엔드 engine.ts와 동일한 항목 (사진은 제외, 크롤링 미지원)
const RESULT_CATEGORIES = [
  { key: "description", title: "상세설명" },
  { key: "directions", title: "오시는길" },
  { key: "keywords", title: "대표키워드" },
  { key: "reviews", title: "리뷰" },
  { key: "price", title: "가격/메뉴" },
];

export default function Result({ data, onBack }) {
  const [showLogs, setShowLogs] = useState(true);
  const [paidData, setPaidData] = useState(null);
  const [paidLoading, setPaidLoading] = useState(false);
  const [paidError, setPaidError] = useState("");
  const placeUrl = data?.placeUrl;
  const industry = data?.industry || "hairshop";
  const defaultQuery = useMemo(() => defaultSearchQuery(industry), [industry]);
  const [searchQuery, setSearchQuery] = useState(defaultQuery);

  const grade = gradeValue(data);
  const logs = getLogs(data);

  async function runPaidDiagnosis() {
    if (!placeUrl) {
      setPaidError("진단 URL이 없습니다. 무료 진단을 먼저 실행해 주세요.");
      return;
    }
    setPaidError("");
    setPaidLoading(true);
    setPaidData(null);
    try {
      // ✅ 지도에서 조회한 이름/주소/좌표를 함께 전달
      const mapPlaceInfo = data?.mapPlaceInfo || {};
      const x = mapPlaceInfo.x || mapPlaceInfo.mapx;
      const y = mapPlaceInfo.y || mapPlaceInfo.mapy;
      
      console.log("[Result] ========== 유료진단 시작 ==========");
      console.log("[Result] data 전체 구조:", Object.keys(data || {}));
      console.log("[Result] data.data 구조:", Object.keys(data?.data || {}));
      console.log("[Result] data.data.data 구조:", Object.keys(data?.data?.data || {}));
      console.log("[Result] mapPlaceInfo:", mapPlaceInfo);
      console.log("[Result] 유료진단 호출: x=" + x + ", y=" + y);
      console.log("[Result] placeName:", placeName(data));
      console.log("[Result] placeAddress:", placeAddress(data));
      
      // 데이터 구조 상세 확인
      const inner = data?.data?.data || data?.data || data || {};
      console.log("[Result] inner 키:", Object.keys(inner));
      console.log("[Result] inner.scores:", inner.scores);
      console.log("[Result] inner.description:", inner.description ? inner.description.substring(0, 50) : "없음");
      console.log("[Result] inner.directions:", inner.directions ? inner.directions.substring(0, 50) : "없음");
      console.log("[Result] inner.keywords:", inner.keywords);
      
      const res = await diagnosePaid(
        placeUrl,
        industry,
        searchQuery.trim() || defaultQuery,
        placeName(data),     // 지도 이름
        placeAddress(data),  // 지도 주소
        x,                   // 경도
        y,                   // 위도
        data                 // ✅ 일반진단 전체 데이터 전달
      );
      setPaidData(res);
    } catch (e) {
      setPaidError(e?.message || "유료 진단 실패");
    } finally {
      setPaidLoading(false);
    }
  }

  return (
    <div className="result-page">
      <div className="result-wrap">
        {placeName(data) && (
          <div className="result-place-info">
            <div className="result-place-name">{placeName(data)}</div>
            {placeAddress(data) && (
              <div className="result-place-address">{placeAddress(data)}</div>
            )}
          </div>
        )}

        <div className="result-top">
          <div className="result-total">{totalValue(data)}</div>
          <div className={`result-grade result-grade--${String(grade).toLowerCase() || "f"}`}>{grade || "-"}</div>
        </div>
        <div className="result-total-label">종합 점수</div>

        <div className="result-divider" />

        <h2 className="result-section-title">항목별 점수</h2>

        <div className="result-grid">
          {RESULT_CATEGORIES.map(({ key, title }, index) => {
            const explain = sectionExplain(data, key, index);
            const positives = Array.isArray(explain?.good) ? explain.good : (explain?.positives || []);
            const negatives = Array.isArray(explain?.bad) ? explain.bad : (explain?.negatives || []);
            return (
              <ScoreCard
                key={key}
                title={title}
                score={scoreValue(data, key, index)}
                positives={positives}
                negatives={negatives}
              />
            );
          })}
        </div>

        <div className="result-actions">
          <button type="button" className="back-button" onClick={onBack}>
            새 진단 시작
          </button>
        </div>

        {/* 유료 컨설팅 (원소스와 동일) */}
        {placeUrl && (
          <div className="result-paid-card">
            <div className="result-paid-head">
              <h3 className="result-paid-title">유료 컨설팅</h3>
              <span className="result-paid-price">₩19,900</span>
            </div>
            <p className="result-paid-desc">경쟁사 Top 5 + 추천키워드 + 개선안을 확인하세요</p>
            <div className="result-paid-field">
              <label htmlFor="paid-search-query">경쟁사 분석 검색어</label>
              <input
                id="paid-search-query"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="예) 서대문역 미용실"
                className="result-paid-input"
                disabled={paidLoading}
              />
            </div>
            {paidError && <div className="result-paid-error">{paidError}</div>}
            <button
              type="button"
              className="result-paid-btn"
              onClick={runPaidDiagnosis}
              disabled={paidLoading}
            >
              {paidLoading ? "진단 중..." : "유료 진단 실행"}
            </button>
          </div>
        )}

        {/* 유료 진단 결과: 추천 키워드 / 개선안 / 경쟁사 */}
        {paidData?.success && paidData?.data && (
          <div className="result-paid-result">
            {Array.isArray(paidData.data.recommendedKeywords) && paidData.data.recommendedKeywords.length > 0 && (
              <div className="result-paid-block">
                <h3 className="result-paid-block-title">✅ 추천 대표키워드 (5개)</h3>
                <p className="result-paid-block-desc">아래 키워드를 플레이스 대표키워드에 넣으세요</p>
                <div className="result-paid-keywords">
                  {paidData.data.recommendedKeywords.slice(0, 5).map((kw, i) => (
                    <span key={i} className="result-paid-kw-chip">{kw}</span>
                  ))}
                </div>
              </div>
            )}
            {paidData.data.improvements?.description && (
              <div className="result-paid-block">
                <h3 className="result-paid-block-title">상세설명 개선안</h3>
                <pre className="result-paid-pre">{paidData.data.improvements.description}</pre>
              </div>
            )}
            {paidData.data.improvements?.directions && (
              <div className="result-paid-block">
                <h3 className="result-paid-block-title">오시는길 개선안</h3>
                <pre className="result-paid-pre">{paidData.data.improvements.directions}</pre>
              </div>
            )}
            {Array.isArray(paidData.data.competitorsSimple) && paidData.data.competitorsSimple.length > 0 && (
              <div className="result-paid-block">
                <h3 className="result-paid-block-title">🏁 경쟁업체 TOP5</h3>
                <ul className="result-paid-comp-list">
                  {paidData.data.competitorsSimple.slice(0, 5).map((c, i) => (
                    <li key={i}>
                      <a 
                        href={c?.placeUrl || "#"} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="result-paid-comp-link"
                        title="네이버 플레이스에서 열기"
                      >
                        <strong>{c?.name || `경쟁사 ${i + 1}`}</strong>
                      </a>
                      {Array.isArray(c?.keywords) && c.keywords.length
                        ? ` : ${c.keywords.slice(0, 5).join(", ")}`
                        : " (대표키워드 미노출)"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 크롤링 로그 (원소스와 동일) */}
        <div className="result-log-section">
          <div className="result-log-header">
            <h3 className="result-log-title">🔍 크롤링 로그</h3>
            <button
              type="button"
              className="result-log-toggle"
              onClick={() => setShowLogs((v) => !v)}
            >
              {showLogs ? "로그 닫기" : "로그 보기"}
            </button>
          </div>
          {showLogs && (
            <pre className="result-log-content">
              {logs.length ? logs.join("\n") : "(로그 없음)"}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
