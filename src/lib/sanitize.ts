import sanitizeHtml from "sanitize-html";

// Rich text from the CMS is stored sanitised; it is never executed.
export function sanitizeRichText(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li",
      "h2", "h3", "h4", "blockquote", "hr", "span",
    ],
    allowedAttributes: { a: ["href", "target", "rel"], span: ["class"] },
    allowedClasses: { span: ["highlight"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: attribs.target === "_blank" ? { ...attribs, rel: "noopener noreferrer" } : attribs,
      }),
    },
  });
}

export function stripTags(html: string) {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
}
