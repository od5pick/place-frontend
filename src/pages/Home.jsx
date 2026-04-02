
import { useState, useCallback } from "react";
import { diagnoseFree, engineHealth } from "../api/backendApi";
import MapPlaceSelect from "../components/MapPlaceSelect";
import DiagnosisLoadingModal from "../components/DiagnosisLoadingModal";
import ResultBlogTab from "./result/ResultBlogTab";
import Result from "./Result";
import ResultOtherTab from "./result/ResultOtherTab";
import AdminBlogImageTest from "./AdminBlogImageTest";
import { getLogs, placeAddress } from "./result/resultDataUtils";
import { SHELL_TAB } from "../layout/shellTabs";

/** 마케팅자동화 탭: 채널 ON/OFF 스위치 */
function MarketingChannelSwitch({ id, label, on, onChange }) {
  return (
    <div className="home-mkt-channel">
      <span className="home-mkt-channel-label" id={`${id}-label`}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={`${id}-label`}
        className={"home-mkt-switch" + (on ? " home-mkt-switch--on" : "")}
        onClick={() => onChange(!on)}
      >
        <span className="home-mkt-switch-track" aria-hidden>
          <span className="home-mkt-switch-knob" />
        </span>
        <span className="home-mkt-switch-state">{on ? "ON" : "OFF"}</span>
      </button>
    </div>
  );
}

const INDUSTRIES = [
  { value: "hairshop", label: "미용실" },
  { value: "cafe", label: "카페" },
  { value: "restaurant", label: "식당" },
];

const MODES = [
  { value: "url", label: "URL로 검색" },
  { value: "map", label: "지도에서 선택" },
];

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * 헤더/푸터는 App에서 렌더링. 본문 탭만 담당.
 */
