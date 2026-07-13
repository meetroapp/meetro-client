import { useSyncExternalStore } from "react";
import {
  getCurrentAppLayoutMetrics,
  subscribeAppLayoutMetrics,
} from "../utils/appLayout";

export default function useAppLayoutMetrics() {
  return useSyncExternalStore(
    subscribeAppLayoutMetrics,
    getCurrentAppLayoutMetrics,
    getCurrentAppLayoutMetrics
  );
}
