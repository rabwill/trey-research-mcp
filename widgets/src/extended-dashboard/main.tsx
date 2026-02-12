import React from "react";
import { createRoot } from "react-dom/client";
import { FluentProvider, webLightTheme, webDarkTheme } from "@fluentui/react-components";
import { ExtendedDashboard } from "./ExtendedDashboard";
import { useOpenAiGlobal } from "../hooks/useOpenAiGlobal";
import type { Theme } from "../types";

function App() {
  const theme = (useOpenAiGlobal<string>("theme") ?? "light") as Theme;
  return (
    <FluentProvider theme={theme === "dark" ? webDarkTheme : webLightTheme}>
      <ExtendedDashboard />
    </FluentProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
