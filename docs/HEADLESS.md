---
title: Headless roadmap
last_reviewed: 2026-10-25
owner: Miku (weekly review)
---

# Headless roadmap (low priority)

Goal: Miku runs on home hardware with no screen and no babysitting. Times are rough estimates. "Manual" lists the steps that need Bowie's hands or approval.

| Stage | What | Exit criteria | Rough time | Manual steps |
| --- | --- | --- | --- | --- |
| C0 Staging PWA | Public static build on HTTPS | URL passes smoke, axe and zero-request tests | 1 evening | Create GitHub repo, enable Pages |
| C1 Network | Tailscale on every device, HTTPS names via `tailscale serve` | Phone reaches app over HTTPS at home and away | 1-2 h | Approve each device sign-in |
| C2 Pi appliance | Raspberry Pi OS Lite + cloud-init, Docker Compose, systemd watchdog, read-only overlayfs | Pi survives 20 power pulls; boots to working voice satellite | 1 day | Flash SD card, plug in mic and speaker |
| C3 CyberPower brain | Ollama as a service, wake-on-LAN, idle sleep after N minutes | Wake from app, answer, sleep again; fallback when asleep | 1 day | Enable WoL in BIOS, choose OS |
| C4 Auto-updates | Pinned images, staged update, health check, automatic rollback | Bad update rolls back by itself | 1 day | Approve update window |
| C5 Self-heal and monitoring | systemd `Restart=on-failure`, Docker healthchecks, Uptime Kuma, weekly local status report | A killed service restarts; weekly report is read aloud or captioned | half day | Choose where the report goes |
| C6 Power and optimisation | Smaller models, quantisation, sleep schedules, measure watts | Idle draw measured and documented | half day | Smart plug or meter reading |
| C7 Fully headless | Everything above, no screen | 30 days with no manual fix | ongoing | none |
