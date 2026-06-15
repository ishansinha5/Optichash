async function previewAndUpload(event) {
    const file = event.target.files[0];
    
    if (file === undefined) {
        return;
    }

    // 1. Render immediate mobile UI preview
    const placeholder = document.getElementById("preview-placeholder");
    const previewImg = document.getElementById("preview-img");
    const resultsDiv = document.getElementById("scan-results");
    const routeIndicator = document.getElementById("route-indicator");
    const linkElement = document.getElementById("comic-locg-link");

    placeholder.style.display = "none";
    previewImg.src = URL.createObjectURL(file);
    previewImg.style.display = "block";
    resultsDiv.innerText = "Processing Cover Math...";
    routeIndicator.style.display = "none";
    linkElement.style.display = "none";

    // 2. Package the binary payload
    const formData = new FormData();
    formData.append("file", file);

    try {
        // CRITICAL FIX: Explicitly target your local FastAPI endpoint
        const response = await fetch("http://localhost:8000/process", {
            method: "POST",
            body: formData
        });
        
        const data = await response.json();
        console.log("Gateway Response:", data);

        if (data.status === "success") {
            // Display title if available, otherwise display the raw model class ID
            const matchName = data.title !== undefined ? data.title : "Class ID " + data.predicted_id;
            resultsDiv.innerText = " MATCH FOUND: " + matchName;
            
            routeIndicator.innerText = "Optimization Route: " + data.optimization_route.toUpperCase() + "\nCompute Footprint Saved: " + data.compute_cycles_saved;
            routeIndicator.style.display = "block";

            if (data.url !== undefined) {
                linkElement.href = data.url;
                linkElement.style.display = "block";
            }
        } else {
            resultsDiv.innerText = "Match Failed. Try cleaner lighting.";
        }
    } catch (error) {
        console.error("Scanning communication breakdown:", error);
        resultsDiv.innerText = "Gateway connection error.";
    }
}