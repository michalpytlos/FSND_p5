'use strict';
/**
* Pre-defined poi types available in the app.
* The types conform to the OSM format.
* Reference: list of all OSM keys and values for map features: https://wiki.openstreetmap.org/wiki/Map_Features
*
* To add new poi types to the app, follow the exisiting format:
* OSM keys such as "amenity" or "shop" are properties of POI_TYPES each with its value
* set to a list of poi types, referred to as values on OSM, which belong to this OSM key
* and are to be used in the app.
*/
const POI_TYPES = {
	amenity: ["restaurant", "cafe", "pub", "fast_food"],
  //shop: ["bakery", "greengrocer"] // Example addtional poi types; uncomment the line to add them to the app.
};


/** Default location */
const DEFAULT_LOCATION = {
	country: 'United Kingdom',
	city: 'London',
	street: '1 Oxford Street'
};
