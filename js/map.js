var map;
var districtsInfo = [];
var districtInfoWindowIndex = -1;
var previousHighlightedDistrict;
var filtersSelected = false;

function onGoogleMapResponse() {
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: {
      lat: 40.7291,
      lng: -74.0965
    }
  });
  setBigMarker([40.7291, -73.9965], "MYU", "white");
  map.data.loadGeoJson('https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nycd/FeatureServer/0/query?where=1=1&outFields=*&outSR=4326&f=geojson');
}

function setMapCenter(latLng) {
  map.setCenter(latLng);
}

function desactivateAllDistricts() {
  map.setZoom(12);
  latLng = new google.maps.LatLng(40.7291, -74.0965);
  map.setCenter(latLng);
  districtsInfo.forEach(function (districtInfo) {
    districtInfo[10] = false;
    if (districtInfo[9] != undefined) {
      closeSpecialInfoPanels(districtsInfo.indexOf(districtInfo));
      districtInfo[9].close();
    }
  });
}

function setMarker(lat_lng, label, color) {
  latLng = new google.maps.LatLng(lat_lng[0], lat_lng[1]);

  var marker = new google.maps.Marker({
    position: latLng,
    map: map,
    zIndex: 1,
    labelAnchor: new google.maps.Point(15, 65),
    icon: pinSymbol(color),
    label: {
      text: label,
      color: "white",
      fontWeight: "1000",
      fontFamily: "product-sans",
      fontSize: "0.75rem"
    },
    animation: google.maps.Animation.DROP
  });

  return marker;
}

function setBigMarker(lat_lng, label, color) {
  latLng = new google.maps.LatLng(lat_lng[0], lat_lng[1]);

  var marker = new google.maps.Marker({
    position: latLng,
    map: map,
    labelAnchor: new google.maps.Point(15, 65),
    icon: pinSymbolBig(color),
    label: {
      text: label,
      color: "#57068c",
      fontWeight: "1000",
      fontFamily: "product-sans",
      fontSize: "0.75rem"
    },
    animation: google.maps.Animation.DROP
  });

  return marker;
}

function pinSymbol(color) {
  return {
    path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z',
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#000',
    strokeWeight: 0,
    scale: 1.45,
    labelOrigin: new google.maps.Point(0, -30)
  };
}

function pinSymbolBig(color) {
  return {
    path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z',
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#57068c',
    strokeWeight: 1.8,
    scale: 1.6,
    labelOrigin: new google.maps.Point(0, -30)
  };
}

function setPolygon(paths, color) {
  mapPolygon = new google.maps.Polygon({
    paths: paths,
  });

  return mapPolygon;
}

function drawDistrictPolygons() {

  var district;
  var fillColor;
  var color;
  var topTen;
  var z_index;
  var districtMap;

  map.data.setStyle(function (feature) {

    district = districtsInfo[(feature.l.OBJECTID - 1)];
    color = colorPicker(district[0].toString().substring(0, 1));
    fillColor = color;
    z_index = 0;
    district[11] = feature;

    if (district[5]) {
      if (topTen != undefined && district[8]) {
        fillColor = colorPicker("topTen");
        color = colorPicker("topTen");
        z_index = 1;
      }

      if (district[10]) {
        if (district[8]) {
          fillColor = colorPicker("topTenh");
        } else {
          fillColor = colorPicker(district[0].toString().substring(0, 1) + "h");
        }
      } else {
        if (district[8]) {
          fillColor = colorPicker("topTen");
        } else {
          fillColor = colorPicker(district[0].toString().substring(0, 1));
        }
      }
    }

    if (!district[5]) {
      color = "transparent";
      fillColor = "transparent";
    }

    return ({
      map: map,
      zIndex: z_index,
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight: 2.5,
      fillColor: fillColor,
      fillOpacity: 0.35,
      clickable: true
    });
  });

  fixDistrictColors();
}

function fixDistrictColors() {
  districtsInfo.forEach(function (districtInfo) {
    if (districtInfo[5]) {
      if (districtInfo[8]) {
        map.data.overrideStyle(districtInfo[11], {
          fillColor: colorPicker("topTen")
        });
        map.data.overrideStyle(districtInfo[11], {
          strokeColor: colorPicker("topTen")
        });
        map.data.overrideStyle(districtInfo[11], {
          zIndex: 1
        });
      } else {
        map.data.overrideStyle(districtInfo[11], {
          fillColor: colorPicker(districtInfo[0].toString().substring(0, 1))
        });
        map.data.overrideStyle(districtInfo[11], {
          strokeColor: colorPicker(districtInfo[0].toString().substring(0, 1))
        });
        map.data.overrideStyle(districtInfo[11], {
          zIndex: 0
        });
      }
    }
  });
}

