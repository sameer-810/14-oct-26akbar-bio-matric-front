import { Platform } from "react-native";

/**
 * Put text on the clipboard. Resolves true when it got there.
 *
 * The browser's clipboard on web; expo-clipboard on phones, loaded only when
 * used, so an app binary built before it was added (and updated over the air)
 * gets `false` here instead of crashing at start-up.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      return false;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Clipboard = require("expo-clipboard") as typeof import("expo-clipboard");
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}
