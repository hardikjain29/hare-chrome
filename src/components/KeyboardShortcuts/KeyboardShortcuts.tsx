import { connect, ConnectedProps } from 'react-redux';
import * as React from 'react';
import cx from 'classnames';

import { iconUrls } from 'src/constants';
import { IAppState } from 'src/types';

import styles from './KeyboardShortcuts.css';

const mapState = (state: IAppState) => ({
  keyboardShortcuts: state.keyboardShortcuts,
});

const connector = connect(mapState);

type PropsFromRedux = ConnectedProps<typeof connector>;

export interface IKeyboardShortcutsProps {
  className?: string;
}

type TAllProps = PropsFromRedux & IKeyboardShortcutsProps;

export class KeyboardShortcuts extends React.PureComponent<TAllProps> {
  public render() {
    const { keyboardShortcuts, className, closeShortcuts } = this.props;

    return (
      <div className={cx(styles['keyboard-shortcuts'], className)}>
        {
          closeShortcuts ? (
            <div onClick={closeShortcuts} className={styles['close-shortcuts-menu']}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.1854 10.8146L11.1283 9.87174L22.442 21.1854L21.4992 22.1283L10.1854 10.8146Z" fill="#C4C4C4" />
                <path d="M11.1283 22.1283L10.1854 21.1854L21.4992 9.87174L22.442 10.8145L11.1283 22.1283Z" fill="#C4C4C4" />
              </svg>
            </div>
          ) : null
        }
        <table>
          <tbody>
            {keyboardShortcuts.map((item, index) => {
              return (
                <tr className={styles['list-item']} key={index}>
                  <td
                    dangerouslySetInnerHTML={{
                      __html: item.label,
                    }}
                  ></td>
                  <td
                    dangerouslySetInnerHTML={{
                      __html: item.shortcut,
                    }}
                  ></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

export default connector(KeyboardShortcuts);
