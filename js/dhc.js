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
        geocode_layer = new L.GeoJSON(null, {
            pointToLayer: function (feature, latlng) {
                return L.marker(latlng, {
                    icon: L.icon({
                        iconUrl: 'img/markers/home.png',
                        iconSize: [32, 37],
                        iconAnchor: [16, 37],
                        popupAnchor: [0, -28]
                    })
                });
            }
        });
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
        getCriteriaPoints = function (criteria_type, value) {
            if (!geocode_layer.projected_point) {
                setTimeout(function () {
                    getCriteriaPoints(criteria_type, value);
                }, 100);
                return;
            }
            var this_criteria = criteria[criteria_type],
                fields = this_criteria.fields,
                distance_feet = value * 5280;
            var params = {
                x: geocode_layer.projected_point.coordinates[0],
                y: geocode_layer.projected_point.coordinates[1],
                srid: 2232,
                geotable: this_criteria.layer_name,
                parameters: '',
                distance: distance_feet,
                limit: '',
                order: '',
                format: 'json'
            };
            $.ajax({
                url: 'http://gis.drcog.org/REST/v1/ws_geo_bufferpoint.php?' + $.param(params) + '&fields=' + fields.join(',') + ',' + 'st_asgeojson(transform(the_geom,4326))+as+geojson',
                data: params,
                dataType: 'jsonp',
                success: function (data) {
                    processCriteriaPoints(criteria_type, data);
                }
            });
        },
        processCriteriaPoints = function (criteria_type, data) {
            var this_criteria = criteria[criteria_type],
                $criteria_div = $('#' + criteria_type);
            if (data && data.total_rows && parseInt(data.total_rows, 10) > 0) {
                var feature_collection = {
                    type: 'FeatureCollection',
                    features: []
                }
                for (i in data.rows) {
                    var geojson,
                        row = data.rows[i].row,
                        properties = {};
                    for (key in row) {
                        if (key === 'geojson') {
                            geojson = row[key];
                        } else {
                            properties[key] = row[key];
                        }
                    }
                    feature = {
                        type: 'Feature',
                        geometry: geojson,
                        properties: properties
                    }
                    feature_collection.features.push(feature);
                }
                this_criteria.layer.addData(feature_collection);
                $criteria_div
                    .removeClass('alert-error')
                    .addClass('alert-success')
                    .find('.criteria-count').html('<strong style="font-size: 1.4em;">:-)</strong> Great! ' + parseInt(data.total_rows, 10) + ' ' + this_criteria.name + 's found.');
            } else {
                $criteria_div
                    .removeClass('alert-success')
                    .addClass('alert-error')
                    .find('.criteria-count').html('<strong style="font-size: 1.4em;">:-(</strong> Sorry, 0 ' + this_criteria.name + 's found.');
            }
        },
        adjustCriteriaValue = function (criteria_type, value) {
            var this_criteria = criteria[criteria_type];
            if (!this_criteria.layer) {
                this_criteria.layer = new L.GeoJSON(null, {
                    pointToLayer: function (feature, latlng) {
                        return L.marker(latlng, {
                            icon: L.icon({
                                iconUrl: 'img/markers/' + this_criteria.icon_name,
                                iconSize: [32, 37],
                                iconAnchor: [16, 37],
                                popupAnchor: [0, -28]
                            })
                        });
                    },
                    onEachFeature: function (feature, layer) {
                        if (feature && feature.properties) {
                            var popup_content = '';
                            for (key in feature.properties) {
                                popup_content += '<strong>' + key + '</strong>: ' + feature.properties[key] + '<br>';
                            }
                            layer.bindPopup(popup_content);
                        }
                        
                    }
                });
                dhc.map.addLayer(criteria[criteria_type].layer);
            }
            criteria[criteria_type].layer.clearLayers();
            getCriteriaPoints(criteria_type, value);
        },
        getProjectedPoint = function (point) {
            var params = {
                x: point.coordinates[0],
                y: point.coordinates[1],
                fromsrid: 4326,
                tosrid: 2232,
                format: 'json'
            };
            $.ajax({
                url: 'http://gis.drcog.org/REST/v1/ws_geo_projectpoint.php',
                data: params,
                dataType: 'jsonp',
                success: function (data) {
                    processProjectedPoint(data);
                }
            });
        },
        processProjectedPoint = function (data) {
            var x = parseFloat(data.rows[0].row.x_coordinate),
                y = parseFloat(data.rows[0].row.y_coordinate);
            geocode_layer.projected_point = {
                type: 'Point',
                coordinates: [x, y]
            };
        },
        setCurrentLocation = function(address, point) {
            // If we get address and no point, we couldn't geocode
            geocode_layer.clearLayers();
            geocode_layer.projected_point = null;
            if (point) {
                geocode_layer.addData(point);
                dhc.map.setView([point.coordinates[1], point.coordinates[0]], 14);
                $('#location')
                    .removeClass('alert-error')
                    .addClass('alert-success');
                $('#location-address').html(address);
                getProjectedPoint(point);
                updateFacilities();
            } else {
                $('#location')
                    .removeClass('alert-success')
                    .addClass('alert-error');
                $('#location-address').html('Could not find "' + address + '"');
                clearFacilities();
            }
            $('#location').show();
        },
        clearFacilities = function () {

        },
        updateFacilities = function () {
            $('.criteria').each(function (i, o) {
                var $criteria_div = $(o),
                    criteria_type = $criteria_div.data('criteria-type'),
                    criteria_settings = criteria[criteria_type].slider_settings,
                    $criteria_slider = $criteria_div.find('.criteria-slider');
                adjustCriteriaValue(criteria_type, $criteria_slider.slider('value'));
            });
        },
        criteria = {
            light_rail: {
                slider_settings: {
                    min: 0.1,
                    max: 10,
                    value: 2,
                    step: 0.1
                },
                name: 'light rail station',
                icon_name: 'train.png',
                layer_name: 'rtd_lightrailstations',
                fields: ['name', 'address']
            },
            bus_stops: {
                slider_settings: {
                    min: 0.1,
                    max: 5,
                    value: 0.3,
                    step: 0.1
                },
                name: 'bus stop',
                icon_name: 'bus.png',
                layer_name: 'rtd_busstops',
                fields: ['routes', 'stopname', 'dir', 'location']
            },
            b_cycle_stations: {
                slider_settings: {
                    min: 0.1,
                    max: 2,
                    value: 1,
                    step: 0.1
                },
                name: 'b-cycle station',
                icon_name: 'bike.png',
                layer_name: 'b_cycle_stations',
                fields: ['station', 'city_loc']
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
        $('#address').val('1675 Larimer St, Denver, CO');
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