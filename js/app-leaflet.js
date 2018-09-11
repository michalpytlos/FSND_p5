var map;
var poiData = {
	data: {},
	dataCalls: [],
	setBbox: function () {
		// Set bounding box for the osm query
		var bboxNE = map.getBounds().getNorthEast();
		var bboxSW = map.getBounds().getSouthWest();
		this.bboxStr = `(${bboxSW.lat},${bboxSW.lng},${bboxNE.lat},${bboxNE.lng})`;
	},
	addAllData: function () {
		// Add osm poi data on all poi types defined in appPoi.types to poiData.data
		var that = this;
		Object.keys(appPoi.types).forEach(function(poiKey){
			for (i=0; i<appPoi.types[poiKey].length; i++) {
				// Push jqXHR (deferred) returned by $.ajax() to dataCalls for further use with $.when()
				that.dataCalls.push(that.addData(poiKey, appPoi.types[poiKey][i]));
			}
		});
	},
	addData: function (poiKey, poiValue) {
		// Add osm poi data on one poi type to poiData.data
		var nodeStr = `node[${poiKey}=${poiValue}]`;
		var that = this;
		return $.ajax({
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

var appPoi = {
	types: {
		// Pre-defined poi types available in the app. The types conform to the osm format.
		// Reference: list of all osm keys for map features: https://wiki.openstreetmap.org/wiki/Map_Features
		amenity: ["restaurant", "cafe", "pub"],
		//historic: ["castle","church","monument"]
	},
	layerGroups: {},
	addAllPoi: function () {
		// Retrieve all poi data
		that = this;
		var appPoiData = JSON.parse(localStorage.poiData);
		var poiGroup;
		// Add all poi to the appropriate layer groups
		Object.keys(appPoiData).forEach(function(poiType){
			// Add all poi of a given type to a layer
			that.layerGroups[poiType] = new L.LayerGroup();
			poiGroup = appPoiData[poiType].elements;
			for (i = 0; i < poiGroup.length; i++) {
				that.addPoi(poiGroup[i], poiType, that.layerGroups[poiType]);
			};
			// Add layer group to map
			that.layerGroups[poiType].addTo(map);
		});
	},
	addPoi: function (myPoi, poiType, layerGroup) {
		// Add one poi marker to layer group
		var myMarker = L.marker([myPoi.lat, myPoi.lon]);
		var popupContent = `<strong>${myPoi.tags.name}</strong> <br />
		${poiType} <br />
		${myPoi.tags["addr:street"]} ${myPoi.tags["addr:housenumber"]}, ${myPoi.tags["addr:city"]}`;
		myMarker.bindPopup(popupContent).openPopup();
		myMarker.addTo(layerGroup);
	}
}

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

	// Add all poi to map
	if (typeof localStorage.poiData === 'undefined') {
		// Get point of interest (poi) data from OpenStreetMap (osm) when running the app for the first time
		poiData.setBbox();
		poiData.addAllData();
		// Proceed with adding poi to map only after all poi data has been saved to localStorage
		$.when.apply($, poiData.dataCalls).then(function(){
			appPoi.addAllPoi();
		});
	} else {
		// Add poi to map
		appPoi.addAllPoi();
	}
}
