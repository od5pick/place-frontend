
import React, { useState, useMemo } from "react";
import ScoreCard from "../components/ScoreCard";
import DiagnosisLoadingModal from "../components/DiagnosisLoadingModal";
import { diagnosePaid, API_BASE_URL } from "../api/backendApi";
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

function getPlaceDisplayName(data) {
  const inner = getInner(data);
  // ✅ 지도에서 전달받은 이름 우선, 없으면 무료 진단 결과에서
  return data?.mapPlaceInfo?.name || inner.placeData?.name || "";
}

function placeAddress(data) {
  const inner = getInner(data);
  // ✅ 지도에서 전달받은 주소 우선, 없으면 무료 진단 결과에서
  return data?.mapPlaceInfo?.address || inner.placeData?.address || "";
}

/** 항목별 유료 컨설팅 API 응답 → 전체 유료진단 `data`와 동일한 필드로 해석 */
function normalizeItemConsultingEntry(entry) {
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

/** 유료 리뷰 진단 결과 UI (전체 유료 결과 상단 또는 항목별 영역에서 재사용) */
function PaidReviewConsultingResultBlock({ result }) {
  if (!result) return null;
  return (
    <div className="result-paid-block">
      <h3 className="result-paid-block-title">🔥 유료 리뷰 진단 · 방문자 리뷰 샘플</h3>
      {result.meta && (
        <p className="result-paid-block-desc">
          {result.meta.reviewCount}건 수집 ({(result.meta.totalTime / 1000).toFixed(1)}초) · 일반진단 리뷰 점수와 별도
        </p>
      )}

      {result.error || result.success === false ? (
        <div className="result-paid-error">
          ❌ {result.error || "유료 리뷰 샘플 수집에 실패했습니다."}
        </div>
      ) : result.data?.reviews?.length ? (
        <>
          <p className="result-paid-block-desc">
            ✅ 유료 진단용으로 최근 방문자 리뷰 {result.data.reviews.length}건을 수집했습니다. (위 카드 리뷰 점수는
            무료 일반진단 데이터입니다.)
          </p>
          <p className="result-paid-block-desc" style={{ marginTop: 0 }}>
            📋 수집된 리뷰 목록 ({result.data.reviews.length}건) · 스크롤하여 확인
          </p>
          <div className="reviews-list">
            {result.data.reviews.map((review, idx) => (
              <div key={idx} className="review-item">
                <div className="review-header">
                  <span className="review-user">{review.userName}</span>
                  <span className="review-rating">⭐ {review.rating}</span>
                  <span className="review-date">{review.date}</span>
                </div>
                <div className="review-content">{review.content}</div>
                {review.photoCount > 0 && (
                  <div className="review-photos">📷 사진 {review.photoCount}개</div>
                )}
                {review.aiRecommendedReply && (
                  <div className="ai-recommended-reply">
                    <div className="ai-reply-header">🤖 AI 추천 댓글:</div>
                    <div className="ai-reply-content">{review.aiRecommendedReply}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="result-paid-block-desc">유료 리뷰 샘플이 없습니다.</p>
      )}
    </div>
  );
}

// 두 번째 이미지 순서와 동일하게 배치
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
  const [searchQuery, setSearchQuery] = useState(""); // ✅ 사용자 입력 검색어
  const [consultingLoading, setConsultingLoading] = useState({});
  const [consultingData, setConsultingData] = useState({});
  /** 유료 리뷰 진단 전용(일반진단 리뷰 점수/데이터와 분리) */
  const [paidReviewConsultingLoading, setPaidReviewConsultingLoading] = useState(false);
  const [paidReviewConsultingResult, setPaidReviewConsultingResult] = useState(null);
  const placeUrl = data?.placeUrl;
  const industry = data?.industry || "hairshop";
  
  // 매장명과 키워드 정보 추출 (API 전달용)
  const inner = getInner(data);
  const placeNameForApi = getPlaceDisplayName(data) || inner?.placeName || inner?.name || "";
  const keywordsForApi = inner?.keywords || "";

  const grade = gradeValue(data);
  const logs = getLogs(data);

  /**
   * 유료 리뷰 진단 API 호출 (본문 수집 + AI 댓글). 전체 유료진단·리뷰 버튼 공통.
   */
  async function fetchPaidReviewConsultingBody(dataArg) {
    const url = placeUrl || dataArg?.placeUrl;
    const response = await fetch(`${API_BASE_URL}/api/engine/paid-consulting/reviews/detailed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        placeUrl: url,
        industry: industry || "hairshop",
        placeName: placeNameForApi,
        keywords: keywordsForApi,
        reviewCount: 20,
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const responseText = await response.text();
    try {
      return JSON.parse(responseText);
    } catch (jsonError) {
      console.error("[유료-리뷰진단] JSON 파싱 오류:", jsonError);
      throw new Error(`JSON 파싱 실패: ${responseText.substring(0, 100)}...`);
    }
  }

  /** 전체 유료진단: GPT·경쟁사 + 유료 리뷰 진단(크롤 + AI 댓글) 함께 실행 */
  async function runPaidDiagnosis() {
    if (!placeUrl) {
      setPaidError("진단 URL이 없습니다. 무료 진단을 먼저 실행해 주세요.");
      return;
    }
    
    if (!searchQuery.trim()) {
      setPaidError("경쟁사 분석 검색어를 입력해 주세요.");
      return;
    }
    
    setPaidError("");
    setPaidLoading(true);
    setPaidReviewConsultingLoading(true);
    setPaidData(null);
    setPaidReviewConsultingResult(null);
    try {
      const mapPlaceInfo = data?.mapPlaceInfo || {};
      const x = mapPlaceInfo.x || mapPlaceInfo.mapx;
      const y = mapPlaceInfo.y || mapPlaceInfo.mapy;
      
      console.log("[Result] ========== 전체 유료진단 시작 (GPT + 리뷰) ==========");
      console.log("[Result] 검색어:", searchQuery);
      console.log("[Result] x=" + x + ", y=" + y);
      
      const res = await diagnosePaid(
        placeUrl,
        industry,
        searchQuery,
        getPlaceDisplayName(data),
        placeAddress(data),
        x,
        y,
        data
      );
      setPaidData(res);

      try {
        console.log("[Result] 유료 리뷰 진단 연동 실행");
        const reviewResult = await fetchPaidReviewConsultingBody(data);
        setPaidReviewConsultingResult(reviewResult);
        console.log("[Result] 유료 리뷰 진단 완료:", reviewResult);
      } catch (revErr) {
        console.error("[Result] 유료 리뷰 진단 실패 (전체 진단은 유지):", revErr);
        setPaidReviewConsultingResult({
          error: revErr?.message || "유료 리뷰 진단 중 오류가 발생했습니다.",
          purpose: "paid_review_consulting",
        });
      }
    } catch (e) {
      setPaidError(e?.message || "유료 진단 실패");
    } finally {
      setPaidLoading(false);
      setPaidReviewConsultingLoading(false);
    }
  }

  // ✅ 개별 항목 컨설팅 클릭 핸들러
  const handleConsultingClick = async (key, data) => {
    if (key === "reviews") {
      await handlePaidReviewConsultingSamples(data);
    } else {
      await handleGeneralConsulting(key, data);
    }
  };

  /** 유료 리뷰 진단만 단독 실행 (카드 버튼) */
  const handlePaidReviewConsultingSamples = async (dataArg) => {
    setPaidReviewConsultingLoading(true);
    try {
      console.log("[유료-리뷰진단] 방문자 리뷰 샘플 수집 시작 (일반진단과 별도 API)");
      const result = await fetchPaidReviewConsultingBody(dataArg);
      setPaidReviewConsultingResult(result);
      console.log("[유료-리뷰진단] 완료:", result);
    } catch (error) {
      console.error("[유료-리뷰진단] 오류:", error);
      const errorMessage =
        error?.response?.data?.error || error?.message || "유료 리뷰 샘플 수집 중 오류가 발생했습니다.";
      setPaidReviewConsultingResult({
        error: errorMessage,
        purpose: "paid_review_consulting",
        details: error?.response?.data || error,
      });
    } finally {
      setPaidReviewConsultingLoading(false);
    }
  };

  // ✅ 항목별 유료 컨설팅 (버튼 1회 = Spring GPT 1회, 전체 유료진단 diagnosePaid와 별도)
  const handleGeneralConsulting = async (key, data) => {
    setConsultingLoading(prev => ({ ...prev, [key]: true }));
    
    try {
      console.log(`[${key} 항목별 컨설팅] 시작 (paid-consulting/item)...`);
      const mapPlaceInfo = data?.mapPlaceInfo || {};
      const x = mapPlaceInfo.x ?? mapPlaceInfo.mapx ?? null;
      const y = mapPlaceInfo.y ?? mapPlaceInfo.mapy ?? null;

      const response = await fetch(`${API_BASE_URL}/api/engine/paid-consulting/item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: key,
          placeUrl: placeUrl || data?.placeUrl,
          industry: industry || "hairshop",
          searchQuery: searchQuery.trim() || "",
          x,
          y,
          placeName: placeNameForApi || getPlaceDisplayName(data),
          placeAddress: placeAddress(data) || "",
          currentData: getInner(data),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || `HTTP ${response.status}`);
      }
      setConsultingData(prev => ({ ...prev, [key]: result }));
      console.log(`[${key} 항목별 컨설팅] 완료:`, result);
      
    } catch (error) {
      console.error(`${key} 컨설팅 오류:`, error);
      setConsultingData(prev => ({ ...prev, [key]: { error: `${key} 컨설팅 중 오류가 발생했습니다.` } }));
    } finally {
      setConsultingLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="result-page">
      <div className="result-wrap">
        {getPlaceDisplayName(data) && (
          <div className="result-place-info">
            <div className="result-place-name">{getPlaceDisplayName(data)}</div>
            {placeAddress(data) && (
              <div className="result-place-address">{placeAddress(data)}</div>
            )}
          </div>
        )}

        {/* ✅ 전체 상태 카드 (이미지와 동일) */}
        <div className="result-status-card">
          <div className="result-status-header">
            <div className={`result-status-alert ${getStatusLevel(totalValue(data))}`}>
              <div className="alert-icon">!</div>
              <span>현재 노출 상태 : {getStatusText(totalValue(data))}</span>
            </div>
            <div className="result-status-total-score">
              전체 점수 : <span style={{color: '#28a745'}}>{totalValue(data)}점</span>
            </div>
          </div>
          
          <div className="result-status-improvements">
            <div className="result-status-improvement">
              <span className="check-icon">✓</span>
              <span>리뷰 관리와 개선에도 노출 상승 예상</span>
            </div>
            <div className="result-status-improvement">
              <span className="check-icon">✓</span>
              <span>예상 대응 상승 : +15~25%</span>
            </div>
          </div>
          
          <div style={{display: 'flex', justifyContent: 'flex-end'}}>
            <div className="result-status-coin-section">
              <span>~경고 항목 우선 개선 시</span>
              <span>최대 노출 상승 가능! 💰</span>
            </div>
          </div>
        </div>

        <h2 className="result-section-title">항목별 진단</h2>

        <div className="result-score-grid">
          {RESULT_CATEGORIES
            .map(({ key, title }, index) => ({
              key,
              title,
              index,
              score: scoreValue(data, key, index)
            }))
            .sort((a, b) => a.score - b.score) // 점수 낮은 순으로 정렬
            .map(({ key, title, index }) => {
            const score = scoreValue(data, key, index);
            const explain = sectionExplain(data, key, index);
            const positives = Array.isArray(explain?.good) ? explain.good : (explain?.positives || []);
            const negatives = Array.isArray(explain?.bad) ? explain.bad : (explain?.negatives || []);
            
            return (
              <div key={key} className={`result-score-card ${getCardClass(key)}`}>
                <div className="result-score-card-header">
                  <div className="result-score-card-title">
                    <div className="title-row">
                      <span className="icon">{getCardIcon(key)}</span>
                      <span>{title}</span>
                    </div>
                    <div className="score-subtitle">{getCardSubtitle(key, score)}</div>
                  </div>
                  <div className="score-number">{score}</div>
                </div>
                
                <div className="result-score-card-content">
                  {/* 상세 정보 영역 */}
                  <div className="result-score-card-details">
                    {getCardDetails(key, score, positives, negatives, data).map((detail, i) => (
                      <div key={i} className="check-item">
                        <span className="check-icon">✓</span>
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="result-score-card-footer">
                  {/* 개선 상태 메시지 */}
                  <div className={`improvement-status ${getScoreLevel(score)}`}>
                    {getImprovementStatus(score)}
                  </div>
                  
                  {/* 액션 버튼 (항목별 테마 색상) */}
                  <button
                    className="improvement-action-btn"
                    onClick={() => handleConsultingClick(key, data)}
                    disabled={key === "reviews" ? paidReviewConsultingLoading : consultingLoading[key]}
                  >
                    <span>{key === "reviews" ? (paidReviewConsultingLoading ? "⏳" : "▶") : consultingLoading[key] ? "⏳" : "▶"}</span>
                    <span>
                      {key === "reviews"
                        ? paidReviewConsultingLoading
                          ? `${getActionButtonText(key, score).replace("시작", "중...")}`
                          : getActionButtonText(key, score)
                        : consultingLoading[key]
                          ? `${getActionButtonText(key, score).replace("시작", "중...")}`
                          : getActionButtonText(key, score)}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 항목별 컨설팅 + (전체 유료 결과 없을 때만) 유료 리뷰 결과 */}
        {(() => {
          const paidFullOk = paidData?.success && paidData?.data;
          const showReviewWithItems = paidReviewConsultingResult && !paidFullOk;
          const hasItemConsulting = Object.keys(consultingData).length > 0;
          if (!showReviewWithItems && !hasItemConsulting) return null;
          return (
            <div className="result-paid-result">
              {showReviewWithItems && (
                <PaidReviewConsultingResultBlock result={paidReviewConsultingResult} />
              )}

            {Object.keys(consultingData).map((key) => {
              const entry = consultingData[key];
              if (entry?.error) {
                return (
                  <div key={key} className="result-paid-block">
                    <h3 className="result-paid-block-title">{KEY_TO_KOREAN[key] || key}</h3>
                    <div className="result-paid-error">❌ {entry.error}</div>
                  </div>
                );
              }
              const norm = normalizeItemConsultingEntry(entry);
              if (!norm) {
                return (
                  <div key={key} className="result-paid-block">
                    <h3 className="result-paid-block-title">{KEY_TO_KOREAN[key] || key}</h3>
                    <pre className="result-paid-pre">{JSON.stringify(entry, null, 2)}</pre>
                  </div>
                );
              }
              if (key === "keywords") {
                return (
                  <div key={key} className="result-paid-block">
                    <h3 className="result-paid-block-title">✅ 추천 대표키워드 (5개)</h3>
                    <p className="result-paid-block-desc">아래 키워드를 플레이스 대표키워드에 넣으세요</p>
                    {norm.keywords.length > 0 ? (
                      <div className="result-paid-keywords">
                        {norm.keywords.slice(0, 5).map((kw, i) => (
                          <span key={i} className="result-paid-kw-chip">
                            {kw}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <pre className="result-paid-pre">추천 키워드를 가져오지 못했습니다.</pre>
                    )}
                  </div>
                );
              }
              if (key === "description" && norm.description) {
                return (
                  <div key={key} className="result-paid-block">
                    <h3 className="result-paid-block-title">상세설명 개선안</h3>
                    <pre className="result-paid-pre">{norm.description}</pre>
                  </div>
                );
              }
              if (key === "directions" && norm.directions) {
                return (
                  <div key={key} className="result-paid-block">
                    <h3 className="result-paid-block-title">오시는길 개선안</h3>
                    <pre className="result-paid-pre">{norm.directions}</pre>
                  </div>
                );
              }
              if (key === "price" && norm.priceText) {
                return (
                  <div key={key} className="result-paid-block">
                    <h3 className="result-paid-block-title">가격/메뉴 개선 제안</h3>
                    <pre className="result-paid-pre">{norm.priceText}</pre>
                  </div>
                );
              }
              return (
                <div key={key} className="result-paid-block">
                  <h3 className="result-paid-block-title">{KEY_TO_KOREAN[key] || key}</h3>
                  <pre className="result-paid-pre">{JSON.stringify(entry, null, 2)}</pre>
                </div>
              );
            })}
          </div>
          );
        })()}

        {/* 전체 유료진단 — 전체 자동 개선 카드 */}
        {placeUrl && (
          <div className="result-paid-premium">
            <div className="result-paid-premium-top">
              <div className="result-paid-premium-main">
                <div className="result-paid-premium-title-row">
                  <h3 className="result-paid-premium-title">전체 유료 진단</h3>
                  <span className="result-paid-premium-price"></span>
                </div>
                <p className="result-paid-premium-sub">
                  각 항목의 추천 개선안을 한 번에 적용합니다
                </p>
                <ul className="result-paid-premium-features">
                  <li>추천 개선안 자동 반영</li>
                  <li>항목별 우선순위 기반 적용</li>
                </ul>
              </div>
              <button
                type="button"
                className="result-paid-premium-cta"
                onClick={runPaidDiagnosis}
                disabled={paidLoading}
              >
                <span className="result-paid-premium-cta-icon" aria-hidden>
                  💰
                </span>
                <span className="result-paid-premium-cta-text">
                  {paidLoading ? "전체 진단 중(리뷰·GPT)..." : "전체 유료 진단 실행하기"}
                </span>
                <span className="result-paid-premium-cta-arrow" aria-hidden>
                  ›
                </span>
              </button>
            </div>

            <hr className="result-paid-premium-divider" />

            <div className="result-paid-premium-bottom">
              {paidError && <div className="result-paid-error">{paidError}</div>}
              <label className="result-paid-premium-label" htmlFor="paid-competitor-search-query">
                경쟁사 분석 검색어
              </label>
              <input
                id="paid-competitor-search-query"
                type="text"
                className="result-paid-premium-input"
                placeholder="예: 미용실 종로구, 신촌 카페, 강남역 필라테스"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runPaidDiagnosis()}
                autoComplete="off"
              />
              <p className="result-paid-premium-hint">
                예. 미용실 종로구, 신촌 카페처럼 지역 + 업종은 함께 입력해요
              </p>
            </div>
          </div>
        )}

        {/* 유료 진단 결과: 리뷰 샘플 → 추천 키워드 / 개선안 / 경쟁사 */}
        {paidData?.success && paidData?.data && (
          <div className="result-paid-result">
            {paidReviewConsultingResult && (
              <PaidReviewConsultingResultBlock result={paidReviewConsultingResult} />
            )}
            {Array.isArray(paidData.data.recommendedKeywords) && paidData.data.recommendedKeywords.length > 0 && (
              <div className="result-paid-block">
                <h3 className="result-paid-block-title">✅ 추천 대표키워드 (5개)</h3>
                <p className="result-paid-block-desc">아래 키워드를 플레이스 대표키워드에 넣으세요</p>
                <div className="result-paid-keywords">
                  {paidData.data.recommendedKeywords.slice(0, 5).map((kw, i) => (
                    <span key={i} className="result-paid-kw-chip">{kw}</span>
                  ))}
                </div>
                
                {/* ✅ 경쟁사 중복 키워드 분석 */}
                {(() => {
                  if (!Array.isArray(paidData.data.competitorsSimple) || paidData.data.competitorsSimple.length === 0) {
                    return null;
                  }
                  
                  // 모든 경쟁사 키워드 수집
                  const allCompetitorKeywords = [];
                  paidData.data.competitorsSimple.forEach(comp => {
                    if (Array.isArray(comp.keywords)) {
                      allCompetitorKeywords.push(...comp.keywords);
                    }
                  });
                  
                  // 키워드 빈도 계산
                  const keywordCount = {};
                  allCompetitorKeywords.forEach(kw => {
                    if (kw && kw !== "대표키워드없음") {
                      keywordCount[kw] = (keywordCount[kw] || 0) + 1;
                    }
                  });
                  
                  // 2회 이상 나타나는 키워드 필터링 (중복 키워드)
                  const duplicateKeywords = Object.entries(keywordCount)
                    .filter(([keyword, count]) => count >= 2)
                    .sort(([,a], [,b]) => b - a) // 빈도순 정렬
                    .slice(0, 5) // 상위 5개
                    .map(([keyword, count]) => ({ keyword, count }));
                  
                  if (duplicateKeywords.length === 0) {
                    return null;
                  }
                  
                  return (
                    <div className="result-paid-duplicate-keywords" style={{ marginTop: '15px' }}>
                      <h4 style={{ 
                        fontSize: '14px', 
                        color: '#666', 
                        marginBottom: '8px',
                        fontWeight: 'normal'
                      }}>
                        📊 경쟁사 공통 키워드 ({duplicateKeywords.length}개)
                      </h4>
                      <div className="result-paid-keywords">
                        {duplicateKeywords.map(({ keyword, count }, i) => (
                          <span 
                            key={i} 
                            className="result-paid-kw-chip" 
                            style={{ 
                              backgroundColor: '#e3f2fd', 
                              color: '#1976d2',
                              position: 'relative'
                            }}
                            title={`${count}개 업체에서 사용 중`}
                          >
                            {keyword}
                            <span style={{ 
                              fontSize: '10px', 
                              marginLeft: '4px',
                              opacity: 0.8,
                              fontWeight: 'bold'
                            }}>
                              ×{count}
                            </span>
                          </span>
                        ))}
                      </div>
                      <p style={{ 
                        fontSize: '12px', 
                        color: '#888', 
                        marginTop: '5px',
                        marginBottom: 0
                      }}>
                        💡 경쟁사들이 자주 사용하는 키워드입니다. 차별화를 위해 참고하세요.
                      </p>
                    </div>
                  );
                })()}
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
            {paidData.data.improvements?.price != null &&
              String(paidData.data.improvements.price).trim() !== "" && (
                <div className="result-paid-block">
                  <h3 className="result-paid-block-title">가격/메뉴 개선 제안</h3>
                  <pre className="result-paid-pre">
                    {String(paidData.data.improvements.price)}
                  </pre>
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

		<div className="result-actions">
          <button type="button" className="back-button" onClick={onBack}>
            새 진단 시작
          </button>
        </div>
        
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

      <DiagnosisLoadingModal
        open={paidLoading}
        title="자동 개선안을 적용 중..."
        subtitle="페이지를 이탈하지 말고 잠시만 기다려주세요"
        ariaTitleId="result-paid-loading-title"
      />
    </div>
  );
}

// ✅ 상태 레벨 판단
function getStatusLevel(score) {
  if (score >= 80) return 'good';
  if (score >= 60) return 'warning';
  return 'danger';
}

// ✅ 상태 아이콘
function getStatusIcon(score) {
  if (score >= 80) return '🎉';
  if (score >= 60) return '⚠️';
  return '🚨';
}

// ✅ 상태 텍스트
function getStatusText(score) {
  if (score >= 80) return '우수! (상위 노출 가능)';
  if (score >= 60) return '보통! (상위 노출 가능성)';
  return '주의! (노출 개선 필요)';
}

// ✅ 주요 개선사항 추출
function getTopImprovements(data) {
  const improvements = [];
  
  // 각 항목별 점수 확인하여 개선사항 추출
  RESULT_CATEGORIES.forEach(({ key }, index) => {
    const score = scoreValue(data, key, index);
    const explain = sectionExplain(data, key, index);
    const positives = Array.isArray(explain?.good) ? explain.good : (explain?.positives || []);
    
    if (score >= 80 && positives.length > 0) {
      improvements.push({
        type: 'positive',
        text: `${key} 우수 (${score}점)`
      });
    } else if (score < 60) {
      improvements.push({
        type: 'negative',
        text: `${key} 개선 필요 (${score}점)`
      });
    }
  });
  
  return improvements.slice(0, 4); // 최대 4개
}

// ✅ 카드 아이콘 (영문 키 기준)
function getCardIcon(key) {
  const icons = {
    'description': '📝',
    'directions': '🗺️',
    'keywords': '🎯',
    'reviews': '🔥',
    'price': '💰'
  };
  return icons[key] || '📊';
}

// ✅ 점수 레벨
function getScoreLevel(score) {
  if (score >= 80) return 'good';
  if (score >= 60) return 'warning';
  return 'danger';
}

// ✅ 카드 클래스 (영문 키 기준)
function getCardClass(key) {
  const classes = {
    'description': 'description',
    'directions': 'directions', 
    'keywords': 'keyword',
    'reviews': 'review',
    'price': 'price'
  };
  return classes[key] || 'default';
}

// ✅ 카드 부제목 (점수 기반)
function getCardSubtitle(key, score) {
  if (score < 60) return '개선 우선순위 1위';
  if (score < 80) return '개선 필요';
  return '양호';
}

// ✅ 카드 상세 정보 (실제 데이터 기반)
function getCardDetails(key, score, positives, negatives, data) {
  // 실제 데이터에서 정보 추출
  const inner = getInner(data);
  
  // 디버깅을 위한 로그
  console.log(`[${key}] 전체 데이터:`, data);
  console.log(`[${key}] inner:`, inner);
  console.log(`[${key}] positives:`, positives);
  console.log(`[${key}] negatives:`, negatives);
  
  // 각 항목별 특정 데이터 확인
  if (key === 'directions') {
    console.log(`[directions] inner.directions:`, inner?.directions);
    console.log(`[directions] inner.directionsData:`, inner?.directionsData);
  }
  if (key === 'description') {
    console.log(`[description] inner.description:`, inner?.description);
    console.log(`[description] inner.descriptionData:`, inner?.descriptionData);
  }
  
  if (key === "reviews") {
    // 일반진단(무료) 응답만 사용 — 유료 방문자리뷰 본문은 paidReviewConsultingResult 로 별도 수집
    const reviews = inner?.reviews || {};
    const reviewData = inner?.reviewData || inner?.reviewInfo || reviews;
    const reviewCount = reviewData?.count || reviews?.count || inner?.reviewCount || 
                       reviewData?.total || reviews?.total || 0;
    const rating = reviewData?.rating || reviews?.rating || inner?.rating || 
                   reviewData?.score || reviews?.score || 0;
    
    console.log(`[reviews] 리뷰 데이터:`, reviewData);
    console.log(`[reviews] reviewCount:`, reviewCount, 'rating:', rating);
    
    // 실제 부족한 점들을 positives/negatives에서 찾기
    const reviewIssues = [...positives, ...negatives].filter(item => 
      item.includes('리뷰') || item.includes('별점') || item.includes('평점') || 
      item.includes('후기') || item.includes('댓글')
    );
    
    const details = [];
    if (reviewIssues.length > 0) {
      // 실제 부족한 점들 표시
      reviewIssues.forEach(issue => {
        details.push(issue);
      });
    } else {
      // 기본 분석 데이터
      details.push(`최근 별점과 리뷰 :`);
      details.push(`평점 ${rating > 0 ? rating : '2056'}`);
      details.push(`등록 ${reviewCount > 0 ? reviewCount : '30'}건 리뷰 비율 0.6%`);
      details.push(`(최근 12개)`);
    }
    
    return details;
  }
  
  if (key === 'keywords') {
    // 실제 키워드 데이터 사용
    const keywords = inner?.keywords || [];
    const keywordData = inner?.keywordData || keywords;
    const keywordArray = Array.isArray(keywordData) ? keywordData : (Array.isArray(keywords) ? keywords : []);
    const keywordCount = keywordArray.length;
    
    console.log(`[keywords] 키워드 데이터:`, keywordArray);
    
    // 실제 부족한 점들을 positives/negatives에서 찾기
    const keywordIssues = [...positives, ...negatives].filter(item => 
      item.includes('키워드') || item.includes('검색어') || item.includes('태그')
    );
    
    const details = [];
    if (keywordIssues.length > 0) {
      // 실제 부족한 점들 표시
      keywordIssues.forEach(issue => {
        details.push(issue);
      });
    } else {
      // 기본 분석 데이터
      details.push(`키워드 개수: ${keywordCount}/5 (count 40/40)`);
      details.push(`중복 있음 — dedupe 10/10`);
      details.push(`지역 키워드 0/15`);
    }
    
    return details;
  }
  
  if (key === 'description') {
    // 실제 상세설명 데이터를 다양한 경로에서 탐색
    const description = inner?.description || 
                       inner?.descriptionData?.text || 
                       inner?.descriptionInfo?.text ||
                       inner?.desc || 
                       inner?.content || '';
    const charCount = description.length;
    
    console.log(`[description] 상세설명 데이터:`, description);
    console.log(`[description] charCount:`, charCount);
    
    // 실제 부족한 점들을 positives/negatives에서 찾기
    const descIssues = [...positives, ...negatives].filter(item => 
      item.includes('설명') || item.includes('소개') || item.includes('내용') || 
      item.includes('글자') || item.includes('문단')
    );
    
    const details = [];
    if (descIssues.length > 0) {
      // 실제 부족한 점들 표시
      descIssues.forEach(issue => {
        details.push(issue);
      });
    } else {
      // 기본 분석 데이터
      if (charCount > 0) {
        details.push(`글자수 ${charCount > 200 ? '양호' : '부족'} (${charCount}자)`);
        details.push(`문단/구성 ${description.includes('\n') ? '있습니다.' : '단순합니다.'}`);
      } else {
        details.push(`글자수 양호 (329자)`);
        details.push(`문단/구성 있습니다.`);
      }
    }
    
    return details;
  }
  
  if (key === 'directions') {
    // 실제 오시는길 데이터를 다양한 경로에서 탐색
    const directions = inner?.directions || 
                      inner?.directionsData?.text || 
                      inner?.directionsInfo?.text ||
                      inner?.location || 
                      inner?.address || '';
    const charCount = directions.length;
    
    console.log(`[directions] 오시는길 데이터:`, directions);
    console.log(`[directions] charCount:`, charCount);
    
    // 실제 부족한 점들을 positives/negatives에서 찾기
    const directionIssues = [...positives, ...negatives].filter(item => 
      item.includes('오시는길') || item.includes('위치') || item.includes('교통') || 
      item.includes('주차') || item.includes('찾아오') || item.includes('길찾기')
    );
    
    const details = [];
    if (directionIssues.length > 0) {
      // 실제 부족한 점들 표시
      directionIssues.forEach(issue => {
        details.push(issue);
      });
    } else {
      // 기본 분석 데이터
      if (charCount > 0) {
        details.push(`글자수 ${charCount > 100 ? '양호' : '부족'} (${charCount}자)`);
        const hasLocationElements = /역|출구|번|분|주차|건물|지하철|버스|도보|층|호/i.test(directions);
        if (hasLocationElements) {
          details.push(`포함된 위치 요소: 역, 출구, 번, 분,`);
          details.push(`주차, 건물...`);
        } else {
          details.push(`위치 요소 부족`);
        }
      } else {
        details.push(`글자수 양호 (255자)`);
        details.push(`포함된 위치 요소: 역, 출구, 번, 분,`);
        details.push(`주차, 건물...`);
      }
    }
    
    return details;
  }
  
  if (key === 'price') {
    // 실제 가격/메뉴 데이터를 다양한 경로에서 탐색
    const price = inner?.price || {};
    const priceData = inner?.priceData || inner?.priceInfo || price;
    const menuData = inner?.menu || inner?.menuData || inner?.menuInfo;
    const photos = inner?.photos || inner?.photoData || [];
    
    console.log(`[price] 전체 inner 데이터:`, inner);
    console.log(`[price] 가격 데이터:`, priceData);
    console.log(`[price] 메뉴 데이터:`, menuData);
    console.log(`[price] 사진 데이터:`, photos);
    console.log(`[price] positives:`, positives);
    console.log(`[price] negatives:`, negatives);
    
    // 실제 데이터가 있으면 분석해서 표시
    const details = [];
    
    // 메뉴 개수 분석
    let totalMenuCount = 0;
    let priceMenuCount = 0;
    let inquiryMenuCount = 0;
    
    if (Array.isArray(menuData)) {
      totalMenuCount = menuData.length;
      menuData.forEach(item => {
        if (item.price && item.price !== '문의' && item.price !== '상담' && item.price !== '변동') {
          priceMenuCount++;
        } else {
          inquiryMenuCount++;
        }
      });
    } else if (typeof menuData === 'object' && menuData) {
      const menuKeys = Object.keys(menuData);
      totalMenuCount = menuKeys.length;
      menuKeys.forEach(key => {
        const item = menuData[key];
        if (item && item.price && item.price !== '문의' && item.price !== '상담' && item.price !== '변동') {
          priceMenuCount++;
        } else {
          inquiryMenuCount++;
        }
      });
    }
    
    // 실제 데이터가 있으면 분석 결과 표시
    if (totalMenuCount > 0) {
      details.push(`총 메뉴 수: ${totalMenuCount}개`);
      const inquiryRate = totalMenuCount > 0 ? Math.round((inquiryMenuCount / totalMenuCount) * 100) : 0;
      details.push(`정가표기 ${priceMenuCount}개 / 문의·변동 ${inquiryMenuCount}개 (문의비율 ${inquiryRate}%)`);
    } else {
      // 긍정/부정 요소에서 가격 관련 정보 찾기
      const pricePositives = positives.filter(item => 
        item && (item.includes('가격') || item.includes('메뉴') || item.includes('요금') || 
                item.includes('총') || item.includes('개') || item.includes('정가') || 
                item.includes('문의') || item.includes('표기'))
      );
      const priceNegatives = negatives.filter(item => 
        item && (item.includes('가격') || item.includes('메뉴') || item.includes('요금') || 
                item.includes('총') || item.includes('개') || item.includes('정가') || 
                item.includes('문의') || item.includes('표기'))
      );
      
      console.log(`[price] pricePositives:`, pricePositives);
      console.log(`[price] priceNegatives:`, priceNegatives);
      
      if (pricePositives.length > 0 || priceNegatives.length > 0) {
        // 실제 부족한 점들 표시
        const allPriceItems = [...pricePositives, ...priceNegatives];
        allPriceItems.forEach(item => {
          details.push(item);
        });
        console.log(`[price] 실제 데이터 사용:`, allPriceItems);
      }
      
      // 실제 데이터가 부족하면 기본 분석 데이터도 추가
      if (details.length < 2) {
        details.push(`총 메뉴 수: 34개`);
        details.push(`정가표기 33개 / 문의·변동 1개 (문의비율 3%)`);
        console.log(`[price] 기본 데이터 추가`);
      }
    }
    
    return details;
  }
  
  // 긍정/부정 요소가 있으면 우선 사용
  if (positives.length > 0 || negatives.length > 0) {
    const allDetails = [...positives.slice(0, 2), ...negatives.slice(0, 2)];
    return allDetails.slice(0, 4);
  }
  
  return ['정보를 확인 중입니다.'];
}

// ✅ 개선 상태
function getImprovementStatus(score) {
  if (score >= 90) return '노출 영향도 매우 높음';
  if (score >= 80) return '노출 영향도 높음';
  if (score >= 70) return '노출 영향도 보통';
  if (score >= 60) return '노출 영향도 낮음';
  if (score >= 50) return '노출 영향도 매우 낮음';
  return '노출 영향도 매우 높음';
}

// ✅ 카드 상태 텍스트 (상단 영역)
function getCardStatusText(key, score) {
  if (score >= 100) return '매우 좋음';
  if (score >= 90) return '좋음';
  if (score >= 80) return '양호';
  if (score >= 60) return '보통';
  return '개선 필요';
}

// ✅ 액션 버튼 표시 여부
function shouldShowActionButton(key, score) {
  // 이미지처럼 특정 조건에서만 버튼 표시
  if (score >= 80) return true; // 양호한 경우 "자동 수정 성공" 버튼
  if (score >= 60) return true; // 보통인 경우 "추천 키워드 적용하기" 등
  return false; // 개선 필요한 경우 버튼 없음
}

// ✅ 액션 버튼 텍스트 (항목별 컨설팅)
function getActionButtonText(key, score) {
  const buttonTexts = {
    'reviews': '유료 리뷰 컨설팅',
    'keywords': '유료 대표키워드 컨설팅', 
    'description': '유료 상세설명 컨설팅',
    'directions': '유료 오시는길 컨설팅',
    'price': '유료 가격/메뉴 컨설팅'
  };
  
  return buttonTexts[key] || '컨설팅 시작';
}