export default function Home({
  tab,
  setTab,
  result,
  onDiagnoseResult,
  onClearResult,
  blogIndustry,
  setBlogIndustry,
}) {
  const [mode, setMode] = useState("url");
  const [url, setUrl] = useState("");
  const [industry, setIndustry] = useState("hairshop");
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");
  const [showLogs, setShowLogs] = useState(true);
  const [marketingBlogOn, setMarketingBlogOn] = useState(true);
  const [marketingBlogImageOn, setMarketingBlogImageOn] = useState(false);
  const [marketingShortsOn, setMarketingShortsOn] = useState(false);
  const [marketingReelsOn, setMarketingReelsOn] = useState(false);

  const runWithUrl = useCallback(
    async (placeUrl, placeInfo) => {
      const u = (placeUrl || url || "").trim();
      if (!u) {
        setError("네이버 플레이스 URL을 입력하세요.");
        setLoading(false);
        return;
      }
      setError("");
      setLoading(true);
      try {
        const data = await diagnoseFree(u, industry);
        onDiagnoseResult({ data, placeUrl: u, industry, mapPlaceInfo: placeInfo });
      } catch (e) {
        setError(e?.message || "진단 실패");
      } finally {
        setLoading(false);
      }
    },
    [url, industry, onDiagnoseResult]
  );

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
    <>
      <DiagnosisLoadingModal
        open={loading}
        title="플레이스 진단을 진행 중..."
        subtitle="페이지를 이탈하지 말고 잠시만 기다려주세요"
        ariaTitleId="home-diagnosis-loading-title"
      />

      {tab === SHELL_TAB.HOME && (
        <>
          <section id="home-top" className="home-hero">
            <div className="home-hero-inner">
              <h1 className="home-hero-title">네이버 플레이스 최적화 자동화 서비스</h1>
              <p className="home-hero-sub">간단한 등록과 발행만으로 내 업체를 최적화하세요!</p>
              <div className="home-hero-btns">
                <button
                  type="button"
                  className="home-hero-btn home-hero-btn--outline"
                  onClick={() => scrollToId("section-features")}
                >
                  서비스소개 보기
                </button>
                <button
                  type="button"
                  className="home-hero-btn home-hero-btn--solid"
                  onClick={() => setTab(SHELL_TAB.PLACE)}
                >
                  최적화 시작하기
                </button>
              </div>
            </div>
          </section>

          <section className="home-steps" aria-labelledby="home-steps-title">
            <h2 id="home-steps-title" className="home-section-heading">이렇게 진행됩니다</h2>
            <div className="home-steps-grid">
              <article className="home-step-card">
                <div className="home-step-icon" aria-hidden>📋</div>
                <h3>회원가입 후 업체 등록</h3>
                <p>업체 정보를 등록하고 플레이스와 연결할 준비를 합니다.</p>
              </article>
              <article className="home-step-card">
                <div className="home-step-icon" aria-hidden>📱</div>
                <h3>원클릭으로 정보 입력</h3>
                <p>URL 또는 지도에서 업체를 선택해 빠르게 진단을 시작합니다.</p>
              </article>
              <article className="home-step-card">
                <div className="home-step-icon" aria-hidden>🚀</div>
                <h3>완벽한 최적화 완료</h3>
                <p>점수와 개선 포인트를 확인하고 다음 액션을 이어갑니다.</p>
              </article>
            </div>
          </section>

          <section id="section-features" className="home-features" aria-labelledby="home-features-title">
            <h2 id="home-features-title" className="home-section-heading">우리 서비스의 특징</h2>
            <div className="home-features-grid">
              <article className="home-feature-card">
                <div className="home-feature-icon" aria-hidden>⚙️</div>
                <h3>완전 자동화</h3>
                <p>크롤링·분석·제안까지 한 흐름으로 연결됩니다.</p>
              </article>
              <article className="home-feature-card">
                <div className="home-feature-icon" aria-hidden>⏱️</div>
                <h3>간편한 사용</h3>
                <p>복잡한 설정 없이 URL만으로도 진단을 시작할 수 있습니다.</p>
              </article>
              <article className="home-feature-card">
                <div className="home-feature-icon" aria-hidden>🛡️</div>
                <h3>안전한 관리</h3>
                <p>공개된 플레이스 정보만 활용하며 과장 없는 제안을 지향합니다.</p>
              </article>
            </div>
          </section>

          <section className="home-cta-banner" aria-label="시작 유도">
            <p className="home-cta-text">지금 바로 시작해보세요! 클릭 한 번으로 내 업체 최적화 완료!</p>
            <button
              type="button"
              className="home-cta-banner-btn"
              onClick={() => setTab(SHELL_TAB.PLACE)}
            >
              최적화 시작하기
            </button>
          </section>
        </>
      )}

      {tab === SHELL_TAB.PLACE && (
        <>
          {result ? (
            <Result data={result} onBack={onClearResult} embedded />
          ) : (
            <section className="home-tab-page home-section-place">
              <div className="home-card">
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
                    onDiagnoseStart={() => {
                      setError("");
                      setLoading(true);
                    }}
                    loading={loading}
                  />
                )}

                {error && <div className="home-error">{error}</div>}
              </div>
            </section>
          )}
        </>
      )}

      {tab === SHELL_TAB.MARKETING && (
        <section className="home-tab-page home-section-marketing">
          <div className="home-marketing-standalone">
            <h2 className="home-mkt-page-title">마케팅 자동화</h2>
            <p className="home-blog-lead">
              자동으로 돌릴 채널을 선택하세요. 블로그는 네이버 블로그 컨설팅을 바로 이용할 수 있고, <strong>블로그 + 이미지</strong>는 글과 함께 이미지 포인트를 강조합니다. 쇼츠·릴스는 단계적으로 연동됩니다.
            </p>

            <div className="home-mkt-toggle-panel" aria-label="마케팅 채널 선택">
              <MarketingChannelSwitch
                id="mkt-blog"
                label="블로그"
                on={marketingBlogOn}
                onChange={setMarketingBlogOn}
              />
              <MarketingChannelSwitch
                id="mkt-blog-image"
                label="블로그 + 이미지"
                on={marketingBlogImageOn}
                onChange={setMarketingBlogImageOn}
              />
              <MarketingChannelSwitch
                id="mkt-shorts"
                label="쇼츠"
                on={marketingShortsOn}
                onChange={setMarketingShortsOn}
              />
              <MarketingChannelSwitch
                id="mkt-reels"
                label="릴스"
                on={marketingReelsOn}
                onChange={setMarketingReelsOn}
              />
            </div>

            {marketingBlogOn && (
              <>
                {result ? (
                  <p className="home-blog-lead home-mkt-section-lead">
                    방금 진단한 업체 정보를 반영해 블로그 컨설팅을 받을 수 있습니다. (상단 <strong>플레이스</strong>에서 진단 화면으로 돌아갈 수 있어요.)
                  </p>
                ) : (
                  <p className="home-blog-lead home-mkt-section-lead">
                    플레이스 진단 없이도 지역과 주제만 입력하면 네이버 블로그용 컨설팅을 받을 수 있습니다.
                  </p>
                )}
                {!result && (
                  <div className="home-industry-row home-blog-industry-row">
                    <label htmlFor="homeBlogIndustry">업종</label>
                    <select
                      id="homeBlogIndustry"
                      value={blogIndustry}
                      onChange={(e) => setBlogIndustry(e.target.value)}
                      className="home-select"
                    >
                      {INDUSTRIES.map((i) => (
                        <option key={i.value} value={i.value}>{i.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                <ResultBlogTab
                  industry={result ? result.industry || "hairshop" : blogIndustry}
                  defaultRegion={result ? placeAddress(result) || "" : ""}
                  standalone
                  imageMode={marketingBlogImageOn}
                  hintText={
                    result
                      ? "업종·지역은 진단에 사용한 업체 정보가 반영됩니다."
                      : "업종은 위에서 선택합니다."
                  }
                />
              </>
            )}

            {marketingBlogImageOn && !marketingBlogOn && (
              <div className="home-mkt-channel-block home-mkt-channel-block--note">
                <p className="home-mkt-channel-block-desc home-mkt-channel-block-desc--warn">
                  <strong>블로그 + 이미지</strong>는 <strong>블로그</strong>가 켜져 있을 때 함께 적용됩니다. 위에서 블로그를 ON으로 바꿔 주세요.
                </p>
              </div>
            )}

            {marketingShortsOn && (
              <div className="home-mkt-channel-block">
                <h3 className="home-mkt-channel-block-title">쇼츠 (YouTube Shorts)</h3>
                <p className="home-mkt-channel-block-desc">
                  숏폼 콘텐츠 자동 기획·발행 연동은 준비 중입니다. ON으로 두시면 서비스 오픈 시 알림을 받을 수 있어요.
                </p>
              </div>
            )}

            {marketingReelsOn && (
              <div className="home-mkt-channel-block">
                <h3 className="home-mkt-channel-block-title">릴스 (Instagram Reels)</h3>
                <p className="home-mkt-channel-block-desc">
                  릴스용 소재·캡션 자동화 연동은 준비 중입니다.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {tab === SHELL_TAB.ADMIN_BLOG_IMAGE_TEST && <AdminBlogImageTest />}

      {tab === SHELL_TAB.ETC && (
        <section className="home-tab-page home-section-etc">
          {result ? (
            <ResultOtherTab
              logs={getLogs(result)}
              showLogs={showLogs}
              setShowLogs={setShowLogs}
              onBack={onClearResult}
            />
          ) : (
            <>
              <div className="home-etc-columns">
                <div className="home-subsection-card">
                  <h3 className="home-etc-block-title">이용 요금</h3>
                  <p className="home-subsection-desc">요금표 및 요금제 안내는 준비 중입니다.</p>
                </div>
                <div className="home-subsection-card">
                  <h3 className="home-etc-block-title">자주 묻는 질문</h3>
                  <p className="home-subsection-desc">FAQ 콘텐츠는 곧 추가됩니다.</p>
                </div>
              </div>
              <div className="home-health-row">
                <button type="button" onClick={checkHealth} className="home-btn-health" disabled={health?.checking}>
                  {health?.checking ? "확인 중…" : "서버 상태 확인"}
                </button>
                {health && !health.checking && (
                  <pre className="home-health-pre">{JSON.stringify(health, null, 2)}</pre>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
