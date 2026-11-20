export function splitByQueryHighlight(text: string, query: string): Array<{ text: string; match: boolean }> {
  const needle = query.trim();
  if (!needle) return [{ text, match: false }];
  const pattern = new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
  const parts = text.split(pattern).filter(Boolean);
  return parts.map((part) => ({
    text: part,
    match: part.toLowerCase() === needle.toLowerCase(),
  }));
}