# winget manifest (draft, not submitted)

Fill in after a real GitHub release exists. Generate with the official tool so the
hash is computed from the real file:

```powershell
wingetcreate new https://github.com/BowieMoonenTTV/miku-home/releases/download/v0.1.0/Miku.Home_0.1.0_x64-setup.exe
```

Identifier: `BowieMoonenTTV.MikuHome`. Validate with `winget validate <folder>` before
opening a PR on microsoft/winget-pkgs. Unsigned installers may get SmartScreen warnings;
see `docs/signing.md`.
