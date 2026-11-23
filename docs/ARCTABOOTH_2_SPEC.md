# ArctaBooth 2.0 — Implementation specification

Status: approved by product owner, implementation pending. This document is a contract, not a claim that features are live.

## Session state machine
- FRAME_SELECTION: max 120 seconds. User chooses built-in/uploaded frame, sees auto-detected slots, can correct their geometry/order, and may advance early.
- PHOTO_SESSION: 300 seconds, starts when user advances or selection timer expires. User presses Start for EACH shot, waits 3-second countdown, reviews photo, then Insert or Retake. Insert saves to gallery and fills next unassigned logical slot; after full, new shots still go into gallery. Do not auto-shoot again.
- FINISHING: 120 seconds, starts when photo timer expires or user explicitly ends. User replaces any slot from gallery, adjusts crop, and previews result. At timeout freeze final composition and generate assets.
- RESULT: show downloads and upload status; QR is shown only after successful upload and public link confirmation.

## Slot mapping
- Frame geometry is determined independently of photo count. 6/8 green areas may represent 3/4 unique captures, respectively.
- Detect and group spatial slots, sort within each column top-to-bottom. For two-column layouts fill left ascending, right descending using same photos.
- For other layouts, provide user-editable slot mapping; never assume geometry without correction controls.
- Overlay original frame art ABOVE photographs, preserving any decoration overlapping photo openings. For arbitrary uploads, offer editable masks if automatic green-key segmentation fails.

## Media
- Camera permission required. Audio disabled for video capture.
- Record the full 5-minute photo session as video, with clear recording indicator and consent, browser MediaRecorder support detection and fallback.
- For each Start press, capture a 3-second GIF clip around the shutter event, and also create a photo-sequence GIF. Avoid claiming GIF/video succeeded before generation completes.
- Prevent resource leaks; stop tracks/recorder on end/unmount; use browser memory carefully. Warn users before leaving page.
- Keep photos accessible for download even if cloud upload fails.

## Cloud and privacy
- Backend-controlled Google Drive upload; NEVER expose credentials/service-account secrets in client-side JS.
- One folder per session; upload final strip, all accepted photos, GIFs, and video. Confirm upload before publishing QR.
- Configure folder access to anyone-with-link viewer only with explicit consent. Explain that link holders can access the content.
- Session expiration/deletion policy, file-size quotas, retries, and upload progress must be defined before production.
- Google Drive ChatGPT connector access is not a replacement for backend OAuth/service-account credentials or unattended production uploads.

## Delivery phases
1. Refactor frame selection before camera, timed session state machine, manual capture/insert/retake, unlimited gallery, adaptive slot mapping, finishing UI.
2. GIF/video recording, generation and download, cross-browser fallbacks.
3. Secure Drive backend integration, sharing, QR, retention and error handling.
4. End-to-end browser testing, accessibility, mobile camera testing, deployment verification.

## Acceptance checks
- 8-slot frame: captures 1,2,3,4 render left top-to-bottom, right 4,3,2,1.
- 6-slot frame: captures 1,2,3 render left top-to-bottom, right 3,2,1.
- 9+ photos during a 5-minute session remain selectable at finishing.
- 2-minute finishing timeout finalizes without silently losing data.
- Decorative foreground always overlays photographs.
- QR never links to a nonexistent or private folder.
