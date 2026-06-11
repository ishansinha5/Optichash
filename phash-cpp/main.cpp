#include <iostream>
#include <string>
#include <vector>
#include "httplib.h"
#include <pqxx/pqxx>
#include <opencv2/opencv.hpp>

using namespace std;

const string DB_CONN_STR = "postgresql://admin:enterprise_secure@spatial_db:5432/comicdb";

string calculate_phash(const string& image_data) {
    try {
        // 1. Convert the raw HTTP byte stream into an OpenCV matrix
        vector<char> data(image_data.begin(), image_data.end());
        cv::Mat img = cv::imdecode(data, cv::IMREAD_GRAYSCALE);
        
        if (img.empty()) return "INVALID_IMAGE_DATA";

        // 2. Crush the image down to 32x32 to destroy high-frequency noise (like glare)
        cv::resize(img, img, cv::Size(32, 32));
        
        // OpenCV's DCT requires a 32-bit float matrix
        img.convertTo(img, CV_32F);
        
        // 3. Apply the Discrete Cosine Transform
        cv::dct(img, img);

        // 4. Extract the top-left 8x8 block (the lowest frequencies / core structural data)
        cv::Mat topLeft = img(cv::Rect(0, 0, 8, 8));

        // 5. Calculate the mean, excluding the very first pixel [0,0] which is the DC coefficient (overall brightness)
        double sum = 0.0;
        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                if (i == 0 && j == 0) continue; 
                sum += topLeft.at<float>(i, j);
            }
        }
        double mean = sum / 63.0;

        // 6. Generate the 64-bit hash
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
            // We pass the raw binary payload directly to OpenCV
            string image_hash = calculate_phash(req.body);
            
            if (image_hash == "INVALID_IMAGE_DATA" || image_hash == "HASHING_FAILED") {
                res.status = 400;
                res.set_content("{\"status\": \"error\", \"message\": \"Unreadable image stream\"}", "application/json");
                return;
            }

            cout << "\n[C++ Bouncer] pHash Generated: " << image_hash << endl;

            pqxx::connection C(DB_CONN_STR);
            pqxx::nontransaction N(C);
            
            string query = "SELECT id FROM locg_variants WHERE phash = '" + image_hash + "'";
            pqxx::result R = N.exec(query);

            if (!R.empty()) {
                res.set_content("{\"status\": \"cached_hit\", \"optimization_route\": \"cache_hit_cpp\", \"variant_id\": " + R[0][0].as<string>() + "}", "application/json");
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