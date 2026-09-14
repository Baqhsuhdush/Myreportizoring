import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

import "./styles/global.css";
import "./styles/layout.css";
import "./styles/auth.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Не найден элемент #root — проверьте index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
