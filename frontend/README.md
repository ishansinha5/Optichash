# Frontend Client: Edge Deployment & Telemetry

This directory contains the lightweight, zero-bloat presentation layer of the OpticHash pipeline. It handles user inputs, image pre-processing, and visualizes the complex routing logic of the backend architecture. 

The UI is built using strict, vanilla HTML and CSS to ensure maximum compatibility and near-instant load times across mobile and desktop devices without the overhead of heavy JavaScript frameworks.

---

## 1. The Original Live Architecture (Ideal State)
*The architecture designed for local orchestration and live edge-node integration.*

* **`analyzer.html`:** The primary interface housing the file-upload and native mobile camera hooks (`<input type="file" capture="environment">`).
* **`scanner.js` (Live Mode):** The bridge between the user's physical camera and the orchestrator engine. It executes a highly specific sequence of events:
    1. **Payload Packaging:** The binary image is encapsulated inside a standard `FormData()` object.
    2. **Asynchronous Communication:** The script fires an `await fetch` POST request to the live Java endpoint (`http://localhost:8080/process`). 
    3. **Logic Branching & DOM Injection:** Once the JSON response is caught, the script evaluates the routing status:
        * *Success (Cache Hit):* If the backend returns `compute_cycles_saved > 0`, the JavaScript conditionally generates a Green AI Telemetry block. It formats the raw integer (e.g., 58631680) into a readable "58.6 Million FLOPs" string and dynamically injects an HTML sub-text explaining how the C++ cache bypassed the PyTorch engine to conserve electricity.
        * *Success (Cache Miss):* The UI renders a successful title match but indicates that 0 FLOPs were saved since the Python model had to execute the inference.
        * *Error Handling:* If the backend triggers a low-confidence threshold rejection (<75%) or flags the image as "generic background noise" (Junk Class), the script overrides the UI with a specific visual flag (e.g., Detective Chimp or a Confused Spider-Man) and displays a user-friendly scanning correction prompt.

---

## 2. The Current Vercel Architecture (Stateful Simulator)
*The architecture currently live on the portfolio site, modified to bypass cloud compute constraints.*

To strictly enforce the project's Green AI mandate and eliminate idle cloud compute costs, the live multi-container backend is currently hibernating. `analyzer.html` and `scanner.js` have been heavily refactored into a **Stateful Architectural Simulator** that mimics the exact logic of the edge node natively inside the user's browser.

* **Mobile vs. Web UI Adapters:** Standard desktop web browsers retain the original file-upload flow. For mobile testing, CSS media queries are used to dynamically hide unsupported assets and introduce a localized "Scan Comic" button that cleanly intercepts live camera feeds with a "Compute Hibernating" modal.
* **Canvas Pixel Analysis:** Because iOS and Android operating systems aggressively strip original filenames and EXIF metadata when saving images to the local camera roll, standard string-routing failed. To fix this, I engineered a localized HTML5 Canvas fallback. The script draws the uploaded image to a 64x64 grid and executes a localized spatial algorithm:
    * It calculates the geometric aspect ratio to detect extreme perspective skew.
    * It measures relative RGB hue clusters to identify the dominant color palette (e.g., flagging the heavy blues in Nightwing vs. the warm reds in Batman).
    * It divides the Red channel into spatial quadrants (`q1_r / q3_r`) to map physical blockages (like a thumb holding the comic) versus flat digital scans.
* **Stateful Routing:** Once the Canvas identifies the asset, the JavaScript maintains a local `Set()` cache during the user's session. First-time uploads simulate a "Cache Miss" and a 2.5-second PyTorch cold-start latency. 
* **Telemetry Injection:** On subsequent uploads, the system registers a "Cache Hit," dropping the latency down to 45ms. It dynamically injects Green AI telemetry, updating the UI progress bars to demonstrate exactly how the C++ cache bypasses the PyTorch engine.

---

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