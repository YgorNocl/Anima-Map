import stores from './stores.js';

mapboxgl.accessToken = 'pk.eyJ1IjoieWdvcnJlY3VydCIsImEiOiJjbWNtdjY3cTcwMDZoMmpvZTgxYWlnbnUwIn0.KgS223QEccA73ATBPduGXg';

const map = new mapboxgl.Map({
    container: 'map',
    center: [-46.6333, -23.5505],
    zoom: 10,
    minZoom: 4,
    maxZoom: 18,
    maxBounds: [[-74.0, -34.0], [-32.0, 5.0]],
});

map.addControl(new mapboxgl.NavigationControl());

stores.features.forEach((store, i) => {
    store.properties.id = i;
});

function buildLocationList(features) {
    const listingsView = document.getElementById('listings');
    listingsView.innerHTML = '';

    if (features.length === 0) {
        listingsView.innerHTML = '<p class="empty-list">Nenhuma unidade encontrada para esta região.</p>';
        return;
    }

    for (const feature of features) {
        const listing = listingsView.appendChild(document.createElement('div'));
        listing.id = `listing-${feature.properties.id}`;
        listing.className = 'item';

        const logoContainer = listing.appendChild(document.createElement('div'));
        logoContainer.className = 'item-logo';
        const logo = logoContainer.appendChild(document.createElement('img'));
        logo.src = feature.properties.logo;
        logo.alt = `Logo ${feature.properties.institution}`;
        logo.onerror = (e) => { e.target.style.display = 'none'; };

        const detailsContainer = listing.appendChild(document.createElement('div'));
        detailsContainer.className = 'item-details';

        const link = detailsContainer.appendChild(document.createElement('a'));
        link.className = 'title';
        link.innerHTML = feature.properties.address;

        const details = detailsContainer.appendChild(document.createElement('div'));
        details.className = 'city';
        details.innerHTML = feature.properties.city;

        listing.addEventListener('click', () => {
            map.flyTo({ center: feature.geometry.coordinates, zoom: 15 });
            document.querySelectorAll('.listings .item.active').forEach(item => item.classList.remove('active'));
            listing.classList.add('active');
        });
    }
}

function filterByRegion(regionName) {
    const filter = regionName === 'Todos' ? null : ['==', ['get', 'region'], regionName];
    map.setFilter('points', filter);

    const filteredFeatures = regionName === 'Todos'
        ? stores.features
        : stores.features.filter(store => store.properties.region === regionName);

    buildLocationList(filteredFeatures);
}

map.on('load', () => {
    const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        placeholder: 'Pesquisar endereço'
    });
    document.getElementById('geocoder-container').appendChild(geocoder.onAdd(map));
    
  const institutionImages = {
        'São Judas': './assets/marker/marker.png', 'Anhembi Morumbi': './assets/marker/marker_AMO.png',
        'FASEH': './assets/marker/marker_FASEH.png', 'IBMR': './assets/marker/marker_IBMR.png',
        'UniBH': './assets/marker/marker_UNIBH.png', 'Una': './assets/marker/marker_UNA.png',
        'FADERGS': './assets/marker/marker_FADERGS.png', 'Unicuritiba': './assets/marker/marker_UNICURITIBA.png',
        'UniRitter': './assets/marker/marker_UNIRITTER.png', 'UniSociesc': './assets/marker/marker_UNISOCIESC.png',
        'UNISUL': './assets/marker/marker_UNISUL.png', 'AGES': './assets/marker/marker_AGES.png',
        'FPB': './assets/marker/marker_FPB.png', 'UNIFG': './assets/marker/marker_UNIFG.png',
        'UNIFGG': './assets/marker/marker_UNIFGG.png', 'UNIFACS': './assets/marker/marker_UNIFACS.png',
        'UnP': './assets/marker/marker_UNP.png',
    };

    const imageLoadPromises = Object.entries(institutionImages).map(([name, url]) =>
        new Promise((resolve, reject) => {
            map.loadImage(url, (error, image) => {
                if (error) return reject(error);
                map.addImage(name, image);
                resolve();
            });
        })
    );

    Promise.all(imageLoadPromises).then(() => {
        map.addSource('places', { type: 'geojson', data: stores });
        map.addLayer({
            id: 'points',
            type: 'symbol',
            source: 'places',
            layout: {
                'icon-image': [
                    'match', ['get', 'institution'],
                    ...Object.keys(institutionImages).flatMap(name => [name, name]),
                    'São Judas'
                ],
                'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.2, 12, 0.3],
                'icon-allow-overlap': true
            }
        });
        buildLocationList(stores.features);
    }).catch(error => console.error("Erro ao carregar mapa/imagens:", error));

    map.on('click', 'points', (e) => {
        const feature = e.features[0];
        map.flyTo({ center: feature.geometry.coordinates, zoom: 15 });

        const listing = document.getElementById(`listing-${feature.properties.id}`);
        if (listing) {
            document.querySelectorAll('.listings .item.active').forEach(item => item.classList.remove('active'));
            listing.classList.add('active');
            listing.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });

    map.on('mouseenter', 'points', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'points', () => { map.getCanvas().style.cursor = ''; });

    const filterButtons = document.querySelectorAll('#region-filters .region-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const targetButton = e.currentTarget;
            const region = targetButton.dataset.region;
            const center = JSON.parse(targetButton.dataset.center);
            const zoom = JSON.parse(targetButton.dataset.zoom);

            map.flyTo({ center, zoom });
            filterByRegion(region);

            filterButtons.forEach(btn => btn.classList.remove('active'));
            targetButton.classList.add('active');
        });
    });
});

document.getElementById('toggleSidebar').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('collapsed');
});