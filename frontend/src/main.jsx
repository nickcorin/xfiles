import React from "react";
import { createRoot } from "react-dom/client";
import "mapbox-gl/dist/mapbox-gl.css";
import "./styles.css";

import { App } from "@/App";

document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")).render(<App />);
