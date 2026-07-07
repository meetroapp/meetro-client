import { askCompanionGateway } from "./gateway.js";

export async function handleCompanionAsk(req, res, dependencies = {}) {
  const result = await askCompanionGateway({
    body: req?.body || {},
    user: req?.user || req?.auth?.user || {},
    ...dependencies,
  });

  const status = result.success ? 200 : result.error?.code === "missing_authentication" ? 401 : 200;

  if (typeof res?.status === "function" && typeof res?.json === "function") {
    return res.status(status).json(result);
  }

  return result;
}

