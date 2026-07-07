# Apps (plugins)

Each app is a self-contained module under `src/apps/<id>/` exporting a descriptor. Register it in `registry.js`.

## Descriptor shape

```js
export const myApp = {
  id: 'my-app',                 // unique id, also the tab id if it has a tab
  labelKey: 'myApp',            // key in src/lib/strings.js (en + pt)
  icon: SomeLucideIcon,
  keywords: ['search', 'terms'],// used by the Apps search bar
  isEnabled: state => state.settings?.apps?.myApp === true,
  setEnabled: (updateSettings, apps, value, state) =>
    updateSettings({ apps: { ...apps, myApp: value } }),
  wipe: state => ({ ...state, myAppData: [] }), // erase this app's data on disable
  SettingsModal: MyAppModal,     // dialog: ({ open, onOpenChange }) => ...
  tab: { id: 'my-app', component: MyAppTab }, // or null for no navbar tab
}
```

## Register

Add to `APP_PLUGINS` in `registry.js`. AppsGrid, the navbar tab shell, search, and disable-wipe pick it up automatically — no other wiring needed.

Community apps: open a PR adding `src/apps/<id>/` + the strings + the registry entry.
