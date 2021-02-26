## Highlights

- Gives a familiar macOS Spotlight like interface to quickly jump between tabs across windows.
- Jump to a tab and quickly return to where you were for replying to that quick message or changing a song.
- Fuzzy search in all the open tabs across windows. Search on the title or URL of the tabs.
- Quickly mute-unmute tabs from a filtered down list of tabs which are audible.
- See the tabs which aren't audible now but were a while back. This is useful for times like when you want to reply to a message you got a couple of minutes back.
- Highly accessible. Completely navigable usable just your keyboard.
- Keyboard shortcuts for switching to a tab, toggling mute of a tab, jumping back to the last tab, etc.

## Setup for local development

Clone the repo.
In the root of the cloned repo run the following commands,

`npm install`

`npm run watch` This will keep the files in _dist_ directory updated.

### Installing the extension

1. Open the Extension Management page by navigating to _chrome://extensions_.

- The Extension Management page can also be opened by clicking on the Chrome menu, hovering over **More Tools** then select **Extensions**.

2. Enable Developer Mode by clicking the toggle switch next to **Developer mode**.
3. Click the **LOAD UNPACKED** button and select the extension directory.

<img src="https://user-images.githubusercontent.com/36832784/79633430-23d3bf80-8183-11ea-880b-1e171827f22e.png" width="512">

After making any changes press the reload button on the extension card on _chrome://extensions_ page.


Build instructions:
For development
1) `npm install`
2) `npm run watch` This will keep the files in _dist_ directory updated.

To build it for adding it to the firefox:
1) npm run build
2) Run command `node build/create-archive.js`, this will output a zip file in the `chrome-extension-archive` folder which can be used to add to the firefox.