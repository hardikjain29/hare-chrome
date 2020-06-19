import { connect, ConnectedProps } from 'react-redux';
import React, { createRef } from 'react';
import cx from 'classnames';
import Fuse from 'fuse.js';

import KeyboardShortcuts from 'src/components/KeyboardShortcuts/KeyboardShortcuts';
import NoResults from 'src/components/NoResults/NoResults';
import TabList from 'src/components/TabList/TabList';
import SearchBox from 'src/components/SearchBox/SearchBox';
import { updateIsChromeOnSteroidsVisibleFlagValue } from 'src/actions';
import { IAppState, ModeTypes } from 'src/types';
import {
  transformIntoFuseResultLikeShape,
  dispatchToggleVisibilityAction,
  closeTab,
} from 'src/utils';
import { fuseOptions } from 'src/config';
import {
  ActionTypes,
  AUDIBLE_TABS_POLL_FREQUENCY_IN_MS,
  consoleCommands,
  mousetrapKeyMappings,
  ModifierKey,
  keyLabels
} from 'src/constants';

import styles from './Root.css';

const mapState = (state: IAppState) => ({
  showAudibleTabsOnly: state.showAudibleTabsOnly,
  isChromeOnSteroidsVisible: state.isChromeOnSteroidsVisible,
  platformInfo: state.platformInfo,
});

const mapDispatch = {
  updateIsChromeOnSteroidsVisibleFlagValue,
};

const connector = connect(mapState, mapDispatch);

type PropsFromRedux = ConnectedProps<typeof connector>;

export interface IRootProps {
  isEmbedded?: boolean;
}

type TAllProps = PropsFromRedux & IRootProps;

export interface IRootState {
  searchInputValue: string;
  modeType: ModeTypes;
  recentlyAudibleTabs: Fuse.FuseResult<chrome.tabs.Tab>[];
  recentlyAudibleTabsFuzzySearchResults: Fuse.FuseResult<chrome.tabs.Tab>[];
  tabs: Fuse.FuseResult<chrome.tabs.Tab>[];
  fuzzySearchResults: Fuse.FuseResult<chrome.tabs.Tab>[];
  consoleModeFuzzySearchResults: Fuse.FuseResult<string>[];
}

export class Root extends React.Component<TAllProps, IRootState> {
  private consoleModeFuse = new Fuse<string, {}>(consoleCommands);
  private recentlyAudibleTabsFuse = new Fuse<chrome.tabs.Tab, {}>(
    [],
    fuseOptions
  );
  private fuse = new Fuse<chrome.tabs.Tab, {}>([], fuseOptions);
  private pollingItervalId: NodeJS.Timeout | null = null;
  private containerRef = createRef<HTMLDivElement>()

  constructor(props: TAllProps) {
    super(props);

    this.state = {
      searchInputValue: '',
      modeType: ModeTypes.DEFAULT,
      recentlyAudibleTabs: [],
      recentlyAudibleTabsFuzzySearchResults: [],
      tabs: [],
      fuzzySearchResults: [],
      consoleModeFuzzySearchResults: [],
      multipleHighlights: [],
      showShortcuts: false,
    };
  }

  componentDidMount() {
    const { updateIsChromeOnSteroidsVisibleFlagValue } = this.props;

    // TODO Not quite sure why this has to be done. But without causing this
    // forced deferred execution, the invisible to visible CSS transitions
    // aren't working. Need to investigate this.
    setTimeout(() => {
      updateIsChromeOnSteroidsVisibleFlagValue(true);
    }, 0);

    this.registerListeners();
    this.getTabs();
  }

  componentDidUpdate(prevProps: TAllProps) {
    if (prevProps.showAudibleTabsOnly !== this.props.showAudibleTabsOnly) {
      this.getTabs();
    }
  }

  toggleShotcuts = () => {
    this.setState({
      showShortcuts: !this.state.showShortcuts,
    })
  }

  closeShortcuts = () => {
    this.setState({
      showShortcuts: false,
    })
  }

  toggleMultipleHighLights = (id) => {
    const { multipleHighlights } = this.state;
    const isIdAvailable = multipleHighlights.find((highlight) => highlight === id);
    let newMultipleHighlights = [];
    if (isIdAvailable) {
      newMultipleHighlights = multipleHighlights.filter((highlight) => highlight !== id);
    } else {
      newMultipleHighlights = [...multipleHighlights, id];
    }
    this.setState({
      multipleHighlights: newMultipleHighlights,
    },
      () => console.log(this.state.multipleHighlights)
    )
  }

  private handleTabClose = () => {
    const { multipleHighlights } = this.state;

    closeTab(multipleHighlights, () => {
      this.setState({ multipleHighlights: [] });
      setTimeout(() => {
        this.getTabs();
      }, 100);
    });
  };

