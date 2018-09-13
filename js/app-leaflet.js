/** Container for the app */
var P5 = {};


/**
* Pre-defined poi types available in the app.
* The types conform to the osm format.
* Reference: list of all osm keys for map features: https://wiki.openstreetmap.org/wiki/Map_Features
*/
P5.poiTypes = {
	amenity: ["restaurant", "cafe", "pub"],
	//historic: ["castle","church","monument"]
};


/**  Container holding properties and methods required to fetch and store poi data from osm */
P5.poiData = {
	data: {},
	dataCalls: [],
	setBbox: function () {
		// Set bounding box for the osm query
		var bboxNE = P5.map.leafMap.getBounds().getNorthEast();
		var bboxSW = P5.map.leafMap.getBounds().getSouthWest();
		this.bboxStr = `(${bboxSW.lat},${bboxSW.lng},${bboxNE.lat},${bboxNE.lng})`;
	},
	addAllData: function () {
		// Fetch osm poi data on all poi types defined in poiTypes
		var that = this;
		Object.keys(P5.poiTypes).forEach(function(poiKey){
			for (i=0; i<P5.poiTypes[poiKey].length; i++) {
				// Push jqXHR (deferred) returned by $.ajax() to dataCalls for further use with $.when()
				that.dataCalls.push(that.addData(poiKey, P5.poiTypes[poiKey][i]));
			}
		});
	},
	addData: function (poiKey, poiValue) {
		// Fetch poi data on one poi type from osm
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


/** Container holding all map layers, leaflet map object and methods relevant to them */
P5.map = {
	leafMap: new L.Map('krakowMap'),
	layers: ko.observableArray([])
};


/** Method for map. Initialize the map. */
P5.map.init = function () {
	// Create the tile layer
	var osmUrl='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	var osmAttrib='Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors';
	var osm = new L.TileLayer(osmUrl, {minZoom: 14, maxZoom: 18, attribution: osmAttrib});

	// Start the map in Krakow with the center in Wawel
	this.leafMap.setView(new L.LatLng(50.0540, 19.9354),16);
	this.leafMap.addLayer(osm);

	// add poi data to map and to layers
	this.loadPoiData();
}


/** Method for map.  Load poi data to leaflet map and map.layers. Fetch data from osm if missing. */
P5.map.loadPoiData = function () {
	that = this;
	if (typeof localStorage.poiData === 'undefined') {
		// Get point of interest (poi) data from OpenStreetMap (osm) when running the app for the first time
		P5.poiData.setBbox();
		P5.poiData.addAllData();
	};
	// If the data is being downloaded, wait for all the ajax calls to resolve before proceeding
	$.when.apply($, P5.poiData.dataCalls).then(function(){
		// Load poi data from localStorage
		var appPoiData = JSON.parse(localStorage.poiData);
		// Load poi data to map and to map.layers
		Object.keys(appPoiData).forEach(function(poiType){
			// Create new layer group
			var myLGroup = new P5.Layer(poiType);
			// Create and add to layer group all markers of the corresponding type
			myLGroup.addAllMarkers(appPoiData[poiType].elements);
			// Add layer group to map.layers
			that.layers.push(myLGroup);
			// Add layer group to map
			myLGroup.leafObj.addTo(P5.map.leafMap);
		});
	});
}


/** Marker constructor */
P5.Marker = function (data, poiType){
	this.name = ko.observable(data.tags.name);
	this.active = ko.observable(true);
	this.leafObj = L.marker([data.lat, data.lon]);
	this.popupContent = `<strong>${data.tags.name}</strong> <br />${poiType}`;
	// Bind popup to marker
	this.leafObj.bindPopup(this.popupContent).openPopup();
}


/** Layer constructor */
P5.Layer = function (name){
	this.name = ko.observable(name);
	this.active = ko.observable(true);
	this.leafObj = new L.LayerGroup();
	this.markers = ko.observableArray([]);
}


/** Method for Layer objects. Create and add to this layer all markers of the appropriate type  */
P5.Layer.prototype.addAllMarkers = function(data){
	for (i = 0; i < data.length; i++) {
		// create new poi marker
		marker = new P5.Marker(data[i], this.name());
		// add leaflet marker to leaflet layerGroup
		marker.leafObj.addTo(this.leafObj);
		// add marker to th
		this.markers().push(marker);
	};
}


/** knockout.js viewModel constructor */
P5.viewModel = function() {
	this.layers = P5.map.layers;
	P5.map.init();
};


ko.applyBindings(new P5.viewModel());
