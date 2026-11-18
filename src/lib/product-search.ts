const groups = [
  ["celular", "celulares", "smartphone", "smartphones", "smartfone", "smartfones"],
  ["laptop", "laptops", "notebook", "notebooks", "portatil", "portatiles"],
  ["audifono", "audifonos", "auricular", "auriculares", "headphones"],
];
const normalize = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const tokens = (text: string) => normalize(text).match(/[\p{L}\p{N}]+/gu) ?? [];
const stem = (word: string) => word.length > 4 ? word.replace(/(?:[lrnd]es|[aeiou]s)$/u,
  ending => ending.length === 3 ? ending[0] : ending.slice(0, -1)) : word;

function distance(a: string, b: string) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  rows[0] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1]));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
    }
  }
  return rows[a.length][b.length];
}

function grade(query: string, word: string): number {
  if (query === word) return 3;
  if (stem(query) === stem(word) || (query.length >= 3 && word.startsWith(query))) return 2;
  if (groups.some(group => group.includes(query) && group.includes(word))) return 1;
  const limit = /\d/.test(query + word) ? 0 : query.length >= 8 ? 2 : query.length >= 5 ? 1 : 0;
  const target = stem(word);
  const input = stem(query);
  return limit && Math.abs(input.length - target.length) <= limit && distance(input, target) <= limit ? 1 : 0;
}

export function searchScore(query: string, fields: string[]): number | null {
  const words = tokens(query);
  const indexed = fields.map(tokens);
  let weakest = 3;
  let nameMatches = 0;
  for (const term of words) {
    const matches = indexed.map(field => field.reduce((best, word) => Math.max(best, grade(term, word)), 0));
    const best = Math.max(0, ...matches);
    if (!best) return null;
    weakest = Math.min(weakest, best);
    if (matches[0] === best) nameMatches++;
  }
  return weakest * 1000 + nameMatches;
}
