# P5
Project 5 of the Full Stack Nanodegree <br>
Michal Pytlos, October 2018

## 1. Overview
### 1.1. Program features
P5 is a tool for searching for places of interest (poi) in a chosen area. The application lists and shows on a map restaurants, cafes and pubs within the walking distance of the address specified by the user. The poi can be filtered by name and type.

### 1.2. Key design features
* Single-page application
* Built with:
  * [Knockout](https://knockoutjs.com/)
  * [Leaflet](https://leafletjs.com/reference-1.3.4.html)
  * [Bootstrap 3](https://getbootstrap.com/docs/3.3/)
* Map data obtained from [OpenStreetMap](https://www.openstreetmap.org)
* Poi data obtained using [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)
* Addresses geocoded with the [Nominatim](https://nominatim.openstreetmap.org/) search engine
* App's data stored in localStorage
* All data requests are asynchronous

## 2. Getting started
### 2.1. Starting the app
Open **index.html** in a web browser.

### 2.2. Using the app
* Navigation bar at the top provides access to the filtering functionalities and the location change form.
* Side menu contains a list of all the points of interest satisfying the current filtering criteria.
* Selecting a map marker on the map or the corresponding list item in the side menu changes the marker colour, displays basic poi info in a popup above the marker and highlights the list item.
* Upon location change, the poi data is downloaded for a 2.25km2 area with the centre at the specified address and is not updated dynamically. To view poi outside the area, change the address.

## 3. File structure
The file structure of the app is outlined below.
```
index.html
js/
  P5.js
  libs/
    bootstrap.min.js
    knockout-3.4.2.js
    leaflet/
css/
  style.css
  bootstrap.min.css  
fonts/
```
The components are briefly described in the table below.

| File/directory   | Description                  |
| -----------------| -----------------------------|
| index.html       | P5 html                      |
| P5.js            | P5 js code                   |
| bootstrap.min.js | Bootstrap 3.3.7 js           |
| knockout-3.4.2.js| Knockout 3.4.2               |
| leaflet/         | Leaflet 1.3.4                |
| style.css        | P5 unique css                |
| bootstrap.min.css| Bootstrap 3.3.7 css          |
| fonts/           | Bootstrap 3.3.7 glyphicons   |

Note that only index.html, P5.js and style.css were written by the author of this app.
