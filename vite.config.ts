import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

import cp from "child_process";

const commitHash = cp.execSync("git rev-parse --short HEAD").toString();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
});
