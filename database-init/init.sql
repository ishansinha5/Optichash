CREATE EXTENSION IF NOT EXISTS postgis;

-- The Core Variant Tracking Table (Mapped to LoCG Schema)
CREATE TABLE IF NOT EXISTS locg_variants (
    id SERIAL PRIMARY KEY,
    phash VARCHAR(64) UNIQUE NOT NULL,
    publisher VARCHAR(100) NOT NULL,
    series VARCHAR(255) NOT NULL,
    issue_number VARCHAR(50) NOT NULL,
    variant_details TEXT,
    upc VARCHAR(50),
    distributor_sku VARCHAR(50),
    cover_date VARCHAR(50),
    
    -- Action Hooks
    pull_it BOOLEAN DEFAULT false,
    have_it BOOLEAN DEFAULT false,
    read_it BOOLEAN DEFAULT false,
    want_it BOOLEAN DEFAULT false,
    
    -- ESG / Green AI Tracking metric
    compute_cycles_saved INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);