import { ActionTypes, iframeUrl } from 'src/constants';

import styles from './contentScript.css';

class ChromeOnSteroids {
  private chromeOnSteroidsRootElement: HTMLElement | null = null;

  constructor() {
    this.insertIFrame();
    this.registerListeners();
  }

  insertIFrame() {
    this.chromeOnSteroidsRootElement = document.createElement('div');
    this.chromeOnSteroidsRootElement.classList.add(styles['root']);
    const iFrame = document.createElement('iframe');
    iFrame.src = iframeUrl;
    this.chromeOnSteroidsRootElement.append(iFrame);

    document.body.insertAdjacentElement(
      'afterbegin',
      this.chromeOnSteroidsRootElement
    );
  }

  toggleRootVisibility() {
    this.chromeOnSteroidsRootElement?.classList.toggle(styles['visible']);

    const isChromeOnSteroidsVisible = this.chromeOnSteroidsRootElement?.classList.contains(
      styles['visible']
    );

    if (isChromeOnSteroidsVisible) {
      document.body.classList.add(styles['overflow-hidden']);
    } else {
      document.body.classList.remove(styles['overflow-hidden']);
      (document.activeElement as HTMLElement).blur();
    }
  }

  registerListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const { type } = request;

      switch (type) {
        case ActionTypes.TOGGLE_VISIBILITY:
          this.toggleRootVisibility();

          break;

        default:
          break;
      }
    });
  }
}

// TODO: Get rid of the disable-next-line. What is the right way to create an
// instance when you don't want to use its value. Is there something like an
// IIFE for this use case?

// tslint:disable-next-line: no-unused-expression
new ChromeOnSteroids();
