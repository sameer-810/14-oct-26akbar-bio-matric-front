import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { MAX_UPLOAD_BYTES, formatSize, type PickedFile } from "../types";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
const MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const INPUT_TEST_ID = "document-file-input";

/** The file's type from what the platform says, or from its name when it says nothing useful. */
function typeOf(name: string, mime: string | undefined) {
  if (mime && MIME_TYPES.includes(mime.toLowerCase())) return mime.toLowerCase();
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  return null;
}

/** Why a file cannot be shared, before spending the upload on it. The server checks the bytes again. */
function refusal(f: PickedFile) {
  if (f.size > MAX_UPLOAD_BYTES) return `${f.name} is ${formatSize(f.size)}. Files up to ${formatSize(MAX_UPLOAD_BYTES)} can be shared.`;
  if (!typeOf(f.name, f.type)) return `${f.name} is not a PDF, JPG or PNG.`;
  return null;
}

/**
 * Choosing one PDF or image to share. On the web a single hidden file input
 * lives on the page while the screen is open, so the "Choose file" button and
 * browser tests (setInputFiles on data-testid="document-file-input") both
 * feed the same place. On a phone it is the system document picker.
 */
export function useFilePicker({ enabled = true }: { enabled?: boolean } = {}) {
  const [file, setFile] = useState<PickedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web" || !enabled || typeof document === "undefined") return;
    let el = document.querySelector<HTMLInputElement>(`input[data-testid="${INPUT_TEST_ID}"]`);
    const created = !el;
    if (!el) {
      el = document.createElement("input");
      el.type = "file";
      el.accept = ACCEPT;
      el.setAttribute("data-testid", INPUT_TEST_ID);
      el.style.display = "none";
      document.body.appendChild(el);
    }
    const input = el;
    const onChange = () => {
      const f = input.files?.[0];
      // cleared so choosing the same file again still fires a change
      input.value = "";
      if (!f) return;
      const picked: PickedFile = { name: f.name, size: f.size, type: typeOf(f.name, f.type) ?? f.type, file: f };
      const why = refusal(picked);
      setError(why);
      setFile(why ? null : picked);
    };
    input.addEventListener("change", onChange);
    inputRef.current = input;
    return () => {
      input.removeEventListener("change", onChange);
      if (created) input.remove();
      inputRef.current = null;
    };
  }, [enabled]);

  async function choose() {
    if (Platform.OS === "web") {
      inputRef.current?.click();
      return;
    }
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: MIME_TYPES, copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      const picked: PickedFile = { name: a.name, size: a.size ?? 0, type: typeOf(a.name, a.mimeType) ?? a.mimeType ?? "application/octet-stream", uri: a.uri };
      const why = refusal(picked);
      setError(why);
      setFile(why ? null : picked);
    } catch {
      setError("Could not open the file picker.");
    }
  }

  function clear() {
    setFile(null);
    setError(null);
  }

  return { file, error, choose, clear };
}
