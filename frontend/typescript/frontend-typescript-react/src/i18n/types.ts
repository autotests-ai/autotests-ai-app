export type Lang = 'en' | 'ru';

export interface Dictionary {
  nav: {
    home: string;
    stack: string;
  };
  home: {
    panelBuild: string;
    panelAllure: string;
    panelDriver: string;
    panelRemote: string;
    panelConsole: string;
    panelTestops: string;
    panelProject: string;
    panelAgents: string;
    panelDestination: string;
    millProtect: string;
    cloneCourse: string;
    outputFormat: string;
    reset: string;
    download: string;
    catalogHref: string;
    githubOauth: string;
    idpLogin: string;
    copy: string;
    remotePlaceholder: string;
    driverWebdriver: string;
    driverPlaywright: string;
    panelImport: string;
    importUrl: string;
    importZip: string;
    importRun: string;
    importPlaceholder: string;
  };
  stack: {
    loading: string;
    error: string;
    openHome: string;
    noBackendPrefix: string;
    panelBackend: string;
    panelFrontend: string;
    panelTests: string;
    panelPerformance: string;
    colModule: string;
    colGh: string;
    colApi: string;
    colTests: string;
    colAllure: string;
    colStatus: string;
    colOpen: string;
    colLayers: string;
    open: string;
    github: string;
    swagger: string;
    swaggerTitle: string;
    testsSrc: string;
    allure: string;
    loadBoard: string;
    loadBoardTitle: string;
    grafana: string;
    grafanaTitle: string;
  };
}
