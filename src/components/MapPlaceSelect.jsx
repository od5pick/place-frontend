import { useState, useEffect, useRef } from "react";
import { placeSearch, placeResolve } from "../api/backendApi";
import "./MapPlaceSelect.css";

const NAVER_MAP_CLIENT_ID = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;

/** 업종별 크롤링용 URL (예: 미용실 → m.place.naver.com/hairshop/1443688242/home) */
function getCrawlPlaceUrl(placeId, industry) {
  if (!placeId) return "";
  const slug = industry === "hairshop" ? "hairshop" : industry === "cafe" ? "cafe" : industry === "restaurant" ? "restaurant" : "place";
  return `https://m.place.naver.com/${slug}/${placeId}/home`;
}

/** URL 또는 문자열에서 placeId 숫자만 추출 (map.naver.com/.../place/1443688242 포함) */
function extractPlaceIdFromString(str) {
  if (!str) return null;
  const s = String(str).trim();
  const m = s.match(/\/place\/(\d{5,})/) || s.match(/\/(?:hairshop|restaurant|cafe)\/(\d{5,})/) || s.match(/\/entry\/place\/(\d+)/) || s.match(/(\d{7,})/);
  return m ? (m[1] || m[2]) : null;
}

function buildPlaceUrlFromItem(item, industry) {
  const link = String(item?.link || "").trim();
  const id = item?.placeId || extractPlaceIdFromString(link);
  if (id) return getCrawlPlaceUrl(id, industry);
  if (!link) return "";
  const extracted = extractPlaceIdFromString(link);
  return extracted ? getCrawlPlaceUrl(extracted, industry) : "";
}

