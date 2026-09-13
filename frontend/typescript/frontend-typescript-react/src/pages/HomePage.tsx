import {
  Badge,
  type HighlightKind,
  highlightOutput,
  IconCopy,
  IconDownload,
  IconReset,
  Panel,
  PlaqueField,
  PlaqueFieldGrid,
  PlaqueFieldGridStack,
  PlaqueFieldSeg,
  PlaqueFieldSegN,
  PlaqueSelect,
  PlaqueTagstrip,
  usePlaqueFieldMagnet,
} from '@zero-design-system/react';
import { type ChangeEvent, type ReactNode, useState } from 'react';
import { useI18n } from '../i18n';
import {
  AGENT_ACCESS,
  ALLURE_REPORT_MODES,
  ALLURE_VERSIONS,
  BROWSER_SIZES,
  BROWSER_VERSIONS,
  BROWSERS,
  BUILD_LANGUAGES,
  BUILD_OS,
  BUILD_OS_VERSIONS,
  BUILD_TOOL_VERSIONS,
  BUILD_TOOLS,
  buildWrapperOptions,
  cloneConfig,
  copyText,
  DEFAULTS,
  DESTINATIONS,
  downloadText,
  fingerprint,
  IMAGES,
  isAgentAccess,
  isDestinationId,
  LANGUAGE_VERSIONS,
  type LandingConfig,
  LOAD_STACKS,
  OUTPUT_TABS,
  type OutputTabId,
  outputFilename,
  PRODUCT_BACKEND_STACKS,
  PRODUCT_FRONTEND_STACKS,
  ROOT_LOG_LEVELS,
  SCREEN_RESOLUTIONS,
  SESSION_TIMEOUTS,
  TESTS_STACKS,
  toJson,
  toYaml,
} from '../lib/landing-config';

type AxisChoice = { value: string; label: string };

function AxisField({
  label,
  paramId,
  value,
  options,
  onChange,
}: {
  label: string;
  paramId: string;
  value: string;
  options: readonly AxisChoice[];
  onChange: (value: string) => void;
}) {
  if (options.length === 2) {
    return (
      <PlaqueFieldSeg
        label={label}
        paramId={paramId}
        value={value}
        onValueChange={onChange}
        options={[
          { value: options[0].value, label: options[0].label },
          { value: options[1].value, label: options[1].label },
        ]}
        data-testid={`landing-seg-${paramId}`}
      />
    );
  }
  return (
    <PlaqueSelect
      label={label}
      paramId={paramId}
      value={value}
      options={options}
      onChange={onChange}
      data-testid={`landing-select-${paramId}`}
    />
  );
}

function ConfigPanel({
  title,
  testId,
  titleTestId,
  stackTestId,
  magnetSyncKey,
  children,
}: {
  title: string;
  testId: string;
  titleTestId: string;
  stackTestId: string;
  magnetSyncKey: string;
  children: ReactNode;
}) {
  return (
    <Panel title={title} testId={testId} titleTestId={titleTestId}>
      <PlaqueFieldGridStack align="magnet" syncKey={magnetSyncKey} data-testid={stackTestId}>
        {children}
      </PlaqueFieldGridStack>
    </Panel>
  );
}