function selectSufixInfoCard(i) {
  if (i == 1) {
    return "st";
  } else if (i == 2) {
    return "nd";
  } else if (i == 3) {
    return "rd";
  } else {
    return "th";
  }
}

function setDistrictInfoWindow() {

  districtsInfo.forEach(function (districtInfo) {
    districtInfo[24] = [false, false, false];
    districtInfo[25] = [undefined, undefined, undefined];
  });

  var i = 0;

  districtsInfo.forEach(function (districtInfo) {

    var districtPosition;
    var districtBorough = districtInfo[1].toString();
    var districtID = districtInfo[0].toString();
    var districtCenter = new google.maps.LatLng(districtInfo[3][0], districtInfo[3][1]);
    var districtNeighboorhoods = parseNeighborhoodList(districtInfo);
    var districtCloseness = "  " + districtInfo[14].toFixed(2).toString() + " meters";
    var districtSafety = "  " + districtInfo[15].toString();
    var districtAffordability = "  " + districtInfo[16].toString();
    var districtIndex = i;

    if (filtersSelected && districtInfo[8]) {
      districtPosition = (districtInfo[13] + 1).toString() + selectSufixInfoCard(districtInfo[13] + 1);
    } else {
      districtPosition = "";
    }

    var districtAirQuality;
    if (Number(districtInfo[19][0]) == 0) {
      districtAirQuality = "No data";
    } else {
      districtAirQuality = Number(districtInfo[19][0]).toString();
    }

    var districtNumberOfMuseums = (districtInfo[17]).toString();
    var districtNumberOfArtGalleries = (districtInfo[20]).toString();
    var districtNumberOfMarkets = (districtInfo[22]).toString();

    var contentString =
      '<div class="district_info_window" onmouseover = "mouseOverInfoWinfow()">' +
      '<div class="district_info_header">' +
      '<h5 class ="district_info_window_position">' + districtPosition + '</h5>' +
      '<div class="district_info_title">' +
      '<h1 style="color: ' + colorPicker(districtID.substring(0, 1)) + '">' + districtBorough + '</h1>' +
      '<h2>' + districtID + '</h2>' +
      '</div>' +
      '</div>' +
      '<h3>District neighborhoods: </h3>' +
      '<div class="district_info_neighborhoods_container">' +
      '<div class="district_info_neighborhoods_col">' +
      '<h4>' + districtNeighboorhoods[0] + '</h4>' +
      '</div>' +
      '<div class="district_info_neighborhoods_col">' +
      '<h4>' + districtNeighboorhoods[1] + '</h4>' +
      '</div>' +
      '</div>' +
      '<div class="district_info_data_container">' +
      '<div class="district_info_data">' +
      '<h3>Distance to NYU: </h3>' +
      '<h4>' + districtCloseness + '</h4>' +
      '</div>' +
      '<div class="district_info_data">' +
      '<h3>crimes: </h3>' +
      '<h4>' + districtSafety + '</h4>' +
      '</div>' +
      '<div class="district_info_data">' +
      '<h3>Affordable units: </h3>' +
      '<h4>' + districtAffordability + '</h4>' +
      '</div>' +
      '<div class="district_info_data">' +
      '<h3>Pollution concentration in the air: </h3>' +
      '<h4>' + districtAirQuality + '</h4>' +
      '</div>' +
      '<div class="district_info_data">' +
      '<h3>Museums: </h3>' +
      '<h4>' + districtNumberOfMuseums + '</h4>' +
      '</div>' +
      '<div class="district_info_data">' +
      '<h3>Art galleries: </h3>' +
      '<h4>' + districtNumberOfArtGalleries + '</h4>' +
      '</div>' +
      '<div class="district_info_data">' +
      '<h3>Farmers Markets: </h3>' +
      '<h4>' + districtNumberOfMarkets + '</h4>' +
      '</div>' +
      '</div>' +
      '<div class="district_info_buttons_container">' +
      '<div class="district_info_button">' +
      '<i onmouseover = "infoWindowButtonMouseOver(this, ' + districtID.substring(0, 1) + ',' + districtIndex + ',0)" onmouseout = "infoWindowButtonMouseOut(this, ' + districtID.substring(0, 1) + ',' + districtIndex + ',0)" onclick = "infoWindowButtonOnClick(this,' + districtIndex + ',0)" style="border-color: ' + colorPicker(districtID.substring(0, 1)) + ';color: ' + colorPicker(districtID.substring(0, 1)) + '" class="fas fa-landmark fa-fw district_info_button_icon"></i>' +
      '<h5 style="color: ' + colorPicker(districtID.substring(0, 1)) + '" class="district_info_button_txt">Museums</h5>' +
      '</div>' +
      '<div class="district_info_button">' +
      '<i onmouseover = "infoWindowButtonMouseOver(this, ' + districtID.substring(0, 1) + ',' + districtIndex + ',1)" onmouseout = "infoWindowButtonMouseOut(this, ' + districtID.substring(0, 1) + ',' + districtIndex + ',1)" onclick = "infoWindowButtonOnClick(this,' + districtIndex + ',1)" style="border-color: ' + colorPicker(districtID.substring(0, 1)) + ';color: ' + colorPicker(districtID.substring(0, 1)) + '" class="fas fa-paint-brush fa-fw district_info_button_icon"></i>' +
      '<h5 style="color: ' + colorPicker(districtID.substring(0, 1)) + '" class="district_info_button_txt">Art galleries</h5>' +
      '</div>' +
      '<div class="district_info_button">' +
      '<i onmouseover = "infoWindowButtonMouseOver(this, ' + districtID.substring(0, 1) + ',' + districtIndex + ',2)" onmouseout = "infoWindowButtonMouseOut(this, ' + districtID.substring(0, 1) + ',' + districtIndex + ',2)" onclick = "infoWindowButtonOnClick(this,' + districtIndex + ',2)" style="border-color: ' + colorPicker(districtID.substring(0, 1)) + ';color: ' + colorPicker(districtID.substring(0, 1)) + '" class="fas fa-shopping-basket fa-fw district_info_button_icon"></i>' +
      '<h5  style="color: ' + colorPicker(districtID.substring(0, 1)) + '" class="district_info_button_txt">Markets</h5>' +
      '</div>' +
      '</div>' +
      '</div>';

    var infowindow = new google.maps.InfoWindow({
      position: districtCenter,
      content: contentString
    });

    infowindow.setZIndex(2000);
    infowindow.open(map);
    infowindow.close();

    districtInfo[9] = infowindow;
    districtInfo[10] = false;
    i++;
  });

  districtsInfo.forEach(function (districtInfo) {
    districtInfo[9].addListener('closeclick', function () {
      districtInfo[10] = false;
      closeSpecialInfoPanels(districtsInfo.indexOf(districtInfo));
      if (districtInfo[8]) {
        map.data.overrideStyle(districtInfo[11], {
          fillColor: colorPicker("topTen")
        });
      } else {
        map.data.overrideStyle(districtInfo[11], {
          fillColor: colorPicker(districtInfo[0].toString().substring(0, 1))
        });
      }
    });
  });
}

