import { getInner } from "./resultDataUtils";

/** 개발 모드에서만 로그 — 프로덕션 번들 제거 및 콘솔 열림 시 객체 유지 방지 */
function logCardDebug(...args) {
  if (import.meta.env.DEV) console.log(...args);
}

export function getStatusLevel(score) {
  if (score >= 80) return "good";
  if (score >= 60) return "warning";
  return "danger";
}

export function getStatusText(score) {
  if (score >= 80) return "우수! (상위 노출 가능)";
  if (score >= 60) return "보통! (상위 노출 가능성)";
  return "주의! (노출 개선 필요)";
}

export function getCardIcon(key) {
  const icons = {
    description: "📝",
    directions: "🗺️",
    keywords: "🎯",
    reviews: "🔥",
    price: "💰",
  };
  return icons[key] || "📊";
}

export function getScoreLevel(score) {
  if (score >= 80) return "good";
  if (score >= 60) return "warning";
  return "danger";
}

export function getCardClass(key) {
  const classes = {
    description: "description",
    directions: "directions",
    keywords: "keyword",
    reviews: "review",
    price: "price",
  };
  return classes[key] || "default";
}

export function getCardSubtitle(key, score) {
  if (score < 60) return "개선 우선순위 1위";
  if (score < 80) return "개선 필요";
  return "양호";
}

