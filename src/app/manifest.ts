import type { MetadataRoute } from "next";

// Makes "Add to Home Screen" install the CRM as a standalone app — required on
// iPhone for push notifications to work at all.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LumeLush Studio CRM",
    short_name: "LumeLush",
    start_url: "/",
    display: "standalone",
    background_color: "#0a1020",
    theme_color: "#0a1020",
    icons: [{ src: "/brand-logo.png", sizes: "1280x1158", type: "image/png" }],
  };
}
