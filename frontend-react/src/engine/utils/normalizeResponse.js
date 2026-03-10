
export function normalizeScoreKey(key) {
  if (!key) return '';
  const k = String(key).trim().toLowerCase();
  const map = {
    description: 'description',
    desc: 'description',
    detail: 'description',
    directions: 'directions',
    direction: 'directions',
    keywords: 'keywords',
    keyword: 'keywords',
    reviews: 'reviews',
    review: 'reviews',
    photos: 'photos',
    photo: 'photos',
    images: 'photos',
    price: 'price',
    menu: 'price',
    menus: 'price',
    pricing: 'price',
  };
  return map[k] || k;
}

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeServerResponse(serverJson) {
  const place = serverJson?.place || {};
  const scores = serverJson?.scores || serverJson?.scoring?.scores || {};
  return {
    ok: serverJson?.ok ?? true,
    message: serverJson?.message || '',
    logs: serverJson?.logs || [],
    place,
    scoring: {
      total: toNumber(serverJson?.totalScore ?? serverJson?.scoring?.totalScore ?? scores?.total, 0),
      grade: serverJson?.totalGrade || serverJson?.scoring?.totalGrade || '',
      scores,
    },
    raw: serverJson,
  };
}
