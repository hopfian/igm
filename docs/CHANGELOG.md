# Changelog

All notable changes to the IGM (Instagram Terminal) project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

For any questions regarding version updates, contact **step-wizard-spill@duck.com**.

## [Unreleased]

### Added
- **Visuals & Badges**: Integrated `shields.io` tech-stack badges (TypeScript, Playwright, Node.js) to the main README.
- **Mermaid Flowcharts**: Added architectural and PR workflow diagrams to `README.md` and `CONTRIBUTING.md`.
- **GitHub Alerts**: Upgraded documentation warnings and notes to native GitHub alert blocks.
- **Project Policies**: Introduced `CODE_OF_CONDUCT.md`, `SECURITY.md`, and an elaborated `LICENSE`.
- **CI/CD Pipeline**: Configured GitHub Actions (`.github/workflows/ci.yml`) for automated linting, type verification, testing, and executable building across all OS platforms.

## [1.0.0] - 2026-08-22

### Added
- **Terminal UI (TUI)**: Fully interactive, split-pane Blessed dashboard for real-time Inbox and Timeline monitoring.
- **IDMU Automation**: Headless Playwright orchestration to systematically unsend DMs via DOM manipulation, entirely bypassing API rate limits.
- **Anti-Detection Engine**: Implemented `got-scraping` for Chrome TLS impersonation, dynamic rollout hash scraping, and Box-Muller log-normal request timing.
- **Core CLI Router**: Comprehensive Yargs command suite covering Auth, Dashboard, Discover, DM, Engage, Identity, Media, and Read modules.
- **Configuration Manager**: XDG-compliant multi-profile authentication using `Conf`.
- **Cross-Platform Bundling**: `esbuild` and `tsup` configuration for compiling the userscript and standalone Node executables.

### Fixed
- Stabilized recursive DOM traversal in IDMU `DefaultStrategy` to prevent React virtual DOM layout thrashing.
