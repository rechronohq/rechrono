# Contributing

Rechrono is open source. Keep changes focused, tested, and consistent with the app patterns already in place.

## Task Menus

Timeline task menus and project-view task menus should stay aligned. Use the shared task action and row context menu helpers when adding, removing, or renaming task actions so the `...` menu and right-click context menu feel like the same app in both surfaces.

## Checks

Before opening a pull request, run:

```bash
composer test
npm run build
```
