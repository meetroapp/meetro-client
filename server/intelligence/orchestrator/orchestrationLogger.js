function write(logger, level, event, fields = {}) {
  const method = logger?.[level] || logger?.info;
  if (typeof method !== "function") return;
  method.call(logger, event, { event, ...fields });
}

export function createOrchestrationLogger(logger = console) {
  return {
    info(event, fields) {
      write(logger, "info", event, fields);
    },
    warn(event, fields) {
      write(logger, "warn", event, fields);
    },
  };
}
