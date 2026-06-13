let storesData = [];
let currentIndex = 0;

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                useLocation(lat, lng);
            },
            error => {
                console.log("Geolocation error:", error);
                const lat = 38.9072;
                const lng = -77.0369;
                useLocation(lat, lng);
                alert("Using test location (Washington, D.C.). Please enable location services for your actual location.");
            }
        );
    } else {
        const lat = 38.9072;
        const lng = -77.0369;
        useLocation(lat, lng);
        alert("Geolocation not supported. Using test location (Washington, D.C.).");
    }
}

async function useLocation(lat, lng) {
    const radius = 10000; 
    const params = new URLSearchParams({
        lat: lat,
        lng: lng,
        radius: radius
    });

    const endpoint = `/api/find-stores?${params.toString()}`;

    try {
        const response = await fetch(endpoint);
        const data = await response.json();
        
        console.log("API Response:", data); 
        
        if (data.error) {
            console.error("API Error:", data.error);
            alert(`Error: ${data.error}`);
            return;
        }
        
        if (data.places && data.places.length > 0) {
            storesData = data.places;
            currentIndex = 0;
            displayCards(storesData);
        } else {
            console.log("No places found in response");
            displayFinalCard("No comic book shops found in this area. Try a different location or increase the search radius.");
        }
    } catch (e) {
        console.error("Error fetching comic book shops:", e);
        alert("Error fetching comic book shops. Please check your internet connection and try again.");
    }
}

function displayCards(stores) {
    const container = document.querySelector('.cards');
    container.innerHTML = '';
    
    // **FIX** Reset the index here every time cards are displayed
    currentIndex = 0;

    if (!stores || stores.length === 0) {
        displayFinalCard("No comic book shops found in this area 😢");
        return;
    }
    
    stores.forEach((store, i) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'swipe-wrapper';
        wrapper.style.zIndex = stores.length - i;
        
        const card = document.createElement('div');
        card.className = 'location-card';

        const photoName = store.photos?.[0]?.name;
        const imgUrl = photoName ? `/api/get-photo?photoreference=${encodeURIComponent(photoName)}` : 'https://via.placeholder.com/250x150?text=No+Image';

        const comicBookShopData = {
            name: store.displayName?.text || store.name || 'Unknown Shop', 
            place_id: store.id, 
            photo: imgUrl,
            rating: store.rating || 'N/A',
            website: store.websiteUri || ''
        };

        card.innerHTML = `
            <img src="${imgUrl}" alt="${comicBookShopData.name}" />
            <h3>${comicBookShopData.name}</h3>
            <p>⭐️ Rating: ${comicBookShopData.rating}</p>
            ${comicBookShopData.website ? `<p><a href="${comicBookShopData.website}" target="_blank">Visit Website</a></p>` : ''}
            <p><small>Swipe right to save 💖</small></p>
        `;

        wrapper.appendChild(card);
        container.appendChild(wrapper);

        if (typeof Hammer !== 'undefined') {
            const hammertime = new Hammer(wrapper);
            hammertime.on('swipeleft swiperight', (event) => {
                const isSaved = event.type === 'swiperight';
                if (isSaved) {
                    saveCB(JSON.stringify(comicBookShopData));
                }
                
                wrapper.style.transform = `translateX(${isSaved ? '150%' : '-150%'}) rotate(${isSaved ? '15deg' : '-15deg'})`;
                wrapper.style.opacity = 0;
                
                currentIndex++;
                if (currentIndex === stores.length) {
                    setTimeout(() => {
                        displayFinalCard(`No other shops within ${Math.round(10000 * 0.000621371)} mile radius. Click here to search again!`);
                    }, 300);
                }
            });
        }
    });
}

function saveCB(cbJSON) {
    try {
        const cbshop = JSON.parse(cbJSON);
        let saved = JSON.parse(localStorage.getItem('savedComicBookShops') || '[]');
        
        if (!saved.find(c => c.place_id === cbshop.place_id)) {
            saved.push(cbshop);
            localStorage.setItem('savedComicBookShops', JSON.stringify(saved));
            alert(`${cbshop.name} saved!`);
        } else {
            alert(`${cbshop.name} is already saved.`);
        }
    } catch (e) {
        console.error("Error saving comic book shop:", e);
        alert("Error saving comic book shop.");
    }
}

function showSaved() {
    const container = document.querySelector('.cards');
    container.innerHTML = '';
    
    try {
        const savedShops = JSON.parse(localStorage.getItem('savedComicBookShops') || '[]');
        
        if (savedShops.length === 0) {
            container.innerHTML = '<p>No saved comic book shops yet 😢</p>';
            return; 
        }
        
        savedShops.forEach(shop => {
            const card = document.createElement('div');
            card.className = 'location-card';
            card.innerHTML = `
                <img src="${shop.photo}" alt="${shop.name}" />
                <h3>${shop.name}</h3>
                <p>⭐️ Rating: ${shop.rating}</p>
                <button onclick="removeCB('${shop.place_id}')">Remove</button>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        console.error("Error loading saved shops:", e);
        container.innerHTML = '<p>Error loading saved shops 😢</p>';
    }
}

function removeCB(placeId) {
    let saved = JSON.parse(localStorage.getItem('savedComicBookShops') || '[]');

    const shopIndex = saved.findIndex(shop => shop.place_id === placeId);

    if (shopIndex !== -1) {
        saved.splice(shopIndex, 1);
        localStorage.setItem('savedComicBookShops', JSON.stringify(saved));
        showSaved(); 
        alert("Comic book shop removed!");
    }
}

function displayFinalCard(message) {
    const container = document.querySelector('.cards');
    container.innerHTML = ''; 
    
    const card = document.createElement('div');
    card.className = 'location-card';
    card.style.zIndex = 200; 
    
    card.innerHTML = `
        <img src="detectivechimp.jpg" alt="End of List" />
        <h3>${message}</h3>
        <p>Click here to go back to the beginning.</p>
    `;
    
    container.appendChild(card);

    card.addEventListener('click', () => {
        if (storesData.length > 0) {
            displayCards(storesData); 
        } else {
            getLocation();
        }
    });
}