var map, infoWindow, marker, addressId
var markerButton = false
var markers = []

document.getElementById('disable-markers').setAttribute('disabled', 'disabled')
document.getElementById('hide-markers').setAttribute('disabled', 'disabled')
document.getElementById('show-markers').setAttribute('disabled', 'disabled')
document.getElementById('delete-markers').setAttribute('disabled', 'disabled')

/**
 * Create the google map in the div
 * 
 * @return {[type]} [description]
 */
function initMap() {
	map = new google.maps.Map(document.getElementById('map'), {
		center: {lat: 48.8534, lng: 2.3488},
		zoom: 10
	})

	infoWindow = new google.maps.InfoWindow

	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function (position) {
			var pos = {
				lat: position.coords.latitude,
				lng: position.coords.longitude
			}

			document.getElementById('input-lat-start').setAttribute('value', position.coords.latitude)
			document.getElementById('input-long-start').setAttribute('value', position.coords.longitude)

			infoWindow.setPosition(pos);
            infoWindow.setContent('Location found.');
            infoWindow.open(map);
            map.setCenter(pos);

			resolvePlace(pos, function (place) {
				var marker = new google.maps.Marker({
					title: place.formatted_address,
					map: map,
					position: pos
				})

				addressId = place.place_id
				new AutocompleteDirectionsHandler(map, addressId)

				infoWindow.setContent(place.formatted_address)
				infoWindow.open(map, marker)
				map.setCenter(pos)
				document.getElementById('input-start').setAttribute('value', place.formatted_address)
			}, function (status) {
				infoWindow.setPosition(pos);
				infoWindow.setContent('La géolocalisation a échoué à cause de : ' + status)
			})
		}, function () {
			handleLocationError(true, infoWindow, map.getCenter())
		})
	} else {
	 	handleLocationError(false, infoWindow, map.getCenter())
	}

	map.addListener('click', function(event) {
		if (markerButton) {
			addMarker(event.latLng)
		}
	})

	var transitLayer = new google.maps.TransitLayer()
	transitLayer.setMap(map)

	new AutocompleteDirectionsHandler(map)
}

function resolvePlace(pos, success, error) {
	var geocoder = new google.maps.Geocoder

	geocoder.geocode({ 'location': pos }, function (results, status) {
		if (status === google.maps.GeocoderStatus.OK) {
			if (results[0]) {
				success(results[0])
			} else {
				error('Aucun résultat trouvé')
			}
		} else {
			error(status)
		}
	})
}

/**
 * Handle the location errors
 * 
 * @param  {[type]} browserHasGeolocation [description]
 * @param  {[type]} infoWindow            [description]
 * @param  {[type]} pos                   [description]
 * @return {[type]}                       [description]
 */
function handleLocationError(browserHasGeolocation, infoWindow, pos) {
	infoWindow.setPosition(pos)

	infoWindow.setContent(browserHasGeolocation
		? 'Erreur : Le service de géolocalisation a échoué.'
		: 'Erreur : Votre navigateur ne supporte pas la géolocalisation.')

	infoWindow.open(map)
}

function AutocompleteDirectionsHandler(map, originId = null) {
	this.map = map
	this.originPlaceId = originId
	this.destinationPlaceId = null
	this.travelMode = 'WALKING'

	var originInput = document.getElementById('input-start')
	var destinationInput = document.getElementById('input-end')
	var modeSelector = document.getElementById('mode-selector')

	this.directionsService = new google.maps.DirectionsService
	this.directionsDisplay = new google.maps.DirectionsRenderer
	this.directionsDisplay.setMap(map)

	var originAutocomplete = new google.maps.places.Autocomplete(originInput, {placeIdOnly: true})
	var destinationAutocomplete = new google.maps.places.Autocomplete(destinationInput, {placeIdOnly: true})

	this.setupClickListener('changemode-walking', 'WALKING')
	this.setupClickListener('changemode-bicycling', 'BICYCLING')
	this.setupClickListener('changemode-transit', 'TRANSIT')
	this.setupClickListener('changemode-driving', 'DRIVING')

	this.setupPlaceChangedListener(originAutocomplete, 'ORIG')
	this.setupPlaceChangedListener(destinationAutocomplete, 'DEST')
}

