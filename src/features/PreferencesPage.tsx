import {
  Button,
  Frame,
  GroupBox,
  Tabs,
  Tab,
  TabBody,
  Select,
  TextInput,
  Checkbox,
  ProgressBar,
  NumberInput,
} from "react95";
import * as styledComponents from "styled-components";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { TitleBar } from "./TitleBar";
import "./PreferencesWindow.css";
import {
  FONT_SIZE_STORAGE_KEY,
  FONT_STORAGE_KEY,
  LOCALE_STORAGE_KEY,
  themeMap,
  themeNames,
} from "../App";
import { useMemo, useState } from "react";

export const PreferencesPage = (): React.ReactElement => {
  const [activeTab, setActiveTab] = useState("theme");
  const [previewTheme, setPreviewTheme] = useState(
    localStorage.getItem("qwk-fox.theme") ?? "original",
  );
  const [fontFamily, setFontFamily] = useState(
    localStorage.getItem(FONT_STORAGE_KEY) ?? "IBMVGA8, monospace",
  );
  const [fontSize, setFontSize] = useState(
    Number.parseInt(
      localStorage.getItem(FONT_SIZE_STORAGE_KEY) ?? "14",
      10,
    ),
  );
  const [locale, setLocale] = useState(
    localStorage.getItem(LOCALE_STORAGE_KEY) ?? "en-US",
  );
  const [previewChecked, setPreviewChecked] = useState(true);
  const [previewText, setPreviewText] = useState("QWK Fox");

  const themeOptions = useMemo(
    () =>
      themeNames.map((name) => ({
        value: name,
        label: name,
      })),
    [],
  );

  const themeSelectWidth = useMemo(() => {
    const longest = themeNames.reduce(
      (max, name) => (name.length > max.length ? name : max),
      "",
    );
    return `${Math.max(12, longest.length + 2)}ch`;
  }, []);

  const selectedTheme = themeMap[previewTheme] ?? themeMap.original;
  const { ThemeProvider } = styledComponents as typeof styledComponents;

  const applyTheme = () => {
    localStorage.setItem("qwk-fox.theme", previewTheme);
  };

  const fontOptions = useMemo(
    () => [
      { value: "IBMVGA8, monospace", label: "IBMVGA8" },
      { value: "Courier New, monospace", label: "Courier New" },
      { value: "IBM Plex Mono, monospace", label: "IBM Plex Mono" },
    ],
    [],
  );

  const applyFontSettings = () => {
    localStorage.setItem(FONT_STORAGE_KEY, fontFamily);
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(fontSize));
  };

  const localeOptions = useMemo(
    () => [
      { value: "en-US", label: "English (US)" },
      { value: "en-GB", label: "English (UK)" },
      { value: "de-DE", label: "German (Germany)" },
      { value: "fr-FR", label: "French (France)" },
      { value: "es-ES", label: "Spanish (Spain)" },
      { value: "ja-JP", label: "Japanese" },
      { value: "zh-CN", label: "Chinese (Simplified)" },
      { value: "ko-KR", label: "Korean" },
      { value: "pt-BR", label: "Portuguese (Brazil)" },
      { value: "it-IT", label: "Italian" },
      { value: "nl-NL", label: "Dutch" },
      { value: "ru-RU", label: "Russian" },
    ],
    [],
  );

  const applyLocaleSettings = () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  };


  return (
    <div
      className="preferences-window preferences-window-standalone"
      style={{
        background: selectedTheme.material,
      }}
    >
      <div className="preferences-window-header">
        <TitleBar title="Preferences" />
      </div>
      <div className="preferences-window-body">
        <ThemeProvider theme={selectedTheme}>
          <Tabs value={activeTab} onChange={setActiveTab} className="preferences-tabs">
            <Tab value="theme">Theme</Tab>
            <Tab value="fonts">Fonts</Tab>
            <Tab value="locale">International</Tab>
          </Tabs>
          <TabBody className="preferences-tab-body">
            {activeTab === "theme" && (
              <GroupBox label="Theme" className="padded">
                <Frame variant="well" className="preferences-window-panel">
                  <div className="preferences-theme-controls">
                    <Select
                      value={previewTheme}
                      options={themeOptions}
                      width={themeSelectWidth}
                      menuMaxHeight="200px"
                      onChange={(option) => setPreviewTheme(option.value)}
                    />
                    <Button onClick={applyTheme}>Apply Theme</Button>
                  </div>
                  <div className="preferences-theme-preview">
                    <Frame
                      variant="well"
                      className="preferences-theme-preview-frame"
                    >
                      <div className="preferences-theme-preview-row">
                        <TextInput
                          value={previewText}
                          onChange={(event) =>
                            setPreviewText(event.target.value)
                          }
                        />
                        <Checkbox
                          checked={previewChecked}
                          label="Enable option"
                          onChange={(event) =>
                            setPreviewChecked(event.target.checked)
                          }
                        />
                      </div>
                      <div className="preferences-theme-preview-row">
                        <Button>Primary</Button>
                        <Button disabled>Disabled</Button>
                      </div>
                      <div className="preferences-theme-preview-row">
                        <ProgressBar value={65} />
                      </div>
                    </Frame>
                  </div>
                </Frame>
              </GroupBox>
            )}
            {activeTab === "fonts" && (
              <GroupBox label="Message Fonts" className="padded">
                <Frame variant="well" className="preferences-window-panel">
                  <div className="preferences-theme-controls">
                    <Select
                      value={fontFamily}
                      options={fontOptions}
                      width="220px"
                      onChange={(option) => setFontFamily(option.value)}
                    />
                    <NumberInput
                      value={fontSize}
                      min={8}
                      max={32}
                      width={80}
                      onChange={(value) => setFontSize(value)}
                    />
                    <Button onClick={applyFontSettings}>Apply Font</Button>
                  </div>
                  <div
                    className="preferences-theme-preview"
                    style={{
                      fontFamily,
                      fontSize: `${fontSize}px`,
                      lineHeight: 1.2,
                    }}
                  >
                    <Frame
                      variant="well"
                      className="preferences-theme-preview-frame"
                    >
                      <div className="preferences-theme-preview-row">
                        The quick brown fox jumps over the lazy dog.
                      </div>
                      <div className="preferences-theme-preview-row">
                        0123456789 !@#$%^&*()
                      </div>
                    </Frame>
                  </div>
                </Frame>
              </GroupBox>
            )}
            {activeTab === "locale" && (
              <GroupBox label="Locale Settings" className="padded">
                <Frame variant="well" className="preferences-window-panel">
                  <div className="preferences-theme-controls">
                    <Select
                      value={locale}
                      options={localeOptions}
                      width="220px"
                      onChange={(option) => setLocale(option.value)}
                    />
                    <Button onClick={applyLocaleSettings}>Apply Locale</Button>
                  </div>
                  <div
                    className="preferences-theme-preview"
                    style={{
                      fontFamily,
                      fontSize: `${fontSize}px`,
                      lineHeight: 1.2,
                    }}
                  >
                    <Frame
                      variant="well"
                      className="preferences-theme-preview-frame"
                    >
                      <div className="preferences-theme-preview-row">
                        {new Date().toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })}
                      </div>
                      <div className="preferences-theme-preview-row">
                        {new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </Frame>
                  </div>
                </Frame>
              </GroupBox>
            )}
          </TabBody>
        </ThemeProvider>
        <div className="preferences-window-actions">
          <Button onClick={() => getCurrentWindow().close()}>Close</Button>
        </div>
      </div>
    </div>
  );
};
