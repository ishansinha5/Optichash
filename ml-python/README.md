# The Edge Neural Brain: Python Machine Learning Engine

This directory houses the core vision logic of the OpticHash pipeline. 

Deploying an image classifier is relatively easy with unlimited cloud compute. However, as a student building a proof of concept, I wanted to architect this microservice around strict, artificial hardware constraints. This directory contains a Python pipeline that aggressively compresses mathematical weights, calculates its own computational footprint, and serves inferences via a lightweight API.

## Model Architecture & Self-Aware Telemetry

* **`core/model.py`:** This file defines the `GreenComicVision` class. To keep the memory footprint low, I utilized a `mobilenet_v3_small` backbone, replacing its 1,000-class default configuration with a highly targeted linear output mapping directly to our specific comic catalog.
* **The Optimization Engine:** In `main.py`, the PyTorch model undergoes an aggressive structural crunch using `torchao` dynamic INT8 quantization. This mathematically compresses the 32-bit floating-point parameters down to 8-bit dynamic integers, drastically reducing the required RAM for inferences.
* **FLOPs Profiling:** To accurately report our hardware efficiency to the C++ layer, the script uses the `fvcore` library to run a `FlopCountAnalysis` at startup. Crucially, this profile is executed on a dummy input tensor *before* the model is quantized, allowing the script to identify the true architectural footprint—which was calculated precisely at 58,631,680 FLOPs for our custom model. This exact number is dynamically attached to every JSON response payload.

## The Data Pipeline & Chaos Engineering

Building a robust vision model requires anticipating how humans actually take photos in the real world. The dataset was manually engineered using a strict "Hardware-Aware" photography protocol. For each target comic class, exactly 55 photos were taken with extreme physical variations:

* **The Chaos Rule:** Photos were deliberately spread across highly varied backgrounds (beds, floors, outside environments) to prevent environmental bias. 
* **The Edge-Case Matrix:** Each set captured 15 angles, 15 lighting changes, 15 real-world messes (thumbs physically overlapping the cover, glossy plastic bags), and 10 extreme distance variations.
* **The 'Junk' Class:** To prevent false positives, a dedicated `junk` class was constructed containing empty messy environments and non-target comics. This explicitly teaches the network the mathematical difference between "a comic book" and "our specific target comic book".
* **The Occlusion Simulator:** I engineered an aggressive data augmentation pipeline using `torchvision.transforms.v2`, employing `RandomErasing` to delete up to 25% of the image during training to simulate physical occlusions.

## The Production API Gateway

* **Logit Temperature Scaling:** Before calculating the final softmax probabilities, the script divides raw output logits by a temperature constant (**T = 2.0**) to smooth out the probability distribution.
* **Strict Thresholding:** If the final confidence score sits below **75%**, the API outright rejects the request, throwing an error flag to the frontend rather than guessing blindly.

## Containerization

* **`requirements.txt`:** Rather than downloading standard 2GB+ PyTorch binaries with unnecessary NVIDIA CUDA drivers, this file explicitly targets lightweight CPU-only PyTorch wheels alongside the `fvcore` profiler dependency.
* **`Dockerfile`:** Built on the minimal `python:3.11-slim` base image, it explicitly binds Uvicorn to port `7860`.