/* eslint-disable */
function toCodePointSlug(char) {
  if (!char) return "";
  return Array.from(char).map((grapheme) => grapheme.codePointAt(0).toString(16).toLowerCase()).join("-");
}

export function assetPathForEmoji(char) {
  const slug = toCodePointSlug(char);
  if (!slug) return "";
  return `/vendor/fluent-emoji/${slug}.svg`;
}

export default assetPathForEmoji;
