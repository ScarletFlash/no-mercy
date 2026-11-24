---
'eslint-plugin-no-mercy': patch
---

fix: the `recommended` config registers the plugin object itself, so it can be combined with an explicit `plugins: { "no-mercy": plugin }` registration
