var dhc = {};

(function () {
    var BING_MAPS_KEY = 'AuRei7ImMP3dpPg_ZXMtaetmhQayDq2w9Z8EyMiIPUo9LDPvFln2RaJh5nxwLMkT',
        start_location = new L.LatLng(39.7357, -104.951),
        road_layer = new L.TileLayer('http://{s}.tiles.mapbox.com/v3/jcsanford.map-xu5k4lii/{z}/{x}/{y}.png', {
                maxZoom: 17,
                subdomains: ['a', 'b', 'c', 'd'],
                attribution: 'Map data (c) <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> contributors, CC-BY-SA.'
            }),
        satellite_layer = new L.TileLayer('http://{s}.tiles.mapbox.com/v3/jcsanford.map-c487ey3y/{z}/{x}/{y}.png', {
                maxZoom: 17,
                subdomains: ['a', 'b', 'c', 'd'],
                attribution: 'Map data (c) <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> contributors, CC-BY-SA.'
            }),
        geocode_layer = new L.GeoJSON(null)
        bingMapsCallback = function(data) {
            if (data && data.resourceSets && data.resourceSets.length && data.resourceSets[0].resources && data.resourceSets[0].resources.length && data.resourceSets[0].resources[0].point) {

                // F'real bing? you got lat,lng mixed up? #headdesk
                point = data.resourceSets[0].resources[0].point;
                point.coordinates = [point.coordinates[1], point.coordinates[0]]

                geocode_layer.addData(point);
                dhc.map.setView([point.coordinates[1], point.coordinates[0]], 12)
            }
        };

    dhc.map = new L.Map('map-container', {
        center: start_location,
        zoom: 10,
        layers: [
            road_layer
        ]
    });

    dhc.map.addLayer(geocode_layer);

    L.control.layers({'Road': road_layer, 'Satellite': satellite_layer}, {}).addTo(dhc.map);

    $('#address-form').on('submit', function (event) {
        event.preventDefault();
        if ($('#address').val().length <= 0) {
            return;
        }
        var params = {
            query: $('#address').val(),
            key: BING_MAPS_KEY
        };
        $.ajax({
            url: 'http://dev.virtualearth.net/REST/v1/Locations',
            jsonp: 'jsonp',
            data: params,
            dataType: 'jsonp',
            success: bingMapsCallback
        })
    });

    $('#paste-example').on('click', function (event) {
        event.preventDefault();
        $('#address').val('7910 S Bemis St, Littleton, CO');
        $('#address-form').submit();
    })
}())