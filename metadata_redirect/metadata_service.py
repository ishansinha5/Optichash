import fastapi
from fastapi import FastAPI
from fastapi import HTTPException

app = FastAPI()

# Static dictionary to mock a live database for the Proof of Concept.
# This ensures ultra-low latency while still simulating a decoupled microservice architecture.
COMIC_DATABASE = {
    "beta_ray_bill_tpb": {
        "title": "Beta Ray Bill: Argent Star (2025 Edition)",
        "publisher": "Marvel Comics",
        "format": "Trade Paperback",
        "source": "Local Mock Database",
        "url": "https://leagueofcomicgeeks.com/comic/8509698/beta-ray-bill-argent-star-tp?variant=8271107"
    },
    "nightwing_compendium_3": {
        "title": "Nightwing: A Knight in Blüdhaven Compendium Book 3",
        "publisher": "DC Comics",
        "format": "Compendium",
        "source": "Local Mock Database",
        "url": "https://leagueofcomicgeeks.com/comic/3717786/nightwing-a-knight-in-bluedhaven-compendium-book-3-tp"
    },
    "absolute_batman_annual_1": {
        "title": "Absolute Batman 2025 Annual #1",
        "publisher": "DC Comics",
        "format": "Single Issue",
        "source": "Local Mock Database",
        "url": "https://leagueofcomicgeeks.com/comic/6092062/absolute-batman-2025-annual-1"
    },
    "transformers_4": {
        "title": "Transformers #4 (Cover E 1:50 Andrea Milana Variant)",
        "publisher": "Image Comics",
        "format": "Single Issue",
        "source": "Local Mock Database",
        "url": "https://leagueofcomicgeeks.com/comic/4294159/transformers-4?variant=9647505"
    },
    "absolute_martian_manhunter": {
        "title": "Absolute Martian Manhunter #8",
        "publisher": "DC Comics",
        "format": "Single Issue", 
        "source": "Local Mock Database",
        "url": "https://leagueofcomicgeeks.com/comic/1616741/absolute-martian-manhunter-8"
    }
}

@app.get("/metadata/{comic_id}")
async def get_mock_metadata(comic_id: str):
    
    if (comic_id not in COMIC_DATABASE):
        
        raise HTTPException(status_code=404, detail="Comic metadata not found in local database")
        
    return COMIC_DATABASE[comic_id]