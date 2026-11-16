// AI-assisted project code. See AI-USE.md and assets/ai-disclosure.json.
// Manifests retain stable asset identities; hosting supplies the public prefix.
export function localAssetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}