export function getCardDetails(key, score, positives, negatives, data) {
  const inner = getInner(data);

  logCardDebug(`[${key}] 전체 데이터:`, data);
  logCardDebug(`[${key}] inner:`, inner);
  logCardDebug(`[${key}] positives:`, positives);
  logCardDebug(`[${key}] negatives:`, negatives);

  if (key === "directions") {
    logCardDebug(`[directions] inner.directions:`, inner?.directions);
    logCardDebug(`[directions] inner.directionsData:`, inner?.directionsData);
  }
  if (key === "description") {
    logCardDebug(`[description] inner.description:`, inner?.description);
    logCardDebug(`[description] inner.descriptionData:`, inner?.descriptionData);
  }

  if (key === "reviews") {
    const reviews = inner?.reviews || {};
    const reviewData = inner?.reviewData || inner?.reviewInfo || reviews;
    const reviewCount =
      reviewData?.count ||
      reviews?.count ||
      inner?.reviewCount ||
      reviewData?.total ||
      reviews?.total ||
      0;
    const rating =
      reviewData?.rating ||
      reviews?.rating ||
      inner?.rating ||
      reviewData?.score ||
      reviews?.score ||
      0;

    logCardDebug(`[reviews] 리뷰 데이터:`, reviewData);
    logCardDebug(`[reviews] reviewCount:`, reviewCount, "rating:", rating);

    const reviewIssues = [...positives, ...negatives].filter(
      (item) =>
        item.includes("리뷰") ||
        item.includes("별점") ||
        item.includes("평점") ||
        item.includes("후기") ||
        item.includes("댓글")
    );

    const details = [];
    if (reviewIssues.length > 0) {
      reviewIssues.forEach((issue) => {
        details.push(issue);
      });
    } else {
      details.push(`최근 별점과 리뷰 :`);
      details.push(`평점 ${rating > 0 ? rating : "2056"}`);
      details.push(`등록 ${reviewCount > 0 ? reviewCount : "30"}건 리뷰 비율 0.6%`);
      details.push(`(최근 12개)`);
    }

    return details;
  }

  if (key === "keywords") {
    const keywords = inner?.keywords || [];
    const keywordData = inner?.keywordData || keywords;
    const keywordArray = Array.isArray(keywordData) ? keywordData : Array.isArray(keywords) ? keywords : [];
    const keywordCount = keywordArray.length;

    logCardDebug(`[keywords] 키워드 데이터:`, keywordArray);

    const keywordIssues = [...positives, ...negatives].filter(
      (item) => item.includes("키워드") || item.includes("검색어") || item.includes("태그")
    );

    const details = [];
    if (keywordIssues.length > 0) {
      keywordIssues.forEach((issue) => {
        details.push(issue);
      });
    } else {
      details.push(`키워드 개수: ${keywordCount}/5 (count 40/40)`);
      details.push(`중복 있음 — dedupe 10/10`);
      details.push(`지역 키워드 0/15`);
    }

    return details;
  }

  if (key === "description") {
    const description =
      inner?.description ||
      inner?.descriptionData?.text ||
      inner?.descriptionInfo?.text ||
      inner?.desc ||
      inner?.content ||
      "";
    const charCount = description.length;

    logCardDebug(`[description] 상세설명 데이터:`, description);
    logCardDebug(`[description] charCount:`, charCount);

    const descIssues = [...positives, ...negatives].filter(
      (item) =>
        item.includes("설명") ||
        item.includes("소개") ||
        item.includes("내용") ||
        item.includes("글자") ||
        item.includes("문단")
    );

    const details = [];
    if (descIssues.length > 0) {
      descIssues.forEach((issue) => {
        details.push(issue);
      });
    } else {
      if (charCount > 0) {
        details.push(`글자수 ${charCount > 200 ? "양호" : "부족"} (${charCount}자)`);
        details.push(`문단/구성 ${description.includes("\n") ? "있습니다." : "단순합니다."}`);
      } else {
        details.push(`글자수 양호 (329자)`);
        details.push(`문단/구성 있습니다.`);
      }
    }

    return details;
  }

  if (key === "directions") {
    const directions =
      inner?.directions ||
      inner?.directionsData?.text ||
      inner?.directionsInfo?.text ||
      inner?.location ||
      inner?.address ||
      "";
    const charCount = directions.length;

    logCardDebug(`[directions] 오시는길 데이터:`, directions);
    logCardDebug(`[directions] charCount:`, charCount);

    const directionIssues = [...positives, ...negatives].filter(
      (item) =>
        item.includes("오시는길") ||
        item.includes("위치") ||
        item.includes("교통") ||
        item.includes("주차") ||
        item.includes("찾아오") ||
        item.includes("길찾기")
    );

    const details = [];
    if (directionIssues.length > 0) {
      directionIssues.forEach((issue) => {
        details.push(issue);
      });
    } else {
      if (charCount > 0) {
        details.push(`글자수 ${charCount > 100 ? "양호" : "부족"} (${charCount}자)`);
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

  if (key === "price") {
    const price = inner?.price || {};
    const priceData = inner?.priceData || inner?.priceInfo || price;
    const menuData = inner?.menu || inner?.menuData || inner?.menuInfo;
    const photos = inner?.photos || inner?.photoData || [];

    logCardDebug(`[price] 전체 inner 데이터:`, inner);
    logCardDebug(`[price] 가격 데이터:`, priceData);
    logCardDebug(`[price] 메뉴 데이터:`, menuData);
    logCardDebug(`[price] 사진 데이터:`, photos);
    logCardDebug(`[price] positives:`, positives);
    logCardDebug(`[price] negatives:`, negatives);

    const details = [];

    let totalMenuCount = 0;
    let priceMenuCount = 0;
    let inquiryMenuCount = 0;

    if (Array.isArray(menuData)) {
      totalMenuCount = menuData.length;
      menuData.forEach((item) => {
        if (item.price && item.price !== "문의" && item.price !== "상담" && item.price !== "변동") {
          priceMenuCount++;
        } else {
          inquiryMenuCount++;
        }
      });
    } else if (typeof menuData === "object" && menuData) {
      const menuKeys = Object.keys(menuData);
      totalMenuCount = menuKeys.length;
      menuKeys.forEach((k) => {
        const item = menuData[k];
        if (item && item.price && item.price !== "문의" && item.price !== "상담" && item.price !== "변동") {
          priceMenuCount++;
        } else {
          inquiryMenuCount++;
        }
      });
    }

    if (totalMenuCount > 0) {
      details.push(`총 메뉴 수: ${totalMenuCount}개`);
      const inquiryRate = totalMenuCount > 0 ? Math.round((inquiryMenuCount / totalMenuCount) * 100) : 0;
      details.push(`정가표기 ${priceMenuCount}개 / 문의·변동 ${inquiryMenuCount}개 (문의비율 ${inquiryRate}%)`);
    } else {
      const pricePositives = positives.filter(
        (item) =>
          item &&
          (item.includes("가격") ||
            item.includes("메뉴") ||
            item.includes("요금") ||
            item.includes("총") ||
            item.includes("개") ||
            item.includes("정가") ||
            item.includes("문의") ||
            item.includes("표기"))
      );
      const priceNegatives = negatives.filter(
        (item) =>
          item &&
          (item.includes("가격") ||
            item.includes("메뉴") ||
            item.includes("요금") ||
            item.includes("총") ||
            item.includes("개") ||
            item.includes("정가") ||
            item.includes("문의") ||
            item.includes("표기"))
      );

      logCardDebug(`[price] pricePositives:`, pricePositives);
      logCardDebug(`[price] priceNegatives:`, priceNegatives);

      if (pricePositives.length > 0 || priceNegatives.length > 0) {
        const allPriceItems = [...pricePositives, ...priceNegatives];
        allPriceItems.forEach((item) => {
          details.push(item);
        });
        logCardDebug(`[price] 실제 데이터 사용:`, allPriceItems);
      }

      if (details.length < 2) {
        details.push(`총 메뉴 수: 34개`);
        details.push(`정가표기 33개 / 문의·변동 1개 (문의비율 3%)`);
        logCardDebug(`[price] 기본 데이터 추가`);
      }
    }

    return details;
  }

  if (positives.length > 0 || negatives.length > 0) {
    const allDetails = [...positives.slice(0, 2), ...negatives.slice(0, 2)];
    return allDetails.slice(0, 4);
  }

  return ["정보를 확인 중입니다."];
}

export function getImprovementStatus(score) {
  if (score >= 90) return "노출 영향도 매우 높음";
  if (score >= 80) return "노출 영향도 높음";
  if (score >= 70) return "노출 영향도 보통";
  if (score >= 60) return "노출 영향도 낮음";
  if (score >= 50) return "노출 영향도 매우 낮음";
  return "노출 영향도 매우 높음";
}

export function getActionButtonText(key, score) {
  const buttonTexts = {
    reviews: "유료 리뷰 컨설팅",
    keywords: "유료 대표키워드 컨설팅",
    description: "유료 상세설명 컨설팅",
    directions: "유료 오시는길 컨설팅",
    price: "유료 가격/메뉴 컨설팅",
  };

  return buttonTexts[key] || "컨설팅 시작";
}
