# Gateway Orchestrator: Java Spring Boot Microservice

This directory contains the central nervous system of the OpticHash architecture. Built using Java and Spring Boot, this microservice acts as the primary API Gateway within the Docker network. It is entirely responsible for receiving front-end payloads, executing the two-stage evaluation logic, and aggregating data before returning a final response to the client.

## Core Routing Logic (`GatewayController.java`)

To ensure strict adherence to our optimized computing constraints, the `GatewayController` does not perform any heavy vision math itself. Instead, it acts as a traffic director utilizing Spring's `RestTemplate` to make synchronous internal HTTP requests across the Docker bridge network.

Here is the atomic breakdown of the controller's decision tree:

* **Stage 1 (The C++ Intercept):** When the `/api/scan-cover` endpoint receives a `MultipartFile`, it converts the payload into raw bytes (`APPLICATION_OCTET_STREAM`) and fires it at the internal `phash_bouncer` container. 
* **The Optimization Check:** The code utilizes fully expanded `try/catch` blocks and explicit conditional logic to evaluate the C++ response. If the Bouncer's JSON returns `"status": "cached_hit"`, the Gateway immediately exits the routing sequence and returns a `200 OK` to the frontend, successfully bypassing the PyTorch container.
* **Stage 2 (The Python Fallback):** If the C++ layer throws an exception (meaning a cache miss or the bouncer is offline), the Gateway catches it, rebuilds the payload as `MULTIPART_FORM_DATA`, and forwards the heavy compute load to the `ml_vision` Python brain.
* **Data Formatting (The Translation Map):** Deep learning arrays are mathematically efficient, but they return raw integer class IDs (e.g., `1`, `4`). To preserve separation of concerns, the Python container only returns the raw ID. The Java Gateway holds a static `COMIC_CLASS_MAP` to translate those integers into human-readable titles before injecting them into the final JSON response.

## Application Configuration

* **`GatewayApplication.java`:** This is the primary bootstrap class. Beyond launching the Spring context, it contains a critical `MultipartConfigElement` bean. By default, the embedded Tomcat server crashes if it receives a payload larger than 1MB. Because high-resolution mobile photos often exceed this, I explicitly injected a `MultipartConfigFactory` to expand the `MaxFileSize` and `MaxRequestSize` limits to 100 Megabytes, guaranteeing that large edge cases don't crash the orchestrator.
* **`application.properties`:** Mirrors the programmatic Tomcat configurations above (`spring.servlet.multipart.max-file-size=10MB`), ensuring file size limits are enforced at the application environment level as well.

## Build & Containerization

To maintain a minimal production footprint, the application utilizes a multi-stage Docker build pipeline.

* **Stage 1 (The Builder):** The `Dockerfile` pulls a heavy `maven:3.9.5` image to read the `pom.xml`. It downloads our explicit dependencies (`spring-boot-starter-web`, `jackson-databind`) and executes `mvn clean package`. This compiles the `.java` source code into `.class` bytecode and packages it into an executable `.jar` file.
* **Stage 2 (The Runner):** Rather than pushing the massive Maven image to production, the `Dockerfile` switches to an ultra-lightweight `eclipse-temurin:17-jre-jammy` image. It copies *only* the compiled `.jar` from Stage 1. This drastically reduces the Docker container's final image size, strips out unnecessary build tools to reduce security vulnerabilities, and exposes port `8080` for the Vercel frontend to consume.