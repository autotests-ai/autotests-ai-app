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
  PlaqueFieldSeg,
  PlaqueSelect,
  PlaqueTagstrip,
  usePlaqueFieldMagnet,
} from '@zero-design-system/react';
import { type ChangeEvent, useState } from 'react';
import {
  applyBackendFramework,
  applyBackendLanguage,
  applyCodeHost,
  applyFrontendFramework,
  applyFrontendLanguage,
  applyTestsAxis,
  applyTestsLanguage,
  BACKEND_LANGUAGES,
  BROWSER_SIZES,
  BROWSER_VERSIONS,
  BROWSERS,
  BUILD_LANGUAGES,
  BUILD_OS,
  BUILD_OS_VERSIONS,
  BUILD_TOOL_VERSIONS,
  BUILD_TOOLS,
  backendFrameworks,
  CI_RUNNERS,
  CODE_HOSTS,
  cloneConfig,
  copyText,
  DEFAULTS,
  downloadText,
  FRONTEND_LANGUAGES,
  fingerprint,
  frontendFrameworks,
  IMAGES,
  LANGUAGE_VERSIONS,
  type LandingConfig,
  OUTPUT_TABS,
  type OutputTabId,
  outputFilename,
  ROOT_LOG_LEVELS,
  SCREEN_RESOLUTIONS,
  SESSION_TIMEOUTS,
  TEST_LANGUAGES,
  type TestAxis,
  testAxisOptions,
  toJson,
  toYaml,
} from '../lib/landing-config';

type AxisChoice = { value: string; label: string };

const TEST_AXIS_FIELDS: ReadonlyArray<{ axis: TestAxis; paramId: string }> = [
  { axis: 'build', paramId: 'testsBuild' },
  { axis: 'runner', paramId: 'testsRunner' },
  { axis: 'allure', paramId: 'testsAllure' },
  { axis: 'ui', paramId: 'testsUi' },
];

function pairRows<T>(items: readonly T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return rows;
}

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

