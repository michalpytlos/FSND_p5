var map;
var poiData = {
	data: {},
	setBbox: function () {
		// Set bounding box for the osm query
		var bboxNE = map.getBounds().getNorthEast();
		var bboxSW = map.getBounds().getSouthWest();
		this.bboxStr = `(${bboxSW.lat},${bboxSW.lng},${bboxNE.lat},${bboxNE.lng})`;
	},
	addAllData: function () {
		// Add osm poi data on all poi types defined in appPoiTypes to poiData.data
		var that = this;
		Object.keys(appPoiTypes).forEach(function(poiKey){
			for (i=0; i<appPoiTypes[poiKey].length; i++) {
				that.addData(poiKey, appPoiTypes[poiKey][i]);
			}
		});
	},
	addData: function (poiKey, poiValue) {
		// Add osm poi data on one poi type to poiData.data
		var nodeStr = `node[${poiKey}=${poiValue}]`;
		var that = this;
		$.ajax({
			url: 'https://www.overpass-api.de/api/interpreter' +
						'?data=[out:json][timeout:60];' +
						nodeStr + this.bboxStr + ';' +
						'out%20meta;',
			method: 'GET',
			dataType: 'json',
			success: function(osmPoiData) {
				that.data[poiValue] = osmPoiData;
				that.saveData();
				console.log('Data on ' + poiValue + ' saved to localStorage');
			},
			error: function(){
				console.log('Unsuccessful request to osm: ' + poiValue);
			},
		});
	},
	saveData: function () {
		// Save poi data to localStorage
		var that = this;
		localStorage.setItem('poiData', JSON.stringify(that.data));
	}
};

var appPoiTypes = {
	// List of all osm keys for map features: https://wiki.openstreetmap.org/wiki/Map_Features
	amenity: ["restaurant", "cafe", "pub"],
	historic: ["castle","church","monument"]
};

function initMap() {
	// Set up the map
	map = new L.Map('krakowMap');

	// Create the tile layer
	var osmUrl='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	var osmAttrib='Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors';
	var osm = new L.TileLayer(osmUrl, {minZoom: 14, maxZoom: 18, attribution: osmAttrib});

	// Start the map in Krakow with the center in Wawel
	map.setView(new L.LatLng(50.0540, 19.9354),16);
	map.addLayer(osm);

	// Get point of interest (poi) data from OpenStreetMap (osm) when running the app for the first time
	if (typeof localStorage.poiData === 'undefined') {
		poiData.setBbox();
		poiData.addAllData();
	};
}
