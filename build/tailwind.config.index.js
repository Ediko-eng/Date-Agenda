const path = require("path");
const root = path.resolve(__dirname, "..");
const palette = {
  "on-tertiary-container": "#404746", "secondary-fixed-dim": "#e9c349", "surface-variant": "#dde4e6",
  "primary-fixed-dim": "#a1d0c8", "on-background": "#161d1f", "inverse-on-surface": "#ebf2f4",
  "on-primary-container": "#1f4c47", "primary-fixed": "#bdece4", "tertiary": "#59605f",
  "secondary": "#735c00", "on-primary": "#ffffff", "tertiary-container": "#aeb5b4",
  "on-primary-fixed-variant": "#204e49", "background": "#f4fafd", "on-surface": "#161d1f",
  "tertiary-fixed": "#dde4e3", "on-error-container": "#93000a", "primary-container": "#8ebcb5",
  "on-primary-fixed": "#00201d", "surface-container-lowest": "#ffffff", "surface": "#f4fafd",
  "secondary-container": "#fed65b", "on-secondary-fixed-variant": "#574500", "on-surface-variant": "#404847",
  "surface-container-high": "#e2e9ec", "error-container": "#ffdad6", "on-secondary-fixed": "#241a00",
  "surface-container": "#e8eff1", "on-secondary": "#ffffff", "surface-container-low": "#eef5f7",
  "outline": "#707977", "tertiary-fixed-dim": "#c1c8c7", "on-secondary-container": "#745c00",
  "primary": "#3a6660", "on-tertiary-fixed-variant": "#414848", "on-error": "#ffffff",
  "secondary-fixed": "#ffe088", "on-tertiary-fixed": "#161d1d", "surface-dim": "#d4dbdd",
  "surface-bright": "#f4fafd", "error": "#ba1a1a", "inverse-primary": "#a1d0c8", "surface-tint": "#3a6660",
  "surface-container-highest": "#dde4e6", "on-tertiary": "#ffffff", "outline-variant": "#c0c8c6", "inverse-surface": "#2b3234"
};
module.exports = {
  darkMode: "class",
  content: [path.join(root, "index.html"), path.join(root, "script.js"), path.join(root, "simple-db.js")],
  theme: {
    extend: {
      colors: palette,
      borderRadius: { DEFAULT: "0.25rem", lg: "0.5rem", xl: "0.75rem", full: "9999px" },
      spacing: { lg: "48px", xl: "80px", "margin-mobile": "16px", "margin-desktop": "64px", md: "24px", gutter: "24px", base: "8px", xs: "4px", sm: "12px" },
      fontFamily: { "headline-lg-mobile": ["Playfair Display"], "label-sm": ["Inter"], "headline-lg": ["Playfair Display"], "headline-xl": ["Playfair Display"], "body-lg": ["Inter"], "body-md": ["Inter"], "headline-md": ["Playfair Display"] },
      fontSize: {
        "headline-lg-mobile": ["32px", { lineHeight: "1.2", fontWeight: "600" }], "label-sm": ["14px", { lineHeight: "1", letterSpacing: "0.05em", fontWeight: "600" }],
        "headline-lg": ["48px", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }], "headline-xl": ["60px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }], "body-md": ["16px", { lineHeight: "1.5", fontWeight: "400" }], "headline-md": ["32px", { lineHeight: "1.3", fontWeight: "500" }]
      }
    }
  }
};
