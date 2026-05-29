import { createRoot } from "react-dom/client";
import "../../src/ui/styles.css";
import { PopupApp } from "./PopupApp";

const root = document.getElementById("root");

if (root !== null) {
  createRoot(root).render(<PopupApp />);
}
