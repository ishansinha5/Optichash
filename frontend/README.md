# Frontend Client: Edge Deployment & Telemetry

This directory contains the lightweight, zero-bloat presentation layer of the OpticHash pipeline. It handles user inputs, image pre-processing, and visualizes the complex routing logic of the backend architecture. 

## Core Web Application (HTML & JS)

The UI is built using strict, vanilla HTML and CSS to ensure maximum compatibility and near-instant load times across mobile and desktop devices without the overhead of heavy JavaScript frameworks.

* **`analyzer.html`:** The primary interface for the computer vision pipeline. It houses the file-upload inputs, the interactive hardware metrics dashboards, and the dynamic terminal logs. 
* **`scanner.js`:** Originally built to fire asynchronous `POST` payloads to the live Java endpoint, this file has been heavily refactored for our Vercel deployment into a **Stateful Architectural Simulator**. To strictly enforce the project's Green AI mandate and eliminate idle cloud compute costs, the live multi-container backend is currently hibernating. Instead, this script mimics the exact logic of the edge node:
    1. **Payload Analysis:** When an image is uploaded, it evaluates the asset or runs a localized Canvas Pixel Analysis (to bypass aggressive mobile OS filename stripping).
    2. **Stateful Routing:** It maintains a local `Set()` cache during the user's session. First-time uploads simulate a "Cache Miss" and a 2.5-second PyTorch cold-start latency. 
    3. **DOM Injection & Telemetry:** On subsequent uploads, the system registers a "Cache Hit," dropping the latency down to 45ms. It dynamically injects Green AI telemetry, updating the UI progress bars to demonstrate exactly how the C++ cache bypasses the PyTorch engine to conserve edge memory and electricity. 
    4. **Safety & Fallbacks:** If a live mobile camera photo or an unsupported asset is submitted, the script cleanly intercepts it, throws a realistic "Hibernation Timeout" terminal error, and gracefully directs the user to the verified resource kit.

## Styling & Assets

* **`assets/images/`:** Stores the local images for the frontend UI, including our background wallpapers, the localized comic covers for the simulation, and the visual scanning examples utilized in the modal overlay.
* **`styles.css`:** Built with sliding shader panels and heavy drop shadows to give the interface a stylized, physical depth while maintaining a strong graphic-novel aesthetic.

---

## The Legacy Architecture (Vercel Serverless Monolith)

As a learning progression, this project originally started as a monolithic web application for a local comic shop locator. All of the original code for this phase is preserved in the `legacy/` directory. Building this was an incredible learning experience in handling asynchronous API chains.

### Legacy Front-End
* `comicfinder.js` hooked directly into the browser's `navigator.geolocation` API. 
* To navigate store results, I integrated `Hammer.js` to enable mobile-native swipe gestures, serializing swiped store data into a JSON string and pushing it directly into the browser's `localStorage` for persistence.

### Legacy Backend
The frontend sent coordinate data to Vercel Serverless Functions acting as a proxy to protect Google Cloud API keys.
* **Multi-Strategy Routing (`find-stores.js`):** Executed an automated fallback loop through the Google Places API (`searchText`, `searchNearby`) and aggressively filtered results against an array of keywords (`manga`, `graphic`, `hobby`).
* **Asset Retrieval (`get-photos.js`):** Extracted the `photoreference` string and fetched raw binary image buffers from Google's media endpoint, caching the image for 24 hours to minimize API billing costs.