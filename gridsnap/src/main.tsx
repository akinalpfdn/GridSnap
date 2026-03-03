import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./theme/themes/carbon.css";
import "./theme/tokens.css";
import "./theme/reset.css";
import "./theme/typography.css";
import "./theme/scrollbar.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
