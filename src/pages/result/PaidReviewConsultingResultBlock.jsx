import React from "react";

/** 유료 리뷰 진단 결과 UI (전체 유료 결과 상단 또는 항목별 영역에서 재사용) */
export default function PaidReviewConsultingResultBlock({ result }) {
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
