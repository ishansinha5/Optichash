# The Efficiency Layer: Native C++ Gatekeeper

This directory contains the `phash_bouncer` microservice. It is the absolute core of the project's "Optimized AI" philosophy.

While the Python PyTorch container handles complex predictions, invoking a neural network is computationally expensive. To reduce electrical overhead and memory footprint, this native C++ microservice acts as a highly optimized bouncer. It intercepts incoming images from the Java Gateway, computes a mathematical fingerprint, and checks it against a dynamic memory map. 

## Core Logic & Dynamic Telemetry (`main.cpp`)

Instead of relying on multi-layered neural weights, this script uses fast, deterministic mathematics to evaluate images.

* **The Geometry Extraction (OpenCV):** The script uses OpenCV to strip out all color data and crush the image down to a microscopic 32x32 pixel grid. 
* **Discrete Cosine Transform (DCT):** It applies a `cv::dct` transformation and isolates the top-left 8x8 matrix to extract the fundamental geometric structure of the comic cover—ignoring high-frequency noise like text variations or camera flash.
* **Dynamic Memory Map:** I upgraded the standard C++ `unordered_map` to store a custom `CacheEntry` struct. This struct holds both the comic's title and the exact FLOP count (compute cycles) required to run the image through the Python neural network. 
* **The Write-Back Receiver:** The `/api/cache-update` endpoint actively listens for POST requests from the Java Gateway. When the Python layer successfully evaluates a new comic, this C++ endpoint intercepts the new title and exact FLOP telemetry from Java, parsing the JSON integers to permanently memorize the asset in its RAM.

## The Network Server (`httplib.h`)

To ensure this microservice remains as lightweight as possible, I avoided heavy C++ web frameworks. I utilized `cpp-httplib`—a powerful, header-only HTTP library. By including this single `.h` file, the compiled C++ binary is able to natively spin up a REST API listener on port `8081` to receive the multipart byte streams.

## Compilation & Containerization

* **`CMakeLists.txt`:** This build orchestration file mandates the C++17 standard and uses `pkg-config` to hunt down the required system dependencies (`OpenCV` for the vision math). 
* **`Dockerfile`:** The Dockerfile pulls down a fresh `ubuntu:24.04` environment, uses `apt-get` to install the raw `g++` compiler, `cmake`, and compiles the binary directly inside the container. It then exposes port `8081` to the internal Docker network.