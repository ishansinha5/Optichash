#include <iostream>
#include <string>
#include <vector>
#include "httplib.h"
#include <pqxx/pqxx>
#include <opencv2/opencv.hpp>

using namespace std;

const string DB_CONN_STR = "postgresql://admin:enterprise_secure@spatial_db:5432/comicdb";

// The enterprise fuzzy-matching logic
int calculate_hamming_distance(const string& hash1, const string& hash2) {
    if (hash1.length() != hash2.length()) return 64; // Fallback to max distance if sizes mismatch
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
        if (img.empty()) return "INVALID_IMAGE_DATA";

        cv::resize(img, img, cv::Size(32, 32));
        img.convertTo(img, CV_32F);
        cv::dct(img, img);

        cv::Mat topLeft = img(cv::Rect(0, 0, 8, 8));

        double sum = 0.0;
        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                if (i == 0 && j == 0) continue; 
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

    svr.Post("/api/analyze-cover", [](const httplib::Request& req, httplib::Response& res) {
        try {
            string image_hash = calculate_phash(req.body);
            
            if (image_hash == "INVALID_IMAGE_DATA" || image_hash == "HASHING_FAILED") {
                res.status = 400;
                res.set_content("{\"status\": \"error\", \"message\": \"Unreadable image stream\"}", "application/json");
                return;
            }

            cout << "\n[C++ Bouncer] pHash Generated: " << image_hash << endl;

            pqxx::connection C(DB_CONN_STR);
            pqxx::nontransaction N(C);
            
            // We fetch all hashes to compare them in memory
            string query = "SELECT id, phash FROM locg_variants";
            pqxx::result R = N.exec(query);

            bool cache_hit = false;
            string matched_id = "";

            for (auto row : R) {
                string db_hash = row[1].c_str();
                int dist = calculate_hamming_distance(image_hash, db_hash);
                
                // If the distance is within our threshold (e.g., 10 bits), we consider it the same comic
                if (dist <= 10) {
                    cache_hit = true;
                    matched_id = row[0].c_str();
                    break;
                }
            }

            if (cache_hit) {
                res.set_content("{\"status\": \"cached_hit\", \"optimization_route\": \"cache_hit_cpp\", \"variant_id\": " + matched_id + "}", "application/json");
            } else {
                res.set_content("{\"status\": \"cache_miss\", \"optimization_route\": \"inference_python\", \"generated_hash\": \"" + image_hash + "\"}", "application/json");
            }
        } catch (const std::exception &e) {
            cerr << "Database Error: " << e.what() << endl;
            res.status = 500;
            res.set_content("{\"status\": \"error\", \"message\": \"" + string(e.what()) + "\"}", "application/json");
        }
    });

    cout << "C++ Bouncer listening on port 8081..." << endl;
    svr.listen("0.0.0.0", 8081);
    return 0;
}