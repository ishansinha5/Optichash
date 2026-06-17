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
        // [DEV MODE]: Pointing to the local Java Spring Boot Gateway
        const response = await fetch("http://localhost:8080/process", {
            method: "POST",
            body: formData
        });
        
        // [PROD MODE]: Pointing to the live cloud Edge Engine
        // const response = await fetch("https://ishansinha05-optichash-engine.hf.space/process", {
        //     method: "POST",
        //     body: formData
        // });
        
        const data = await response.json();
        console.log("Gateway Response:", data);

        if (data.status === "success" || data.status === "cached_hit") {
            // Display title if available, otherwise display the raw model class ID
            let matchName = "";
            if (data.title !== undefined) {
                matchName = data.title;
            } else {
                matchName = "Class ID " + data.predicted_id;
            }

            resultsDiv.innerText = " MATCH FOUND: " + matchName;
            
            routeIndicator.innerText = "Optimization Route: " + data.optimization_route.toUpperCase() + "\nCompute Footprint Saved: " + data.compute_cycles_saved;
            routeIndicator.style.display = "block";

            if (data.url !== undefined) {
                linkElement.href = data.url;
                linkElement.style.display = "block";
            }
        } else if (data.status === "error") {
            let errorImageHtml = "";
            
            // Check if the backend threw the threshold rejection (Low confidence)
            if (data.message.includes("Low confidence")) {
                errorImageHtml = `<img src="assets/images/confusedspidey.jpg" alt="Confused Spider-Man" style="display: block; margin: 0 auto 15px auto; max-width: 180px; border-radius: 8px; border: 2px solid #dc3545;"><br>`;
            } 
            // Check if the backend successfully recognized it as an invalid comic (Junk class)
            else if (data.message.includes("generic background noise")) {
                errorImageHtml = `<img src="assets/images/detectivechimp.jpg" alt="Detective Chimp" style="display: block; margin: 0 auto 15px auto; max-width: 180px; border-radius: 8px; border: 2px solid #facc15;"><br>`;
                // Override the backend message with something more user-friendly
                data.message = "Clear scan, but this comic is not in our authorized database!";
            }

            // Render the image and the error text to the screen
            resultsDiv.innerHTML = `${errorImageHtml}<span style="color: #dc3545;">${data.message}</span>`;
            
            // Hide the LOCG link and route indicator on errors
            routeIndicator.style.display = "none";
            linkElement.style.display = "none";
        }
    } catch (error) {
        console.error("Scanning communication breakdown:", error);
        resultsDiv.innerText = "Gateway connection error.";
    }
}