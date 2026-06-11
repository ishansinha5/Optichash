cmake_minimum_required(VERSION 3.10)
project(phash_bouncer)

set(CMAKE_CXX_STANDARD 17)

# Find both PostgreSQL and OpenCV
find_package(PkgConfig REQUIRED)
pkg_check_modules(PQXX REQUIRED libpqxx)
find_package(OpenCV REQUIRED)

add_executable(phash_bouncer main.cpp)

# Link both libraries to the executable
target_link_libraries(phash_bouncer ${PQXX_LIBRARIES} ${OpenCV_LIBS})
target_include_directories(phash_bouncer PUBLIC ${PQXX_INCLUDE_DIRS} ${OpenCV_INCLUDE_DIRS})