var onHoverDistrict;
var infoWindowHover = false;

function mouseOverInfoWinfow() {
  if (onHoverDistrict != undefined && previousHighlightedDistrict != undefined) {
    if (onHoverDistrict[0] != previousHighlightedDistrict[0]) {
      if (onHoverDistrict[8]) {
        map.data.overrideStyle(onHoverDistrict[11], {
          fillColor: colorPicker("topTen")
        });
      } else {
        map.data.overrideStyle(onHoverDistrict[11], {
          fillColor: colorPicker(onHoverDistrict[0].toString().substring(0, 1))
        });
      }
    }
  }
}

function infoWindowButtonMouseOver(element, boroughID, districtIndex, type) {
  if (!districtsInfo[districtIndex][24][type]) {
    var background_color = colorPicker(boroughID);
    element.style.color = "white";
    element.style.backgroundColor = background_color;
  }
}

function infoWindowButtonMouseOut(element, boroughID, districtIndex, type) {
  if (!districtsInfo[districtIndex][24][type]) {
    var color = colorPicker(boroughID);
    element.style.color = color;
    element.style.backgroundColor = "white";
  }
}

function infoWindowButtonOnClick(element, districtIndex, type) {
  var color;
  var district;
  districtInfoWindowIndex = districtIndex;

  if (!districtsInfo[districtIndex][24][type] && type == 0) {

    districtsInfo[districtIndex][24] = [true, false, false];
    districtsInfo[districtIndex][25][0] = element;

    background_color = colorPicker(districtsInfo[districtIndex][0].toString().substring(0, 1));
    districtsInfo[districtIndex][25][0].style.color = "white";
    districtsInfo[districtIndex][25][0].style.backgroundColor = background_color;

    if (districtsInfo[districtIndex][25][1] != undefined) {
      color = colorPicker(districtsInfo[districtIndex][0].toString().substring(0, 1));
      districtsInfo[districtIndex][25][1].style.color = color;
      districtsInfo[districtIndex][25][1].style.backgroundColor = "white";
    }

    if (districtsInfo[districtIndex][25][2] != undefined) {
      color = colorPicker(districtsInfo[districtIndex][0].toString().substring(0, 1));
      districtsInfo[districtIndex][25][2].style.color = color;
      districtsInfo[districtIndex][25][2].style.backgroundColor = "white";
    }

    $("#museums_list_button_close").css("color", "black");
    $("#museums_list_button_close").css("background-color", "white");
    $(".museums_list_container").css("left", "79%");
    $("#museums_list_button_close").css("opacity", "1");

    $("#art_galleries_list_button_close").css("color", "white");
    $("#art_galleries_list_button_close").css("background-color", "black");
    $(".art_galleries_list_container").css("left", "100%");
    $("#art_galleries_list_button_close").css("opacity", "0");

    $("#markets_list_button_close").css("color", "white");
    $("#markets_list_button_close").css("background-color", "black");
    $(".markets_list_container").css("left", "100%");
    $("#markets_list_button_close").css("opacity", "0");

    $(".museums_list_container").animate({
      scrollTop: 0
    }, 0);
    $(".museums_list_txt_container").html(getMuseumsList(districtsInfo[districtIndex]));

  } else if (!districtsInfo[districtIndex][24][type] && type == 1) {

    districtsInfo[districtIndex][24] = [false, true, false];
    districtsInfo[districtIndex][25][1] = element;

    background_color = colorPicker(districtsInfo[districtIndex][0].toString().substring(0, 1));
    districtsInfo[districtIndex][25][1].style.color = "white";
    districtsInfo[districtIndex][25][1].style.backgroundColor = background_color;

    if (districtsInfo[districtIndex][25][0] != undefined) {
      color = colorPicker(districtsInfo[districtIndex][0].toString().substring(0, 1));
      districtsInfo[districtIndex][25][0].style.color = color;
      districtsInfo[districtIndex][25][0].style.backgroundColor = "white";
    }

    if (districtsInfo[districtIndex][25][2] != undefined) {
      color = colorPicker(districtsInfo[districtIndex][0].toString().substring(0, 1));
      districtsInfo[districtIndex][25][2].style.color = color;
      districtsInfo[districtIndex][25][2].style.backgroundColor = "white";
    }

    $("#museums_list_button_close").css("color", "white");
    $("#museums_list_button_close").css("background-color", "black");
    $(".museums_list_container").css("left", "100%");
    $("#museums_list_button_close").css("opacity", "0");

    $("#art_galleries_list_button_close").css("color", "black");
    $("#art_galleries_list_button_close").css("background-color", "white");
    $(".art_galleries_list_container").css("left", "79%");
    $("#art_galleries_list_button_close").css("opacity", "1");

    $("#markets_list_button_close").css("color", "white");
    $("#markets_list_button_close").css("background-color", "black");
    $(".markets_list_container").css("left", "100%");
    $("#markets_list_button_close").css("opacity", "0");

    $(".art_galleries_list_container").animate({
      scrollTop: 0
    }, 0);
    $(".art_galleries_list_txt_container").html(getArtGalleriesList(districtsInfo[districtIndex]));

  } else if (!districtsInfo[districtIndex][24][type] && type == 2) {

    districtsInfo[districtIndex][24] = [false, false, true];
    districtsInfo[districtIndex][25][2] = element;

    background_color = colorPicker(districtsInfo[districtIndex][0].toString().substring(0, 1));
    districtsInfo[districtIndex][25][2].style.color = "white";
    districtsInfo[districtIndex][25][2].style.backgroundColor = background_color;

    if (districtsInfo[districtIndex][25][0] != undefined) {
      color = colorPicker(districtsInfo[districtIndex][0].toString().substring(0, 1));
      districtsInfo[districtIndex][25][0].style.color = color;
      districtsInfo[districtIndex][25][0].style.backgroundColor = "white";
    }

    if (districtsInfo[districtIndex][25][1] != undefined) {
      color = colorPicker(districtsInfo[districtIndex][0].toString().substring(0, 1));
      districtsInfo[districtIndex][25][1].style.color = color;
      districtsInfo[districtIndex][25][1].style.backgroundColor = "white";
    }

    $("#museums_list_button_close").css("color", "white");
    $("#museums_list_button_close").css("background-color", "black");
    $(".museums_list_container").css("left", "100%");
    $("#museums_list_button_close").css("opacity", "0");

    $("#art_galleries_list_button_close").css("color", "white");
    $("#art_galleries_list_button_close").css("background-color", "black");
    $(".art_galleries_list_container").css("left", "100%");
    $("#art_galleries_list_button_close").css("opacity", "0");

    $("#markets_list_button_close").css("color", "black");
    $("#markets_list_button_close").css("background-color", "white");
    $(".markets_list_container").css("left", "79%");
    $("#markets_list_button_close").css("opacity", "1");

    $(".markets_list_container").animate({
      scrollTop: 0
    }, 0);
    $(".markets_list_txt_container").html(getMarketsList(districtsInfo[districtIndex]));

  }
}

