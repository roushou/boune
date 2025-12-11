// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: "https://boune.dev",

  integrations: [
    starlight({
      title: "Boune",
      social: [{ icon: "github", label: "GitHub", href: "https://github.com/roushou/boune" }],
      components: {
        Head: "./src/components/Head.astro",
      },
      sidebar: [
        {
          label: "Guides",
          items: [
            // Each item here is one entry in the navigation menu.
            { label: "Example Guide", slug: "guides/example" },
          ],
        },
        {
          label: "Reference",
          autogenerate: { directory: "reference" },
        },
      ],
      customCss: [
        "./src/styles/global.css",
        "@fontsource/space-mono/400.css",
        "@fontsource/space-mono/700.css",
        "@fontsource/press-start-2p/400.css",
      ],
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: cloudflare(),
});
