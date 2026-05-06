import { styleReset } from "react95";
import { Theme } from "react95/dist/common/themes/types";
import { createGlobalStyle } from "styled-components";

const fontFamily = "Arial";

export const GlobalStyles = createGlobalStyle`
  ${styleReset}
  @font-face {
    font-family: ${fontFamily};
    font-weight: 400;
    font-style: normal
  }
  @font-face {
    font-family: ${fontFamily};
    font-weight: bold;
    font-style: normal
  }
  body {
    font-family: ${fontFamily};
  }
  main {
    background-color: ${({ theme }: { theme: Theme }) => theme.material};
    color: ${({ theme }: { theme: Theme }) => theme.canvasText};
    min-height: 100vh;
  }
  :root {    
    --border-light: ${({ theme }: { theme: Theme }) => theme.borderLight};
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

    --wx-table-header-border: ${({ theme }: { theme: Theme }) => theme.materialText};
    --wx-table-header-color: ${({ theme }: { theme: Theme }) => theme.materialText};
    --wx-table-header-background: ${({ theme }: { theme: Theme }) => theme.material};

    --wx-table-select-border: ${({ theme }: { theme: Theme }) => theme.materialText};
    --wx-table-select-color: ${({ theme }: { theme: Theme }) => theme.canvasTextInvert};
    --wx-table-select-background: ${({ theme }: { theme: Theme }) => theme.hoverBackground};
  }
`;