let mapsPromise = null;
function loadNaverMaps() {
  if (!NAVER_MAP_CLIENT_ID) return Promise.reject(new Error("VITE_NAVER_MAP_CLIENT_ID가 설정되지 않았습니다."));
  if (!mapsPromise) {
    mapsPromise = new Promise((resolve, reject) => {
      if (window.naver && window.naver.maps) {
        resolve(window.naver);
        return;
      }
      // 변경 후: ncpKeyId 사용 (기존 ncpClientId → 개인/일반 통합)
      const script = document.createElement("script");
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_MAP_CLIENT_ID}&submodules=geocoder`;
      script.async = true;
      script.onload = () => {
        if (window.naver && window.naver.maps) resolve(window.naver);
        else reject(new Error("네이버 지도 스크립트 로딩 실패"));
      };
      script.onerror = () => reject(new Error("네이버 지도 스크립트 로딩 실패"));
      document.head.appendChild(script);
    });
  }
  return mapsPromise;
}

function geocodeOnce(naver, address) {
  return new Promise((resolve) => {
    if (!address) return resolve(null);
    naver.maps.Service.geocode({ query: address }, (status, response) => {
      if (status !== naver.maps.Service.Status.OK || !response?.v2?.addresses?.length) {
        return resolve(null);
      }
      const first = response.v2.addresses[0];
      const lat = Number(first.y);
      const lng = Number(first.x);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return resolve(null);
      resolve(new naver.maps.LatLng(lat, lng));
    });
  });
}

export default function MapPlaceSelect({ industry, onSelectPlace, onDiagnoseStart, loading }) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState({ items: [], error: "" });
  const [mapQuery, setMapQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [markerCount, setMarkerCount] = useState(0);

  const industryLabel = industry === "hairshop" ? "미용실" : industry === "cafe" ? "카페" : "맛집";

  useEffect(() => {
    let cancelled = false;
    loadNaverMaps()
      .then((naver) => {
        if (cancelled) return;
        const center = new naver.maps.LatLng(37.5665, 126.978);
        mapRef.current = new naver.maps.Map(mapContainerRef.current, {
          center,
          zoom: 14,
        });
      })
      .catch(() => {
        // noop: 지도 로딩 실패 시에도 리스트 기반 선택은 동작
      });
    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !window.naver || !window.naver.maps) return;
    const naver = window.naver;
    let cancelled = false;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (!results.items.length) {
      setMarkerCount(0);
      return;
    }

    const bounds = new naver.maps.LatLngBounds();

    (async () => {
      for (let index = 0; index < results.items.length; index += 1) {
        if (cancelled) break;
        const item = results.items[index];
        const addr = item.roadAddress || item.address;
        if (!addr) continue;
        const position = await geocodeOnce(naver, addr);
        if (!position || cancelled) continue;

        const marker = new naver.maps.Marker({
          position,
          map: mapRef.current,
        });

        marker.addListener("click", () => {
          setSelectedIndex(index);
          mapRef.current.panTo(position);
        });

        markersRef.current.push(marker);
        bounds.extend(position);
      }

      if (cancelled) return;

      if (markersRef.current.length > 0) {
        try {
          mapRef.current.fitBounds(bounds);
        } catch (_) {
          // ignore
        }
      } else if (results.items.length > 0) {
        console.warn("[지도] 마커 0개 - 주소 지오코딩 실패. 첫 항목:", results.items[0]);
      }
      setMarkerCount(markersRef.current.length);
    })();

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, [results.items]);

  async function handleSearch() {
    const q = (query || mapQuery || `${industryLabel}`).trim();
    if (!q) return;
    setSearching(true);
    setResults({ items: [], error: "" });
    try {
      const res = await placeSearch(q);
      const items = Array.isArray(res.items) ? res.items : [];
      setResults({
        items,
        error: res.message || res.error || ""
      });
      setMapQuery(q);
      setSelectedIndex(-1);
      // 디버그: API 응답에 mapx/mapy, placeId 있는지 확인 (F12 콘솔)
      if (items.length > 0) {
        const withCoord = items.filter((i) => i.mapx != null && i.mapy != null).length;
        console.log("[place-search] 항목 수:", items.length, "좌표 있음:", withCoord, "첫 항목:", items[0]);
      }
    } catch (e) {
      console.error("[place-search] 실패:", e);
      setResults({ items: [], error: e?.message || "검색 실패" });
    } finally {
      setSearching(false);
    }
  }

  function handleItemClick(index) {
    setSelectedIndex(index);
    const marker = markersRef.current[index];
    if (marker && mapRef.current) {
      const pos = marker.getPosition();
      if (pos) mapRef.current.panTo(pos);
    }
  }

  async function handleDiagnose(item) {
    onDiagnoseStart?.();
    console.log("[진단 클릭] 업체:", item?.title, "placeId:", item?.placeId, "link:", item?.link);
    let placeUrl = item.placeId
      ? getCrawlPlaceUrl(item.placeId, industry)
      : buildPlaceUrlFromItem(item, industry);

    if (!placeUrl && item?.title) {
      try {
        const res = await placeResolve(item.title);
        if (res?.placeId) placeUrl = getCrawlPlaceUrl(res.placeId, industry);
        else if (res?.placeUrl) placeUrl = res.placeUrl;
        else if (res?.error) setResults((prev) => ({ ...prev, error: res.error }));
      } catch (e) {
        setResults((prev) => ({ ...prev, error: "placeId 조회 실패. node-engine을 실행했는지 확인하세요." }));
      }
    }
    if (!placeUrl) {
      setResults((prev) => ({
        ...prev,
        error: "선택한 결과에서 플레이스 ID를 찾지 못했습니다. URL로 직접 진단해 주세요.",
      }));
      return;
    }
    onSelectPlace(placeUrl);
    setSelectedIndex(-1);
  }

  return (
    <div className="map-place-select">
      <div className="map-place-search-row">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder={`예) 서대문역 ${industryLabel}, 강남역 ${industryLabel}`}
          className="map-place-input"
          disabled={loading}
        />
        <button
          type="button"
          className="map-place-search-btn"
          onClick={handleSearch}
          disabled={searching || loading}
        >
          {searching ? "검색 중..." : "검색"}
        </button>
      </div>

      {results.error && (
        <div className="map-place-error">{results.error}</div>
      )}

      <div className="map-place-layout">
        <div className="map-place-map-wrap">
          <p className="map-place-map-label">네이버 지도에서 위치 확인</p>
          {results.items.length > 0 && markerCount === 0 && (
            <p className="map-place-map-hint">좌표 정보가 없어 마커를 표시하지 못했습니다. (F12 콘솔에서 상세 확인)</p>
          )}
          <div id="map" ref={mapContainerRef} className="map-place-iframe" />
        </div>
        <div className="map-place-list-wrap">
          <p className="map-place-list-label">검색 결과에서 진단할 업체를 선택하세요</p>
          {searching && (
            <p className="map-place-search-hint">
              네이버 지도 검색 중입니다. 네트워크 상황에 따라 5~10초 정도 걸릴 수 있어요.
            </p>
          )}
          {results.items.length === 0 && !searching && !results.error && (
            <p className="map-place-list-empty">위에서 검색어를 입력 후 검색하세요.</p>
          )}
          {results.items.length > 0 && (
            <ul className="map-place-list">
              {results.items.map((item, i) => (
                <li
                  key={i}
                  className={
                    "map-place-item" + (i === selectedIndex ? " map-place-item--selected" : "")
                  }
                >
                  <div className="map-place-item-inner">
                    <button
                      type="button"
                      className="map-place-item-btn"
                      onClick={() => handleItemClick(i)}
                      disabled={loading}
                    >
                      <span className="map-place-item-title">{item.title}</span>
                      {(item.roadAddress || item.address) && (
                        <span className="map-place-item-addr">
                          {item.roadAddress || item.address}
                        </span>
                      )}
                    </button>
                    {i === selectedIndex && (
                      <button
                        type="button"
                        id = "dxBtn"
                        className="map-place-item-diagnose-btn"
                        onClick={() => handleDiagnose(item)}
                        disabled={loading}
                      >
                        {loading ? "진단 중..." : "진단"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