function getMuseumsList(districtInfo) {
  var content = "";

  if (districtInfo[18].length == 0) {
    return '<h3 class="district_info_bold_text">No museums found</h3>';
  }

  districtInfo[18].forEach(function (museum) {
    content = content +
      '<div class="district_special_data_container">' +
      '<div class="district_special_data">' +
      '<h3 class="district_info_bold_text">Name: </h3>' +
      '<h4 class="district_info_plain_text">' + museum[0] + '</h4>' +
      '</div>' +
      '<div class="district_special_data">' +
      '<h3 class="district_info_bold_text">Adress: </h3>' +
      '<h4 class="district_info_plain_text">' + museum[2] + '</h4>' +
      '</div>' +
      '<div class="district_special_data">' +
      '<a class="district_info_link" href="' + museum[1] + '" target="_blank">link to web site</a>' +
      '</div>' +
      '<div class="divider_line"></div>' +
      '</div>';
  });

  return content;
}

function getArtGalleriesList(districtInfo) {
  var content = "";

  if (districtInfo[21].length == 0) {
    return '<h3 class="district_info_bold_text">No art galleries found</h3>';
  }

  districtInfo[21].forEach(function (artGallery) {
    content = content +
      '<div class="district_special_data_container">' +
      '<div class="district_special_data">' +
      '<h3 class="district_info_bold_text">Name: </h3>' +
      '<h4 class="district_info_plain_text">' + artGallery[0] + '</h4>' +
      '</div>' +
      '<div class="district_special_data">' +
      '<h3 class="district_info_bold_text">Adress: </h3>' +
      '<h4 class="district_info_plain_text">' + artGallery[2] + '</h4>' +
      '</div>' +
      '<div class="district_special_data">' +
      '<a class="district_info_link" href="' + artGallery[1] + '" target="_blank">link to web site</a>' +
      '</div>' +
      '<div class="divider_line"></div>' +
      '</div>';
  });

  return content;
}

