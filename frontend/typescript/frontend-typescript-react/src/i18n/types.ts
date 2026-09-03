export type Lang = 'en' | 'ru';

export interface Dictionary {
  nav: {
    home: string;
    stack: string;
  };
  home: {
    panelStack: string;
    panelBuild: string;
    panelCi: string;
    panelIntegrations: string;
    panelDriver: string;
    panelRemote: string;
    panelConsole: string;
    outputFormat: string;
    reset: string;
    download: string;
    copy: string;
    remotePlaceholder: string;
    driverWebdriver: string;
    driverPlaywright: string;
  };
  stack: {
    loading: string;
    error: string;
    openHome: string;
    noBackendPrefix: string;
    panelBackend: string;
    panelFrontend: string;
    panelTests: string;
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
  };
}
