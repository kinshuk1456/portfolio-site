// router.js
// Responsibilities:
// - Read query params
// - Provide small helpers for required parameters (slug/type)

export function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

export function requireQueryParam(name) {
  const v = getQueryParam(name);
  if (!v) throw new Error(`Missing required query param: ${name}`);
  return v;
}

export function getSlug() {
  return requireQueryParam('slug');
}

export function getPostType() {
  const type = requireQueryParam('type');
  if (type !== 'insights' && type !== 'life') {
    throw new Error(`Invalid post type: ${type}`);
  }
  return type;
}
