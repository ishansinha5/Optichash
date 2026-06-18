package com.comicbookapp.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

@RestController
@CrossOrigin(origins = {"http://localhost:3000", "https://optichash.vercel.app"})
public class GatewayController {

    private final RestTemplate restTemplate;
    private final ObjectMapper mapper = new ObjectMapper();

    // Constructor injection resolves the @Autowired warning
    public GatewayController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    // Internal Docker network addresses
    private final String CPP_BOUNCER_URL = "http://phash_bouncer:8081/api/analyze-cover";
    private final String PYTHON_BRAIN_URL = "http://ml-python:7860/process";

    @PostMapping("/process")
    public ResponseEntity<String> processComic(@RequestParam("file") MultipartFile file) {
        try {
            byte[] fileBytes = file.getBytes();
            String generatedHash = "UNKNOWN_HASH";

            // 1. C++ Bouncer Call
            HttpHeaders cppHeaders = new HttpHeaders();
            cppHeaders.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            HttpEntity<byte[]> cppRequest = new HttpEntity<>(fileBytes, cppHeaders);
            
            try {
                ResponseEntity<String> cppResponse = restTemplate.postForEntity(CPP_BOUNCER_URL, cppRequest, String.class);
                JsonNode cppJson = mapper.readTree(cppResponse.getBody());

                if (cppJson.has("generated_hash")) {
                    generatedHash = cppJson.get("generated_hash").asText();
                }

                if (cppJson.has("status") && "cached_hit".equals(cppJson.get("status").asText())) {
                    System.out.println("[GATEWAY] Optimization achieved. Bypassing Python.");
                    return ResponseEntity.ok(cppResponse.getBody());
                }
            } catch (Exception e) {
                System.out.println("[GATEWAY] C++ Bouncer miss or offline. Proceeding to Python.");
            }

            // 2. Python ML Call
            HttpHeaders pythonHeaders = new HttpHeaders();
            pythonHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", file.getResource());

            HttpEntity<MultiValueMap<String, Object>> pythonRequest = new HttpEntity<>(body, pythonHeaders);
            ResponseEntity<String> pythonResponse = restTemplate.postForEntity(PYTHON_BRAIN_URL, pythonRequest, String.class);
            JsonNode pythonJson = mapper.readTree(pythonResponse.getBody());

            // 3. Robust Logic: Extract title and flops
            if (pythonJson.has("status") && "success".equals(pythonJson.get("status").asText())) {
                if (pythonJson.has("title")) {
                    String verifiedTitle = pythonJson.get("title").asText();
                    long exactFlops = 0;
                    
                    if (pythonJson.has("model_flops")) {
                        exactFlops = pythonJson.get("model_flops").asLong();
                    }
                    
                    try {
                        String cacheUpdateUrl = "http://phash_bouncer:8081/api/cache-update";
                        
                        // Dynamically inject the exact FLOPs into the C++ payload
                        String payload = "{\"hash\":\"" + generatedHash + "\", \"title\":\"" + verifiedTitle + "\", \"flops\":" + exactFlops + "}";
                        
                        HttpHeaders headers = new HttpHeaders();
                        headers.setContentType(MediaType.APPLICATION_JSON);
                        restTemplate.postForEntity(cacheUpdateUrl, new HttpEntity<>(payload, headers), String.class);
                        System.out.println("[GATEWAY] Successfully wrote new entry and telemetry to C++ cache.");
                    } catch (Exception e) {
                        System.out.println("[GATEWAY] Cache write-back skipped.");
                    }
                }
            }

            // Return the pure JSON string
            return ResponseEntity.ok(pythonResponse.getBody());

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"status\": \"error\", \"message\": \"Gateway architecture failure\"}");
        }
    }
}