/** Container for the app */
var P5 = {};


/**
* Pre-defined poi types available in the app.
* The types conform to the osm format.
* Reference: list of all osm keys for map features: https://wiki.openstreetmap.org/wiki/Map_Features
*/
P5.poiTypes = {
	amenity: ["restaurant", "cafe", "pub", "fast_food"],
};


/** Default location */
P5.defLocation = {
	country: 'United Kingdom',
	city: 'London',
	street: '1 Oxford Street'
};


/**
* Create destination point given start point, distance and bearing.
* Mathematical formulation after http://www.movable-type.co.uk/scripts/latlong.html
*
* @constructor
* @param {number} lat1D - Latitude of start point in degrees.
* @param {number} lon1D - Longitude of start point in degrees.
* @param {number} dist - Distance in metres.
* @param {number} bearingD - Bearing in degrees.
*/
P5.DestPoint = function (lat1D, lon1D, dist, bearingD) {
	// Convert bearing and coordinates of start point to radians
	var lat1 = lat1D * (Math.PI / 180);
	var lon1 = lon1D * (Math.PI / 180);
	var bearing =  bearingD * (Math.PI / 180);
	// Earth radius in m
	var earthR = 6371e3;
	// Angular distance from start to destination
	var angDist = dist / earthR
	// Calculate latitude of destination point
	var sinLat2 = Math.sin(lat1)*Math.cos(angDist)+Math.cos(lat1)*Math.sin(angDist)*Math.cos(bearing);
	var lat2 = Math.asin(sinLat2); // destination latitude
	// Calculate longitude of destination point
	var y = Math.sin(bearing)*Math.sin(angDist)*Math.cos(lat1);
	var x = Math.cos(angDist)-Math.sin(lat1)*Math.sin(lat2);
	var lon2 = lon1 + Math.atan2(y, x);
	// Convert coordinates of destination point to angles and normalize longitude to -180 +180
	this.lat = lat2 * (180 / Math.PI);
	this.lon = (lon2 * (180 / Math.PI) + 540) % 360 - 180;
}


/**  Container holding properties and methods required to fetch and store poi data from osm */
P5.poiData = {
	data: {},
	dataCalls: []
}


/**
* Construct bboxStr ready to be used in query to overpass api.
*
* @param {number} latC - Latitude of the bbox centre point.
* @param {number} lonC - Longitude of the bbox centre point.
*/
P5.poiData.setBbox = function (latC, lonC) {
	var a = 1500; // bbox width and height in m
	var halfDiag = Math.sqrt(2) * a / 2; // distance from centre to corner of bbox
	var cornerSW = new P5.DestPoint (latC, lonC, halfDiag, 225); // SW corner of bbox
	var cornerNE = new P5.DestPoint (latC, lonC, halfDiag, 45); // NE corner of bbox
	this.bboxStr = `(${cornerSW.lat},${cornerSW.lon},${cornerNE.lat},${cornerNE.lon})`;
}


/** Fetch osm poi data on all poi types defined in P5.poiTypes */
P5.poiData.addAllData = function () {
	var that = this;
	Object.keys(P5.poiTypes).forEach(function(poiKey){
		for (i=0; i<P5.poiTypes[poiKey].length; i++) {
			// Push jqXHR (deferred) returned by $.ajax() to dataCalls for further use with $.when()
			that.dataCalls.push(that.addData(poiKey, P5.poiTypes[poiKey][i]));
		}
	});
}


/**
* Fetch poi data on one poi type from osm
*
* @param {string} poiKey - poi primary type e.g. amenity
* @param {string} poiValue - poi type e.g. pub
*/
P5.poiData.addData = function (poiKey, poiValue) {
	//
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
			that.purgeOsmPoiData(osmPoiData);
			that.data[poiValue] = osmPoiData;
			that.saveData();
			console.log('Data on ' + poiValue + ' saved to localStorage');
		},
		error: function(){
			window.alert('Unsuccessful request to Overpass API (' + poiValue + '). Data could not be downloaded.');
		},
	});
}


/** Save poi data to localStorage */
P5.poiData.saveData = function () {
	var that = this;
	localStorage.setItem('P5_poiData', JSON.stringify(that.data));
}


/**
* Geocode location.
*
* @param {object} queryParams - Address of location in format ready to be used in query to Nominatim.
*/
P5.poiData.geocodeLoc = function(queryParams){
	queryParams['format'] = 'json';
	queryParams['addressdetails'] = 1;
	return $.ajax({
		url: 'https://nominatim.openstreetmap.org/search',
		method: 'GET',
		data: queryParams,
		dataType: 'json',
		success: function(data) {
			if (data.length > 0) {
				localStorage.setItem('P5_location', JSON.stringify(data[0]));
				console.log('Location metadata saved to localStorage');
				P5.poiData.setBbox(data[0].lat, data[0].lon);
				P5.poiData.addAllData();
				P5.map.init();
			} else {
				window.alert('Location not found! Please check the address and try again.');
			};
		},
		error: function(){
			window.alert('Unsuccessful request to Nominatim. The location could not be geocoded.');
		},
	});
}

