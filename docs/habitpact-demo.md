# HabitPact portfolio demo

This is a Flutter web release built from kinshuk1456/HabitPact-new, shipaton commit 34a89321dab04c0702025154e3b5fffb20f1d6c9. It uses the actual screens, widgets, theme, brand assets, and DemoData from that revision. It replaces the earlier hand-written HTML recreation.

The portfolio-only entry point overrides demoModeProvider to true and omits Firebase initialization, auth bootstrap, FCM, and device-tracking hosts. Browser compatibility adds kIsWeb platform guards and an explicit Cupertino transition import. Sample pact creation and chat messages are held in memory; photo uploads, account deletion, and notification permissions are blocked or explained. No production backend or real accounts are used.

Built with Flutter 3.47.7 / Dart 3.13.5 using flutter build web --no-pub --target lib/portfolio_demo.dart --base-href /habitpact-app/ --no-wasm-dry-run. Compiled files live in src/pages/habitpact-app and are copied into dist by the existing build. The normal Flutter CanvasKit release runtime is loaded from Google's versioned CDN. No Dart source maps, .env, or Firebase configuration file is included. Preserve assets/NOTICES.

Open /habitpact-demo.html to launch. Reset unloads the iframe, discarding the in-memory session. The exact demo source and adaptation script are retained with the task deliverables for rebuilding.

Release transport: the original minified Flutter output is split into 96KB binary static assets to fit the connector review size. The small entry script assembles and verifies its SHA-256 before loading it. Compiled application bytes are unchanged. NOTICES uses gzip with an explicit Cloudflare _headers entry.