function getMarketsList(districtInfo) {
  var content = "";

  if (districtInfo[23].length == 0) {
    return '<h3 class="district_info_bold_text">No museums found</h3>';
  }

  districtInfo[23].forEach(function (market) {
    content = content +
      '<div class="district_special_data_container">' +
      '<div class="district_special_data">' +
      '<h3 class="district_info_bold_text">Name: </h3>' +
      '<h4 class="district_info_plain_text">' + market[0] + '</h4>' +
      '</div>' +
      '<div class="district_special_data">' +
      '<h3 class="district_info_bold_text">Adress: </h3>' +
      '<h4 class="district_info_plain_text">' + market[1] + '</h4>' +
      '</div>' +
      '<div class="district_special_data">' +
      '<h3 class="district_info_bold_text">Contact number: </h3>' +
      '<h4 class="district_info_plain_text">' + market[2] + '</h4>' +
      '</div>' +
      '<div class="district_special_data">' +
      '<h3 class="district_info_bold_text">business hours: </h3>' +
      '<h4 class="district_info_plain_text">' + market[3] + '</h4>' +
      '</div>' +
      '<div class="divider_line"></div>' +
      '</div>';
  });

  return content;
}

function closeSpecialInfoPanels(districtInfoIndex) {
  districtsInfo[districtInfoIndex][24] = [false, false, false];

  $("#museums_list_button_close").css("color", "white");
  $("#museums_list_button_close").css("background-color", "black");
  $(".museums_list_container").css("left", "100%");
  $("#museums_list_button_close").css("opacity", "0");

  $("#art_galleries_list_button_close").css("color", "white");
  $("#art_galleries_list_button_close").css("background-color", "black");
  $(".art_galleries_list_container").css("left", "100%");
  $("#art_galleries_list_button_close").css("opacity", "0");

  $("#markets_list_button_close").css("color", "white");
  $("#markets_list_button_close").css("background-color", "black");
  $(".markets_list_container").css("left", "100%");
  $("#markets_list_button_close").css("opacity", "0");

  if (districtsInfo[districtInfoIndex][25][0] != undefined) {
    color = colorPicker(districtsInfo[districtInfoIndex][0].toString().substring(0, 1));
    districtsInfo[districtInfoIndex][25][0].style.color = color;
    districtsInfo[districtInfoIndex][25][0].style.backgroundColor = "white";
  }

  if (districtsInfo[districtInfoIndex][25][1] != undefined) {
    color = colorPicker(districtsInfo[districtInfoIndex][0].toString().substring(0, 1));
    districtsInfo[districtInfoIndex][25][1].style.color = color;
    districtsInfo[districtInfoIndex][25][1].style.backgroundColor = "white";
  }

  if (districtsInfo[districtInfoIndex][25][2] != undefined) {
    color = colorPicker(districtsInfo[districtInfoIndex][0].toString().substring(0, 1));
    districtsInfo[districtInfoIndex][25][2].style.color = color;
    districtsInfo[districtInfoIndex][25][2].style.backgroundColor = "white";
  }
}

