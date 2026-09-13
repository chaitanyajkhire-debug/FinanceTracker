import type { MetadataRoute } from "next";

/**
 * Web app manifest so the tracker can be installed to a phone home screen and
 * opened full-screen, without an app store round trip.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FinanceTracker — Portfolio & Weight",
    short_name: "Tracker",
    description:
      "Track your portfolio and your daily weight, BMI and progress in one place.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#020617",
    theme_color: "#020617",
    categories: ["finance", "health", "lifestyle"],
    shortcuts: [
      {
        name: "Log today's weight",
        short_name: "Log weight",
        description: "Jump straight to the weight tracker",
        url: "/weight",
      },
      {
        name: "Portfolio dashboard",
        short_name: "Portfolio",
        url: "/",
      },
    ],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