/**
* Build address object to be used in query to Nominatim.
*
* @param {object} addressForm - HTML form with address data.
* @returns {object} Address object.
*/
P5.poiData.buildAddress = function(addressForm) {
	if (addressForm === null) {
		return P5.defLocation
	} else {
		var addressFields = ["country", "city", "street", "postalcode"]; // same as in html
		var address = {};
		for (i = 0; i < addressFields.length; ++i) {
			if (addressForm.elements.namedItem(addressFields[i]).value.length > 0) {
				address[addressFields[i]] = addressForm.elements.namedItem(addressFields[i]).value;
			}
		};
		return address
	}
}

/**
* Remove all poi without a name from the data.
*
* @param {object} osmPoiData - poi data from osm.
*/
P5.poiData.purgeOsmPoiData = function(osmPoiData) {
	for (i = osmPoiData.elements.length -1; i >= 0; --i) {
		if (typeof osmPoiData.elements[i].tags.name === 'undefined' || !osmPoiData.elements[i].tags.name){
			osmPoiData.elements.splice(i, 1);
		}
	}
}


/** Container holding all map layers, leaflet map object and methods relevant to them */
P5.map = {
	address: {
		country: ko.observable(null),
		city: ko.observable(null),
		street: ko.observable(null)
	},
	leafMap: new L.Map('myLocation', {zoomControl: true}),
	layers: ko.observableArray([]),
	selectedMarker: null,
	markerDict: {}, // dictionary with marker_id: marker pairs
	icons: {
		stdIcon: L.divIcon({
			 className:'std-marker-icon',
			 html:'<i class="material-icons" style="font-size:36px">place</i>',
			 iconAnchor: [18,36],
			 popupAnchor: [0,-32]
		}),
		selIcon: L.divIcon({
			 className:'selected-marker-icon',
			 html:'<i class="material-icons" style="font-size:36px">place</i>',
			 iconAnchor: [18,36],
			 popupAnchor: [0,-32]
		})
	}
};


/** Initialize the map. */
P5.map.init = function () {
	that = this;

	// Create tile layer
	var osmUrl='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	var osmAttrib='Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors';
	var osm = new L.TileLayer(osmUrl, {minZoom: 14, maxZoom: 18, attribution: osmAttrib});
	// Load location data from localStorage
	var location = JSON.parse(localStorage.P5_location);
	// Save address
	if (typeof location.address.road !== 'undefined' || location.address.road) {
		that.address.street(location.address.road);
	} else {
		that.address.street(null);
	};
	that.address.country(location.address.country);
	that.address.city(location.address.city);
	// Set starting location
	that.leafMap.setView(new L.LatLng(location.lat, location.lon),16);
	// Add tile layer to map
	that.leafMap.addLayer(osm);
	// Position zoom controller on map
	that.leafMap.zoomControl.setPosition('bottomright');
	// Reset layers array
	that.layers([]);
	// Add poi data to map and to layers
	that.loadData();
}


/** Add poi data to leaflet map and map.layers. */
P5.map.loadData = function () {
	that = this;
	// If the data is being downloaded, wait for all the ajax calls to resolve before proceeding
	$.when.apply($, P5.poiData.dataCalls).then(function(){
		console.log('hello');
		// Load poi data from localStorage
		var appPoiData = JSON.parse(localStorage.P5_poiData);
		// Add poi data to map and to map.layers
		Object.keys(appPoiData).forEach(function(poiType){
			// Create new layer
			var layer = new P5.Layer(poiType);
			// Create and add to layer all markers of the corresponding type
			layer.addMarkers(appPoiData[poiType].elements);
			// Add layer to map.layers
			that.layers.push(layer);
			// Add leaflet layer to map
			layer.leafLayer.addTo(P5.map.leafMap);
		});
	});
}


/**
* Update container holding marker marked as selected and inform marker that it has been selected.
* @param {object} marker - marker object selected by user.
*/
P5.map.toggleMarker = function(marker) {
	// Save previously selected marker and unselect it
	unselMarker = this.selectedMarker;
	this.unselectMarker();
	// Select passed marker if new
	if (marker !== unselMarker) {
		marker.leafMarker.setIcon(P5.map.icons.selIcon);
		marker.selected(true);
		this.selectedMarker = marker;
	};
};


