const path = require("path");
const root = path.resolve(__dirname, "..");
module.exports = {
  content: [path.join(root, "account.html"), path.join(root, "account.js"), path.join(root, "simple-db.js")],
  theme: {
    extend: {
      colors: { primary: "#3a6660", "on-primary": "#ffffff", "primary-container": "#8ebcb5",
        background: "#f4fafd", "on-background": "#161d1f", "on-surface-variant": "#404847",
        "surface-container-low": "#eef5f7", outline: "#707977", "outline-variant": "#c0c8c6", error: "#ba1a1a" },
      fontFamily: { headline: ["Playfair Display"], body: ["Inter"] }
    }
  }
};
