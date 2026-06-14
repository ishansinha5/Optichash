import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI
from fastapi import HTTPException

app = FastAPI()

# Scrapes League of Comic Geeks to extract the exact title and publisher for a given search term
def scrape_locg(search_term: str):
    formatted_query = search_term.replace(" ", "+")
    
    url = "https://leagueofcomicgeeks.com/search?keyword=" + formatted_query
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    response = requests.get(url, headers=headers)
    
    if (response.status_code != 200):
        return None
        
    soup = BeautifulSoup(response.text, "html.parser")
    
    try:
        title_element = soup.find("div", class_="REPLACE_WITH_TITLE_CLASS")
        
        title_text = title_element.text
        
        title_clean = title_text.strip()
        
        publisher_element = soup.find("div", class_="REPLACE_WITH_PUBLISHER_CLASS")
        
        publisher_text = publisher_element.text
        
        publisher_clean = publisher_text.strip()
        
        result_dictionary = {
            "title": title_clean,
            "publisher": publisher_clean,
            "source": "League of Comic Geeks Scrape"
        }
        
        return result_dictionary
        
    except AttributeError:
        return None

@app.get("/metadata/{comic_id}")
async def get_dynamic_metadata(comic_id: str):
    clean_search = comic_id.replace("_", " ")
    
    data = scrape_locg(clean_search)
    
    if (data is None):
        raise HTTPException(status_code=404, detail="Could not dynamically scrape data")
        
    return data