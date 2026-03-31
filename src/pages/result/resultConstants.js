/** 백엔드 영문 키 ↔ 한글 키 */
export const KEY_TO_KOREAN = {
  description: "상세설명",
  directions: "오시는길",
  keywords: "대표키워드",
  reviews: "리뷰",
  price: "가격/메뉴",
};

/** 항목별 진단 카드 순서 */
export const RESULT_CATEGORIES = [
  { key: "description", title: "상세설명" },
  { key: "directions", title: "오시는길" },
  { key: "keywords", title: "대표키워드" },
  { key: "reviews", title: "리뷰" },
  { key: "price", title: "가격/메뉴" },
];

export const RESULT_MAIN_TABS = [
  { id: "diagnosis", label: "진단" },
  { id: "blog", label: "블로그" },
  { id: "other", label: "기타" },
];
