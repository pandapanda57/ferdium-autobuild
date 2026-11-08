# ferdium-autobuild

**Unofficial personal builds of [Ferdium](https://github.com/ferdium/ferdium-app). Not affiliated with the Ferdium project.**

This repository holds only a GitHub Actions workflow and a few patch files. Every 6 hours the workflow checks for a new Electron patch release and, when there is one, rebuilds the newest official Ferdium release on it for Windows x64, then publishes the installer here as a release.

What each build changes compared with official Ferdium:

- **Electron** moved to the newest patch of a chosen major version (currently 45), for security fixes.
- **npm packages:** patch/minor security updates forced for shipped packages, including tar 7.
- **Patches** in `.github/patches/`:
  - clipboard handler for the Electron 44+ clipboard API
  - recipe unpacking without `preservePaths`
  - a token check on Ferdium's built-in local server that rejects requests before body parsing

Every build runs Ferdium's lint and tests, a real-framework test of the local-server token check, and a check that no known-vulnerable package version remains, before anything is published.

Builds are **unsigned**. Install them only if you understand what that means.
