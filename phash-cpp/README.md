# The Efficiency Layer: Native C++ Gatekeeper

This directory contains the `phash_bouncer` microservice. It is the absolute core of the project's "Optimized AI" philosophy.

While the Python PyTorch container handles the complex edge-case predictions, invoking a neural network is computationally expensive. To dramatically reduce the system's electrical overhead and memory footprint, this native C++ microservice acts as a highly optimized bouncer. It intercepts incoming images from the Java Gateway, computes a mathematical fingerprint, and checks it against a local cache. If it finds a match, the deep learning pipeline is entirely bypassed.

## Core Logic & Vision Math (`main.cpp`)

Instead of relying on multi-layered neural weights, this script uses fast, deterministic mathematics to evaluate images.

* **The Geometry Extraction (OpenCV):** When the binary image payload hits the server, the script uses OpenCV to strip out all color data (converting to grayscale) and crushes the image down to a microscopic 32x32 pixel grid. 
* **Discrete Cosine Transform (DCT):** The script then applies a `cv::dct` transformation and deliberately isolates just the top-left 8x8 matrix. In signal processing, the lowest frequencies gather in the top-left of a DCT matrix. By isolating this quadrant, the code extracts the fundamental geometric structure of the comic cover—completely ignoring high-frequency noise like minor text variations, color grading, or compression artifacts.
* **Fuzzy Logic (Hamming Distance):** Real-world photos are never perfect 1:1 pixel matches. The script connects to the PostgreSQL `spatial_db` via `libpqxx` and pulls down the known `locg_variants` hashes. It then calculates the Hamming distance between the newly generated 64-bit hash and the database hashes. If the distance is 10 bits or fewer, the system confidently declares a `cached_hit`.
* **Routing Telemetry:** It returns a structured JSON payload to the Java API Gateway dictating the `optimization_route`. A cache hit returns the variant ID instantly, while a miss forwards the generated hash along with the payload so the Python brain can take over.

## The Network Server (`httplib.h`)

To ensure this microservice remains as lightweight as possible, I avoided heavy C++ web frameworks (like Drogon or Crow). Instead, I utilized `cpp-httplib`—a powerful, header-only HTTP library. By including this single `.h` file, the compiled C++ binary is able to natively spin up a REST API listener on port `8081` to receive the multipart byte streams from the Java Gateway.

## Compilation & Containerization

Because C++ is a compiled language, the deployment architecture is significantly more rigid than Python or JavaScript.

* **`CMakeLists.txt`:** This is the build orchestration file. It mandates the C++17 standard and uses `pkg-config` to hunt down the required system dependencies (`libpqxx` for PostgreSQL and `OpenCV` for the vision math). It explicitly links these dynamic libraries to the final `phash_bouncer` executable so the binary doesn't throw a segmentation fault at runtime.
* **`Dockerfile`:** Because compiled C++ binaries are highly specific to the operating system they were built on, this service cannot just be run blindly. The Dockerfile pulls down a fresh `ubuntu:24.04` environment, uses `apt-get` to install the raw `g++` compiler, `cmake`, and all necessary development headers, and compiles the binary directly inside the container. It then exposes port `8081` to the internal Docker network.