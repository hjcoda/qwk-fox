import type { Preview } from "@storybook/react-vite";

import { styleReset } from "react95";
// pick a theme of your choice
import original from "react95/dist/themes/original";
import { createGlobalStyle, ThemeProvider } from "styled-components";

const GlobalStyles = createGlobalStyle`
  ${styleReset}
  @font-face {
    font-family: 'ms_sans_serif';

    font-weight: 400;
    font-style: normal
  }
  @font-face {
    font-family: 'ms_sans_serif';

    font-weight: bold;
    font-style: normal
  }
  body {
    font-family: 'ms_sans_serif';
  }
`;

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
  decorators: [
    (Story) => (
      <div>
        <GlobalStyles />
        <ThemeProvider theme={original}>
          <Story />
        </ThemeProvider>
      </div>
    ),
  ],
};

export default preview;