function parseNeighborhoodList(districtInfo) {

  var neighborhoodList1 = "<ul>";
  var neighborhoodList2 = "<ul>";

  for (var i = 0; i < Math.ceil(districtInfo[4].length / 2); i++) {
    neighborhoodList1 = neighborhoodList1 + "<li>" + districtInfo[4][i] + "</li>";
  }
  for (var j = Math.ceil(districtInfo[4].length / 2); j < districtInfo[4].length; j++) {
    neighborhoodList2 = neighborhoodList2 + "<li>" + districtInfo[4][j] + "</li>";
  }
  neighborhoodList1 = neighborhoodList1 + "</ul>";
  neighborhoodList2 = neighborhoodList2 + "</ul>";
  return [neighborhoodList1, neighborhoodList2];
}

function getMapOffset() {
  var mapOffset = 0;
  var zoom = map.getZoom();

  // y = x-(x*0.5)
  if (zoom <= 12) {
    mapOffset = 0.11;
  } else if (zoom > 12 && zoom <= 13) {
    mapOffset = 0.05;
  } else if (zoom > 13 && zoom <= 14) {
    mapOffset = 0.025;
  } else if (zoom > 14 && zoom <= 15) {
    mapOffset = 0.0125;
  } else if (zoom > 15 && zoom <= 16) {
    mapOffset = 0.00625;
  } else if (zoom > 16 && zoom <= 17) {
    mapOffset = 0.003125;
  } else if (zoom > 17 && zoom <= 18) {
    mapOffset = 0.0015625;
  } else if (zoom > 18 && zoom <= 19) {
    mapOffset = 0.00078125;
  } else if (zoom > 19 && zoom <= 20) {
    mapOffset = 0.000390625;
  } else if (zoom > 20 && zoom <= 21) {
    mapOffset = 0.0001953125;
  } else if (zoom > 21 && zoom <= 22) {
    mapOffset = 0.00009765625;
  }

  return mapOffset;
}


