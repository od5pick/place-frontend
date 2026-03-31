import React from "react";
import { KEY_TO_KOREAN, RESULT_CATEGORIES } from "./resultConstants";
import {
  normalizeItemConsultingEntry,
  scoreValue,
  sectionExplain,
  totalValue,
} from "./resultDataUtils";
import {
  getActionButtonText,
  getCardClass,
  getCardDetails,
  getCardIcon,
  getCardSubtitle,
  getImprovementStatus,
  getScoreLevel,
  getStatusLevel,
  getStatusText,
} from "./resultCardHelpers";
import PaidReviewConsultingResultBlock from "./PaidReviewConsultingResultBlock";

export default function ResultDiagnosisTab({
  data,
  placeUrl,
  paidData,
  paidLoading,
  paidError,
  searchQuery,
  setSearchQuery,
  runPaidDiagnosis,
  consultingData,
  consultingLoading,
  paidReviewConsultingLoading,
  paidReviewConsultingResult,
  handleConsultingClick,
  onBack,
}) {
  return (
    <div
      className="result-main-tabpanel"
      role="tabpanel"
      id="result-tab-panel-diagnosis"
      aria-labelledby="result-tab-trigger-diagnosis"
    >
      <div className="result-status-card">
        <div className="result-status-header">
          <div className={`result-status-alert ${getStatusLevel(totalValue(data))}`}>
            <div className="alert-icon">!</div>
            <span>현재 노출 상태 : {getStatusText(totalValue(data))}</span>
          </div>
          <div className="result-status-total-score">
            전체 점수 : <span style={{ color: "#28a745" }}>{totalValue(data)}점</span>
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

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div className="result-status-coin-section">
            <span>~경고 항목 우선 개선 시</span>
            <span>최대 노출 상승 가능! 💰</span>
          </div>
        </div>
      </div>

      <h2 className="result-section-title">항목별 진단</h2>

      <div className="result-score-grid">
        {RESULT_CATEGORIES.map(({ key, title }, index) => ({
          key,
          title,
          index,
          score: scoreValue(data, key, index),
        }))
          .sort((a, b) => a.score - b.score)
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
                  <div className={`improvement-status ${getScoreLevel(score)}`}>
                    {getImprovementStatus(score)}
                  </div>

                  <button
                    className="improvement-action-btn"
                    onClick={() => handleConsultingClick(key, data)}
                    disabled={key === "reviews" ? paidReviewConsultingLoading : consultingLoading[key]}
                  >
                    <span>
                      {key === "reviews"
                        ? paidReviewConsultingLoading
                          ? "⏳"
                          : "▶"
                        : consultingLoading[key]
                          ? "⏳"
                          : "▶"}
                    </span>
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

      {placeUrl && (
        <div className="result-paid-premium">
          <div className="result-paid-premium-top">
            <div className="result-paid-premium-main">
              <div className="result-paid-premium-title-row">
                <h3 className="result-paid-premium-title">전체 유료 진단</h3>
                <span className="result-paid-premium-price"></span>
              </div>
              <p className="result-paid-premium-sub">각 항목의 추천 개선안을 한 번에 적용합니다</p>
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
                  <span key={i} className="result-paid-kw-chip">
                    {kw}
                  </span>
                ))}
              </div>

              {(() => {
                if (!Array.isArray(paidData.data.competitorsSimple) || paidData.data.competitorsSimple.length === 0) {
                  return null;
                }

                const allCompetitorKeywords = [];
                paidData.data.competitorsSimple.forEach((comp) => {
                  if (Array.isArray(comp.keywords)) {
                    allCompetitorKeywords.push(...comp.keywords);
                  }
                });

                const keywordCount = {};
                allCompetitorKeywords.forEach((kw) => {
                  if (kw && kw !== "대표키워드없음") {
                    keywordCount[kw] = (keywordCount[kw] || 0) + 1;
                  }
                });

                const duplicateKeywords = Object.entries(keywordCount)
                  .filter(([, count]) => count >= 2)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([keyword, count]) => ({ keyword, count }));

                if (duplicateKeywords.length === 0) {
                  return null;
                }

                return (
                  <div className="result-paid-duplicate-keywords" style={{ marginTop: "15px" }}>
                    <h4
                      style={{
                        fontSize: "14px",
                        color: "#666",
                        marginBottom: "8px",
                        fontWeight: "normal",
                      }}
                    >
                      📊 경쟁사 공통 키워드 ({duplicateKeywords.length}개)
                    </h4>
                    <div className="result-paid-keywords">
                      {duplicateKeywords.map(({ keyword, count }, i) => (
                        <span
                          key={i}
                          className="result-paid-kw-chip"
                          style={{
                            backgroundColor: "#e3f2fd",
                            color: "#1976d2",
                            position: "relative",
                          }}
                          title={`${count}개 업체에서 사용 중`}
                        >
                          {keyword}
                          <span
                            style={{
                              fontSize: "10px",
                              marginLeft: "4px",
                              opacity: 0.8,
                              fontWeight: "bold",
                            }}
                          >
                            ×{count}
                          </span>
                        </span>
                      ))}
                    </div>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#888",
                        marginTop: "5px",
                        marginBottom: 0,
                      }}
                    >
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
                <pre className="result-paid-pre">{String(paidData.data.improvements.price)}</pre>
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
    </div>
  );
}
