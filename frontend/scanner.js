async function previewAndUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 1. Render immediate mobile UI preview
    const placeholder = document.getElementById('preview-placeholder');
    const previewImg = document.getElementById('preview-img');
    const resultsDiv = document.getElementById('scan-results');
    const routeIndicator = document.getElementById('route-indicator');

    placeholder.style.display = 'none';
    previewImg.src = URL.createObjectURL(file);
    previewImg.style.display = 'block';
    
    resultsDiv.innerText = "Processing Cover Math...";
    routeIndicator.style.display = 'none';

    // 2. Package the binary payload for your Java Gateway
    const formData = new FormData();
    formData.append("file", file);

    try {
        // Pointing to your gateway endpoint that orchestrates the pHash check and ML fallback
        const response = await fetch('/api/scan-cover', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        console.log("Gateway Response:", data);

        if (data.status === "success") {
            // Display the verified title returned from your Java lookup layer
            resultsDiv.innerText = `🎯 MATCH FOUND: ${data.title}`;
            
            // Show the user if the "Green AI" cached pHash layer saved server costs
            routeIndicator.innerText = `Optimization Route: ${data.optimization_route.toUpperCase()}\nCompute Footprint Saved: ${data.compute_cycles_saved}`;
            routeIndicator.style.display = 'block';
        } else {
            resultsDiv.innerText = "Match Failed. Try cleaner lighting.";
        }
    } catch (error) {
        console.error("Scanning communication breakdown:", error);
        resultsDiv.innerText = "Gateway connection error.";
    }
}