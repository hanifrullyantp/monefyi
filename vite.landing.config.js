/** @type {import('vite').UserConfig} */
const path = require("path");

module.exports = {
  root: path.join(__dirname, "landing page"),
  base: "/",
  publicDir: "public",
  build: {
    outDir: path.join(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.join(__dirname, "landing page", "index.html"),
        admin: path.join(__dirname, "landing page", "admin.html"),
        privacy: path.join(__dirname, "landing page", "privacy.html"),
        terms: path.join(__dirname, "landing page", "terms.html"),
        "js/landing-cookie": path.join(__dirname, "landing page", "js", "landing-cookie.js"),
      },
      output: {
        entryFileNames: (chunk) => (
          chunk.name === "js/landing-cookie" ? "js/landing-cookie.js" : "assets/[name]-[hash].js"
        ),
      },
    },
  },
  server: {
    port: 5174,
    fs: {
      allow: [path.join(__dirname, "landing page"), path.join(__dirname, "shared")],
    },
  },
};
