declare module "sanitize-html" {
  interface IOptions {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
  }

  function sanitizeHtml(input: string, options?: IOptions): string;
  export default sanitizeHtml;
}
