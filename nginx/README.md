# Edge Proxy: Nginx Router

This directory contains the configuration for the Nginx reverse proxy. While the Java Spring Boot orchestrator handles the internal system logic, I needed a robust, battle-tested edge layer to securely manage traffic entering the Docker network from the public internet.

## Architecture & Responsibilities

In a production environment, directly exposing backend application servers (like Tomcat running inside Spring Boot) can lead to header vulnerabilities and connection bottlenecking. By placing Nginx at the front of the architecture, we achieve a much safer and cleaner separation of concerns.

* **Reverse Proxy Routing:** The `nginx.conf` file actively listens on port `80`. When a request hits the server, Nginx acts as a middleman, silently routing the traffic to the internal Java Gateway container on port `8080`.
* **Header Management:** The proxy cleanly rewrites standard HTTP headers (such as `X-Forwarded-For` and `X-Real-IP`). This ensures that the Java and Python containers properly register the origin of the traffic, which is highly critical for accurate logging and future rate-limiting implementations.
* **Payload Buffering:** Because this application handles image uploads from mobile devices, Nginx provides an essential buffer. It handles the raw TCP connection and absorbs the incoming multipart binary stream, only passing the request to the Java backend once the payload is fully assembled. This prevents slow mobile connections from tying up the Java orchestrator's active threads.

## Deployment

The configuration is seamlessly integrated into the overarching `docker-compose.yml`. It spins up an official `nginx:alpine` image, mounts the local configuration file directly into `/etc/nginx/nginx.conf`, and acts as the sole public-facing port for the entire pipeline.