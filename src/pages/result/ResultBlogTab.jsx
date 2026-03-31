import React from "react";

/** 블로그 연동 진단·가이드 영역 (추후 확장) */
export default function ResultBlogTab() {
  return (
    <div
      className="result-main-tabpanel"
      role="tabpanel"
      id="result-tab-panel-blog"
      aria-labelledby="result-tab-trigger-blog"
    >
      <div className="result-tab-placeholder result-tab-placeholder--blog">
        <h2 className="result-tab-placeholder-title">블로그</h2>
        <p className="result-tab-placeholder-desc">
          네이버 블로그 연동 진단·가이드 등은 준비 중입니다. 이 탭에 블로그 전용 결과를 붙일 수 있어요.
        </p>
      </div>
    </div>
  );
}
