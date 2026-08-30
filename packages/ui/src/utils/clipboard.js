/**
 * Copy text to the clipboard. Prefers the modern Clipboard API and falls back
 * to the legacy execCommand approach for non-secure contexts (e.g. plain HTTP
 * on a LAN). Best effort: failures are swallowed so callers can keep their
 * existing "copied" feedback semantics without handling rejections.
 * @param {string} text
 * @returns {Promise<void>}
 */
export default async function copyToClipboard(text) {
  if (typeof text !== "string") text = String(text == null ? "" : text);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
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
    document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}