function addListenersOnPolygon() {

  map.data.addListener('mouseover', function (event) {
    var district = districtsInfo[(event.feature.l.OBJECTID - 1)];
    if (district[5] && !district[10]) {
      onHoverDistrict = district;
      if (district[8]) {
        map.data.overrideStyle(event.feature, {
          fillColor: colorPicker("topTenh")
        });
      } else {
        map.data.overrideStyle(event.feature, {
          fillColor: colorPicker(district[0].toString().substring(0, 1) + "h")
        });
      }
    }

  });

  map.data.addListener('mouseout', function (event) {
    var district = districtsInfo[(event.feature.l.OBJECTID - 1)];

    if (district[5] && !district[10]) {
      if (district[8]) {
        map.data.overrideStyle(event.feature, {
          fillColor: colorPicker("topTen")
        });
      } else {
        map.data.overrideStyle(event.feature, {
          fillColor: colorPicker(district[0].toString().substring(0, 1))
        });
      }
      previousHoverDistrict = district;
    }

  });

  map.data.addListener('click', function (event) {
    var district = districtsInfo[(event.feature.l.OBJECTID - 1)];
    if (district[5]) {
      if (!district[10]) {
        district[10] = true;
        var latitude = (event.latLng.lat());
        var longitude = event.latLng.lng();
        var latLng = new google.maps.LatLng(latitude, longitude);
        var mapCenter = new google.maps.LatLng(latitude, (longitude - getMapOffset()));
        setMapCenter(mapCenter);
        district[9].setPosition(latLng);
        district[9].open(map);

        if (previousHighlightedDistrict != undefined && previousHighlightedDistrict[0] != district[0]) {
          previousHighlightedDistrict[10] = false;
          previousHighlightedDistrict[9].close();
          closeSpecialInfoPanels(districtsInfo.indexOf(previousHighlightedDistrict));
          if (previousHighlightedDistrict[8]) {
            map.data.overrideStyle(previousHighlightedDistrict[11], {
              fillColor: colorPicker("topTen")
            });
          } else {
            map.data.overrideStyle(previousHighlightedDistrict[11], {
              fillColor: colorPicker(previousHighlightedDistrict[0].toString().substring(0, 1))
            });
          }
        }

        previousHighlightedDistrict = district;

        if (district[8]) {
          map.data.overrideStyle(event.feature, {
            fillColor: colorPicker("topTenh")
          });
        } else {
          map.data.overrideStyle(event.feature, {
            fillColor: colorPicker(district[0].toString().substring(0, 1) + "h")
          });
        }

      } else {
        district[10] = false;
        district[9].close();
        closeSpecialInfoPanels(districtsInfo.indexOf(district));
        if (district[8]) {
          map.data.overrideStyle(event.feature, {
            fillColor: colorPicker("topTen")
          });
        } else {
          map.data.overrideStyle(event.feature, {
            fillColor: colorPicker(district[0].toString().substring(0, 1))
          });
        }
      }
    }
  });
}

function highlightDistrict(district) {
  if (district[8]) {
    map.data.overrideStyle(district[11], {
      fillColor: colorPicker("topTenh")
    });
  } else {
    map.data.overrideStyle(district[11], {
      fillColor: colorPicker(district[0].toString().substring(0, 1) + "h")
    });
  }
}

function unHighlightDistrict(district) {
  if (district[8]) {
    map.data.overrideStyle(district[11], {
      fillColor: colorPicker("topTen")
    });
  } else {
    map.data.overrideStyle(district[11], {
      fillColor: colorPicker(district[0].toString().substring(0, 1))
    });
  }
}


function colorPicker(value) {
  color = "#000000"; //black: default
  if (value == '1') {
    color = "#F9A825"; //yellow: manhattan
  } else if (value == '2') {
    color = "#558B2F"; //greeen: bronx
  } else if (value == '3') {
    color = "#AB47BC"; //light purple: brooklyn
  } else if (value == '4') {
    color = "#03A9F4"; //blue: queens
  } else if (value == '5') {
    color = "#FF5722"; //orange: state island
  } else if (value == '1h') {
    color = "#FFFDE7"; //yellow: manhattan
  } else if (value == '2h') {
    color = "#F1F8E9"; //greeen: bronx
  } else if (value == '3h') {
    color = "#F3E5F5"; //light purple: brooklyn
  } else if (value == '4h') {
    color = "#E1F5FE"; //blue: queens
  } else if (value == '5h') {
    color = "#FBE9E7"; //orange: state island
  } else if (value == "topTen") {
    color = "#220337";
  } else if (value == "topTenh") {
    color = "#EDE7F6";
  }
  return color;
}
