/** @type {import('vite').UserConfig} */
const path = require("path");

module.exports = {
  root: path.join(__dirname, "landing page"),
  base: "/",
  publicDir: "public",
  build: {
    outDir: path.join(__dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    fs: {
      allow: [path.join(__dirname, "landing page"), path.join(__dirname, "shared")],
    },
  },
};
