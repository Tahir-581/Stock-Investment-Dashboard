import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        avatar: {
          blue: { bg: "#B5D4F4", text: "#0C447C" },
          green: { bg: "#C0DD97", text: "#27500A" },
          amber: { bg: "#FAC775", text: "#633806" },
          purple: { bg: "#CECBF6", text: "#3C3489" },
          teal: { bg: "#9FE1CB", text: "#085041" },
          coral: { bg: "#F5C4B3", text: "#712B13" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
