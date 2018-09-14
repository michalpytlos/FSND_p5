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
	this.loadData();
}


/** Method for map.  Load poi data to leaflet map and map.layers. Fetch data from osm if no poi data. */
P5.map.loadData = function () {
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
			// Create and add to layer all markers of the corresponding type
			myLGroup.addMarkers(appPoiData[poiType].elements);
			// Add layer group to map.layers
			that.layers.push(myLGroup);
			// Add layer group to map
			myLGroup.leafLayer.addTo(P5.map.leafMap);
		});
	});
}


/** Method for map.
* Update leaflet layers:
* active layers are added to the map (if not present)
* non-active layers are removed from the map (if present)
*/
P5.map.updateLayersMap = function () {
	that = this;
	that.layers().forEach(function(layer){
		if (!layer.active() && that.leafMap.hasLayer(layer.leafLayer)){
			layer.leafLayer.removeFrom(that.leafMap);
		} else if (layer.active() && !that.leafMap.hasLayer(layer.leafLayer)) {
			layer.leafLayer.addTo(that.leafMap);
		}
	});
}


/** Method for map.
* Update leaflet markers:
* markers not satysfying the search criterion are removed from the map and marked as non-active (if present)
* markers satysfying the search criterion are added to the map and marked as active (if not present)
*/
P5.map.updateMarkersMap = function (searchPhrase) {
	that = this;
	that.layers().forEach(function(layer){
		if (layer.active()) {
			layer.markers().forEach(function(marker){
				try {
					hasPhrase = marker.name().toLowerCase().indexOf(searchPhrase.toLowerCase());
				}
				catch (err) {
					console.log(err.name);
					hasPhrase = -1;
				}
				hasMarker = layer.leafLayer.hasLayer(marker.leafMarker);
				if (hasMarker && hasPhrase === -1) {
					marker.leafMarker.removeFrom(layer.leafLayer);
					marker.active(false);
				} else if (!hasMarker && hasPhrase !== -1){
					marker.leafMarker.addTo (layer.leafLayer);
					marker.active(true);
				}
			});
		};
	});
}


/** Marker constructor */
P5.Marker = function (data, poiType){
	this.name = ko.observable(data.tags.name);
	this.active = ko.observable(true);
	this.leafMarker = L.marker([data.lat, data.lon]);
	this.popupContent = `<strong>${data.tags.name}</strong> <br />${poiType}`;
	// Bind popup to marker
	this.leafMarker.bindPopup(this.popupContent).openPopup();
}


/** Layer constructor */
P5.Layer = function (name){
	this.name = ko.observable(name);
	this.active = ko.observable(true);
	this.leafLayer = new L.LayerGroup();
	this.markers = ko.observableArray([]);
}


/** Method for Layer objects. Create and add to this layer all markers of the appropriate type  */
P5.Layer.prototype.addMarkers = function(data){
	for (i = 0; i < data.length; i++) {
		// create new poi marker
		var marker = new P5.Marker(data[i], this.name());
		// add leaflet marker to leaflet layerGroup
		marker.leafMarker.addTo(this.leafLayer);
		// add marker to this layer
		this.markers().push(marker);
	};
}


/** knockout.js viewModel constructor */
P5.viewModel = function() {
	this.map = P5.map;
	this.updateLayers = function() {
		P5.map.updateLayersMap();
		return true; // need to return true for checked binding to work
	};
	this.searchMarkers = function (formElement) {
		P5.map.updateMarkersMap(formElement.elements.namedItem("searchPhrase").value);
	};
	P5.map.init();
};


ko.applyBindings(new P5.viewModel());
