import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { zhHans } from "vuetify/locale";
import store from "@/store";

export default createVuetify({
  components,
  directives,
  locale: {
    locale: "zhHans",
    fallback: "zhHans",
    messages: { zhHans },
  },
  icons: {
    iconfont: "mdi",
  },
  theme: {
    defaultTheme: store.state.settings.darkMode ? "dark" : "light",
    themes: {
      light: {
        dark: false,
        colors: {
          primary: "#6268df",
          secondary: "#17243a",
          accent: "#7c83ee",
          error: "#FF5252",
          info: "#2196F3",
          success: "#4CAF50",
          warning: "#FFC107",
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: "#bd93f9",
          secondary: "#44475a",
          accent: "#6272a4",
          error: "#ff5555",
          info: "#8be9fd",
          success: "#50fa7b",
          warning: "#ffb86c",
        },
      },
    },
  },
});
