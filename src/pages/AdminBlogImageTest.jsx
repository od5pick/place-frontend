import { useEffect, useState } from "react";
import { postBlogConsulting, postGenerateImage } from "../api/backendApi";
import {
  DEFAULT_ADMIN_GEMINI_PROMPT,
  DEFAULT_BLOG_IMAGE_MODE_SYSTEM_PROMPT,
} from "./adminBlogImageTestDefaults";

const INDUSTRIES = [
  { value: "hairshop", label: "미용실" },
  { value: "cafe", label: "카페" },
  { value: "restaurant", label: "식당" },
];

export default function AdminBlogImageTest() {
  const [industry, setIndustry] = useState("hairshop");
  const [region, setRegion] = useState("서대문역");
  const [topicsText, setTopicsText] = useState("봄 헤어 컬러 추천\n서대문역 미용실 스타일");
  const [referenceDataUrl, setReferenceDataUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [blogImageModeSystemPrompt, setBlogImageModeSystemPrompt] = useState(
    DEFAULT_BLOG_IMAGE_MODE_SYSTEM_PROMPT
  );

  const [gptLoading, setGptLoading] = useState(false);
  const [gptError, setGptError] = useState("");
  const [gptContent, setGptContent] = useState("");
  const [imagePrompts, setImagePrompts] = useState([]);
  const [gptImageUrls, setGptImageUrls] = useState([]);

  const [prompt, setPrompt] = useState(DEFAULT_ADMIN_GEMINI_PROMPT);
  const [selectedPromptIdx, setSelectedPromptIdx] = useState(null);

  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState("");
  const [result, setResult] = useState(null);

  const loading = gptLoading || geminiLoading;

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function topicsAsLines() {
    return topicsText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  }

  function clearReference() {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setReferenceDataUrl(null);
  }

  function onReferenceFileChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setGptError("이미지 파일만 선택할 수 있습니다.");
      return;
    }
    const maxBytes = 4 * 1024 * 1024;
    if (file.size > maxBytes) {
      setGptError("참고 이미지는 4MB 이하로 올려 주세요.");
      return;
    }
    setGptError("");
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl.startsWith("data:image/")) {
        setGptError("이미지를 읽지 못했습니다.");
        return;
      }
      setReferenceDataUrl(dataUrl);
      setPreviewUrl((prev) => {
        if (prev && prev.startsWith("blob:")) {
          URL.revokeObjectURL(prev);
        }
        return URL.createObjectURL(file);
      });
    };
    reader.onerror = () => setGptError("이미지를 읽지 못했습니다.");
    reader.readAsDataURL(file);
  }

  async function handleGpt() {
    setGptError("");
    setGeminiError("");
    setResult(null);
    setGptContent("");
    setImagePrompts([]);
    setGptImageUrls([]);
    setSelectedPromptIdx(null);

    const regionTrim = region.trim();
    if (!regionTrim) {
      setGptError("지역을 입력해 주세요.");
      return;
    }

    setGptLoading(true);
    try {
      const res = await postBlogConsulting({
        industry,
        region: regionTrim,
        existingTopics: topicsAsLines(),
        imageMode: true,
        referenceImageDataUrl: referenceDataUrl || null,
        blogImageModeSystemPrompt: blogImageModeSystemPrompt.trim() || null,
      });
      if (!res.success || !res.content) {
        setGptError(res.error || "GPT 응답이 올바르지 않습니다.");
        return;
      }
      setGptContent(res.content);
      const prompts = Array.isArray(res.imagePrompts) ? res.imagePrompts : [];
      setImagePrompts(prompts);
      const urls = Array.isArray(res.imageUrls) ? res.imageUrls : [];
      setGptImageUrls(urls);
      if (prompts.length > 0) {
        setPrompt(prompts[0]);
        setSelectedPromptIdx(0);
      } else {
        setGptError(
          "본문에서 영문 이미지 프롬프트를 찾지 못했습니다. GPT 전문을 확인하거나 아래 프롬프트를 직접 수정하세요."
        );
      }
      if (prompts.length > 0 && urls.length === 0) {
        setGptError(
          "영문 프롬프트는 추출됐지만 Gemini 이미지가 생성되지 않았습니다. 서버 로그·API 키를 확인하거나 2단계에서 개별 생성해 보세요."
        );
      }
    } catch (err) {
      setGptError(err?.message || "GPT 요청에 실패했습니다.");
    } finally {
      setGptLoading(false);
    }
  }

  function selectPromptAt(index) {
    if (!imagePrompts[index]) return;
    setSelectedPromptIdx(index);
    setPrompt(imagePrompts[index]);
  }

  async function handleGemini() {
    setGeminiError("");
    setResult(null);
    const p = prompt.trim();
    if (!p) {
      setGeminiError("이미지 프롬프트(영문)를 입력하거나 GPT 결과에서 선택해 주세요.");
      return;
    }
    setGeminiLoading(true);
    try {
      const res = await postGenerateImage(p, {
        referenceImageDataUrl: referenceDataUrl || undefined,
      });
      setResult(res);
    } catch (err) {
      setGeminiError(err?.message || "Gemini 요청에 실패했습니다.");
    } finally {
      setGeminiLoading(false);
    }
  }

  return (
    <section className="home-tab-page home-section-admin-blog-test" aria-label="블로그 이미지 관리자 테스트">
      <div className="home-admin-blog-test-inner">
        <h1 className="home-admin-blog-test-title">블로그 + 이미지 · 관리자 테스트</h1>
        <p className="home-admin-blog-test-lead">
          <strong>1단계</strong>에서 블로그+이미지 모드로 <strong>GPT 본문</strong>과 추출된 영문 프롬프트를 받은 뒤, 서버에서{" "}
          <strong>Gemini</strong>로 이미지까지 생성합니다. <strong>2단계</strong>는 한 장만 따로 실험할 때 쓰는 선택 단계입니다.
        </p>

        <div className="home-admin-blog-test-step">
          <h2 className="home-admin-blog-test-step-title">1. GPT + Gemini (블로그 본문·이미지)</h2>

          <label className="home-admin-blog-test-label" htmlFor="admin-industry">
            업종
          </label>
          <select
            id="admin-industry"
            className="home-admin-blog-test-select"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            disabled={loading}
          >
            {INDUSTRIES.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>

          <label className="home-admin-blog-test-label" htmlFor="admin-region">
            지역 <span className="home-admin-blog-test-req">*</span>
          </label>
          <input
            id="admin-region"
            type="text"
            className="home-admin-blog-test-input"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            disabled={loading}
            placeholder="예: 서대문역"
            autoComplete="off"
          />

          <label className="home-admin-blog-test-label" htmlFor="admin-topics">
            블로그 주제 (한 줄에 하나)
          </label>
          <textarea
            id="admin-topics"
            className="home-admin-blog-test-textarea home-admin-blog-test-textarea--sm"
            rows={4}
            value={topicsText}
            onChange={(e) => setTopicsText(e.target.value)}
            disabled={loading}
          />

          <label className="home-admin-blog-test-label" htmlFor="admin-ref-image-gpt">
            참고 이미지 (선택 · GPT 비전 + 이후 Gemini)
          </label>
          <div className="home-admin-blog-test-file-row">
            <label className="home-admin-blog-test-file-label">
              <input
                id="admin-ref-image-gpt"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="home-admin-blog-test-file-input"
                onChange={onReferenceFileChange}
                disabled={loading}
              />
              <span className="home-admin-blog-test-file-fake">파일 선택</span>
            </label>
            {referenceDataUrl && (
              <button type="button" className="home-admin-blog-test-clear" onClick={clearReference} disabled={loading}>
                참고 이미지 제거
              </button>
            )}
          </div>
          {previewUrl && (
            <div className="home-admin-blog-test-preview-wrap">
              <img src={previewUrl} alt="참고 이미지 미리보기" className="home-admin-blog-test-preview" />
            </div>
          )}

          <label className="home-admin-blog-test-label" htmlFor="admin-blog-image-system">
            블로그+이미지 GPT 시스템 프롬프트 (BLOG_IMAGE_MODE_SYSTEM_PROMPT)
          </label>
          <p className="home-admin-blog-test-hint">
            GPT에 보내는 <strong>system</strong> 메시지 전체입니다. 비우면 서버 기본값을 씁니다. 참고 이미지가 있으면 서버가 참고용 문구를
            이 뒤에 덧붙입니다.
          </p>
          <div className="home-admin-blog-test-file-row">
            <button
              type="button"
              className="home-admin-blog-test-clear"
              onClick={() => setBlogImageModeSystemPrompt(DEFAULT_BLOG_IMAGE_MODE_SYSTEM_PROMPT)}
              disabled={loading}
            >
              기본 프롬프트로 복원
            </button>
          </div>
          <textarea
            id="admin-blog-image-system"
            className="home-admin-blog-test-textarea"
            rows={18}
            value={blogImageModeSystemPrompt}
            onChange={(e) => setBlogImageModeSystemPrompt(e.target.value)}
            disabled={loading}
            spellCheck={false}
          />

          {gptError && <div className="home-admin-blog-test-error">{gptError}</div>}

          <button type="button" className="home-admin-blog-test-gpt-btn" onClick={handleGpt} disabled={loading}>
            {gptLoading ? "GPT·Gemini 생성 중…" : "GPT로 이미지 프롬프트 받기"}
          </button>
        </div>

        {(gptContent || imagePrompts.length > 0 || gptImageUrls.length > 0) && (
          <div className="home-admin-blog-test-step">
            <h2 className="home-admin-blog-test-step-title">GPT + Gemini 결과</h2>
            {gptContent && (
              <>
                <h3 className="home-admin-blog-test-subtitle">블로그 본문 (GPT)</h3>
                <pre className="home-admin-blog-test-gpt-pre home-admin-blog-test-gpt-pre--body">{gptContent}</pre>
              </>
            )}
            {gptImageUrls.length > 0 && (
              <>
                <h3 className="home-admin-blog-test-subtitle">생성 이미지 (Gemini)</h3>
                <div className="home-admin-blog-test-pipeline-images">
                  {gptImageUrls.map((url, i) => (
                    <div key={i} className="home-admin-blog-test-pipeline-img-cell">
                      <div className="home-admin-blog-test-pipeline-img-wrap">
                        <img src={url} alt={`Gemini 생성 이미지 ${i + 1}`} />
                      </div>
                      {imagePrompts[i] && (
                        <p className="home-admin-blog-test-pipeline-img-cap" title={imagePrompts[i]}>
                          [{i + 1}] {imagePrompts[i].length > 120 ? `${imagePrompts[i].slice(0, 120)}…` : imagePrompts[i]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            {imagePrompts.length > 0 && (
              <>
                <h3 className="home-admin-blog-test-subtitle">추출된 영문 프롬프트</h3>
                <p className="home-admin-blog-test-hint">클릭하면 2단계 입력란에 반영됩니다.</p>
                <ul className="home-admin-blog-test-prompt-list" role="list">
                  {imagePrompts.map((line, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        className={
                          "home-admin-blog-test-prompt-chip" +
                          (selectedPromptIdx === i ? " home-admin-blog-test-prompt-chip--on" : "")
                        }
                        onClick={() => selectPromptAt(i)}
                        disabled={loading}
                      >
                        <span className="home-admin-blog-test-prompt-idx">[{i + 1}]</span> {line}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="home-admin-blog-test-step">
          <h2 className="home-admin-blog-test-step-title">2. Gemini 이미지 (선택 · 한 장 재실험)</h2>
          <p className="home-admin-blog-test-hint">
            1단계에서 이미 전체 이미지가 나왔습니다. 여기서는 프롬프트 하나만 골라 한 장만 다시 만들어 볼 수 있습니다.
          </p>
          <label className="home-admin-blog-test-label" htmlFor="admin-gemini-prompt">
            이미지 프롬프트 (영문) — GPT에서 가져오거나 직접 수정
          </label>
          <textarea
            id="admin-gemini-prompt"
            className="home-admin-blog-test-textarea"
            rows={8}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setSelectedPromptIdx(null);
            }}
            disabled={loading}
            spellCheck={false}
          />

          {geminiError && <div className="home-admin-blog-test-error">{geminiError}</div>}

          <button type="button" className="home-admin-blog-test-submit" onClick={handleGemini} disabled={loading}>
            {geminiLoading ? "Gemini 생성 중…" : "Gemini 이미지 생성"}
          </button>
        </div>

        {result && result.success && (
          <div className="home-admin-blog-test-result">
            <h2 className="home-admin-blog-test-result-title">Gemini 결과</h2>
            <p className="home-admin-blog-test-meta">
              model: {result.model}
              {result.referenceImageUsed != null && (
                <>
                  {" "}
                  · referenceImageUsed: {String(result.referenceImageUsed)}
                </>
              )}
              {result.mimeType && (
                <>
                  {" "}
                  · {result.mimeType}
                </>
              )}
            </p>
            {result.dataUrl && (
              <div className="home-admin-blog-test-result-img-wrap">
                <img src={result.dataUrl} alt="Gemini 생성 이미지" className="home-admin-blog-test-result-img" />
              </div>
            )}
            <details className="home-admin-blog-test-details">
              <summary>Base64 앞부분만 보기</summary>
              <pre className="home-admin-blog-test-pre">
                {result.base64 ? `${result.base64.slice(0, 200)}…` : "(없음)"}
              </pre>
            </details>
          </div>
        )}
      </div>
    </section>
  );
}
