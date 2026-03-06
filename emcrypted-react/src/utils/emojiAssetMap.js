const VS16 = /\uFE0F/g;

const stripVS16 = (seq = "") => seq.replace(VS16, "");

export function toHexCodeSequence(seq) {
  const cleaned = stripVS16(seq);
  const codes = [];
  for (let i = 0; i < cleaned.length; ) {
    const codePoint = cleaned.codePointAt(i);
    codes.push(codePoint.toString(16));
    i += codePoint > 0xffff ? 2 : 1;
  }
  return codes.join("-");
}

export function assetPathForEmoji(emoji) {
  const code = toHexCodeSequence(emoji);
  return `/vendor/fluent-emoji/${code}.svg`;
}

export default assetPathForEmoji;
