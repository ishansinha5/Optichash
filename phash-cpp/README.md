# The Efficiency Layer: Native C++ Gatekeeper

This directory contains the `phash_bouncer` microservice. It is the absolute core of the project's "Optimized AI" and Green Computing philosophy.

While the Python PyTorch container handles complex predictions, invoking a neural network is computationally expensive. To significantly reduce electrical overhead and memory footprint at the edge, this native C++ microservice acts as a highly optimized bouncer. It intercepts incoming images from the Java Gateway, computes a mathematical fingerprint, and checks it against a dynamic memory map in milliseconds.

## Core Logic & Spatial Mathematics (`main.cpp`)

Instead of relying on multi-layered neural weights, this script uses fast, deterministic mathematics to evaluate images. Writing this layer directly in C++ allowed for incredibly tight, low-level memory control.

* **The Geometry Extraction:** The script parses the incoming byte stream using OpenCV. It strips out all color data (converting to grayscale) and crushes the incoming image down to a microscopic 32x32 pixel grid. 
* **Discrete Cosine Transform (DCT):** It applies a `cv::dct` transformation to the grid and strictly isolates the top-left 8x8 matrix. This isolates the fundamental, low-frequency geometric structure of the comic cover—completely ignoring high-frequency noise like text variations, physical condition, or camera flash.
* **Dynamic Memory Map:** I upgraded the standard C++ `std::unordered_map` to store a custom `CacheEntry` struct. This struct holds both the comic's title string and the exact `flops_count` integer (compute cycles) required to run the image through the Python neural network. 
* **The Write-Back Receiver:** The `/api/cache-update` endpoint actively listens for POST requests from the Java Gateway. When the Python layer successfully evaluates a new comic, this C++ endpoint intercepts the new title and exact FLOP telemetry, dynamically pushing the new asset into the memory map without requiring a server reboot.

## The Network Server (`httplib.h`)

To ensure this microservice remains as lightweight as possible, I avoided heavy C++ web frameworks. I utilized `cpp-httplib`—a powerful, header-only HTTP library. By `#include`-ing this single `.h` file, the compiled C++ binary natively spins up a REST API listener on port `8081` to handle the multipart boundary parsing and payload extraction without any unnecessary framework bloat.

## Compilation & Containerization

* **`CMakeLists.txt`:** This build orchestration file mandates the C++17 standard and uses `pkg-config` to hunt down the required system dependencies (specifically OpenCV for the spatial math) during compilation.
* **`Dockerfile`:** The Dockerfile pulls down a fresh `ubuntu:24.04` environment. It uses `apt-get` to install the raw `g++` compiler, `cmake`, and the `libopencv-dev` libraries, compiling the binary directly inside the container. It then exposes port `8081` strictly to the internal Docker network.