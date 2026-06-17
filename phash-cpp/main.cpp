#include <iostream>
#include <string>
#include <vector>
#include <unordered_map>
#include "httplib.h"
#include <opencv2/opencv.hpp>

using namespace std;

// Define the new storage structure to hold both Title and FLOPs
struct CacheEntry {
    string title;
    long long flops;
};

// The enterprise fuzzy-matching logic
int calculate_hamming_distance(const string& hash1, const string& hash2) {
    if (hash1.length() != hash2.length()) {
        return 64; 
    }
    int distance = 0;
    for (size_t i = 0; i < hash1.length(); ++i) {
        if (hash1[i] != hash2[i]) {
            distance++;
        }
    }
    return distance;
}

string calculate_phash(const string& image_data) {
    try {
        vector<char> data(image_data.begin(), image_data.end());
        cv::Mat img = cv::imdecode(data, cv::IMREAD_GRAYSCALE);
        if (img.empty()) {
            return "INVALID_IMAGE_DATA";
        }

        cv::resize(img, img, cv::Size(32, 32));
        img.convertTo(img, CV_32F);
        cv::dct(img, img);

        cv::Mat topLeft = img(cv::Rect(0, 0, 8, 8));

        double sum = 0.0;
        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                if (i == 0 && j == 0) {
                    continue; 
                }
                sum += topLeft.at<float>(i, j);
            }
        }
        double mean = sum / 63.0;

        string hash = "";
        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                if (topLeft.at<float>(i, j) > mean) {
                    hash += "1";
                } else {
                    hash += "0";
                }
            }
        }
        return hash;
        
    } catch (const std::exception& e) {
        cerr << "OpenCV Error: " << e.what() << endl;
        return "HASHING_FAILED";
    }
}

int main() {
    httplib::Server svr;

    // [DEMO MODE] Memory map upgraded to hold CacheEntry structs
    static std::unordered_map<string, CacheEntry> known_hashes = {
        {"1000010111000001000010100101100101111111010101000101101001101110", {"Nightwing: A Knight in Blüdhaven Compendium Three", 58631680}}
    };

    // Endpoint 1: The Write-Back Receiver (Now captures FLOPs)
    svr.Post("/api/cache-update", [](const httplib::Request& req, httplib::Response& res) {
        cout << "[C++ Bouncer] Received new cache entry with telemetry." << endl;
        
        // Parse Hash
        size_t hash_pos = req.body.find("hash\":\"") + 7;
        string hash = req.body.substr(hash_pos, req.body.find("\"", hash_pos) - hash_pos);
        
        // Parse Title
        size_t title_pos = req.body.find("title\":\"") + 8;
        string title = req.body.substr(title_pos, req.body.find("\"", title_pos) - title_pos);

        // Parse FLOPs safely
        long long extracted_flops = 0;
        size_t flops_pos = req.body.find("flops\":");
        if (flops_pos != string::npos) {
            flops_pos += 7;
            string flops_str = req.body.substr(flops_pos, req.body.find("}", flops_pos) - flops_pos);
            extracted_flops = std::stoll(flops_str);
        }

        // Store both pieces of data in the map
        known_hashes[hash] = {title, extracted_flops};
        res.set_content("{\"status\": \"cache_updated\"}", "application/json");
    });

    // Endpoint 2: The Analyzer
    svr.Post("/api/analyze-cover", [](const httplib::Request& req, httplib::Response& res) {
        try {
            string image_hash = calculate_phash(req.body);
            
            if (image_hash == "INVALID_IMAGE_DATA" || image_hash == "HASHING_FAILED") {
                res.status = 400;
                res.set_content("{\"status\": \"error\", \"message\": \"Unreadable image stream\"}", "application/json");
                return;
            }

            cout << "\n[C++ Bouncer] pHash Generated: " << image_hash << endl;

            bool cache_hit = false;
            string matched_title = "";
            long long saved_flops = 0;

            for (const auto& pair : known_hashes) {
                if (calculate_hamming_distance(image_hash, pair.first) <= 10) {
                    cache_hit = true;
                    matched_title = pair.second.title;
                    saved_flops = pair.second.flops;
                    break;
                }
            }

            if (cache_hit) {
                // Dynamically return the specific FLOP count saved for this image
                string json_res = "{\"status\": \"cached_hit\", \"optimization_route\": \"CACHED_HIT_CPP\", \"compute_cycles_saved\": " + std::to_string(saved_flops) + ", \"title\": \"" + matched_title + "\"}";
                res.set_content(json_res, "application/json");
            } else {
                res.set_content("{\"status\": \"cache_miss\", \"optimization_route\": \"inference_python\", \"generated_hash\": \"" + image_hash + "\"}", "application/json");
            }
        } catch (const std::exception &e) {
            res.status = 500;
            res.set_content("{\"status\": \"error\", \"message\": \"" + string(e.what()) + "\"}", "application/json");
        }
    });

    cout << "C++ Bouncer listening on port 8081..." << endl;
    svr.listen("0.0.0.0", 8081);
    return 0;
}