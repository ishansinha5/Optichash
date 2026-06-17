# Frontend Client: Edge Deployment & Telemetry

This directory contains the lightweight, zero-bloat presentation layer of the OpticHash pipeline. It handles user inputs, image preprocessing, and direct asynchronous communication with the Java Spring Boot backend. 

## Core Web Application (HTML & JS)

The UI is built using strict, vanilla HTML to ensure maximum compatibility and near-instant load times across mobile devices.
* **`analyzer.html`:** The primary interface for the computer vision pipeline. It houses the file-upload and native mobile camera hooks. To ensure our dynamic telemetry updates are never blocked by aggressive browser caching, the linked JavaScript asset utilizes a cache-busting query string (e.g., `?v=2`).
* **`scanner.js`:** The bridge between the user's physical camera and the orchestrator engine. It executes a highly specific sequence of events:

1. **Payload Packaging:** The binary image is encapsulated inside a standard `FormData()` object.
2. **Asynchronous Communication:** The script fires an `await fetch` POST request to the live Java endpoint (`http://localhost:8080/process`). 
3. **Logic Branching & DOM Injection:** Once the JSON response is caught, the script evaluates the routing status:
   * *Success (Cache Hit):* If the backend returns `compute_cycles_saved > 0`, the JavaScript conditionally generates a Green AI Telemetry block. It formats the raw integer (e.g., 58631680) into a readable "58.6 Million FLOPs" string and dynamically injects an HTML sub-text explaining how the C++ cache bypassed the PyTorch engine to conserve electricity.
   * *Success (Cache Miss):* The UI renders a successful title match but indicates that 0 FLOPs were saved since the Python model had to execute the math.
   * *Error Handling:* If the backend triggers a low-confidence threshold rejection or flags the image as "generic background noise" (Junk Class), the script overrides the UI with a specific visual flag (e.g., Detective Chimp or a Confused Spider-Man) and displays a user-friendly scanning correction prompt.

## Styling & Assets

* **`assets/images/`:** Stores the local images for the frontend UI, including our background wallpapers and the visual scanning examples utilized in the modal overlay.
* **`styles.css`:** Built with sliding shader panels and heavy drop shadows to give the interface a stylized, physical depth while maintaining a strong graphic-novel aesthetic.

---

## The Legacy Architecture (Vercel Serverless Monolith)

As a learning progression, this project originally started as a monolithic web application for a local comic shop locator. All of the original code for this phase is preserved in the `legacy/` directory.

### Legacy Front-End
* `comicfinder.js` hooked directly into the browser's `navigator.geolocation` API. 
* To navigate store results, I integrated `Hammer.js` to enable mobile-native swipe gestures, serializing swiped store data into a JSON string and pushing it directly into the browser's `localStorage`.

### Legacy Backend
The frontend sent coordinate data to Vercel Serverless Functions acting as a proxy to protect Google Cloud API keys.
* **Multi-Strategy Routing (`find-stores.js`):** Executed an automated fallback loop through the Google Places API (`searchText`, `searchNearby`) and aggressively filtered results against an array of keywords (`manga`, `graphic`, `hobby`).
* **Asset Retrieval (`get-photos.js`):** Extracted the `photoreference` string and fetched raw binary image buffers from Google's media endpoint, caching the image for 24 hours to minimize API billing costs.