export function HomePage() {
  const { copy } = useI18n();
  const [config, setConfig] = useState<LandingConfig>(() => cloneConfig(DEFAULTS));
  const [activeTab, setActiveTab] = useState<OutputTabId>('yaml');

  const magnetSyncKey = [
    config.images.length,
    config.buildTool,
    activeTab,
    config.destination,
    config.coverageProfile.harness.agents.cline.access,
    config.coverageProfile.harness.agents.cursor.access,
  ].join(':');

  usePlaqueFieldMagnet({
    syncKey: magnetSyncKey,
  });

  const vectorId = fingerprint(config);
  const yaml = toYaml(config, vectorId);
  const json = toJson(config, vectorId);
  const activeOutput = activeTab === 'json' ? json : yaml;
  const highlightKind: HighlightKind = activeTab === 'json' ? 'json' : 'plain';
  const highlightedHtml = highlightOutput(activeOutput, highlightKind);

  const patch = (partial: Partial<LandingConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const setField =
    <K extends keyof LandingConfig>(key: K) =>
    (value: LandingConfig[K]) => {
      patch({ [key]: value } as Pick<LandingConfig, K>);
    };

  const setFromInput = (key: 'remoteUrl' | 'name') => (event: ChangeEvent<HTMLInputElement>) => {
    patch({ [key]: event.target.value });
  };

  const setDestination = (value: string) => {
    if (isDestinationId(value)) {
      patch({ destination: value });
    }
  };

  const setAgentAccess = (agent: 'cline' | 'cursor') => (value: string) => {
    if (!isAgentAccess(value)) {
      return;
    }
    setConfig((prev) => {
      const next = cloneConfig(prev);
      next.coverageProfile.harness.agents[agent].access = value;
      return next;
    });
  };

  const toggleImage = (value: string) => {
    setConfig((prev) => ({
      ...prev,
      images: prev.images.includes(value)
        ? prev.images.filter((item) => item !== value)
        : [...prev.images, value],
    }));
  };

  const resetConfig = () => {
    setConfig(cloneConfig(DEFAULTS));
  };

  return (
    <main
      className="configurator page-shell page-shell--below-header-tight page-shell--pad-bottom-lg"
      data-testid="page-shell"
    >
      <div
        className="configurator__layout grid grid--2x1 configurator__layout--terminal"
        data-testid="landing-configurator"
      >
        <div className="configurator__main">
          <div className="stack stack--lg">
            <ConfigPanel
              title={copy.home.panelProject}
              testId="landing-project-panel"
              titleTestId="landing-project-title"
              stackTestId="landing-project-stack"
              magnetSyncKey={magnetSyncKey}
            >
              <PlaqueFieldGrid layout="duo" aria-label="Product stacks">
                <PlaqueSelect
                  label="backend"
                  paramId="backend"
                  value={config.coverageProfile.product.backend.stack}
                  options={PRODUCT_BACKEND_STACKS}
                  data-testid="landing-select-backend"
                />
                <PlaqueSelect
                  label="frontend"
                  paramId="frontend"
                  value={config.coverageProfile.product.frontend.stack}
                  options={PRODUCT_FRONTEND_STACKS}
                  data-testid="landing-select-frontend"
                />
              </PlaqueFieldGrid>
              <PlaqueFieldGrid layout="duo" aria-label="Tests and load">
                <PlaqueSelect
                  label="tests"
                  paramId="tests"
                  value={config.coverageProfile.automation.api.stack}
                  options={TESTS_STACKS}
                  data-testid="landing-select-tests"
                />
                <PlaqueSelect
                  label="load"
                  paramId="load"
                  value={config.coverageProfile.load.stack}
                  options={LOAD_STACKS}
                  data-testid="landing-select-load"
                />
              </PlaqueFieldGrid>
            </ConfigPanel>

            <ConfigPanel
              title={copy.home.panelAgents}
              testId="landing-agents-panel"
              titleTestId="landing-agents-title"
              stackTestId="landing-agents-stack"
              magnetSyncKey={magnetSyncKey}
            >
              <PlaqueFieldGrid layout="duo" aria-label="Harness agents">
                <PlaqueFieldSeg
                  label="cline"
                  paramId="clineAccess"
                  value={config.coverageProfile.harness.agents.cline.access}
                  onValueChange={setAgentAccess('cline')}
                  options={AGENT_ACCESS}
                  data-testid="landing-seg-clineAccess"
                />
                <PlaqueFieldSeg
                  label="cursor"
                  paramId="cursorAccess"
                  value={config.coverageProfile.harness.agents.cursor.access}
                  onValueChange={setAgentAccess('cursor')}
                  options={AGENT_ACCESS}
                  data-testid="landing-seg-cursorAccess"
                />
              </PlaqueFieldGrid>
            </ConfigPanel>

            <ConfigPanel
              title={copy.home.panelDestination}
              testId="landing-destination-panel"
              titleTestId="landing-destination-title"
              stackTestId="landing-destination-stack"
              magnetSyncKey={magnetSyncKey}
            >
              <PlaqueFieldGrid layout="solo" aria-label="destination">
                <PlaqueFieldSegN
                  label="destination"
                  paramId="destination"
                  value={config.destination}
                  onValueChange={setDestination}
                  options={DESTINATIONS}
                  data-testid="landing-seg-destination"
                />
              </PlaqueFieldGrid>
            </ConfigPanel>

            <ConfigPanel
              title={copy.home.panelBuild}
              testId="landing-build-panel"
              titleTestId="landing-build-title"
              stackTestId="landing-build-stack"
              magnetSyncKey={magnetSyncKey}
            >
              <PlaqueFieldGrid layout="duo" aria-label="OS and OS version">
                <PlaqueSelect
                  label="OS"
                  paramId="buildOs"
                  value={config.buildOs}
                  options={BUILD_OS}
                  onChange={setField('buildOs')}
                  data-testid="landing-select-buildOs"
                />
                <PlaqueSelect
                  label="OS Version"
                  paramId="buildOsVersion"
                  value={config.buildOsVersion}
                  options={BUILD_OS_VERSIONS}
                  onChange={setField('buildOsVersion')}
                  data-testid="landing-select-buildOsVersion"
                />
              </PlaqueFieldGrid>
              <PlaqueFieldGrid layout="duo" aria-label="Language and version">
                <PlaqueSelect
                  label="Language"
                  paramId="buildLanguage"
                  value={config.buildLanguage}
                  options={BUILD_LANGUAGES}
                  onChange={setField('buildLanguage')}
                  data-testid="landing-select-buildLanguage"
                />
                <PlaqueSelect
                  label="Language Version"
                  paramId="javaVersion"
                  value={config.javaVersion}
                  options={LANGUAGE_VERSIONS}
                  onChange={setField('javaVersion')}
                  data-testid="landing-select-javaVersion"
                />
              </PlaqueFieldGrid>
              <PlaqueFieldGrid layout="duo" aria-label="Build tool and wrapper">
                <AxisField
                  label="buildTool"
                  paramId="buildTool"
                  value={config.buildTool}
                  options={BUILD_TOOLS}
                  onChange={setField('buildTool')}
                />
                <AxisField
                  label="buildWrapper"
                  paramId="buildWrapper"
                  value={config.buildWrapper}
                  options={buildWrapperOptions(config.buildTool)}
                  onChange={setField('buildWrapper')}
                />
              </PlaqueFieldGrid>
              <PlaqueFieldGrid layout="solo" aria-label="Build tool version">
                <PlaqueSelect
                  label="Build Tool Version"
                  paramId="buildToolVersion"
                  value={config.buildToolVersion}
                  options={BUILD_TOOL_VERSIONS}
                  onChange={setField('buildToolVersion')}
                  data-testid="landing-select-buildToolVersion"
                />
              </PlaqueFieldGrid>
            </ConfigPanel>

            <ConfigPanel
              title={copy.home.panelAllure}
              testId="landing-allure-panel"
              titleTestId="landing-allure-title"
              stackTestId="landing-allure-stack"
              magnetSyncKey={magnetSyncKey}
            >
              <PlaqueFieldGrid layout="duo" aria-label="Allure report mode and CLI version">
                <PlaqueSelect
                  label="allureReportMode"
                  paramId="allureReportMode"
                  value={config.allureReportMode}
                  options={ALLURE_REPORT_MODES}
                  onChange={setField('allureReportMode')}
                  data-testid="landing-select-allureReportMode"
                />
                <PlaqueSelect
                  label="allureVersion"
                  paramId="allureVersion"
                  value={config.allureVersion}
                  options={ALLURE_VERSIONS}
                  onChange={setField('allureVersion')}
                  data-testid="landing-select-allureVersion"
                />
              </PlaqueFieldGrid>
              <PlaqueFieldGrid layout="duo" aria-label="Allure agent and quality gate">
                <PlaqueFieldSeg
                  label="allureAgentMode"
                  paramId="allureAgentMode"
                  value={config.allureAgentMode}
                  onValueChange={setField('allureAgentMode')}
                  options={[
                    { value: 'none', title: 'post-test hook off' },
                    { value: 'inspect', title: 'allure agent inspect → build/agent-output/' },
                  ]}
                  data-testid="landing-seg-allureAgentMode"
                />
                <PlaqueFieldSeg
                  label="allureQualityGate"
                  paramId="allureQualityGate"
                  value={config.allureQualityGate}
                  onValueChange={setField('allureQualityGate')}
                  data-testid="landing-seg-allureQualityGate"
                />
              </PlaqueFieldGrid>
              <PlaqueFieldGrid
                layout="duo"
                cellSpan="lg"
                aria-label="Allure runtime — Selenide listener and last screenshot"
              >
                <PlaqueFieldSeg
                  label="enableAllureSelenideListener"
                  paramId="enableAllureSelenideListener"
                  value={config.enableAllureSelenideListener}
                  onValueChange={setField('enableAllureSelenideListener')}
                  data-testid="landing-seg-enableAllureSelenideListener"
                />
                <PlaqueFieldSeg
                  label="attachLastScreenshot"
                  paramId="attachLastScreenshot"
                  value={config.attachLastScreenshot}
                  onValueChange={setField('attachLastScreenshot')}
                  data-testid="landing-seg-attachLastScreenshot"
                />
              </PlaqueFieldGrid>
              <PlaqueFieldGrid
                layout="duo"
                cellSpan="lg"
                aria-label="Allure runtime — page source and browser console"
              >
                <PlaqueFieldSeg
                  label="attachPageSource"
                  paramId="attachPageSource"
                  value={config.attachPageSource}
                  onValueChange={setField('attachPageSource')}
                  data-testid="landing-seg-attachPageSource"
                />
                <PlaqueFieldSeg
                  label="attachBrowserConsoleLogs"
                  paramId="attachBrowserConsoleLogs"
                  value={config.attachBrowserConsoleLogs}
                  onValueChange={setField('attachBrowserConsoleLogs')}
                  data-testid="landing-seg-attachBrowserConsoleLogs"
                />
              </PlaqueFieldGrid>
              <PlaqueFieldGrid layout="duo" aria-label="Allure runtime — video and HAR logs">
                <PlaqueFieldSeg
                  label="attachVideo"
                  paramId="attachVideo"
                  value={config.attachVideo}
                  onValueChange={setField('attachVideo')}
                  data-testid="landing-seg-attachVideo"
                />
                <PlaqueFieldSeg
                  label="attachHarLogs"
                  paramId="attachHarLogs"
                  value={config.attachHarLogs}
                  onValueChange={setField('attachHarLogs')}
                  data-testid="landing-seg-attachHarLogs"
                />
              </PlaqueFieldGrid>
              <PlaqueFieldGrid
                layout="duo"
                cellSpan="lg"
                aria-label="Allure runtime — REST Assured listener and style"
              >
                <PlaqueFieldSeg
                  label="enableAllureRestAssuredListener"
                  paramId="enableAllureRestAssuredListener"
                  value={config.enableAllureRestAssuredListener}
                  onValueChange={setField('enableAllureRestAssuredListener')}
                  data-testid="landing-seg-enableAllureRestAssuredListener"
                />
                <PlaqueFieldSeg
                  label="allureRestAssuredListenerStyle"
                  paramId="allureRestAssuredListenerStyle"
                  value={config.allureRestAssuredListenerStyle}
                  onValueChange={setField('allureRestAssuredListenerStyle')}
                  options={[
                    { value: 'default', title: 'stock AllureRestAssured templates' },
                    { value: 'colored', title: 'tpl/request.ftl + tpl/response.ftl' },
                  ]}
                  data-testid="landing-seg-allureRestAssuredListenerStyle"
                />
              </PlaqueFieldGrid>
            </ConfigPanel>

            <ConfigPanel
              title={copy.home.panelDriver}
              testId="landing-driver-panel"
              titleTestId="landing-driver-title"
              stackTestId="landing-driver-stack"
              magnetSyncKey={magnetSyncKey}
            >
              <PlaqueFieldGrid layout="solo" aria-label="driverEngine">
                <PlaqueFieldSeg
                  label="driverEngine"
                  paramId="driverEngine"
                  value={config.driverEngine}
                  onValueChange={setField('driverEngine')}
                  options={[
                    { value: 'webdriver', title: copy.home.driverWebdriver },
                    { value: 'playwright', title: copy.home.driverPlaywright },
                  ]}
                  data-testid="landing-seg-driverEngine"
                />
              </PlaqueFieldGrid>
              <PlaqueFieldGrid
                layout="duo"
                cellSpan="lg"
                aria-label="Browser identity"
                data-testid="landing-driver-browser"
              >
                <PlaqueSelect
                  label="browser"
                  paramId="browser"
                  value={config.browser}
                  options={BROWSERS}
                  onChange={setField('browser')}
                  data-testid="landing-select-browser"
                />
                <PlaqueSelect
                  label="browserVersion"
                  paramId="browserVersion"
                  value={config.browserVersion}
                  options={BROWSER_VERSIONS}
                  onChange={setField('browserVersion')}
                  data-testid="landing-select-browserVersion"
                />
              </PlaqueFieldGrid>
              <PlaqueFieldGrid layout="solo" aria-label="Driver viewport">
                <PlaqueSelect
                  label="browserSize"
                  paramId="browserSize"
                  value={config.browserSize}
                  options={BROWSER_SIZES}
                  onChange={setField('browserSize')}
                  data-testid="landing-select-browserSize"
                />
              </PlaqueFieldGrid>
              <PlaqueFieldGrid layout="solo" aria-label="Driver runtime">
                <PlaqueFieldSeg
                  label="headless"
                  paramId="headless"
                  value={config.headless}
                  onValueChange={setField('headless')}
                  data-testid="landing-seg-headless"
                />
              </PlaqueFieldGrid>
              <PlaqueFieldGrid layout="solo" aria-label="images">
                <PlaqueTagstrip
                  label="images"
                  paramId="images"
                  options={IMAGES}
                  values={config.images}
                  onToggle={toggleImage}
                  data-testid="landing-tagstrip-images"
                />
              </PlaqueFieldGrid>
              <PlaqueFieldGrid layout="solo" aria-label="closeBrowserAfterEach">
                <PlaqueFieldSeg
                  label="closeBrowserAfterEach"
                  paramId="closeBrowserAfterEach"
                  value={config.closeBrowserAfterEach}
                  onValueChange={setField('closeBrowserAfterEach')}
                  data-testid="landing-seg-closeBrowserAfterEach"
                />
              </PlaqueFieldGrid>
              <PlaqueFieldGrid layout="solo" aria-label="closeBrowserAfterAll">
                <PlaqueFieldSeg
                  label="closeBrowserAfterAll"
                  paramId="closeBrowserAfterAll"
                  value={config.closeBrowserAfterAll}
                  onValueChange={setField('closeBrowserAfterAll')}
                  data-testid="landing-seg-closeBrowserAfterAll"
                />
              </PlaqueFieldGrid>
            </ConfigPanel>

            <ConfigPanel
              title={copy.home.panelRemote}
              testId="landing-remote-panel"
              titleTestId="landing-remote-title"
              stackTestId="landing-remote-stack"
              magnetSyncKey={magnetSyncKey}
            >
              <PlaqueFieldGrid layout="solo" aria-label="Remote URL">
                <PlaqueField
                  label="remoteUrl"
                  paramId="remoteUrl"
                  labelVariant="param"
                  value={config.remoteUrl}
                  placeholder={copy.home.remotePlaceholder}
                  onChange={setFromInput('remoteUrl')}
                  data-testid="landing-field-remoteUrl"
                />
              </PlaqueFieldGrid>
              <PlaqueFieldGrid layout="duo" aria-label="Session identity">
                <PlaqueSelect
                  label="sessionTimeout"
                  paramId="sessionTimeout"
                  value={config.sessionTimeout}
                  options={SESSION_TIMEOUTS}
                  onChange={setField('sessionTimeout')}
                  data-testid="landing-select-sessionTimeout"
                />
                <PlaqueField
                  label="name"
                  paramId="name"
                  labelVariant="param"
                  value={config.name}
                  onChange={setFromInput('name')}
                  data-testid="landing-field-name"
                />
              </PlaqueFieldGrid>
              <PlaqueFieldGrid layout="solo" aria-label="Screen resolution">
                <PlaqueSelect
                  label="screenResolution"
                  paramId="screenResolution"
                  value={config.screenResolution}
                  options={SCREEN_RESOLUTIONS}
                  onChange={setField('screenResolution')}
                  data-testid="landing-select-screenResolution"
                />
              </PlaqueFieldGrid>
              <PlaqueFieldGrid
                layout="pair"
                aria-label="Remote hub flags"
                data-testid="landing-remote-flags"
              >
                <PlaqueFieldSeg
                  label="enableVnc"
                  paramId="enableVnc"
                  value={config.enableVnc}
                  onValueChange={setField('enableVnc')}
                  data-testid="landing-seg-enableVnc"
                />
                <PlaqueFieldSeg
                  label="enableVideo"
                  paramId="enableVideo"
                  value={config.enableVideo}
                  onValueChange={setField('enableVideo')}
                  data-testid="landing-seg-enableVideo"
                />
                <PlaqueFieldSeg
                  label="enableHar"
                  paramId="enableHar"
                  value={config.enableHar}
                  onValueChange={setField('enableHar')}
                  data-testid="landing-seg-enableHar"
                />
              </PlaqueFieldGrid>
            </ConfigPanel>

            <ConfigPanel
              title={copy.home.panelConsole}
              testId="landing-console-panel"
              titleTestId="landing-console-title"
              stackTestId="landing-console-stack"
              magnetSyncKey={magnetSyncKey}
            >
              <PlaqueFieldGrid layout="solo" aria-label="logToConsole">
                <PlaqueFieldSeg
                  label="logToConsole"
                  paramId="logToConsole"
                  value={config.logToConsole}
                  onValueChange={setField('logToConsole')}
                  data-testid="landing-seg-logToConsole"
                />
              </PlaqueFieldGrid>
              <PlaqueFieldGrid layout="solo" aria-label="selenideLogToConsole">
                <PlaqueFieldSeg
                  label="selenideLogToConsole"
                  paramId="selenideLogToConsole"
                  value={config.selenideLogToConsole}
                  onValueChange={setField('selenideLogToConsole')}
                  data-testid="landing-seg-selenideLogToConsole"
                />
              </PlaqueFieldGrid>
              <PlaqueFieldGrid layout="solo" aria-label="rootLogLevel">
                <PlaqueSelect
                  label="rootLogLevel"
                  paramId="rootLogLevel"
                  value={config.rootLogLevel}
                  options={ROOT_LOG_LEVELS}
                  onChange={setField('rootLogLevel')}
                  data-testid="landing-select-rootLogLevel"
                />
              </PlaqueFieldGrid>
            </ConfigPanel>

            <ConfigPanel
              title={copy.home.panelTestops}
              testId="landing-testops-panel"
              titleTestId="landing-testops-title"
              stackTestId="landing-testops-stack"
              magnetSyncKey={magnetSyncKey}
            >
              <PlaqueFieldGrid layout="solo" aria-label="testopsEnabled">
                <PlaqueFieldSeg
                  label="testopsEnabled"
                  paramId="testopsEnabled"
                  value={config.testopsEnabled}
                  onValueChange={setField('testopsEnabled')}
                  options={[
                    { value: 'true', label: 'on', title: 'allurectl watch + export ALLURE_*' },
                    { value: 'false', label: 'off' },
                  ]}
                  data-testid="landing-seg-testopsEnabled"
                />
              </PlaqueFieldGrid>
            </ConfigPanel>
          </div>
        </div>

        <div className="configurator__aside">
          <div className="configurator__output-panel">
            <div className="configurator__output-sticky">
              <Panel
                variant="terminal"
                testId="landing-terminal-panel"
                className="panel--sticky ch-theme--vscode"
                trail={
                  <div
                    className="tabs"
                    role="tablist"
                    aria-label={copy.home.outputFormat}
                    data-testid="landing-terminal-tabs"
                  >
                    {OUTPUT_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        className={'tab' + (activeTab === tab.id ? ' tab--active' : '')}
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        data-tab={tab.id}
                        data-testid={`landing-terminal-tab-${tab.id}`}
                        onClick={() => setActiveTab(tab.id)}
                      >
                        {tab.barLabel}
                      </button>
                    ))}
                  </div>
                }
                barEnd={
                  <Badge variant="primary" data-testid="landing-terminal-vector">
                    {vectorId}
                  </Badge>
                }
                actions={[
                  {
                    icon: <IconReset />,
                    label: copy.home.reset,
                    onClick: resetConfig,
                    'data-testid': 'landing-terminal-reset',
                  },
                  {
                    icon: <IconDownload />,
                    label: copy.home.download,
                    onClick: () => downloadText(activeOutput, outputFilename(activeTab)),
                    'data-testid': 'landing-terminal-download',
                  },
                  {
                    icon: <IconCopy />,
                    label: copy.home.copy,
                    onClick: () => copyText(activeOutput),
                    'data-testid': 'landing-terminal-copy',
                  },
                ]}
              >
                <pre
                  className="panel__code ch-code"
                  data-testid="landing-terminal-output"
                  // highlightOutput escapes; same terminal mount as library ConfiguratorPanelScreen.
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: highlightOutput HTML
                  dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                />
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
