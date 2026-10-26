---
title: Code signing
last_reviewed: 2026-10-25
owner: Miku (weekly review)
---

# Code signing

Release builds are **unsigned** for now. CI signs automatically only when the secrets below exist; otherwise the signing steps are skipped. Nothing has been bought or applied for.

## What users see without signing

- **Windows:** SmartScreen says "Windows protected your PC". Choose *More info*, then *Run anyway*.
- **macOS:** Gatekeeper says the app "cannot be opened because the developer cannot be verified". Right-click (Control-click) the app, choose *Open*, then *Open*. On macOS 15 and later you may need System Settings, Privacy & Security, *Open Anyway*.
- **Linux:** AppImage needs `chmod +x`. Flatpak from Flathub is built and signed by Flathub.
- **Android:** the APK is signed with our release key (required for install). Users enable "Install unknown apps" for their browser or file manager.

## Windows options

1. **SignPath Foundation**: free code signing for qualifying open-source projects. Apply at https://signpath.org/ with a public repo, an OSI licence and CI builds. Secrets: `SIGNPATH_API_TOKEN`, `SIGNPATH_ORGANIZATION_ID`.
2. **Azure Artifact Signing** (formerly Trusted Signing): US$9.99 per month (Basic, 5,000 signatures, then US$0.005 each). Individual developers must be in the United States or Canada, need a paid Azure subscription, and an Azure billing account of type Individual whose legal name and address match government ID. Sources: https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart and https://azure.microsoft.com/en-us/products/artifact-signing. Secrets: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_SIGNING_ENDPOINT`, `AZURE_SIGNING_ACCOUNT`, `AZURE_CERT_PROFILE`.

Microsoft notes signing does not give instant SmartScreen trust; reputation builds over consecutive signed releases.

## macOS

Apple Developer Program, US$99 per year. Create a *Developer ID Application* certificate, export it as .p12, and notarize with `notarytool`. Secrets used by tauri-action: `APPLE_CERTIFICATE` (base64 .p12), `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD` (app-specific password), `APPLE_TEAM_ID`.

## Android

Keystore stored only as GitHub secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Keep a backup in a password manager (Bitwarden). Losing it means users must uninstall to update.
