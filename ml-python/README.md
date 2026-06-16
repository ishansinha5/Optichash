# The Edge Neural Brain: Python Machine Learning Engine

This directory houses the core vision logic of the OpticHash pipeline. 

Deploying an image classifier is relatively easy if you have access to unlimited cloud GPU compute. However, I wanted to architect this specific microservice around strict, artificial hardware constraints. This directory contains an end-to-end Python pipeline that trains a vision model, aggressively compresses its mathematical weights, and serves it via a lightweight API designed to run entirely on standard consumer-tier CPUs.

## The Data Pipeline & Chaos Engineering

While the raw image files are too large to track via version control, the system expects a standard `data/` directory split into `train/` and `val/` subfolders. Building a robust vision model requires more than just scraping clean digital data—it requires anticipating exactly how humans actually take photos in the real world. 

To achieve this, the dataset was manually engineered from scratch using a strict "Hardware-Aware" photography protocol. For each target comic class (e.g., Absolute Martian Manhunter, Transformers), exactly 55 photos were taken of the exact same physical issue. 

To ensure the neural network actually learned the cover art and didn't just overfit to the background, the photography followed a strict set of rules:
* **The Chaos Rule:** Photos were deliberately spread across highly varied backgrounds—beds, floors, kitchen counters, and outside environments—to prevent environmental bias. The AI is lazy; if every photo is taken on a desk, it will learn to identify the desk instead of the comic.
* **The Edge-Case Matrix:** Each 55-photo set was specifically structured to capture real-world variables: 15 angles (pitched 45-degrees, skewed, straight), 15 lighting changes (harsh camera flash, dim rooms, bright window sunlight), 15 real-world messes (coffee cups in the background, thumbs physically overlapping the cover, shooting through glossy plastic comic bags), and 10 extreme distance variations (zoomed out vs. edge-cropping closeups).
* **The "Final Exam" Split:** The data was split into 45 training images and 10 validation images per class. Crucially, the 10-photo validation folder was deliberately seeded with a mix of the absolute hardest edge cases (glare, darkness, occlusion) to ensure the validation accuracy metric was a true test of production readiness, rather than an inflated score.
* **The 'Junk' Class:** To prevent the model from hallucinating false positives when scanning an uncatalogued comic, a dedicated `junk` class was constructed. The training folder contains 48 photos: 8 empty messy environments (just the backgrounds where the comics were shot), 20 clean digital covers of non-target comics, and 20 messy in-hand photos of non-target comics. The validation set mirrors this with 12 proportionally distributed photos. This explicitly teaches the network the mathematical difference between "a comic book" and "our specific target comic book".

Once the physical dataset was structured, the pipeline extends the chaos into the software layer:
* **`core/dataset.py` (The Occlusion Simulator):** This script orchestrates the data loading and preprocessing. Instead of just passing our photos straight to the neural network, I engineered an aggressive data augmentation pipeline using `torchvision.transforms.v2`. 
    * It applies random perspective warps to simulate steep camera angles.
    * It utilizes `ColorJitter` to further fortify the model against harsh room lighting.
    * Most importantly, it employs `RandomErasing` to randomly delete up to 25% of the image during training. This acts as a simulated physical occlusion, forcing the model to mathematically reconstruct the identity of a comic cover even when a user's thumb is physically blocking a quarter of the page.

## Model Architecture & Training

* **`core/model.py`:** This file defines the `GreenComicVision` class. To keep the memory footprint as low as possible, I bypassed massive architectures like ResNet50 in favor of a `mobilenet_v3_small` backbone. The script hijacks the final classification layer, stripping out its default 1,000-class ImageNet configuration and replacing it with a custom, highly targeted linear output mapping directly to our specific comic catalog.
* **`train.py`:** The orchestration script for the learning loop. It initializes an `AdamW` optimizer and calculates loss via `CrossEntropyLoss`. It runs the training epochs and outputs a massive, highly accurate 32-bit floating-point (FP32) weight file (`comic_vision_fp32.pth`). This file is computationally heavy and serves solely as the baseline for our optimization phase.

## The Optimization Engine (Quantization)

* **`quantize.py`:** This is the most critical script for the project's compute-optimization goals. It intercepts the massive FP32 training file and executes a structural crunch. By utilizing the modern `torchao` library, the script applies `Int8DynamicActivationInt8WeightConfig`. This mathematically compresses the 32-bit floating-point parameters down to 8-bit dynamic integers. The result is `comic_vision_int8.pth`—a production-ready model that requires a fraction of the RAM and electrical overhead to execute inferences.

## The Production API Gateway

* **`main.py`:** This script serves the quantized INT8 model to the web via FastAPI. Because it operates as the final fallback when the C++ layer fails, it has to be mathematically bulletproof. 
    * **Logit Temperature Scaling:** Neural networks are notoriously overconfident. Before calculating the final softmax probabilities, this script divides the raw output logits by a temperature constant (**T = 2.0**). This smooths out the probability distribution and prevents the model from hallucinating a false positive on a blurry image.
    * **Strict Thresholding:** If the final confidence score sits below **75%**, the API outright rejects the request, throwing an error flag to the frontend UI rather than guessing blindly.
    * **The Zero-Hop Metadata DB:** To maximize Hugging Face Spaces efficiency, the final metadata URLs and titles are hardcoded directly into a `METADATA_DB` dictionary within this script. This prevents the Python container from having to make secondary external API calls to a database just to fetch a hyperlink.

## Containerization & Environment Management

To guarantee this microservice can be spun up anywhere without dependency conflicts, the environment is strictly locked down.

* **`requirements.txt`:** Rather than downloading the standard PyTorch binaries (which often exceed 2GB and include unnecessary NVIDIA CUDA drivers), this file explicitly targets the lightweight CPU-only PyTorch wheels. This keeps the environment lean and specifically tailored for edge deployments.
* **`Dockerfile`:** The container is built on the minimal `python:3.11-slim` base image. It handles dependency installation, copies the application logic, and explicitly binds Uvicorn to port `7860`, which is the exact networking requirement for seamless deployment onto Hugging Face Spaces.