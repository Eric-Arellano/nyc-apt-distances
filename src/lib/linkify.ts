export type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'url' | 'email' | 'phone'; text: string; href: string };

// One capturing group around the whole alternation, so `split` puts every match at an odd index.
// URLs come first, since one may contain an `@` or a run of digits.
const LINK = new RegExp(
  `(${[
    // Not ending in punctuation, which is more likely the sentence's than the link's.
    String.raw`https?://[^\s<>"]*[^\s<>".,;:!?)\]']`,
    String.raw`[\w.+-]+@[\w-]+(?:\.[\w-]+)+`,
    // A US number, however it's punctuated, but not ten digits inside a longer run.
    String.raw`(?<!\d)(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)`,
  ].join('|')})`,
);

function toLink(text: string): Segment {
  if (/^https?:/.test(text)) return { kind: 'url', text, href: text };
  if (text.includes('@')) return { kind: 'email', text, href: `mailto:${text}` };
  return { kind: 'phone', text, href: `tel:${text.replace(/[^\d+]/g, '')}` };
}

/** Splits free text so its web links, emails and phone numbers can be tapped. */
export function linkify(text: string): Segment[] {
  return text
    .split(LINK)
    .map((part, index): Segment => (index % 2 ? toLink(part) : { kind: 'text', text: part }))
    .filter((segment) => segment.text !== '');
}
