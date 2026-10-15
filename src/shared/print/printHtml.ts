import { Platform } from "react-native";

export const canPrint = Platform.OS === "web";

/** Escape text going into printed HTML; a student's name must never become markup. */
export function escapeHtml(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Print a self-contained HTML document from the browser, through a hidden
 * iframe so only the document prints — not the sidebar and the screen behind
 * it. Phones print through expo-print once the reports phase adds it.
 */
export function printHtml(html: string) {
  if (!canPrint || typeof document === "undefined") return false;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) return false;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  }, 250);
  return true;
}