export function HomePage() {
  const [config, setConfig] = useState<LandingConfig>(() => cloneConfig(DEFAULTS));
  const [activeTab, setActiveTab] = useState<OutputTabId>('yaml');

  usePlaqueFieldMagnet({
    syncKey: `${config.backendLanguage}:${config.frontendLanguage}:${config.testsLanguage}:${config.images.length}:${activeTab}`,
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

  const toggleImage = (value: string) => {
    setConfig((prev) => ({
      ...prev,
      images: prev.images.includes(value)
        ? prev.images.filter((item) => item !== value)
        : [...prev.images, value],
    }));
  };

  const setCodeHost = (value: string) => {
    setConfig((prev) => applyCodeHost(prev, value));
  };

  const setBackendLanguage = (value: string) => {
    setConfig((prev) => applyBackendLanguage(prev, value));
  };

  const setBackendFramework = (value: string) => {
    setConfig((prev) => applyBackendFramework(prev, value));
  };

  const setFrontendLanguage = (value: string) => {
    setConfig((prev) => applyFrontendLanguage(prev, value));
  };

  const setFrontendFramework = (value: string) => {
    setConfig((prev) => applyFrontendFramework(prev, value));
  };

  const setTestsLanguage = (value: string) => {
    setConfig((prev) => applyTestsLanguage(prev, value));
  };

  const setTestsAxis = (axis: TestAxis) => (value: string) => {
    setConfig((prev) => applyTestsAxis(prev, axis, value));
  };

  const visibleTestAxes = TEST_AXIS_FIELDS.filter(
    (field) => testAxisOptions(config.testsLanguage, field.axis).length > 0,
  );

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
            <Panel title="Stack" testId="landing-stack-panel" titleTestId="landing-stack-title">
              <div
                className="plaque-field-grid-stack plaque-field-grid-stack--magnet"
                data-testid="landing-stack-stack"
              >
                <PlaqueFieldGrid layout="duo" aria-label="backend language and framework">
                  <AxisField
                    label="backendLanguage"
                    paramId="backendLanguage"
                    value={config.backendLanguage}
                    options={BACKEND_LANGUAGES}
                    onChange={setBackendLanguage}
                  />
                  <AxisField
                    label="backendFramework"
                    paramId="backendFramework"
                    value={config.backendFramework}
                    options={backendFrameworks(config.backendLanguage)}
                    onChange={setBackendFramework}
                  />
                </PlaqueFieldGrid>
                <PlaqueFieldGrid layout="duo" aria-label="frontend language and framework">
                  <AxisField
                    label="frontendLanguage"
                    paramId="frontendLanguage"
                    value={config.frontendLanguage}
                    options={FRONTEND_LANGUAGES}
                    onChange={setFrontendLanguage}
                  />
                  <AxisField
                    label="frontendFramework"
                    paramId="frontendFramework"
                    value={config.frontendFramework}
                    options={frontendFrameworks(config.frontendLanguage)}
                    onChange={setFrontendFramework}
                  />
                </PlaqueFieldGrid>
                <PlaqueFieldGrid layout="solo" aria-label="tests language">
                  <AxisField
                    label="testsLanguage"
                    paramId="testsLanguage"
                    value={config.testsLanguage}
                    options={TEST_LANGUAGES}
                    onChange={setTestsLanguage}
                  />
                </PlaqueFieldGrid>
                {pairRows(visibleTestAxes).map((row) => (
                  <PlaqueFieldGrid
                    key={row.map((field) => field.paramId).join('-')}
                    layout={row.length === 1 ? 'solo' : 'duo'}
                    aria-label={row.map((field) => field.paramId).join(' and ')}
                  >
                    {row.map((field) => (
                      <AxisField
                        key={field.paramId}
                        label={field.paramId}
                        paramId={field.paramId}
                        value={
                          field.axis === 'build'
                            ? config.testsBuild
                            : field.axis === 'runner'
                              ? config.testsRunner
                              : field.axis === 'allure'
                                ? config.testsAllure
                                : config.testsUi
                        }
                        options={testAxisOptions(config.testsLanguage, field.axis)}
                        onChange={setTestsAxis(field.axis)}
                      />
                    ))}
                  </PlaqueFieldGrid>
                ))}
              </div>
            </Panel>

            <Panel title="Build" testId="landing-build-panel" titleTestId="landing-build-title">
              <div
                className="plaque-field-grid-stack plaque-field-grid-stack--magnet"
                data-testid="landing-build-stack"
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
                <PlaqueFieldGrid layout="duo" aria-label="Build tool and version">
                  <PlaqueSelect
                    label="Build Tool"
                    paramId="buildTool"
                    value={config.buildTool}
                    options={BUILD_TOOLS}
                    onChange={setField('buildTool')}
                    data-testid="landing-select-buildTool"
                  />
                  <PlaqueSelect
                    label="Build Tool Version"
                    paramId="buildToolVersion"
                    value={config.buildToolVersion}
                    options={BUILD_TOOL_VERSIONS}
                    onChange={setField('buildToolVersion')}
                    data-testid="landing-select-buildToolVersion"
                  />
                </PlaqueFieldGrid>
              </div>
            </Panel>

            <Panel title="CI" testId="landing-ci-panel" titleTestId="landing-ci-title">
              <div
                className="plaque-field-grid-stack plaque-field-grid-stack--magnet"
                data-testid="landing-ci-stack"
              >
                <PlaqueFieldGrid layout="duo" aria-label="Code host and CI runner">
                  <PlaqueSelect
                    label="codeHost"
                    paramId="codeHost"
                    value={config.codeHost}
                    options={CODE_HOSTS}
                    onChange={setCodeHost}
                    data-testid="landing-select-codeHost"
                  />
                  <PlaqueSelect
                    label="ciRunner"
                    paramId="ciRunner"
                    value={config.ciRunner}
                    options={CI_RUNNERS}
                    onChange={setField('ciRunner')}
                    data-testid="landing-select-ciRunner"
                  />
                </PlaqueFieldGrid>
              </div>
            </Panel>

            <Panel title="Driver" testId="landing-driver-panel" titleTestId="landing-driver-title">
              <div
                className="plaque-field-grid-stack plaque-field-grid-stack--magnet"
                data-testid="landing-driver-stack"
              >
                <PlaqueFieldGrid layout="solo" aria-label="driverEngine">
                  <PlaqueFieldSeg
                    label="driverEngine"
                    paramId="driverEngine"
                    value={config.driverEngine}
                    onValueChange={setField('driverEngine')}
                    options={[
                      { value: 'webdriver', title: 'Selenium WebDriver / Selenoid' },
                      { value: 'playwright', title: 'Playwright движок' },
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
                <PlaqueFieldGrid layout="duo" aria-label="Driver runtime">
                  <PlaqueSelect
                    label="browserSize"
                    paramId="browserSize"
                    value={config.browserSize}
                    options={BROWSER_SIZES}
                    onChange={setField('browserSize')}
                    data-testid="landing-select-browserSize"
                  />
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
              </div>
            </Panel>

            <Panel
              title="Remote hub"
              testId="landing-remote-panel"
              titleTestId="landing-remote-title"
            >
              <div
                className="plaque-field-grid-stack plaque-field-grid-stack--magnet"
                data-testid="landing-remote-stack"
              >
                <PlaqueFieldGrid layout="solo" aria-label="Remote URL">
                  <PlaqueField
                    label="remoteUrl"
                    paramId="remoteUrl"
                    labelVariant="param"
                    value={config.remoteUrl}
                    placeholder="пусто = local driver"
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
              </div>
            </Panel>

            <Panel
              title="Console log"
              testId="landing-console-panel"
              titleTestId="landing-console-title"
            >
              <div
                className="plaque-field-grid-stack plaque-field-grid-stack--magnet"
                data-testid="landing-console-stack"
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
              </div>
            </Panel>
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
                    aria-label="Формат вывода"
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
                    label: 'Сброс',
                    onClick: resetConfig,
                    'data-testid': 'landing-terminal-reset',
                  },
                  {
                    icon: <IconDownload />,
                    label: 'Скачать',
                    onClick: () => downloadText(activeOutput, outputFilename(activeTab)),
                    'data-testid': 'landing-terminal-download',
                  },
                  {
                    icon: <IconCopy />,
                    label: 'Копировать',
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
