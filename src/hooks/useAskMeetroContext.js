import { useEffect } from "react";

// The mounted canonical panel answers synchronously; there is no global record cache.
export default function useAskMeetroContext(context) {
  const serialized = JSON.stringify(context || {});
  useEffect(() => {
    const respond = (event) => event.detail?.provide?.(JSON.parse(serialized));
    window.addEventListener("meetro:assistant:context-request", respond);
    return () => window.removeEventListener("meetro:assistant:context-request", respond);
  }, [serialized]);
}
