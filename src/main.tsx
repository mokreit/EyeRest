import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import "./index.css";
import { App } from "./App";
import { BreakOverlay } from "./pages/BreakOverlay";
import { PreBreakToast } from "./pages/PreBreakToast";
import { ReminderPopup } from "./pages/ReminderPopup";

function detectWindowLabel(): string {
  try {
    return getCurrentWebviewWindow().label;
  } catch {
    const view = new URLSearchParams(window.location.search).get("view");
    if (view === "overlay") return "overlay-primary-preview";
    if (view === "popup") return "reminder-popup-preview";
    if (view === "prebreak") return "pre-break-toast-preview";
    return "main";
  }
}

const label = detectWindowLabel();

if (label === "main") {
  document.body.classList.add("window-main");
} else {
  document.body.classList.add("window-transparent");
}

function RootRouter() {
  if (label.startsWith("reminder-popup")) {
    return <ReminderPopup />;
  }
  if (label.startsWith("pre-break-toast")) {
    return <PreBreakToast />;
  }
  if (label.startsWith("overlay-")) {
    return <BreakOverlay isPrimary={label.startsWith("overlay-primary")} />;
  }
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootRouter />
  </React.StrictMode>
);