AutocompleteDirectionsHandler.prototype.setupClickListener = function(id, mode) {
	var radioButton = document.getElementById(id)
	var me = this

	radioButton.addEventListener('click', function() {
		me.travelMode = mode
		me.route()
	})
}

AutocompleteDirectionsHandler.prototype.setupPlaceChangedListener = function(autocomplete, mode) {
	var me = this

	autocomplete.bindTo('bounds', this.map)

	autocomplete.addListener('place_changed', function() {
		var place = autocomplete.getPlace()

		if (!place.place_id) {
			window.alert("Veuillez sélectionner une option de la liste déroulante s'il vous plaît.")
			return
		}

		if (mode === 'ORIG') {
			me.originPlaceId = place.place_id
		} else {
			me.destinationPlaceId = place.place_id
		}

		me.route()
	})
}

AutocompleteDirectionsHandler.prototype.route = function() {
	if (!this.originPlaceId || !this.destinationPlaceId) {
		return
	}

	var me = this

	this.directionsService.route({
		origin: {'placeId': this.originPlaceId},
		destination: {'placeId': this.destinationPlaceId},
		travelMode: this.travelMode
	}, function(response, status) {
		if (status === 'OK') {
			me.directionsDisplay.setDirections(response)
		} else {
			window.alert("La demande d'itinéraire a échoué à cause de " + status)
		}
	})
}

/**
 * Enable the markers
 * 
 * @return {[type]} [description]
 */
function enableMarkers() {
	markerButton = true

	document.getElementById('enable-markers').setAttribute('disabled', 'disabled')
	document.getElementById('disable-markers').removeAttribute('disabled', 'disabled')
	document.getElementById('hide-markers').removeAttribute('disabled', 'disabled')
	document.getElementById('show-markers').setAttribute('disabled', 'disabled')
	document.getElementById('delete-markers').removeAttribute('disabled', 'disabled')
}

/**
 * Disable the markers
 * 
 * @return {[type]} [description]
 */
function disableMarkers() {
	deleteMarkers()

	markerButton = false

	document.getElementById('enable-markers').removeAttribute('disabled', 'disabled')
	document.getElementById('disable-markers').setAttribute('disabled', 'disabled')
	document.getElementById('hide-markers').setAttribute('disabled', 'disabled')
	document.getElementById('show-markers').setAttribute('disabled', 'disabled')
	document.getElementById('delete-markers').setAttribute('disabled', 'disabled')
}

/**
 * Adds a marker to the map and push to the array.
 * 
 * @param {[type]} location [description]
 */
function addMarker(location) {
	marker = new google.maps.Marker({
		position: location,
		map: map,
		draggable: true,
		title: 'Déplacez-moi'
	})

	markers.push(marker)
}

/**
 * Sets the map on all markers in the array.
 * 
 * @param {[type]} map [description]
 */
function setMapOnAll(map) {
	for (var i = 0; i < markers.length; i++) {
		markers[i].setMap(map)
	}
}

/**
 * Removes the markers from the map, but keeps them in the array.
 * 
 * @return {[type]} [description]
 */
function clearMarkers() {
	setMapOnAll(null)

	document.getElementById('hide-markers').setAttribute('disabled', 'disabled')
	document.getElementById('show-markers').removeAttribute('disabled', 'disabled')
}

/**
 * Shows any markers currently in the array.
 * 
 * @return {[type]} [description]
 */
function showMarkers() {
	setMapOnAll(map)

	document.getElementById('show-markers').setAttribute('disabled', 'disabled')
	document.getElementById('hide-markers').removeAttribute('disabled', 'disabled')
}

/**
 * Deletes all markers in the array by removing references to them.
 * 
 * @return {[type]} [description]
 */
function deleteMarkers() {
	clearMarkers()

	document.getElementById('hide-markers').removeAttribute('disabled', 'disabled')
	document.getElementById('show-markers').removeAttribute('disabled', 'disabled')

	markers = []
}
