export interface SearchResult {
  pageNumber: number;
  snippet: string;
  matchCount: number;
}

export interface SearchPage {
  pageNumber: number;
  text: string;
}

export const buildSearchResults = (pages: SearchPage[], query: string): SearchResult[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const results: SearchResult[] = [];

  for (const page of pages) {
    const pageText = page.text;
    const lowerText = pageText.toLowerCase();
    if (!lowerText.includes(normalizedQuery)) continue;

    const matchIndex = lowerText.indexOf(normalizedQuery);
    const snippetStart = Math.max(0, matchIndex - 30);
    const snippetEnd = Math.min(pageText.length, matchIndex + normalizedQuery.length + 50);
    const snippet = pageText.slice(snippetStart, snippetEnd).replace(/\s+/g, " ");
    const matchCount = lowerText.split(normalizedQuery).length - 1;

    results.push({
      pageNumber: page.pageNumber,
      snippet,
      matchCount,
    });
  }

  return results;
};
