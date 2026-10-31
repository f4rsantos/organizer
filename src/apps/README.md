# Apps (plugins)

Each app is a self-contained module under `src/apps/<id>/` exporting a descriptor. Register it in `registry.js`.

## Descriptor shape

```js
export const myApp = {
  id: "my-app", // unique id, also the tab id if it has a tab
  labelKey: "myApp", // key in src/lib/strings/ (every locale)
  descKey: "myAppDesc", // one-line pitch shown in the Apps grid
  icon: SomeLucideIcon,
  keywordsKey: "myAppKeywords", // array of search words in src/lib/strings/ (every locale), used by Apps and settings search
  isEnabled: (state) => state.settings?.apps?.myApp === true,
  setEnabled: (updateSettings, apps, value, state) =>
    updateSettings({ apps: { ...apps, myApp: value } }),
  cleanup: (state) => state, // optional: extra erasing on disable for data kept outside owned slices (e.g. fields on shared tasks, localStorage)
  needsSetup: false, // true opens SettingsModal when switched on instead of enabling directly
  SettingsModal: MyAppModal, // settings for the enabled app, or null when there is nothing to configure
  tab: { id: "my-app", component: MyAppTab }, // or null for no navbar tab
};
```

## Register

Add to `APP_PLUGINS` in `registry.js`. AppsGrid, the navbar tab shell, search, and disable-wipe pick it up automatically — no other wiring needed.

## Data ownership

Switching an app off must leave no trace of its data. Apps do not write their own wipe: the core does it.

- Every persisted slice and every app-owned settings key is listed in `src/lib/appOwnership.js` with its owner (`core` or an app id).
- On disable, the store's `disableApp` resets everything the app owns to its initial value, then runs the app's optional `cleanup`.
- A slice not listed in `DATA_SLICES` is never persisted, and `tests/store/appOwnership.test.js` fails for any persisted slice without an owner, any unknown owner, and any app that leaves owned data behind after `disableApp`. New slices and settings keys therefore have to be claimed there to ship.

Onboarding is curated: only ids in `ONBOARDING_APP_IDS` (`registry.js`) are offered there, and that list is owned by the maintainers. A descriptor cannot opt itself in.

Community apps: open a PR adding `src/apps/<id>/` + the strings + the registry entry.