  private registerListeners() {
    const { platformInfo: { os } } = this.props;
    Mousetrap.bind('esc', () => {
      dispatchToggleVisibilityAction();
    });

    Mousetrap.bind(`${mousetrapKeyMappings[ModifierKey.ALT][os]}+c`, (e) => {
      e.preventDefault();
      this.onClearClicked();
    });

    // Shortcut for listing keyboard shortcuts
    const key = `${mousetrapKeyMappings[ModifierKey.ALT][os]}+k`;
    Mousetrap.bind(key, this.toggleShotcuts);

    chrome.runtime.onMessage.addListener((request) => {
      const { type } = request;

      switch (type) {
        case ActionTypes.TOGGLE_VISIBILITY: {
          this.togglePopupContainerVisibility();

          break;
        }

        case ActionTypes.GET_TABS_SUCCESS: {
          const { searchInputValue } = this.state;
          const {
            data: { allTabs: tabs, recentlyAudibleTabs },
          } = request;
          this.fuse = new Fuse(tabs, fuseOptions);
          this.recentlyAudibleTabsFuse = new Fuse(
            recentlyAudibleTabs,
            fuseOptions
          );

          if (this.state.searchInputValue.trim() !== '') {
            this.setState({
              recentlyAudibleTabs: transformIntoFuseResultLikeShape(
                recentlyAudibleTabs
              ),
              recentlyAudibleTabsFuzzySearchResults: this.recentlyAudibleTabsFuse.search<
                chrome.tabs.Tab
              >(searchInputValue),
              tabs: transformIntoFuseResultLikeShape(tabs),
              fuzzySearchResults: this.fuse.search<chrome.tabs.Tab>(
                searchInputValue
              ),
            });
          } else {
            this.setState({
              recentlyAudibleTabs: transformIntoFuseResultLikeShape(
                recentlyAudibleTabs
              ),
              recentlyAudibleTabsFuzzySearchResults: [],
              tabs: transformIntoFuseResultLikeShape(tabs),
              fuzzySearchResults: [],
            });
          }

          break;
        }

        // This is not being used right now, as the polling takes care of
        // updating the state.
        case ActionTypes.MUTE_TOGGLED: {
          this.getTabs();

          break;
        }
      }
    });
  }

  // TODO: This is an unused method. I am still not decided on whether polling
  // is a good idea. So letting this stay for the time being. Decide on this soon.
  private startPollingAudibleTabs() {
    this.pollingItervalId = setInterval(
      this.getTabs,
      AUDIBLE_TABS_POLL_FREQUENCY_IN_MS
    );
  }

  private getTabs() {
    chrome.runtime.sendMessage({ type: ActionTypes.GET_TABS_REQUEST });
  }

  private togglePopupContainerVisibility() {
    const {
      updateIsChromeOnSteroidsVisibleFlagValue,
      isChromeOnSteroidsVisible,
    } = this.props;

    updateIsChromeOnSteroidsVisibleFlagValue(!isChromeOnSteroidsVisible);
  }

  private onSearchBoxInputChange = (value: string) => {
    const trimmedSearchInputValue = value.trim();
    const startsWithRightAngleBracket =
      trimmedSearchInputValue.indexOf('>') === 0;
    // const modeType = startsWithRightAngleBracket
    //   ? ModeTypes.CONSOLE
    //   : ModeTypes.DEFAULT;
    const modeType = ModeTypes.DEFAULT;

    this.setState(
      {
        searchInputValue: value,
        modeType,
      },
      () => {
        if (this.state.modeType === ModeTypes.DEFAULT) {
          this.getTabs();
        } else {
          const trimmedSearchInputValue = this.state.searchInputValue.trim();
          const consoleModeSearchQuery = trimmedSearchInputValue.substring(1);
          const consoleModeFuzzySearchResults = this.consoleModeFuse.search(
            consoleModeSearchQuery
          );

          this.setState({
            consoleModeFuzzySearchResults,
          });
        }
      }
    );
  };

  private getActualSearchQuery(): string {
    const { modeType, searchInputValue } = this.state;
    const trimmedSearchInputValue = searchInputValue.trim();

    if (modeType === ModeTypes.CONSOLE) {
      const consoleModeSearchQuery = trimmedSearchInputValue.substring(1);

      return consoleModeSearchQuery;
    } else {
      return trimmedSearchInputValue;
    }
  }

  private areFiltersApplied(): boolean {
    const { modeType } = this.state;
    const { showAudibleTabsOnly } = this.props;
    const actualSearchQuery = this.getActualSearchQuery();

    if (modeType === ModeTypes.CONSOLE) {
      return actualSearchQuery.length > 0;
    } else {
      return actualSearchQuery.length > 0 || showAudibleTabsOnly;
    }
  }

