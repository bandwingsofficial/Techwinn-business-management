import test from 'node:test';
import assert from 'node:assert/strict';

function splitByQueryHighlight(text, query) {
  const needle = query.trim();
  if (!needle) return [{ text, match: false }];
  const pattern = new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
  const parts = text.split(pattern).filter(Boolean);
  return parts.map((part) => ({
    text: part,
    match: part.toLowerCase() === needle.toLowerCase(),
  }));
}

test('highlight splits matching query segment', () => {
  const parts = splitByQueryHighlight('Testing API', 'test');
  assert.equal(parts.some((part) => part.match && part.text.toLowerCase() === 'test'), true);
});