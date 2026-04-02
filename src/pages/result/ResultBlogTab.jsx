import React, { useEffect, useState } from "react";
import { postBlogConsulting, postBlogTopicSuggestions } from "../../api/backendApi";

function guessRegionFromAddress(addr) {
  const s = String(addr || "").trim();
  if (!s) return "";
  const parts = s.replace(/\s+/g, " ").split(" ");
  const station = parts.find((p) => /역$/.test(p) && p.length <= 12);
  if (station) return station;
  if (parts.length >= 2) return `${parts[0]} ${parts[1]}`.trim();
  return parts[0] || "";
}

/** GPT 본문의 [이미지1]~[이미지3] 자리에 Gemini 생성 이미지(data URL)를 끼워 넣어 표시 */
function BlogConsultOutput({ text, imageMode, imageUrls }) {
  if (!text) return null;

  const parts = text.split(/(\[이미지\s*[1-3]\])/g);
  const hasImagePlaceholders = parts.length > 1;

  if (!imageMode || !hasImagePlaceholders) {
    return <pre className="result-blog-output-pre">{text}</pre>;
  }

  return (
    <div className="result-blog-body-with-images" role="article">
      {parts.map((part, i) => {
        const m = part.match(/^\[이미지\s*([1-3])\]$/);
        if (m) {
          const idx = parseInt(m[1], 10) - 1;
          const url = Array.isArray(imageUrls) ? imageUrls[idx] : null;
          return (
            <figure key={`img-${i}`} className="result-blog-inline-figure">
              {url ? (
                <img
                  src={url}
                  alt={`본문 삽입 이미지 ${idx + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="result-blog-inline-img"
                />
              ) : (
                <div className="result-blog-inline-fail" role="status">
                  이미지 {idx + 1} (생성 실패 또는 대기)
                </div>
              )}
            </figure>
          );
        }
        return (
          <span key={`txt-${i}`} className="result-blog-body-chunk">
            {part}
          </span>
        );
      })}
    </div>
  );
}

/** 블로그 탭: GPT 블로그 컨설팅 (결과 화면 / 홈 단독 공통) */
export default function ResultBlogTab({
  industry = "hairshop",
  defaultRegion = "",
  /** 홈 등 단독 사용 시 안내 문구. 미지정 시 진단 연동 안내 */
  hintText,
  /** true면 tabpanel 대신 region (홈 상단 탭과 역할 분리) */
  standalone = false,
  /** 마케팅 탭에서 「블로그 + 이미지」ON일 때 안내 + GPT 이미지 강조 */
  imageMode = false,
}) {
  const [region, setRegion] = useState("");
  const [topicsText, setTopicsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestedTopics, setSuggestedTopics] = useState([]);
  const [selectedSuggestIndex, setSelectedSuggestIndex] = useState(null);
  const [error, setError] = useState("");
  const [resultText, setResultText] = useState("");
  /** 블로그+이미지: 백엔드 Gemini 생성 이미지 URL/data URL (실패 슬롯은 null) */
  const [imageUrls, setImageUrls] = useState([]);
  /** 블로그+이미지: 참고 사진 data URL (GPT 비전으로 본문·이미지 프롬프트 톤 맞춤) */
  const [referenceImageDataUrl, setReferenceImageDataUrl] = useState(null);
  const [referencePreviewUrl, setReferencePreviewUrl] = useState(null);

  useEffect(() => {
    const addr = String(defaultRegion || "").trim();
    if (!addr) return;
    setRegion((prev) => {
      if (prev.trim()) return prev;
      return guessRegionFromAddress(addr) || addr;
    });
  }, [defaultRegion]);

  useEffect(() => {
    return () => {
      if (referencePreviewUrl && referencePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(referencePreviewUrl);
      }
    };
  }, [referencePreviewUrl]);

  function clearReferenceImage() {
    if (referencePreviewUrl && referencePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(referencePreviewUrl);
    }
    setReferencePreviewUrl(null);
    setReferenceImageDataUrl(null);
  }

  function onReferenceFileChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 첨부할 수 있습니다.");
      return;
    }
    const maxBytes = 4 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError("참고 이미지는 4MB 이하로 올려 주세요.");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl.startsWith("data:image/")) {
        setError("이미지를 읽지 못했습니다.");
        return;
      }
      setReferenceImageDataUrl(dataUrl);
      setReferencePreviewUrl((prev) => {
        if (prev && prev.startsWith("blob:")) {
          URL.revokeObjectURL(prev);
        }
        return URL.createObjectURL(file);
      });
    };
    reader.onerror = () => setError("이미지를 읽지 못했습니다.");
    reader.readAsDataURL(file);
  }

  function topicsAsLines() {
    return topicsText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  }

  async function handleSuggestTopics() {
    setError("");
    const regionTrim = region.trim();
    if (!regionTrim) {
      setError("지역을 입력한 뒤 추천 주제를 받을 수 있습니다.");
      return;
    }
    setSuggestLoading(true);
    setSuggestedTopics([]);
    setSelectedSuggestIndex(null);
    try {
      const res = await postBlogTopicSuggestions({
        industry,
        region: regionTrim,
        existingTopics: topicsAsLines(),
      });
      if (res.success && Array.isArray(res.topics) && res.topics.length >= 1) {
        setSuggestedTopics(res.topics.slice(0, 3));
      } else {
        setError(res.error || "추천 주제를 가져오지 못했습니다.");
      }
    } catch (e) {
      setError(e?.message || "추천 주제 요청에 실패했습니다.");
    } finally {
      setSuggestLoading(false);
    }
  }

  function selectSuggestedTopic(index, line) {
    setSelectedSuggestIndex(index);
    setTopicsText(line);
  }

  async function handleConsult() {
    setError("");
    setResultText("");
    setImageUrls([]);
    const regionTrim = region.trim();
    if (!regionTrim) {
      setError("지역을 입력해 주세요.");
      return;
    }
    const lines = topicsAsLines();
    setLoading(true);
    try {
      const res = await postBlogConsulting({
        industry,
        region: regionTrim,
        existingTopics: lines,
        imageMode,
        referenceImageDataUrl: referenceImageDataUrl || null,
      });
      if (res.success && res.content) {
        setResultText(res.content);
        if (imageMode && Array.isArray(res.imageUrls)) {
          setImageUrls(res.imageUrls);
        }
      } else {
        setError(res.error || "응답 형식이 올바르지 않습니다.");
      }
    } catch (e) {
      setError(e?.message || "블로그 컨설팅 요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const defaultHint =
    "업종은 현재 진단에 선택한 값(미용실/카페/음식점)이 자동 반영됩니다.";
  const hint = hintText !== undefined ? hintText : defaultHint;

  return (
    <div
      className="result-main-tabpanel"
      role={standalone ? "region" : "tabpanel"}
      id={standalone ? undefined : "result-tab-panel-blog"}
      aria-labelledby={standalone ? undefined : "result-tab-trigger-blog"}
      aria-label={standalone ? "블로그 컨설팅" : undefined}
    >
      <div className="result-blog-panel">
        <div className="result-tab-placeholder result-tab-placeholder--blog result-blog-intro">
          <h2 className="result-tab-placeholder-title">블로그</h2>
          <p className="result-tab-placeholder-desc">
            네이버 블로그 상위노출을 위한 주제·본문·태그를 GPT로 생성합니다. (매장 운영 블로그 톤, 광고 느낌 최소화)
          </p>
          {imageMode && (
            <p className="result-blog-image-mode-note" role="note">
              <strong>블로그 + 이미지</strong> 모드: GPT가 본문에 <code>[이미지1]</code>~<code>[이미지3]</code>를 넣고 영문 이미지 생성 프롬프트만 만들면, 그 위치에 Gemini로 만든 이미지가 끼워져 보입니다(최대 3장, API 비용 발생).
              참고 사진은 지역 입력 아래에서 첨부할 수 있습니다.
            </p>
          )}
        </div>

        <div className="result-blog-form">
          <label className="result-blog-label" htmlFor="blog-region">
            지역 <span className="result-blog-required">*</span>
          </label>
          <input
            id="blog-region"
            type="text"
            className="result-blog-input"
            placeholder="예: 서대문역, 명동, 서울역"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            disabled={loading || suggestLoading}
            autoComplete="off"
          />

          <div className="result-blog-ref-image-block">
            <label className="result-blog-label" htmlFor="blog-ref-image">
              참고 이미지 <span className="result-blog-optional">(선택)</span>
            </label>
            <p className="result-blog-ref-image-hint">
              매장·메뉴·시술 사진을 올리면 GPT가 이미지를 함께 보고 글을 맞춥니다.{" "}
              {imageMode
                ? "Gemini 삽입 이미지 톤도 참고 이미지에 맞춥니다."
                : "본문만 생성할 때도 반영됩니다. Gemini 이미지까지 쓰려면 상단에서 「블로그 + 이미지」를 켜 주세요."}{" "}
              JPEG·PNG·WebP·GIF, 4MB 이하.
            </p>
            <div className="result-blog-ref-image-row">
              <label className="result-blog-ref-image-upload-label">
                <input
                  id="blog-ref-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="result-blog-ref-image-sr-only"
                  onChange={onReferenceFileChange}
                  disabled={loading || suggestLoading}
                />
                <span className="result-blog-ref-image-fake-btn">참고 이미지 선택</span>
              </label>
              {referenceImageDataUrl && (
                <button
                  type="button"
                  className="result-blog-ref-image-clear"
                  onClick={clearReferenceImage}
                  disabled={loading || suggestLoading}
                >
                  제거
                </button>
              )}
            </div>
            {referencePreviewUrl && (
              <div className="result-blog-ref-image-preview-wrap">
                <img
                  src={referencePreviewUrl}
                  alt="참고 이미지 미리보기"
                  className="result-blog-ref-image-preview"
                />
              </div>
            )}
          </div>

          <label className="result-blog-label" htmlFor="blog-topics">
            블로그 주제 (한 줄에 하나씩 · 추천에서 고르거나 직접 입력)
          </label>
          <div className="result-blog-suggest-row">
            <button
              type="button"
              className="result-blog-suggest-btn"
              onClick={handleSuggestTopics}
              disabled={loading || suggestLoading || !region.trim()}
            >
              {suggestLoading ? "추천 생성 중…" : "추천 주제"}
            </button>
            {!region.trim() && (
              <span className="result-blog-suggest-hint">지역 입력 후 사용할 수 있어요</span>
            )}
          </div>
          {suggestedTopics.length > 0 && (
            <div className="result-blog-suggest-chips" role="group" aria-label="추천 주제 선택">
              {suggestedTopics.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  className={
                    "result-blog-suggest-chip" +
                    (selectedSuggestIndex === i ? " result-blog-suggest-chip--selected" : "")
                  }
                  onClick={() => selectSuggestedTopic(i, t)}
                  disabled={loading || suggestLoading}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          <textarea
            id="blog-topics"
            className="result-blog-textarea"
            rows={5}
            placeholder={"서대문역 미용실 펌 후기\n봄 헤어 컬러 추천"}
            value={topicsText}
            onChange={(e) => {
              setTopicsText(e.target.value);
              setSelectedSuggestIndex(null);
            }}
            disabled={loading || suggestLoading}
          />

          {hint ? <p className="result-blog-hint">{hint}</p> : null}

          {error && <div className="result-blog-error">{error}</div>}

          <button
            type="button"
            className="result-blog-cta"
            onClick={handleConsult}
            disabled={loading || suggestLoading}
          >
            {loading ? "생성 중…" : "블로그 컨설팅"}
          </button>
        </div>

        {resultText && (
          <div className="result-blog-output">
            <h3 className="result-blog-output-title">생성 결과</h3>
            <BlogConsultOutput text={resultText} imageMode={imageMode} imageUrls={imageUrls} />
          </div>
        )}
      </div>
    </div>
  );
}