/** Unselect currently selected marker. */
P5.map.unselectMarker = function () {
	if (this.selectedMarker !== null) {
		marker = this.selectedMarker;
		marker.leafMarker.setIcon(P5.map.icons.stdIcon);
		marker.selected(false);
		this.selectedMarker = null;
	};
};


/**
* Update leaflet layers:
* active layers are added to the map (if not present).
* non-active layers are removed from the map (if present).
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


/**
* Update leaflet markers:
* markers not satysfying the search criterion are removed from the map and marked as non-active (if present)
* markers satysfying the search criterion are added to the map and marked as active (if not present)
*/
P5.map.updateMarkers = function (searchPhrase) {
	that = this;
	that.layers().forEach(function(layer){
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
	});
}

/**
* Create marker.
*
* @constructor
* @param {object} data - Container with information about the marker obtained from osm.
* @param {string} poiType - Name of the layer the marker belongs to.
* @param {string} markerId - Id of the marker.
*/
P5.Marker = function (data, poiType, markerId){
	this.name = ko.observable(data.tags.name);
	this.active = ko.observable(true);
	this.selected = ko.observable(false);
	this.leafMarker = L.marker([data.lat, data.lon], {icon: P5.map.icons.stdIcon});
	this.leafMarker.idParent = markerId;
	this.popupContent = `<strong>${data.tags.name}</strong> <br />${poiType}`;
	// Bind popup to marker
	this.leafMarker.bindPopup(this.popupContent).openPopup();
}

/**
* Create layer.
*
* @constructor
* @param {string} name - Name of the layer.
*/
P5.Layer = function(name) {
	this.name = ko.observable(name);
	this.active = ko.observable(true);
	this.collapsed = ko.observable(true);
	this.leafLayer = new L.LayerGroup();
	this.markers = ko.observableArray([]);
	this.info = ko.computed(function(){
		var activeMarkers = 0; // number of active markers in this layer
		for (i = 0; i < this.markers().length; ++i) {
			if (this.markers()[i].active() === true) {
				++activeMarkers;
			}
		};
		return this.name() + ' (' + activeMarkers + ')'
	}, this);
}


/**
* Create and then add to this layer all markers of the appropriate type.
* @param {object} data - Container with poi data from osm.
*/
P5.Layer.prototype.addMarkers = function(data){
	for (i = 0; i < data.length; i++) {
		// create new poi marker
		markerId = this.name() + i;
		var marker = new P5.Marker(data[i], this.name(), markerId);
		// add leaflet marker to leaflet layerGroup
		// attach toggleMarker() to leaflet marker so click on marker = click on the corresponding poi list item
		marker.leafMarker.addTo(this.leafLayer).on('click', function(){
			marker = P5.map.markerDict[this.idParent]; // this = clicked leafMarker
			P5.map.toggleMarker(marker);
		});
		// add marker to this layer
		this.markers().push(marker);
		// add marker to dictionary
		P5.map.markerDict[markerId] = marker;
	};
}

/**
* Create knockout.js viewModel.
*
* @constructor
*/
P5.ViewModel = function() {
	self = this;
	this.map = P5.map;
	this.sideBar = ko.observable(true); // visibility flag for the side bar
	// Update leaflet map layers
	this.updateLayers = function() {
		P5.map.updateLayersMap();
		return true; // need to return true for checked binding to work
	};
	// Filter poi by name
	this.searchMarkers = function (formElement) {
		P5.map.unselectMarker();
		P5.map.updateMarkers(formElement.elements.namedItem("searchPhrase").value);
	};
	// Toggle visibility of poi list for the given poi type in the side menu
	this.toggleList = function (layer) {
		layer.collapsed(!layer.collapsed());
	};
	// Toggle visibility of the side bar
	this.toggleSidebar = function () {
		self.sideBar(!self.sideBar());
		console.log(self.sideBar());
	};
	// Update container holding marker marked as selected and inform marker that it has been selected
	this.toggleMarker = function(marker) {
		P5.map.toggleMarker(marker);
		// toggle map popup
		marker.leafMarker.togglePopup();
	};
	// Initialize the app with location and poi data
	this.loadLocation = function(addressForm = null) {
		if (addressForm !== null || typeof localStorage.P5_poiData === 'undefined') {
			// Load new location
			// If addressForm === null, loads default location
			// P5.map.init() is invoked by P5.poiData.geocodeLoc() on success
			address = P5.poiData.buildAddress(addressForm);
			P5.poiData.dataCalls.push(P5.poiData.geocodeLoc(address));
		} else {
			// Load location saved in localStorage
			P5.map.init();
		}
	}
};

// Create viewModel and activate knockout
P5.viewModel = new P5.ViewModel();
P5.viewModel.loadLocation();
ko.applyBindings(P5.viewModel);
