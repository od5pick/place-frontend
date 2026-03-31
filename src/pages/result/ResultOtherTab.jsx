import React from "react";

export default function ResultOtherTab({ logs, showLogs, setShowLogs, onBack }) {
  return (
    <div
      className="result-main-tabpanel"
      role="tabpanel"
      id="result-tab-panel-other"
      aria-labelledby="result-tab-trigger-other"
    >
      <div className="result-tab-placeholder result-tab-placeholder--compact result-tab-placeholder--other">
        <p className="result-tab-placeholder-desc" style={{ marginBottom: 16 }}>
          크롤링 로그와 부가 정보를 확인합니다.
        </p>
      </div>
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
      <div className="result-actions">
        <button type="button" className="back-button" onClick={onBack}>
          새 진단 시작
        </button>
      </div>
    </div>
  );
}
