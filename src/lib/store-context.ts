import { createContext } from "react";
import type { Store } from "./store";

// Keep context identity independent of the hot-reloaded provider implementation.
export const StoreContext = createContext<Store | null>(null);