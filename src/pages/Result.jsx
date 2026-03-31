import React, { useState } from "react";
import DiagnosisLoadingModal from "../components/DiagnosisLoadingModal";
import { diagnosePaid, API_BASE_URL } from "../api/backendApi";
import { RESULT_MAIN_TABS } from "./result/resultConstants";
import {
  getInner,
  getLogs,
  getPlaceDisplayName,
  placeAddress,
} from "./result/resultDataUtils";
import ResultBlogTab from "./result/ResultBlogTab";
import ResultDiagnosisTab from "./result/ResultDiagnosisTab";
import ResultOtherTab from "./result/ResultOtherTab";
import "./result.css";

export default function Result({ data, onBack }) {
  const [resultMainTab, setResultMainTab] = useState("diagnosis");
  const [showLogs, setShowLogs] = useState(true);
  const [paidData, setPaidData] = useState(null);
  const [paidLoading, setPaidLoading] = useState(false);
  const [paidError, setPaidError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [consultingLoading, setConsultingLoading] = useState({});
  const [consultingData, setConsultingData] = useState({});
  const [paidReviewConsultingLoading, setPaidReviewConsultingLoading] = useState(false);
  const [paidReviewConsultingResult, setPaidReviewConsultingResult] = useState(null);
  const placeUrl = data?.placeUrl;
  const industry = data?.industry || "hairshop";

  const inner = getInner(data);
  const placeNameForApi = getPlaceDisplayName(data) || inner?.placeName || inner?.name || "";
  const keywordsForApi = inner?.keywords || "";

  const logs = getLogs(data);

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

  const handleConsultingClick = async (key, dataArg) => {
    if (key === "reviews") {
      await handlePaidReviewConsultingSamples(dataArg);
    } else {
      await handleGeneralConsulting(key, dataArg);
    }
  };

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

  const handleGeneralConsulting = async (key, dataArg) => {
    setConsultingLoading((prev) => ({ ...prev, [key]: true }));

    try {
      console.log(`[${key} 항목별 컨설팅] 시작 (paid-consulting/item)...`);
      const mapPlaceInfo = dataArg?.mapPlaceInfo || {};
      const x = mapPlaceInfo.x ?? mapPlaceInfo.mapx ?? null;
      const y = mapPlaceInfo.y ?? mapPlaceInfo.mapy ?? null;

      const response = await fetch(`${API_BASE_URL}/api/engine/paid-consulting/item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: key,
          placeUrl: placeUrl || dataArg?.placeUrl,
          industry: industry || "hairshop",
          searchQuery: searchQuery.trim() || "",
          x,
          y,
          placeName: placeNameForApi || getPlaceDisplayName(dataArg),
          placeAddress: placeAddress(dataArg) || "",
          currentData: getInner(dataArg),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || `HTTP ${response.status}`);
      }
      setConsultingData((prev) => ({ ...prev, [key]: result }));
      console.log(`[${key} 항목별 컨설팅] 완료:`, result);
    } catch (error) {
      console.error(`${key} 컨설팅 오류:`, error);
      setConsultingData((prev) => ({
        ...prev,
        [key]: { error: `${key} 컨설팅 중 오류가 발생했습니다.` },
      }));
    } finally {
      setConsultingLoading((prev) => ({ ...prev, [key]: false }));
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

        <div className="result-main-tablist" role="tablist" aria-label="진단 결과 구역">
          {RESULT_MAIN_TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`result-tab-trigger-${id}`}
              aria-selected={resultMainTab === id}
              aria-controls={`result-tab-panel-${id}`}
              className={`result-main-tab result-main-tab--${id}${resultMainTab === id ? " result-main-tab--active" : ""}`}
              onClick={() => setResultMainTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {resultMainTab === "diagnosis" && (
          <ResultDiagnosisTab
            data={data}
            placeUrl={placeUrl}
            paidData={paidData}
            paidLoading={paidLoading}
            paidError={paidError}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            runPaidDiagnosis={runPaidDiagnosis}
            consultingData={consultingData}
            consultingLoading={consultingLoading}
            paidReviewConsultingLoading={paidReviewConsultingLoading}
            paidReviewConsultingResult={paidReviewConsultingResult}
            handleConsultingClick={handleConsultingClick}
            onBack={onBack}
          />
        )}

        {resultMainTab === "blog" && <ResultBlogTab />}

        {resultMainTab === "other" && (
          <ResultOtherTab
            logs={logs}
            showLogs={showLogs}
            setShowLogs={setShowLogs}
            onBack={onBack}
          />
        )}
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
