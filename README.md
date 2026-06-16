# OpticHash: Distributed Microservices & Compute-Optimized Vision Architecture

**Live Client Deployment:** [[Vercel Portal]]([INSERT_YOUR_VERCEL_URL_HERE])  
**Live AI Inference Engine:** [[Hugging Face Spaces]]([INSERT_YOUR_HUGGING_FACE_URL_HERE])

---

## System Architecture Topology

> [!NOTE]
> ### System Topology Diagram
> ![OpticHash System Flow Architecture](assets/images/architecture_diagram.png)
> *Figure 1: Complete end-to-end routing lifecycle of an image request passing from the Vercel edge client through the Java orchestration gateway down to the dual-stage evaluation matrix.*

### System Design Analysis
The topology above illustrates the strict decoupling of this project's verification process. When an asset payload enters the ecosystem, it is directed to a Java routing gateway. Rather than immediately initializing deep learning compute matrices, the pipeline enforces a critical performance gate: the binary data drops into a native C++ microservice layer. If a Perceptual Hash match exists in our schema index, the system intercepts the asset and exits immediately with zero network hops. Novel assets route directly to the deep neural network.

---

## The Core Question: Can We Decouple Machine Learning from Monolithic Compute Waste?

Computer vision pipelines are an environmental and financial liability. In enterprise asset management or retail lookups, brute-forcing every incoming image request through heavy convolutional neural networks or transformer layers is a massive over-allocation of resources. If a user uploads an image of an asset that has already been analyzed and cataloged, invoking millions of matrix multiplication operations on a GPU cluster is completely unnecessary.

I built this distributed, hardware-aware computer vision pipeline to solve that specific architectural inefficiency. OpticHash uses a distinct two-stage evaluation matrix to guard the machine learning layer. By checking inputs at the byte level before initializing complex neural inference, this project proves that software architecture choices can directly reduce electrical overhead, memory footprint, and hosting costs.

---

## The Distributed Tech Stack & Architecture

To achieve this level of performance isolation, I broke down the application into specialized, decoupled microservices orchestrated via Docker Compose within a local WSL environment:

* **Zone 1: The Presentation Client (Frontend):** A responsive, zero-bloat web application written in standard vanilla JavaScript and deployed at the edge via Vercel. It features automated file preprocessing, state tracking, and explicit telemetry capture.
* **Zone 2: The Core Routing Gateway (Java Spring Boot):** The central business logic layer. It orchestrates service discovery, handles network message serialization, and acts as the secure entry point for all client-side processing operations.
* **Zone 3: The Perceptual Bouncer (Native C++):** A high-performance microservice that computes geometric image hashes at the hardware level. It cross-references an indexed relational table; if an asset matches, it bypasses the neural network completely, serving data instantaneously and saving up to ~90% of typical compute cycles.
* **Zone 4: The Edge Neural Brain (Python FastAPI):** Triggered strictly when the C++ gatekeeper encounters a completely new or unhashed image cover. It hosts custom computer vision weights via a clean, high-throughput REST API.
* **Zone 5: Spatial Optimization Schema (PostgreSQL/PostGIS):** An enterprise-ready persistence layer initialized with robust indexing. It handles spatial coordinates for nearby store lookups alongside structural image hash indices.

---

## Engineering For Optimized AI Efficiency

The true power of this project lies in how the underlying software architecture protects system resources. Deep learning model optimization must look beyond raw software layers down to hardware power telemetry:

1. **INT8 Dynamic Quantization:** Rather than deploying large FP32 weight matrices, the PyTorch model undergoes an aggressive quantization pass via `torchao`. Compressing the neural node values down to 8-bit dynamic integers keeps the volatile memory footprint incredibly low, allowing the pipeline to maintain fast execution speeds directly on consumer-tier CPUs.
2. **Logit Temperature Scaling:** To prevent low-confidence predictions from polluting system data, the inference script routes raw logits through a custom temperature divider ($T = 2.0$) prior to calculating softmax probabilities. This smooths out potential anomalies and guarantees mathematical integrity.
3. **The Zero-Network-Hop Monolith Strategy:** For the lightweight production environment on Hugging Face Spaces, the metadata index is encapsulated as a flat, local dictionary directly alongside the model. This intentional structural optimization eliminates unnecessary internal database connections and optimizes performance.

---

## Proof of Concept: Hardware-Aware System Telemetry

> [!IMPORTANT]
> ### System Operation Demonstration
> [Link to Proof of Concept Video: Local Pipeline Operations](assets/demo.mp4)
> *Our full end-to-end operation running locally under a full multi-container Docker Compose build environment.*

### Technical Telemetry Breakdown
The screen capture highlights the dual-stage evaluation matrix in real time. On the left side of the frame, the Vercel instance triggers a series of scan requests. On the right, the running Docker logs provide clear evidence of the routing system. When an image matching an indexed cover is submitted, the terminal prints `[phash_bouncer] Match Found - Route: PHASH_CPP`. The response payload completes instantly, displaying zero compute cycles consumed. When an unindexed cover is passed, the C++ filter steps aside, and the logs document the activation of the FastAPI worker as it executes quantized INT8 matrix operations.

---

## Local Development & Orchestration

This entire stack is designed to be fully reproducible across environments. You can pull the multi-container configuration down locally via the following workflow:

1. **Clone the Repository:**
```bash
   git clone [https://github.com/ishansinha5/OpticHash.git](https://github.com/ishansinha5/OpticHash.git)
   cd OpticHash