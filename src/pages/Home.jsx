
import { useState } from "react";
import { diagnoseFree, engineHealth } from "../api/backendApi";
import MapPlaceSelect from "../components/MapPlaceSelect";
import DiagnosisLoadingModal from "../components/DiagnosisLoadingModal";
import "./home.css";

const INDUSTRIES = [
  { value: "hairshop", label: "미용실" },
  { value: "cafe",     label: "카페"   },
  { value: "restaurant", label: "식당" },
];

const MODES = [
  { value: "url",  label: "URL로 검색" },
  { value: "map",  label: "지도에서 선택" },
];

export default function Home({ onResult }) {
  const [mode, setMode]         = useState("url");
  const [url, setUrl]           = useState("");
  const [industry, setIndustry] = useState("hairshop");
  const [loading, setLoading]   = useState(false);
  const [health, setHealth]     = useState(null);
  const [error, setError]       = useState("");

  async function runWithUrl(placeUrl, placeInfo) {
    const u = (placeUrl || url || "").trim();
    if (!u) {
      setError("네이버 플레이스 URL을 입력하세요.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await diagnoseFree(u, industry);
      // ✅ 지도에서 전달받은 이름/주소 정보도 함께 저장
      onResult({ data, placeUrl: u, industry, mapPlaceInfo: placeInfo });
    } catch (e) {
      setError(e?.message || "진단 실패");
    } finally {
      setLoading(false);
    }
  }

  async function checkHealth() {
    setHealth({ checking: true });
    try {
      const h = await engineHealth();
      setHealth(h);
    } catch (e) {
      setHealth({ error: e?.message || "연결 실패", raw: String(e) });
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") runWithUrl();
  }

  return (
    <div className="home-page">
      <DiagnosisLoadingModal
        open={loading}
        title="플레이스 진단을 진행 중..."
        subtitle="페이지를 이탈하지 말고 잠시만 기다려주세요"
        ariaTitleId="home-diagnosis-loading-title"
      />
      <header className="home-header">
        <div className="home-logo">
          <svg width="48" height="48" viewBox="0 0 50 50" fill="none">
            <rect width="50" height="50" rx="10" fill="#03C75A"/>
            <path d="M15 35V15H22L28 28V15H35V35H28L22 22V35H15Z" fill="white"/>
          </svg>
          <div className="home-logo-text">
            <h1>플레이스 최적화 진단</h1>
            <p>네이버 플레이스 점수를 확인하세요</p>
          </div>
        </div>
      </header>

      <section className="home-card">
        <div className="home-card-title">
          <h2>플레이스 진단하기</h2>
          <p>URL을 직접 입력하거나 지도에서 업체를 선택해 진단할 수 있습니다</p>
        </div>

        <div className="home-mode-tabs">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              className={"home-mode-tab" + (mode === m.value ? " home-mode-tab--active" : "")}
              onClick={() => setMode(m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="home-industry-row">
          <label htmlFor="industrySelect">업종</label>
          <select
            id="industrySelect"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="home-select"
          >
            {INDUSTRIES.map((i) => (
              <option key={i.value} value={i.value}>{i.label}</option>
            ))}
          </select>
        </div>

        {mode === "url" && (
          <>
            <div className="home-search-row">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="네이버 플레이스 URL을 입력하세요"
                className="home-input"
                disabled={loading}
              />
              <button onClick={() => runWithUrl()} disabled={loading} className="home-btn-diagnose">
                {!loading && (
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <path d="M19 19L13 13M15 8C15 11.866 11.866 15 8 15C4.134 15 1 11.866 1 8C1 4.134 4.134 1 8 1C11.866 1 15 4.134 15 8Z"
                      stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                )}
                {loading ? "분석 중..." : "진단하기"}
              </button>
            </div>
            <div className="home-url-example">
              <span className="home-example-label">URL 예시:</span>
              <span className="home-example-url">https://m.place.naver.com/hairshop/1443688242/home</span>
            </div>
          </>
        )}

        {mode === "map" && (
          <MapPlaceSelect
            industry={industry}
            onSelectPlace={(link, placeInfo) => runWithUrl(link, placeInfo)}
            onDiagnoseStart={() => setLoading(true)}
            loading={loading}
          />
        )}

        {error && <div className="home-error">{error}</div>}
      </section>

      <div className="home-health-row">
        <button onClick={checkHealth} className="home-btn-health" disabled={health?.checking}>
          {health?.checking ? "확인 중…" : "서버 상태 확인"}
        </button>
        {health && !health.checking && (
          <pre className="home-health-pre">{JSON.stringify(health, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}