  private getResultsComponent(): React.ReactNode | null {
    const { modeType, multipleHighlights } = this.state;
    const areFiltersApplied = this.areFiltersApplied();
    const actualSearchQuery = this.getActualSearchQuery();
    const isSearchQueryPresent = actualSearchQuery.length > 0;

    if (modeType === ModeTypes.CONSOLE) {
      const { consoleModeFuzzySearchResults } = this.state;
      const nonEmptyResults = consoleModeFuzzySearchResults.length > 0;

      return nonEmptyResults ? (
        <KeyboardShortcuts closeShortcuts={this.closeShortcuts} />
      ) : areFiltersApplied ? (
        <NoResults modeType={modeType} />
      ) : null;
    } else {
      const {
        tabs,
        fuzzySearchResults,
        recentlyAudibleTabs,
        recentlyAudibleTabsFuzzySearchResults,
      } = this.state;
      const { showAudibleTabsOnly } = this.props;

      const filteredTabs = (isSearchQueryPresent
        ? fuzzySearchResults
        : tabs
      ).filter((item) => !showAudibleTabsOnly || item.item.audible);

      const filteredRecentlyAudibleTabs = showAudibleTabsOnly
        ? isSearchQueryPresent
          ? recentlyAudibleTabsFuzzySearchResults
          : recentlyAudibleTabs
        : [];

      const nonEmptyResults =
        filteredTabs.length > 0 || filteredRecentlyAudibleTabs.length > 0;

      return nonEmptyResults ? (
        <TabList
          tabs={filteredTabs}
          multipleHighlights={multipleHighlights}
          toggleMultipleHighLights={this.toggleMultipleHighLights}
          recentlyAudibleTabs={filteredRecentlyAudibleTabs}
        />
      ) : areFiltersApplied ? (
        <NoResults modeType={modeType} />
      ) : null;
    }
  }

  private onClearClicked = () => {
    this.setState({ multipleHighlights: [] });
  }

  public render() {
    const { multipleHighlights, showShortcuts, searchInputValue = '' } = this.state;
    const { isChromeOnSteroidsVisible, isEmbedded = false, platformInfo: { os } } = this.props;
    const resultsComponent = this.getResultsComponent();
    const resultsSectionVisible = resultsComponent !== null;
    const shortcutString = `${keyLabels[ModifierKey.ALT][os]} + k`

    return (
      <div
        // onClick={dispatchToggleVisibilityAction}
        className={cx([
          styles['container'],
          {
            [styles['visible']]: isChromeOnSteroidsVisible,
            [styles['full-screen-mode']]: !isEmbedded,
            [styles['embed']]: isEmbedded,
          },
        ])}
        ref={this.containerRef}
        onClick={e => {
          if (e.target === this.containerRef.current) {
            dispatchToggleVisibilityAction()
          }
        }}
      >
        <div className={styles['popup-container']}>
          <div className={styles['popup']}>
            {
              !showShortcuts ? (
                <>
                  <SearchBox
                    className={cx({
                      [styles['results-section-visible']]: resultsSectionVisible,
                    })}
                    onSearchBoxInputChange={this.onSearchBoxInputChange}
                    defaultSearchInputValue={searchInputValue}
                  />
                  {resultsComponent}
                  {
                    multipleHighlights.length ? (
                      <div className={cx([
                        styles['multiple-section'],
                        {
                          [styles['multiple-section-visible']]: multipleHighlights.length,
                        }
                      ])}>
                        <div className={styles['tabs-selection-container']}>
                          <div className={styles['actions-info']}>{multipleHighlights.length} tabs selected</div>
                          <div className={styles['clear-container']} onClick={this.onClearClicked}>
                            <div className={styles['clear']}><svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M10.1854 10.8146L11.1283 9.87174L22.442 21.1854L21.4992 22.1283L10.1854 10.8146Z" fill="#C4C4C4" />
                              <path d="M11.1283 22.1283L10.1854 21.1854L21.4992 9.87174L22.442 10.8145L11.1283 22.1283Z" fill="#C4C4C4" />
                            </svg></div>
                            <div className={styles['clear-text']}>Clear</div>
                          </div>
                        </div>
                        <div>
                          <div className={styles['multiple-actions-container']}>
                            <div className={styles['tab-close-button']} onClick={this.handleTabClose}>close tabs</div>
                          </div>
                        </div>
                      </div>
                    ) : null
                  }
                </>
              ) : (
                  <>
                    <div className={cx(styles['popup-title'])}>Keyboard Shortcuts</div>
                    <KeyboardShortcuts closeShortcuts={this.closeShortcuts} />
                  </>
                )
            }
          </div>
          <div className={styles['extension-actions']}>
            <div onClick={this.toggleShotcuts} className={styles['extension-actions-shortcut']}> Toggle shortcuts ({shortcutString})</div>
            <a href="https://twitter.com/hardikjain29" target="_blank" className={styles['author']}>made by Hardik</a>
          </div>
        </div>
      </div>
    );
  }
}

export default connector(Root);
