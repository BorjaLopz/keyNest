import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/industry.css";
import "./styles/keynest-overrides.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("No se encontro #root en index.html");

createRoot(rootElement).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
