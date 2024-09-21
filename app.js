const map = L.map('map').setView([51.505, -0.09], 13); // Centered on London
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; Navguard 2024'
}).addTo(map);

const routingControl = L.Routing.control({
    waypoints: [],
    routeWhileDragging: true,
    geocoder: L.Control.Geocoder.nominatim(),
    createMarker: function() { return null; }, // Disable default markers
    router: L.Routing.osrmv1({ // Use OSRM router for avoidance feature
        serviceUrl: 'https://router.project-osrm.org/route/v1'
    }),
}).addTo(map);

let crimeAreas = [];  // To hold high-crime circles
let crimeMarkers = []; // To hold individual crime markers

// Function to fetch crime data and highlight high-crime areas
async function fetchCrimeData(bounds) {
    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();
    const url = `https://data.police.uk/api/crimes-street/all-crime?lat=${(southWest.lat + northEast.lat) / 2}&lng=${(southWest.lng + northEast.lng) / 2}`;
    const crimeListElement = document.getElementById('crime-list');
    crimeListElement.innerHTML = ''; // Clear previous crime data

    try {
        const response = await fetch(url);
        let crimes = await response.json();

        // Limit crimes to 100 for performance
        crimes = crimes.slice(0, 100);

        if (crimes.length === 0) {
            crimeListElement.innerHTML = '<li>No crimes reported in this area.</li>';
        } else {
            const crimeCoords = {};
            crimes.forEach(crime => {
                const lat = crime.location.latitude;
                const lng = crime.location.longitude;
                const street = crime.location.street.name;

                // Add markers for individual crimes
                const marker = L.marker([lat, lng]).addTo(map);
                marker.bindPopup(`<strong>${crime.category}</strong><br>Location: ${street}`);
                crimeMarkers.push(marker); // Add to the list of markers

                // Track crimes per location to identify high-crime areas
                const key = `${lat},${lng}`;
                if (!crimeCoords[key]) {
                    crimeCoords[key] = { count: 1, lat, lng, street };
                } else {
                    crimeCoords[key].count += 1;
                }

                const li = document.createElement('li');
                li.innerHTML = `<strong>${crime.category}</strong> on ${street}`;
                crimeListElement.appendChild(li);
            });

            // Process crimeCoords to highlight high-crime areas
            highlightCrimeAreas(crimeCoords);
        }
    } catch (error) {
        console.error('Error fetching crime data:', error);
    }
}

// Function to highlight high-crime areas on the map
function highlightCrimeAreas(crimeCoords) {
    // Clear existing crime areas
    crimeAreas.forEach(area => map.removeLayer(area));
    crimeAreas = [];

    Object.values(crimeCoords).forEach(coord => {
        if (coord.count > 3) { // Example threshold for high-crime areas
            const circle = L.circle([coord.lat, coord.lng], {
                color: 'red',
                fillColor: '#f03',
                fillOpacity: 0.5,
                radius: 200
            }).addTo(map);

            crimeAreas.push(circle); // Store circle to remove later
        }
    });
}

// Set up initial crime data fetch based on current map bounds
map.on('moveend', () => {
    const bounds = map.getBounds();
    fetchCrimeData(bounds);
});

// Initial fetch of crime data
fetchCrimeData(map.getBounds());
