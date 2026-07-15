import { useSyncExternalStore } from "react";
import {
  getLanguageSnapshot,
  subscribeLanguage,
} from "../utils/language";

export default function useLanguage() {
  return useSyncExternalStore(
    subscribeLanguage,
    getLanguageSnapshot,
    getLanguageSnapshot
  );
}
