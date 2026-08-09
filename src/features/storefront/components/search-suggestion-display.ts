import type { PublicProductListItemDto } from "@/api/generated/models";

export interface SearchHighlightSegment {
  text: string;
  matched: boolean;
}

function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/đ/gu, "d")
    .replace(/Đ/gu, "D")
    .toLocaleLowerCase("vi-VN");
}

export function highlightSearchText(
  original: string,
  query: string,
): SearchHighlightSegment[] {
  const normalizedQuery = normalizeForMatch(query).trim().replace(/\s+/gu, " ");
  if (!normalizedQuery) return [{ text: original, matched: false }];

  let normalizedOriginal = "";
  const starts: number[] = [];
  const ends: number[] = [];
  let offset = 0;

  for (const character of original) {
    const start = offset;
    const end = start + character.length;
    const normalizedCharacter = normalizeForMatch(character);
    offset = end;

    if (!normalizedCharacter) {
      if (ends.length) ends[ends.length - 1] = end;
      continue;
    }

    if (/\s/u.test(normalizedCharacter)) {
      if (normalizedOriginal.endsWith(" ")) {
        ends[ends.length - 1] = end;
        continue;
      }
      normalizedOriginal += " ";
      starts.push(start);
      ends.push(end);
      continue;
    }

    for (const normalizedCodePoint of normalizedCharacter) {
      normalizedOriginal += normalizedCodePoint;
      starts.push(start);
      ends.push(end);
    }
  }

  const normalizedStart = normalizedOriginal.indexOf(normalizedQuery);
  if (normalizedStart < 0) return [{ text: original, matched: false }];

  const normalizedEnd = normalizedStart + normalizedQuery.length - 1;
  const originalStart = starts[normalizedStart];
  const originalEnd = ends[normalizedEnd];
  if (originalStart === undefined || originalEnd === undefined) {
    return [{ text: original, matched: false }];
  }

  return [
    { text: original.slice(0, originalStart), matched: false },
    { text: original.slice(originalStart, originalEnd), matched: true },
    { text: original.slice(originalEnd), matched: false },
  ].filter((segment) => segment.text.length > 0);
}

export function formatSuggestionMetadata(
  product: Pick<PublicProductListItemDto, "authors" | "publisher">,
): string {
  const fallback = "Đang cập nhật";
  const authors = product.authors
    .map((author) => author.name.trim())
    .filter(Boolean)
    .join(", ");
  const publisher = product.publisher?.name.trim() ?? "";
  if (!authors && !publisher) return fallback;
  return [authors || fallback, publisher || fallback].join(" · ");
}
