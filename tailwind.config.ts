import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * Fix #5: Tailwind CSS config path + color mismatch.
 *
 * BUG 1: Content paths were missing the `src/` prefix. The actual source
 * files live under src/app/, src/components/, etc. — but the config scanned
 * ./pages/, ./components/, ./app/ (all wrong). All utility classes used in
 * src/ files would be purged in the production build, causing unstyled UI.
 *
 * BUG 2: Colors used `hsl(var(--background))` but globals.css defines
 * `--background: #0D1117` (a hex value, NOT HSL). This made `bg-background`
 * resolve to `background-color: hsl(#0D1117)` which is invalid CSS — the
 * class had no visual effect. Since the project uses Tailwind v4 with
 * `@theme inline` in globals.css, the color mappings here are redundant
 * AND broken. Removed them.
 *
 * FIX:
 *   - Content paths now include `src/` prefix and also scan the root-level
 *     `byd/` folder.
 *   - Removed all `colors` overrides — Tailwind v4 handles colors via the
 *     `@theme` block in globals.css. The old HSL-wrapping was broken.
 *   - Kept borderRadius (uses --radius CSS var correctly).
 */
const config: Config = {
    darkMode: "class",
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/lib/**/*.{js,ts,jsx,tsx}",
        "./byd/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
            // Colors are handled by @theme inline in globals.css (Tailwind v4).
            // Do NOT redefine them here — the previous hsl(var(--background))
            // wrapping was broken because the CSS vars are hex values, not HSL.
        },
    },
    plugins: [tailwindcssAnimate],
};

export default config;
