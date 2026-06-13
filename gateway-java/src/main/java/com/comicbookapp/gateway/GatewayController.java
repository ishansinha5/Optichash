package com.comicbookapp.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class GatewayController {

    @Autowired
    private RestTemplate restTemplate;

    private final ObjectMapper mapper = new ObjectMapper();

    // The Fast Lookup Map: Translates Python's integer matrix output into frontend Titles
    private static final Map<Integer, String> COMIC_CLASS_MAP = Map.of(
        0, "Absolute Martian Manhunter",
        1, "Absolute Batman",
        2, "Transformers (Variant Cover)",
        3, "Ultimate Spider-Man",
        4, "Ben 10" 
    );

    // Internal Docker network addresses
    private final String CPP_BOUNCER_URL = "http://phash_bouncer:8081/api/analyze-cover";
    private final String PYTHON_BRAIN_URL = "http://ml_vision:8000/process";

    // Endpoint explicitly matches the fetch('/api/scan-cover') call in scanner.js
    @PostMapping("/scan-cover")
    public ResponseEntity<String> processComic(@RequestParam("file") MultipartFile file) {
        try {
            byte[] fileBytes = file.getBytes();

            // 1. Send the raw binary to the hardware-aware C++ Bouncer
            HttpHeaders cppHeaders = new HttpHeaders();
            cppHeaders.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            HttpEntity<byte[]> cppRequest = new HttpEntity<>(fileBytes, cppHeaders);
            
            try {
                ResponseEntity<String> cppResponse = restTemplate.postForEntity(CPP_BOUNCER_URL, cppRequest, String.class);
                JsonNode cppJson = mapper.readTree(cppResponse.getBody());

                // 2. The Decision Tree: Evaluate the Bouncer's response
                if ("cached_hit".equals(cppJson.get("status").asText())) {
                    System.out.println("[GATEWAY] Optimization achieved. Bypassing Python.");
                    return ResponseEntity.ok(cppResponse.getBody());
                }
            } catch (Exception e) {
                System.out.println("[GATEWAY] C++ Bouncer cache miss or service offline. Proceeding to Python ML layer.");
            }

            System.out.println("[GATEWAY] Cache miss. Forwarding compute load to Python PyTorch container.");

            // 3. Fallback: Send multipart data to Python
            HttpHeaders pythonHeaders = new HttpHeaders();
            pythonHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", file.getResource());

            HttpEntity<MultiValueMap<String, Object>> pythonRequest = new HttpEntity<>(body, pythonHeaders);
            ResponseEntity<String> pythonResponse = restTemplate.postForEntity(PYTHON_BRAIN_URL, pythonRequest, String.class);

            // 4. Translate Python's integer ID into a string title
            JsonNode pythonJson = mapper.readTree(pythonResponse.getBody());
            int predictedId = pythonJson.get("predicted_id").asInt();
            String verifiedTitle = COMIC_CLASS_MAP.getOrDefault(predictedId, "Unknown Cover Detected");
            
            // 5. Inject the translated title back into the JSON payload for the frontend UI
            ObjectNode responseNode = (ObjectNode) pythonJson;
            responseNode.put("title", verifiedTitle);

            return ResponseEntity.ok(responseNode.toString());

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"status\": \"error\", \"message\": \"Gateway architecture failure\"}");
        }
    }
}