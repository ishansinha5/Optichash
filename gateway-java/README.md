# Gateway Orchestrator: Java Spring Boot Microservice

This directory contains the central nervous system of the OpticHash architecture. Built using Java and Spring Boot, this microservice acts as the primary API Gateway within the Docker network. It is entirely responsible for receiving front-end payloads, orchestrating the two-stage evaluation logic, and executing our telemetry write-back loop.

While there is a steep learning curve to enterprise Java, utilizing Spring Boot provided the exact robustness, strict typing, and thread management needed to juggle heavy binary file streams across multiple internal containers without bottlenecking.

## Core Routing Logic (`GatewayController.java`)

To ensure strict adherence to our optimized computing constraints, the `GatewayController` does not perform any heavy vision math itself. It acts as a traffic director, utilizing Spring's `RestTemplate` to make synchronous internal HTTP requests across the Docker bridge network. 

Here is the atomic breakdown of the controller's "Waterfall" decision tree:

* **Stage 1 (The C++ Intercept):** When the endpoint receives a `MultipartFile` from the frontend, it converts the payload into raw bytes and fires it at the internal `phash_bouncer` container on port `8081`. 
    * If the Bouncer's JSON returns `"status": "cached_hit"`, the Gateway immediately halts the routing sequence. It parses the returned `compute_cycles_saved` integer and passes a `200 OK` back to the frontend, successfully bypassing the heavy PyTorch container entirely.
* **Stage 2 (The Python Fallback):** If the C++ layer encounters a cache miss, the Gateway catches the error. It actively rebuilds the payload as `MULTIPART_FORM_DATA` and forwards the heavy compute load to the `ml-python` brain running on port `7860`.
* **Stage 3 (The Telemetry Write-Back):** This is the crucial self-learning step. When the Python container successfully processes a novel image, it returns the predicted title alongside the exact `model_flops` telemetry it generated. The Java Gateway extracts these values and immediately constructs a new JSON payload, firing it backward via a `POST` request to the C++ `/api/cache-update` endpoint. This ensures that the exact spatial geometry and compute weight of the asset are permanently memorized in RAM.

## Build & Containerization

To maintain a minimal production footprint, the application utilizes a multi-stage Docker build pipeline. This was an excellent exercise in optimizing image sizes for cloud deployments.

* **Stage 1 (The Builder):** The `Dockerfile` pulls a heavyweight `maven:3.9.5` image to read the `pom.xml`, download necessary Spring Boot dependencies, and compile the source code into an executable `.jar` file.
* **Stage 2 (The Runner):** Rather than pushing the massive Maven image to production, the `Dockerfile` switches to an ultra-lightweight `eclipse-temurin:17-jre-jammy` image. It copies *only* the compiled `.jar` from Stage 1. This drastically reduces the final container size and cleanly exposes port `8080` to our Nginx proxy layer.