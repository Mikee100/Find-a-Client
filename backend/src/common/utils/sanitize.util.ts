import sanitizeHtml from "sanitize-html";

export const sanitizeInput = (value: string): string =>
  sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {}
  });

export const sanitizeRichText = (value: string): string =>
  sanitizeHtml(value, {
    allowedTags: ["p", "h1", "h2", "h3", "ul", "ol", "li", "strong", "em", "a", "code", "pre", "blockquote"],
    allowedAttributes: {
      a: ["href", "target", "rel"]
    }
  });
