package com.comicbookapp.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

@RestController
@CrossOrigin(origins = "http://localhost:3000")
public class GatewayController {

    @Autowired
    private RestTemplate restTemplate;

    private final ObjectMapper mapper = new ObjectMapper();

    // Internal Docker network addresses
    private final String CPP_BOUNCER_URL = "http://phash_bouncer:8081/api/analyze-cover";
    private final String PYTHON_BRAIN_URL = "http://ml-python:7860/process";

    // Endpoint explicitly updated to match the fetch('/process') call in scanner.js
    @PostMapping("/process")
public ResponseEntity<String> processComic(@RequestParam("file") MultipartFile file) {
    try {
        byte[] fileBytes = file.getBytes();
        String generatedHash = "";

        // 1. C++ Bouncer Call
        HttpHeaders cppHeaders = new HttpHeaders();
        cppHeaders.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        HttpEntity<byte[]> cppRequest = new HttpEntity<>(fileBytes, cppHeaders);
        
        try {
            ResponseEntity<String> cppResponse = restTemplate.postForEntity(CPP_BOUNCER_URL, cppRequest, String.class);
            JsonNode cppJson = mapper.readTree(cppResponse.getBody());
            if (!pythonJson.has("status") || !"success".equals(pythonJson.get("status").asText())) {
    // If it's an error status, just pass the error JSON straight to the frontend
    return ResponseEntity.ok(pythonResponse.getBody());
}

// Now we know it is a "success", so the title field is guaranteed to exist
String verifiedTitle = pythonJson.get("title").asText();
String generatedHash = pythonJson.get("generated_hash").asText();
            if (cppJson.has("generated_hash")) {
                generatedHash = cppJson.get("generated_hash").asText();
            }

            if ("cached_hit".equals(cppJson.get("status").asText())) {
                return ResponseEntity.ok(cppResponse.getBody());
            }
        } catch (Exception e) {
            System.out.println("[GATEWAY] C++ Cache Miss / Service Offline.");
        }

        // 2. Python ML Call
        HttpHeaders pythonHeaders = new HttpHeaders();
        pythonHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", file.getResource());

        HttpEntity<MultiValueMap<String, Object>> pythonRequest = new HttpEntity<>(body, pythonHeaders);
        ResponseEntity<String> pythonResponse = restTemplate.postForEntity(PYTHON_BRAIN_URL, pythonRequest, String.class);
        JsonNode pythonJson = mapper.readTree(pythonResponse.getBody());

        // 3. Robust Logic: Only write-back if status is success
        if ("success".equals(pythonJson.get("status").asText())) {
            String verifiedTitle = pythonJson.get("title").asText();
            
            // Only update cache if we actually got a hash from the C++ layer
            if (!generatedHash.isEmpty()) {
                try {
                    String cacheUpdateUrl = "http://phash_bouncer:8081/api/cache-update";
                    String payload = "{\"hash\":\"" + generatedHash + "\", \"title\":\"" + verifiedTitle + "\"}";
                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(MediaType.APPLICATION_JSON);
                    restTemplate.postForEntity(cacheUpdateUrl, new HttpEntity<>(payload, headers), String.class);
                } catch (Exception e) {
                    System.out.println("[GATEWAY] Write-back failed (this is okay for demo).");
                }
            }
        }

        return ResponseEntity.ok(pythonResponse.toString());

    } catch (Exception e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("{\"status\": \"error\", \"message\": \"Gateway architecture failure\"}");
    }
}
}