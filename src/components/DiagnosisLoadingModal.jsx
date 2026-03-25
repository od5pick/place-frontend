import { useEffect, useState } from "react";
import "./DiagnosisLoadingModal.css";

/**
 * 일반진단·전체 유료진단 공통: 블러 오버레이 + 스피너 + 진행 바
 */
export default function DiagnosisLoadingModal({
  open,
  title,
  subtitle,
  ariaTitleId = "diagnosis-loading-title",
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) {
      setProgress(0);
      return;
    }
    setProgress(42);
    const id = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : Math.min(90, p + Math.random() * 6 + 2)));
    }, 380);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="diagnosis-loading-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaTitleId}
      aria-busy="true"
    >
      <div className="diagnosis-loading-modal">
        <div className="diagnosis-loading-spinner-wrap" aria-hidden>
          <svg className="diagnosis-loading-spinner" viewBox="0 0 50 50" aria-hidden>
            <circle
              className="diagnosis-loading-spinner-track"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke="#e5f0e9"
              strokeWidth="4"
            />
            <circle
              className="diagnosis-loading-spinner-arc"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke="#03c75a"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="14 22"
            />
          </svg>
        </div>
        <h2 id={ariaTitleId} className="diagnosis-loading-title">
          {title}
        </h2>
        <p className="diagnosis-loading-sub">{subtitle}</p>
        <div className="diagnosis-loading-rule" aria-hidden />
        <div className="diagnosis-loading-bar-track">
          <div
            className="diagnosis-loading-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
