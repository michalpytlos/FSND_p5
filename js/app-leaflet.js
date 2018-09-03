var map;

function initMap() {
	// Set up the map
	map = new L.Map('krakowMap');

	// Create the tile layer
	var osmUrl='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	var osmAttrib='Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors';
	var osm = new L.TileLayer(osmUrl, {minZoom: 12, maxZoom: 18, attribution: osmAttrib});

	// Start the map in Krakow with the center in Wawel
	map.setView(new L.LatLng(50.0540, 19.9354),12);
	map.addLayer(osm);
}
