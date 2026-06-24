/** @type {import('vite').UserConfig} */
const path = require("path");

module.exports = {
  root: path.join(__dirname, "app"),
  base: "/app/",
  publicDir: "public",
  build: {
    outDir: path.join(__dirname, "dist", "app"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
};
