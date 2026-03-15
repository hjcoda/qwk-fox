import { styleReset } from "react95";
import { Theme } from "react95/dist/common/themes/types";
import { createGlobalStyle } from "styled-components";
// original Windows95 font (optionally)
import ms_sans_serif from "react95/dist/fonts/ms_sans_serif.woff2";
import ms_sans_serif_bold from "react95/dist/fonts/ms_sans_serif_bold.woff2";

export const GlobalStyles = createGlobalStyle`
  ${styleReset}
  @font-face {
    font-family: 'ms_sans_serif';
    src: url('${ms_sans_serif}') format('woff2');
    font-weight: 400;
    font-style: normal
  }
  @font-face {
    font-family: 'ms_sans_serif';
    src: url('${ms_sans_serif_bold}') format('woff2');
    font-weight: bold;
    font-style: normal
  }
  body {
    font-family: 'ms_sans_serif';
  }
  main {
    background-color: ${({ theme }: { theme: Theme }) => theme.material};
    color: ${({ theme }: { theme: Theme }) => theme.canvasText};
    min-height: 100vh;
  }
  :root {
    --table-border: ${({ theme }: { theme: Theme }) => theme.borderDark};
    --table-row-border: ${({ theme }: { theme: Theme }) => theme.borderLight};
    --table-disabled: ${({ theme }: { theme: Theme }) => theme.materialText};
  
    --table-bg: ${({ theme }: { theme: Theme }) => theme.canvas};
    --table-text: ${({ theme }: { theme: Theme }) => theme.canvasText};

    --table-header-bg: ${({ theme }: { theme: Theme }) => theme.material};
    --table-header-text: ${({ theme }: { theme: Theme }) => theme.materialText};
   
    --table-highlight-bg: ${({ theme }: { theme: Theme }) => theme.hoverBackground};
    --table-highlight-text: ${({ theme }: { theme: Theme }) => theme.canvasTextInvert};
    --table-highlight-border: ${({ theme }: { theme: Theme }) => theme.materialText};
    --table-highlight-unfocused-bg: ${({ theme }: { theme: Theme }) => theme.material};
    --table-highlight-unfocused-border: ${({ theme }: { theme: Theme }) => theme.hoverBackground};
    
    --messagebox-bg: ${({ theme }: { theme: Theme }) => theme.canvas};
    --messagebox-text: ${({ theme }: { theme: Theme }) => theme.canvasText};
  }
`;
