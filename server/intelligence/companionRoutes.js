import { handleCompanionAsk } from "./companionController.js";

export const COMPANION_ASK_ROUTE = "/api/companion/ask";

export function registerCompanionRoutes(app, dependencies = {}) {
  if (!app || typeof app.post !== "function") {
    throw new TypeError("registerCompanionRoutes requires an app with post(path, handler)");
  }

  app.post(COMPANION_ASK_ROUTE, (req, res) =>
    handleCompanionAsk(req, res, dependencies)
  );
}

