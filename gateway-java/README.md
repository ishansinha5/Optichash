# Gateway Orchestrator: Java Spring Boot Microservice

This directory contains the central nervous system of the OpticHash architecture. Built using Java and Spring Boot, this microservice acts as the primary API Gateway within the Docker network. It is entirely responsible for receiving front-end payloads, executing the two-stage evaluation logic, and executing our telemetry write-back loop.

## Core Routing Logic (`GatewayController.java`)

To ensure strict adherence to our optimized computing constraints, the `GatewayController` does not perform any heavy vision math itself. It acts as a traffic director utilizing Spring's `RestTemplate` to make synchronous internal HTTP requests across the Docker bridge network.

Here is the atomic breakdown of the controller's "Waterfall" decision tree:

* **Stage 1 (The C++ Intercept):** When the endpoint receives a `MultipartFile`, it converts the payload into raw bytes and fires it at the internal `phash_bouncer` container. If the Bouncer's JSON returns `"status": "cached_hit"`, the Gateway immediately exits the routing sequence and returns a `200 OK` to the frontend, successfully bypassing PyTorch entirely.
* **Stage 2 (The Python Fallback):** If the C++ layer encounters a cache miss, the Gateway catches the error, rebuilds the payload as `MULTIPART_FORM_DATA`, and forwards the heavy compute load to the `ml-python` brain.
* **Stage 3 (The Telemetry Write-Back):** This is the crucial self-learning step. When the Python container successfully processes a novel image, it returns the predicted title alongside the exact `model_flops` telemetry it generated. The Java Gateway extracts these values and immediately fires a new JSON payload to the C++ `/api/cache-update` endpoint. This ensures that the next time this specific image is scanned, the C++ layer recognizes it instantly.

## Build & Containerization

To maintain a minimal production footprint, the application utilizes a multi-stage Docker build pipeline.

* **Stage 1 (The Builder):** The `Dockerfile` pulls a `maven:3.9.5` image to read the `pom.xml`, downloads dependencies, and compiles the source code into an executable `.jar` file.
* **Stage 2 (The Runner):** Rather than pushing the massive Maven image to production, the `Dockerfile` switches to an ultra-lightweight `eclipse-temurin:17-jre-jammy` image, copying *only* the compiled `.jar`. This drastically reduces the final image size and exposes port `8080` for the frontend client.