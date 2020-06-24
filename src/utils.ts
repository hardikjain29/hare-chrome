import Fuse from 'fuse.js';

import { ActionTypes } from 'src/constants';
import {
  ModifierKey,
  keyLabels,
  defaultFilename,
  partialHostnameToFilenameMapping,
} from 'src/constants';
import { IAppState } from 'src/types';

function getFilenameFromURL(url?: string): string {
  if (
    typeof url === 'undefined' ||
    (typeof url === 'string' && url.length === 0)
  ) {
    return defaultFilename;
  }

  const urlInstance = new URL(url);
  const hostname = urlInstance.hostname;

  // Part of the hostname is mapped against the corresponding filename. The
  // subdomain part of the hostname is being ignore for matching. There can some false
  // matches as well and isn't exactly very optimised way to do this. This is a very
  // naïve approach but works well for this simple use case.

  for (const key in partialHostnameToFilenameMapping) {
    if (partialHostnameToFilenameMapping.hasOwnProperty(key)) {
      const filename = partialHostnameToFilenameMapping[key];

      if (hostname.includes(key)) {
        return filename;
      }
    }
  }

  return defaultFilename;
}

// Duration is the duration of time to sleep for in milliseconds.
function sleep(duration: number): Promise<undefined> {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

function getWebsiteIconPathFromFilename(filename: string): string {
  return chrome.runtime.getURL(`images/apps/${filename}.svg`);
}

function handleToggleMuteButtonClick(tab: chrome.tabs.Tab) {
  if (tab) {
    const { audible, id } = tab;

    if (typeof id === 'undefined' || typeof audible === 'undefined') {
      return;
    }

    const muted = tab.mutedInfo?.muted === true;
    const updatedMutedValue = !muted;

    updateMutedState(id, updatedMutedValue);
  }
}

function updateMutedState(tabId: number, muted: boolean) {
  chrome.runtime.sendMessage({
    type: ActionTypes.TOGGLE_MUTE,
    data: { tabId, muted },
  });
}

function jumpToTab(tabId: number, windowId: number) {
  setFocussedWindow(windowId);
  setActiveTab(tabId);
}

function closeTab(tabId: number, onDone) {
  chrome.tabs.remove(tabId, onDone);
}

function setFocussedWindow(windowId: number) {
  chrome.runtime.sendMessage({
    type: ActionTypes.SET_FOCUSSED_WINDOW,
    data: windowId,
  });
}

function setActiveTab(tabId: number) {
  chrome.runtime.sendMessage({
    type: ActionTypes.SET_ACTIVE_TAB,
    data: tabId,
  });
}

function getTabs() {
  chrome.runtime.sendMessage({ type: ActionTypes.GET_TABS_REQUEST });
}

function dispatchToggleVisibilityAction() {
  chrome.runtime.sendMessage({
    type: ActionTypes.DISPATCH_TOGGLE_VISIBILITY,
  });
}

function transformIntoFuseResultLikeShape<T>(items: T[]): Fuse.FuseResult<T>[] {
  return items.map((item) => ({
    item,
    refIndex: -1,
  }));
}

function getHighlightedHTMLStrings<T>(
  fuseResult: Fuse.FuseResult<T>,
  className: string = 'highlight'
): Record<string, string> {
  const matches: readonly Fuse.FuseResultMatch[] | undefined =
    fuseResult.matches;
  const result: Record<string, string> = {};

  if (typeof matches === 'undefined') {
    return result;
  }

  for (const match of matches) {
    const { key, value, indices: regions } = match;

    if (typeof key === 'undefined' || typeof value === 'undefined') {
      continue;
    }

    let htmlString = '';
    let nextUnhighlightedRegionStartingIndex = 0;

    regions.forEach((region) => {
      const lastRegionNextIndex = region[1] + 1;

      htmlString += [
        value.substring(nextUnhighlightedRegionStartingIndex, region[0]),
        `<span class="${className}">`,
        value.substring(region[0], lastRegionNextIndex),
        '</span>',
      ].join('');

      nextUnhighlightedRegionStartingIndex = lastRegionNextIndex;
    });

    htmlString += value.substring(nextUnhighlightedRegionStartingIndex);

    result[key] = htmlString;
  }

  return result;
}

function getInitialReduxState(
  platformInfo: chrome.runtime.PlatformInfo
): IAppState {
  const { os } = platformInfo;

  // For some weird reason, the down arrow is rendering much bigger than the up
  // arrow. So inverting up arrow as a workaround 🤷🏼‍♂️.
  const keyboardShortcuts = [
    {
      label: `Toggle hare`,
      shortcut: `<kbd>${
        keyLabels[ModifierKey.META][os]
        }</kbd>+<kbd>shift</kbd>+<kbd>space</kbd>`,
    },
    {
      label: `Close hare`,
      shortcut: `<kbd>esc</kbd>`,
    },
    {
      label: `Jump back to previous tab`,
      shortcut: `<kbd>${
        keyLabels[ModifierKey.META][os]
        }</kbd>+<kbd>shift</kbd>+<kbd>U</kbd>`,
    },
    // {
    //   label: `Toggle <i>Audible Tabs Only</i> switch`,
    //   shortcut: `<kbd>${keyLabels[ModifierKey.META][os]}</kbd>+<kbd>S</kbd>`,
    // },
    // {
    //   label: `Jump to nth tab in the results`,
    //   shortcut: `<kbd>${keyLabels[ModifierKey.ALT][os]}</kbd>+<kbd>[1-9]</kbd>`,
    // },
    // {
    //   label: `Toggle mute for nth tab in the results`,
    //   shortcut: `<kbd>shift</kbd>+<kbd>[1-9]</kbd>`,
    // },
    {
      label: `Browse search list`,
      shortcut: `Up arrow <kbd><span>↑<span></kbd> & down arrow <kbd><span>↓<span></kbd>`,
    },
    {
      label: `Open highlighted tab`,
      shortcut: `<kbd>${keyLabels[ModifierKey.ENTER][os]}</kbd>`,
    },
    {
      label: `Close highlighted tab`,
      shortcut: `<kbd>${
        keyLabels[ModifierKey.ALT][os]
        }</kbd>+<kbd>c</kbd>`,
    },
    {
      label: `Select Multiple on list from mouse`,
      shortcut: `<kbd>shift</kbd>+<kbd>click</kbd>`,
    },
    {
      label: `Select Multiple on list from keyboard`,
      shortcut: `<kbd>shift</kbd>+<kbd>down arrow<kbd><span>↓<span></kbd></kbd> OR <kbd>shift</kbd>+<kbd>Up arrow<kbd><span>↑<span></kbd></kbd>`,
    },
    {
      label: `Toggle highlighted tab for selection/unselection`,
      shortcut: `<kbd>${
        keyLabels[ModifierKey.ALT][os]
        }</kbd>+<kbd>s</kbd>`,
    },
    {
      label: `Clear all Selection`,
      shortcut: `<kbd>${
        keyLabels[ModifierKey.ALT][os]
        }</kbd>+<kbd>x</kbd>`,
    },
    {
      label: `Toggle Keyboard shortcuts`,
      shortcut: `<kbd>${
        keyLabels[ModifierKey.ALT][os]
        }</kbd>+<kbd>k</kbd>`,
    },
  ];

  return {
    showAudibleTabsOnly: false,
    isChromeOnSteroidsVisible: false,
    searchInputValue: '',
    platformInfo,
    keyboardShortcuts,
  };
}

export {
  sleep,
  getFilenameFromURL,
  getWebsiteIconPathFromFilename,
  getTabs,
  handleToggleMuteButtonClick,
  dispatchToggleVisibilityAction,
  jumpToTab,
  closeTab,
  transformIntoFuseResultLikeShape,
  getInitialReduxState,
  getHighlightedHTMLStrings,
};
