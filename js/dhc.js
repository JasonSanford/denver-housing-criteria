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
        bingMapsCallback = function(data, address) {
            if (data && data.resourceSets && data.resourceSets.length && data.resourceSets[0].resources && data.resourceSets[0].resources.length && data.resourceSets[0].resources[0].point) {

                // F'real bing? you got lat,lng mixed up? #headdesk
                point = data.resourceSets[0].resources[0].point;
                point.coordinates = [point.coordinates[1], point.coordinates[0]];

                setCurrentLocation(address, point)
                
            } else {
                setCurrentLocation(address, null);
            }
        },
        setSliderText = function(criteria_type, value) {
            $('.criteria').each(function (i, o) {
                var $criteria_div = $(o),
                    criteria_div_type = $criteria_div.data('criteria-type');
                if (criteria_div_type === criteria_type) {
                    $criteria_div.find('.distance-label').html('< ' + value + ' mile' + (value === 1 ? '' : 's'))
                    return false;
                }
            });
        },
        adjustCriteriaValue = function (criteria_type, value) {
            console.log('time to query')
        },
        setCurrentLocation = function(address, point) {
            // If we get address and no point, we couldn't geocode
            geocode_layer.clearLayers();
            if (point) {
                geocode_layer.addData(point);
                dhc.map.setView([point.coordinates[1], point.coordinates[0]], 12);
                $('#location')
                    .removeClass('alert-error')
                    .addClass('alert-success');
                $('#location-address').html(address);
            } else {
                $('#location')
                    .removeClass('alert-success')
                    .addClass('alert-error');
                $('#location-address').html('Could not find "' + address + '"');
            }
            $('#location').show();
        },
        criteria = {
            light_rail: {
                slider_settings: {
                    min: 0,
                    max: 10,
                    value: 2,
                    step: 0.1
                }
            },
            bus_stops: {
                slider_settings: {
                    min: 0,
                    max: 5,
                    value: 1,
                    step: 0.1
                }
            },
            parks: {
                slider_settings: {
                    min: 0,
                    max: 2,
                    value: 1,
                    step: 0.1
                }
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
        var address = $('#address').val();
        if (address.length <= 0) {
            return;
        }
        var params = {
            query: address,
            key: BING_MAPS_KEY
        };
        $.ajax({
            url: 'http://dev.virtualearth.net/REST/v1/Locations',
            jsonp: 'jsonp',
            data: params,
            dataType: 'jsonp',
            success: function (data) {
                bingMapsCallback(data, address);
            }
        })
    });

    $('#paste-example').on('click', function (event) {
        event.preventDefault();
        $('#address').val('7910 S Bemis St, Littleton, CO');
        $('#address-form').submit();
    });

    $('.criteria').each(function (i, o) {
        var $criteria_div = $(o),
            criteria_type = $criteria_div.data('criteria-type'),
            criteria_settings = criteria[criteria_type].slider_settings,
            $criteria_slider = $criteria_div.find('.criteria-slider');
        $criteria_slider.slider({
            min: criteria_settings.min,
            max: criteria_settings.max,
            step: criteria_settings.step,
            value: criteria_settings.value,
            slide: function (event, ui) {
                setSliderText(criteria_type, ui.value);
            },
            change: function (event, ui) {
                setSliderText(criteria_type, ui.value);
            },
            stop: function (event, ui) {
                adjustCriteriaValue(criteria_type, ui.value);
            }
        }).slider('value', criteria_settings.value);
    });
}())