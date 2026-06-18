#include <iostream>
#include <string>
#include <vector>
#include <pqxx/pqxx>
#include "httplib.h"
#include <opencv2/opencv.hpp>

using namespace std;

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

    // Define the database connection string matching your docker-compose network
    string db_conn_string = "dbname=postgres user=postgres password=postgres host=spatial_db port=5432";

    // 1. Initialize Database on Startup
    try {
        pqxx::connection c(db_conn_string);
        if (c.is_open()) {
            cout << "[C++ Bouncer] Connected to PostgreSQL (spatial_db) successfully." << endl;
            pqxx::work w(c);
            
            // Create the persistent table if it doesn't already exist
            string create_table_sql = 
                "CREATE TABLE IF NOT EXISTS known_covers ("
                "hash VARCHAR(64) PRIMARY KEY, "
                "title VARCHAR(255) NOT NULL, "
                "flops BIGINT NOT NULL);";
                
            w.exec(create_table_sql);
            w.commit();
        } else {
            cerr << "[C++ Bouncer] Failed to connect to database." << endl;
        }
    } catch (const std::exception &e) {
        cerr << "[C++ Bouncer] Database Initialization Error: " << e.what() << endl;
    }

    // 2. The Write-Back Receiver
    svr.Post("/api/cache-update", [&db_conn_string](const httplib::Request& req, httplib::Response& res) {
        cout << "[C++ Bouncer] Received new cache entry with telemetry. Writing to PostgreSQL..." << endl;
        
        size_t hash_pos = req.body.find("hash\":\"") + 7;
        string hash = req.body.substr(hash_pos, req.body.find("\"", hash_pos) - hash_pos);
        
        size_t title_pos = req.body.find("title\":\"") + 8;
        string title = req.body.substr(title_pos, req.body.find("\"", title_pos) - title_pos);

        long long extracted_flops = 0;
        size_t flops_pos = req.body.find("flops\":");
        
        if (flops_pos != string::npos) {
            flops_pos += 7;
            string flops_str = req.body.substr(flops_pos, req.body.find("}", flops_pos) - flops_pos);
            extracted_flops = std::stoll(flops_str);
        }

        // Execute SQL Insert
        try {
            pqxx::connection c(db_conn_string);
            pqxx::work w(c);
            
            // UPSERT Logic: Insert new, or update if the hash already exists
            string insert_sql = 
                "INSERT INTO known_covers (hash, title, flops) VALUES (" +
                w.quote(hash) + ", " + w.quote(title) + ", " + to_string(extracted_flops) + ") " +
                "ON CONFLICT (hash) DO UPDATE SET title = EXCLUDED.title, flops = EXCLUDED.flops;";
                
            w.exec(insert_sql);
            w.commit();
            res.set_content("{\"status\": \"cache_updated\"}", "application/json");
        } catch (const std::exception &e) {
            cerr << "[C++ Bouncer] Database Write Error: " << e.what() << endl;
            res.status = 500;
            res.set_content("{\"status\": \"error\"}", "application/json");
        }
    });

    // 3. The Analyzer
    svr.Post("/api/analyze-cover", [&db_conn_string](const httplib::Request& req, httplib::Response& res) {
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

            // Query PostgreSQL for all known hashes
            try {
                pqxx::connection c(db_conn_string);
                pqxx::nontransaction n(c);
                pqxx::result r = n.exec("SELECT hash, title, flops FROM known_covers;");

                for (auto row : r) {
                    string db_hash = row[0].c_str();
                    
                    if (calculate_hamming_distance(image_hash, db_hash) <= 10) {
                        cache_hit = true;
                        matched_title = row[1].c_str();
                        saved_flops = row[2].as<long long>();
                        break;
                    }
                }
            } catch (const std::exception &e) {
                cerr << "[C++ Bouncer] Database Read Error: " << e.what() << endl;
            }

            if (cache_hit) {
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