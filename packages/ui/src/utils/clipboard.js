/**
 * Copy text to the clipboard. Prefers the modern Clipboard API and falls back
 * to the legacy execCommand approach for non-secure contexts (e.g. plain HTTP
 * on a LAN). Resolves to true when the copy succeeded and false otherwise so
 * callers can surface accurate "copied" / "copy failed" feedback.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export default async function copyToClipboard(text) {
  if (typeof text !== "string") text = String(text == null ? "" : text);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fall through to the legacy fallback.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}
