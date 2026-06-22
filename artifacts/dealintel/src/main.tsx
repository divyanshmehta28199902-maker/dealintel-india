import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress the Clerk dev-only single-session notice before Vite's error overlay
// catches it. This is an expected, harmless rejection in development when a
// signed-in user's browser briefly visits /sign-in or /sign-up.
window.addEventListener("unhandledrejection", (event) => {
  if (
    event.reason &&
    typeof event.reason === "object" &&
    "code" in event.reason &&
    event.reason.code === "cannot_render_single_session_enabled"
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
