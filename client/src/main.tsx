import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

const isTest = import.meta.env.MODE === "test";

// Initialize vconsole for mobile debugging in development mode
if (import.meta.env.MODE !== "production") {
  import("vconsole").then(({ default: VConsole }) => {
    new VConsole({
      defaultPlugins: ["system", "network", "element", "storage"],
    });
    // Configure to show only errors
    const originalConsole = window.console;
    if (isTest) {
      window.console = {
        ...originalConsole,
        log: () => {},
        info: () => {},
        error: originalConsole.error,
      };
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
