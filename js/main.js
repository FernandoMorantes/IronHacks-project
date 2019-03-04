const NEIGHBORHOOD_NAMES_GIS = "https://data.cityofnewyork.us/api/views/xyye-rtrs/rows.json?accessType=DOWNLOAD";

const DISTRICT_GEOSHAPES = "https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nycd/FeatureServer/0/query?where=1=1&outFields=*&outSR=4326&f=geojson";

const CRIMES = "https://data.cityofnewyork.us/resource/qgea-i56i.json?$where=cmplnt_fr_dt=%222015-12-31T00:00:00%22&$limit=50000";

const HOUSING = "https://data.cityofnewyork.us/api/views/hg8x-zxpr/rows.json?accessType=DOWNLOAD";

const MUSEUMS = "https://data.cityofnewyork.us/api/views/fn6f-htvy/rows.json?accessType=DOWNLOAD";

const AIR_QUALITY = "https://data.cityofnewyork.us/api/views/c3uy-2p5r/rows.json?accessType=DOWNLOAD";

const ART_GALLERIES = "https://data.cityofnewyork.us/api/views/43hw-uvdj/rows.json?accessType=DOWNLOAD";

const FARMERS_MARKETS = "https://data.ny.gov/api/views/xjya-f8ng/rows.json?accessType=DOWNLOAD";

var neighborhoods_data;
var district_geoshapes;
var crimes_data;
var housing_data;

var museums_data;
var air_quality_data;
var art_galleries_data;
var farmers_markets_data;

var districtsScores = [];
var districtsTotalScore = [];
var previousTopTen = [];
var mainTopTen = [];

var selectedTab = "filters";

function getDataFromURL(URL, type, callback) {
  var data = $.get(URL, function () {})
    .done(function () {
      if (type == "neighborhoods_data") {
        neighborhoods_data = data.responseJSON.data;

      } else if (type == "district_geoshapes") {
        district_geoshapes = JSON.parse(data.responseText).features;

      } else if (type == "crimes") {
        crimes_data = data.responseJSON;

      } else if (type == "housing") {
        housing_data = data.responseJSON.data;

      } else if (type == "museums") {
        museums_data = data.responseJSON.data;

      } else if (type == "air_quality") {
        air_quality_data = data.responseJSON.data;

      } else if (type == "art_galleries") {
        art_galleries_data = data.responseJSON.data;

      } else if (type == "farmers_markets") {
        farmers_markets_data = data.responseJSON.data;
      }

      callback();
    })
    .fail(function (error) {
      console.error(error);
    });
}

function setDistrictPolygons(callback) {
  var districtInfo = [];
  district_geoshapes.forEach(function (reg) {
    if (reg.geometry.coordinates.length > 1) {

      districtInfo = [];
      districtInfo[0] = reg.properties.BoroCD;
      districtInfo[1] = selectBorough(Number(reg.properties.BoroCD.toString().substring(0, 1)));
      districtInfo[2] = [];

      reg.geometry.coordinates.forEach(function (polygon) {
        paths = [];
        color = "#000000";

        polygon.forEach(function (coordinate) {
          coordinate.forEach(function (point) {
            var path = {
              "lat": point[1],
              "lng": point[0]
            };
            paths.push(path);
          });
        });
        color = colorPicker(reg.properties.BoroCD.toString().charAt(0));

        districtInfo[2].push(setPolygon(paths, color));
      });
      districtsInfo.push(districtInfo);

    } else {
      paths = [];
      color = "#000000";
      districtInfo = [];
      districtInfo[2] = [];
      reg.geometry.coordinates[0].forEach(function (coordinate) {
        var path = {
          "lat": coordinate[1],
          "lng": coordinate[0]
        };
        paths.push(path);
      });
      color = colorPicker(reg.properties.BoroCD.toString().charAt(0));

      districtInfo[0] = reg.properties.BoroCD;
      districtInfo[1] = selectBorough(Number(reg.properties.BoroCD.toString().substring(0, 1)));
      districtInfo[2].push(setPolygon(paths, color));

      districtsInfo.push(districtInfo);
    }
  });

  callback();
}

function selectBorough(boroughNumber) {
  if (boroughNumber == 1) return "Manhattan";
  if (boroughNumber == 2) return "Bronx";
  if (boroughNumber == 3) return "Brooklyn";
  if (boroughNumber == 4) return "Queens";
  if (boroughNumber == 5) return "Staten Island";
}

function setCenterOfDistricts() {

  var polygonsCenter;
  districtsInfo.forEach(function (districtInfo) {
    polygonsCenter = [];

    districtInfo[2].forEach(function (polygon) {
      polygonsCenter.push(polygonCenter(polygon));
    });

    districtInfo[3] = averageGeolocation(polygonsCenter);
  });
}

function polygonCenter(polygon) {
  var bounds = new google.maps.LatLngBounds();
  var paths = polygon.getPath().j;

  for (i = 0; i < paths.length; i++) {
    bounds.extend(paths[i]);
  }

  var lat = bounds.getCenter().lat();
  var lng = bounds.getCenter().lng();
  return [lat, lng];
}

function averageGeolocation(coords) {
  if (coords.length === 1) {
    return coords[0];
  }

  var x = 0.0;
  var y = 0.0;
  var z = 0.0;

  coords.forEach(function (coord) {
    var latitude = coord[0] * Math.PI / 180;
    var longitude = coord[1] * Math.PI / 180;

    x += Math.cos(latitude) * Math.cos(longitude);
    y += Math.cos(latitude) * Math.sin(longitude);
    z += Math.sin(latitude);
  });

  var total = coords.length;

  x = x / total;
  y = y / total;
  z = z / total;

  var centralLongitude = Math.atan2(y, x);
  var centralSquareRoot = Math.sqrt(x * x + y * y);
  var centralLatitude = Math.atan2(z, centralSquareRoot);

  return [(centralLatitude * 180 / Math.PI), (centralLongitude * 180 / Math.PI)];
}


var neighborhoods_info = [];

function setDistrictNeighboorhoods(callback) {
  districtsInfo.forEach(function (districtInfo) {
    districtInfo[4] = [];
  });

  var neighborhood_info = [];

  neighborhoods_data.forEach(function (neighborhood_data) {
    neighborhood_info = [];
    var latlngString = neighborhood_data[8].replace('POINT (', '').slice(0, -1);
    latLng = latlngString.split(' ');
    neighborhood_info.push(latLng);

    latLngCoordinate = new google.maps.LatLng(parseFloat(latLng[1]), parseFloat(latLng[0]));
    var BreakException = {};
    var isInsideDistrict = false;

    try {
      districtsInfo.forEach(function (districtInfo) {
        districtInfo[2].forEach(function (polygon) {
          if (neighborhood_data[10] == "Marble Hill") {
            neighborhood_info.push(208);
            districtsInfo[6][4].push("Marble Hill");
            throw BreakException;
          }
          if (neighborhood_data[10] == "Fulton Ferry") {
            neighborhood_info.push(302);
            districtsInfo[30][4].push("Fulton Ferry");
            throw BreakException;
          }

          if (districtInfo[1] === neighborhood_data[16]) {
            isInsideDistrict = google.maps.geometry.poly.containsLocation(latLngCoordinate, polygon);
          }
          if (isInsideDistrict) {
            districtInfo[4].push(neighborhood_data[10]);
            neighborhood_info.push(districtInfo[0]);
            throw BreakException;
          }
        });
      });
    } catch (e) {
      if (e !== BreakException) throw e;
    }

    neighborhood_info.push(neighborhood_data[10]);
    neighborhood_info.push(neighborhood_data[16]);
    neighborhoods_info.push(neighborhood_info);
  });
  callback();
}

function filterHabitableDistricts(callback) {
  districtsInfo.forEach(function (districtInfo) {
    districtInfo[5] = true;
    if (districtInfo[4].length == 0) {
      districtInfo[5] = false;
    }
  });
  callback();
}

function setDistrictHousing() {
  var BreakException;
  var BuildingDistrictID = "";
  districtsInfo.forEach(function (districtInfo) {
    districtInfo[6] = [];
  });

  housing_data.forEach(function (housing) {
    if ((housing[23] && housing[24]) || (housing[25] && housing[26])) {
      BuildingDistrictID = parseBuildingDistrictID(housing[19]);
      try {
        districtsInfo.forEach(function (districtInfo) {
          if (districtInfo[5]) {
            if (BuildingDistrictID == districtInfo[0]) {
              districtInfo[6].push([housing[13], housing[14], housing[15], housing[23], housing[24], housing[33]]);
              throw BreakException;
            }
          }

        });
      } catch (e) {
        if (e !== BreakException) throw e;
      }
    }

  });
}

function parseBuildingDistrictID(buildingID) {
  var districtID;
  if (buildingID.substring(0, 2) == "MN") {
    districtID = "1";
  } else if (buildingID.substring(0, 2) == "BX") {
    districtID = "2";
  } else if (buildingID.substring(0, 2) == "BK") {
    districtID = "3";
  } else if (buildingID.substring(0, 2) == "QN") {
    districtID = "4";
  } else if (buildingID.substring(0, 2) == "SI") {
    districtID = "5";
  }

  return districtID + buildingID.substring(3, 5);
}

function setDistrictCrimes() {

  districtsInfo.forEach(function (districtInfo) {
    districtInfo[7] = 0;
  });

  crimes_data.forEach(function (crime) {

    var BreakException = {};
    var isInsideDistrict = false;
    latLngCoordinate = new google.maps.LatLng(parseFloat(crime.latitude), parseFloat(crime.longitude));

    try {
      districtsInfo.forEach(function (districtInfo) {
        if (districtInfo[5]) {
          districtInfo[2].forEach(function (polygon) {
            if (districtInfo[1].toUpperCase() === crime.boro_nm) {
              isInsideDistrict = google.maps.geometry.poly.containsLocation(latLngCoordinate, polygon);
              if (isInsideDistrict) {
                districtInfo[7] += 1;
                throw BreakException;
              }
            }
          });
        }
      });
    } catch (e) {
      if (e !== BreakException) throw e;
    }
  });
}

function setDistrictMuseums() {
  districtsInfo.forEach(function (districtInfo) {
    districtInfo[17] = 0;
    districtInfo[18] = [];
  });

  var latLng;
  var latLngCoordinate;
  var BreakException = {};
  var isInsideDistrict = false;

  museums_data.forEach(function (museum) {

    var latlngString = museum[8].replace('POINT (', '').slice(0, -1);
    latLng = latlngString.split(' ');
    latLngCoordinate = new google.maps.LatLng(parseFloat(latLng[1]), parseFloat(latLng[0]));

    try {
      districtsInfo.forEach(function (districtInfo) {
        if (districtInfo[5]) {
          districtInfo[2].forEach(function (polygon) {
            isInsideDistrict = google.maps.geometry.poly.containsLocation(latLngCoordinate, polygon);

            if (isInsideDistrict) {
              districtInfo[17] += 1;
              districtInfo[18].push([museum[9], museum[11], museum[12]]);
              throw BreakException;
            }
          });
        }
      });
    } catch (e) {
      if (e !== BreakException) throw e;
    }
  });
}

function setDistrictAirQuality() {
  districtsInfo.forEach(function (districtInfo) {
    districtInfo[19] = [];
  });

  var BreakException;
  neighborhoods_info.splice(76, 1);

  air_quality_data.forEach(function (air_quality) {

    if (air_quality[10] == "Air Toxics Concentrations- Average Benzene Concentrations" ||
      air_quality[10] == "Air Toxics Concentrations- Average Formaldehyde Concentrations" ||
      air_quality[10] == "Neighborhood Air Quality Concentrations- Elemental Carbon (EC)" ||
      air_quality[10] == "Neighborhood Air Quality Concentrations- Fine Particulate Matter (PM2.5)" ||
      air_quality[10] == "Neighborhood Air Quality Concentrations- Nitrogen Dioxide (NO2)" ||
      air_quality[10] == "Neighborhood Air Quality Concentrations- Nitric Oxide (NO)" ||
      air_quality[10] == "Neighborhood Air Quality Concentrations: Sulfur Dioxide (SO2)" ||
      air_quality[10] == "Neighborhood Air Quality Concentrations- Ozone (O3)") {

      var airQualityNeighboorhoods = air_quality[14].split(" - ");
      var districtIDs = [];

      airQualityNeighboorhoods.forEach(function (airQualityNeighboorhood) {
        try {
          if (airQualityNeighboorhood == "Jamaica") {
            airQualityNeighboorhood = "Jamaica Center";
          }
          if (airQualityNeighboorhood == "University Hts.") {
            airQualityNeighboorhood = "University Heights";
          }
          if (airQualityNeighboorhood == "Highbridge") {
            airQualityNeighboorhood = "High  Bridge";
          }
          if (airQualityNeighboorhood == "High bridge") {
            airQualityNeighboorhood = "High  Bridge";
          }
          if (airQualityNeighboorhood == "SoHo") {
            airQualityNeighboorhood = "Soho";
          }
          if (airQualityNeighboorhood == "Union Square") {
            districtIDs.push(105);
          }
          if (airQualityNeighboorhood == "Crown Heights South" || airQualityNeighboorhood == "Crown Heights North") {
            airQualityNeighboorhood = "Crown Heights";
          }
          if (airQualityNeighboorhood == "Crotona -Tremont") {
            airQualityNeighboorhood = "East Tremont";
          }
          if (airQualityNeighboorhood == "Slope") {
            airQualityNeighboorhood = "Park Slope";
          }
          if (airQualityNeighboorhood == "Gramercy Park") {
            airQualityNeighboorhood = "Gramercy";
          }
          if (airQualityNeighboorhood == "Flushing") {
            airQualityNeighboorhood = "Downtown Flushing";
          }
          if (airQualityNeighboorhood == "Flatbush") {

          }
          if (airQualityNeighboorhood == "Flatbush") {

          }

          neighborhoods_info.forEach(function (neighboorhoodInfo) {
            if (airQualityNeighboorhood == neighboorhoodInfo[2]) {
              districtIDs.push(neighboorhoodInfo[1]);
              throw BreakException;
            }
          });

        } catch (e) {
          if (e !== BreakException) throw e;
        }
      });

      districtIDs.forEach(function (districtIDs) {
        try {
          districtsInfo.forEach(function (districtInfo) {
            if (districtInfo[5]) {
              if (districtIDs == districtInfo[0]) {
                districtInfo[19].push(Number(air_quality[16]));

                throw BreakException;
              }
            }

          });
        } catch (e) {
          if (e !== BreakException) throw e;
        }
      });

    }

  });
  districtsInfo.forEach(function (districtInfo) {
    var districtAirQuality = 0;
    districtInfo[19].forEach(function (air_quality) {
      districtAirQuality += air_quality;
    });

    districtAirQuality.toFixed(3);

    if (districtInfo[19].length != 0) {
      districtAirQuality = (districtAirQuality) / (districtInfo[19].length);
    }

    districtInfo[19] = [];
    districtInfo[19].push(districtAirQuality.toFixed(3));
  });
}

function setDistrictArtGalleries() {
  districtsInfo.forEach(function (districtInfo) {
    districtInfo[20] = 0;
    districtInfo[21] = [];
  });

  var latLngCoordinate;
  var latLng;
  var BreakException = {};
  var isInsideDistrict = false;

  art_galleries_data.forEach(function (art_galleries) {

    var latlngString = art_galleries[8].replace('POINT (', '').slice(0, -1);
    latLng = latlngString.split(' ');
    latLngCoordinate = new google.maps.LatLng(parseFloat(latLng[1]), parseFloat(latLng[0]));

    try {
      districtsInfo.forEach(function (districtInfo) {
        if (districtInfo[5]) {
          districtInfo[2].forEach(function (polygon) {
            isInsideDistrict = google.maps.geometry.poly.containsLocation(latLngCoordinate, polygon);

            if (isInsideDistrict) {
              districtInfo[20] += 1;
              districtInfo[21].push([art_galleries[9], art_galleries[11], art_galleries[12]]);
              throw BreakException;
            }
          });
        }

      });
    } catch (e) {
      if (e !== BreakException) throw e;
    }
  });
}

function setDistrictFarmerMarkets(callback) {
  districtsInfo.forEach(function (districtInfo) {
    districtInfo[22] = 0;
    districtInfo[23] = [];
  });

  var BreakException = {};
  var isInsideDistrict = false;
  var latLngCoordinate;

  farmers_markets_data.forEach(function (farmers_markets) {
    if (farmers_markets[12] == "Manhattan" || farmers_markets[12] == "Brooklyn" || farmers_markets[12] == "Bronx" ||
      farmers_markets[12] == "Queens" || farmers_markets[12] == "Staten Island" || farmers_markets[12] == "Richmond" ||
      farmers_markets[12] == "Kings" || farmers_markets[12] == "New York" || farmers_markets[12] == "Farm Rockaway" ||
      farmers_markets[12] == "Jamaica" || farmers_markets[12] == "Flushing" || farmers_markets[12] == "Long Island City" ||
      farmers_markets[12] == "Arverne" || farmers_markets[12] == "Far Rockaway" || farmers_markets[12] == "Fresh Meadows" ||
      farmers_markets[12] == "Elmhurst" || farmers_markets[12] == "jackson heights" || farmers_markets[12] == "Ridgewood" ||
      farmers_markets[12] == "Sunnyside" || farmers_markets[12] == "New York" || farmers_markets[12] == "New York") {

      var lat = Number(farmers_markets[22]);
      var lng = Number(farmers_markets[23]);
      latLngCoordinate = new google.maps.LatLng(lat, lng);

      try {
        districtsInfo.forEach(function (districtInfo) {
          if (districtInfo[5]) {
            districtInfo[2].forEach(function (polygon) {
              isInsideDistrict = google.maps.geometry.poly.containsLocation(latLngCoordinate, polygon);

              if (isInsideDistrict) {
                districtInfo[22] += 1;
                districtInfo[23].push([farmers_markets[9], farmers_markets[11], farmers_markets[16], farmers_markets[18]]);
                throw BreakException;
              }
            });
          }

        });
      } catch (e) {
        if (e !== BreakException) throw e;
      }
    }

  });
  callback();
}

function setDistrictScores(callback) {
  setDistanceToStern();
  setSafetyScore();
  setAffordabilityScore();
  districtsInfo.forEach(function (districtInfo) {
    districtInfo[8] = false;
  });

  callback();
}

function setDistanceToStern() {
  districtsInfo.forEach(function (districtInfo) {
    districtInfo[14] = 0;
  });
  districtsInfo.forEach(function (districtInfo) {
    if (districtInfo[5]) {
      districtInfo[14] = distanceBetweenPoints(districtInfo[3], [40.7291, -73.9965]);
    }

  });
}

function distanceBetweenPoints(p1, p2) {
  var rad = function (x) {
    return x * Math.PI / 180;
  };

  var R = 6378137; // Earth’s mean radius in meter
  var dLat = rad(p2[0] - p1[0]);
  var dLong = rad(p2[1] - p1[1]);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(p1[0])) * Math.cos(rad(p2[0])) *
    Math.sin(dLong / 2) * Math.sin(dLong / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d; // returns the distance in meter
}

function setSafetyScore() {
  districtsInfo.forEach(function (districtInfo) {
    districtInfo[15] = 0;
  });
  districtsInfo.forEach(function (districtInfo) {
    districtInfo[15] = districtInfo[7];
  });
}

function setAffordabilityScore() {
  districtsInfo.forEach(function (districtInfo) {
    districtInfo[16] = 0;
  });
  districtsInfo.forEach(function (districtInfo) {
    districtInfo[6].forEach(function (buildings) {
      districtInfo[16] += Number(buildings[5]);
    });
  });
}

var maximumDistance;
var maximumCrimes;
var maximumAirQuality;

function getMaxDistance(callback) {
  var distances = [];
  districtsInfo.forEach(function (districtInfo) {
    if (districtInfo[5]) distances.push(districtInfo[14]);
  });
  maximumDistance = Math.max.apply(Math, distances);
  callback();
}

function getMaxCrimes(callback) {
  var crimes = [];
  districtsInfo.forEach(function (districtInfo) {
    if (districtInfo[5]) crimes.push(districtInfo[15]);
  });
  maximumCrimes = Math.max.apply(Math, crimes);
  callback();
}

function getMaxAirQuality(callback) {
  var airQuality = [];
  districtsInfo.forEach(function (districtInfo) {
    if (districtInfo[5]) airQuality.push(districtInfo[19]);
  });
  maximumAirQuality = Math.max.apply(Math, airQuality);
  callback();
}

var distanceScores = [];
var safetyScores = [];
var affordabilityScores = [];
var museumsScores = [];
var airQualityScores = [];
var artGalleriesScores = [];
var marketsScores = [];

function scoresComparator(a, b) {
  if (a[1] < b[1])
    return 1;
  if (a[1] > b[1])
    return -1;
  return 0;
}

function getDistanceScores() {
  districtsInfo.forEach(function (districtInfo, i) {
    districtInfo[26] = 0;
    if (districtInfo[5]) distanceScores.push([i, (maximumDistance - districtInfo[14])]);
  });
  distanceScores.sort(scoresComparator);

  distanceScores.forEach(function (score, i) {
    districtsInfo[score[0]][26] = (i + 1);
  });
}

function getSafetyScores() {
  districtsInfo.forEach(function (districtInfo, i) {
    districtInfo[27] = 0;
    if (districtInfo[5]) safetyScores.push([i, (maximumCrimes - districtInfo[15])]);
  });
  safetyScores.sort(scoresComparator);

  safetyScores.forEach(function (score, i) {
    districtsInfo[score[0]][27] = (i + 1);
  });
}

function getAffordabilityScores() {
  districtsInfo.forEach(function (districtInfo, i) {
    districtInfo[28] = 0;
    if (districtInfo[5]) affordabilityScores.push([i, (districtInfo[16])]);
  });
  affordabilityScores.sort(scoresComparator);

  affordabilityScores.forEach(function (score, i) {
    districtsInfo[score[0]][28] = (i + 1);
  });
}

function getMuseumsScores() {
  districtsInfo.forEach(function (districtInfo, i) {
    districtInfo[29] = 0;
    if (districtInfo[5]) museumsScores.push([i, (districtInfo[17])]);
  });
  museumsScores.sort(scoresComparator);

  museumsScores.forEach(function (score, i) {
    districtsInfo[score[0]][29] = (i + 1);
  });
}

function getAirQualityScores() {
  districtsInfo.forEach(function (districtInfo, i) {
    districtInfo[30] = 0;
    if (districtInfo[5]) {
      if (districtInfo[19] == 0) {
        airQualityScores.push([i, 0]);
      } else {
        airQualityScores.push([i, (maximumAirQuality - Number(districtInfo[19][0]))]);
      }
    }
  });
  airQualityScores.sort(scoresComparator);

  airQualityScores.forEach(function (score, i) {
    districtsInfo[score[0]][30] = (i + 1);
  });
}

function getArtGalleriesScores() {
  districtsInfo.forEach(function (districtInfo, i) {
    districtInfo[31] = 0;
    if (districtInfo[5]) artGalleriesScores.push([i, (districtInfo[20])]);
  });
  artGalleriesScores.sort(scoresComparator);

  artGalleriesScores.forEach(function (score, i) {
    districtsInfo[score[0]][31] = (i + 1);
  });
}

function getMarketScores(callback) {
  districtsInfo.forEach(function (districtInfo, i) {
    districtInfo[32] = 0;
    if (districtInfo[5]) marketsScores.push([i, (districtInfo[22])]);
  });
  marketsScores.sort(scoresComparator);

  marketsScores.forEach(function (score, i) {
    districtsInfo[score[0]][32] = (i + 1);
  });
  callback();
}

var rankingDistrictsID = [];

function calculateDistrictRanking(buttonsActivated, slidersValue, specialFilter1, specialFilter2,
  specialFilter3, specialFilter4) {
  var locationImportanceCoef;
  var safetyImportanceCoef;
  var affordabilityImportanceCoef;

  if (buttonsActivated[0]) {
    locationImportanceCoef = 4 - slidersValue[0];
  } else {
    locationImportanceCoef = 0;
  }

  if (buttonsActivated[1]) {
    safetyImportanceCoef = 4 - slidersValue[1];
  } else {
    safetyImportanceCoef = 0;
  }

  if (buttonsActivated[2]) {
    affordabilityImportanceCoef = 4 - slidersValue[2];
  } else {
    affordabilityImportanceCoef = 0;
  }

  rankingDistrictsID = [];

  desactivateAllDistricts(districtsInfo);
  previousTopTen = mainTopTen;

  districtsInfo.forEach(function (districtInfo) {
    districtInfo[8] = false;
  });

  if (!buttonsActivated[0] && !buttonsActivated[1] && !buttonsActivated[2] &&
    !specialFilter1[0] && !specialFilter2[0] && !specialFilter3[0] && !specialFilter4[0]) {
    mainTopTen = [];
    filtersSelected = false;
    drawTopTenDistricts();
    $(".ranking_warning_container").css("display", "flex");
    $(".main_ranking_content").css("display", "none");

  } else {
    getTopTen([locationImportanceCoef, safetyImportanceCoef, affordabilityImportanceCoef, specialFilter1[1],
      specialFilter2[1], specialFilter3[1], specialFilter4[1]
    ]);
    filtersSelected = true;
    drawTopTenDistricts();
    $(".ranking_warning_container").css("display", "none");
    $(".main_ranking_content").css("display", "flex");

  }

}

function getTopTen(params) {

  mainTopTen = [];
  districtsTotalScore = [];
  var districtTotalScore;
  var closenessValue = 0;
  var safetyValue = 0;
  var affordabilityValue = 0;
  var museumsValue = 0;
  var airQualityValue = 0;
  var artGalleriesValue = 0;
  var farmerMarketsValue = 0;
  var totalScore = 0;
  var i = 0;

  districtsInfo.forEach(function (districtInfo) {

    totalScore = 0;
    districtTotalScore = [];
    districtTotalScore.push(districtInfo[0]);
    districtTotalScore.push(districtInfo[1]);
    districtTotalScore.push(districtInfo[3]);
    districtTotalScore.push(districtInfo[5]);
    districtTotalScore.push(districtInfo[14]);
    districtTotalScore.push(districtInfo[15]);
    districtTotalScore.push(districtInfo[16]);
    districtTotalScore.push(districtInfo[17]);
    districtTotalScore.push(districtInfo[19]);
    districtTotalScore.push(districtInfo[20]);
    districtTotalScore.push(districtInfo[22]);

    closenessValue = params[0] * districtInfo[26];
    safetyValue = params[1] * districtInfo[27];
    affordabilityValue = params[2] * districtInfo[28];
    museumsValue = params[3] * districtInfo[29];
    airQualityValue = params[4] * districtInfo[30];
    artGalleriesValue = params[5] * districtInfo[31];
    farmerMarketsValue = params[6] * districtInfo[32];

    totalScore = (closenessValue + safetyValue + affordabilityValue + museumsValue +
      airQualityValue + artGalleriesValue + farmerMarketsValue);

    districtTotalScore.push(totalScore);
    districtTotalScore.push(i);
    if (districtInfo[5]) districtsTotalScore.push(districtTotalScore);

    districtsTotalScore.sort(rankingComparision);
    i++;
  });

  console.log(districtsTotalScore);

  for (var n = 0; n < 10; n++) {
    mainTopTen[n] = districtsTotalScore[n];
    districtsInfo[districtsTotalScore[n][12]][8] = true;
  }

  districtsInfo.forEach(function (districtInfo) {
    districtInfo[13] = 0;
  });

  var BreakException = {};
  for (var j = 0; j < districtsInfo.length; j++) {
    try {
      for (var k = 0; k < mainTopTen.length; k++) {
        if (districtsInfo[j][0] == mainTopTen[k][0]) {
          districtsInfo[j][13] = k;
          throw BreakException;
        }
      }
    } catch (e) {
      if (e !== BreakException) throw e;
    }

  }

  setRankingData(params);
}

function rankingComparision(a, b) {
  if (a[11] < b[11])
    return -1;
  if (a[11] > b[11])
    return 1;
  return 0;
}

function drawTopTenDistricts() {
  setDistrictInfoWindow(districtsInfo, districtsScores);
  previousTopTen.forEach(function (previousTopTenDistrict) {
    previousTopTenDistrict[13].setMap(null);
  });

  for (var i = 0; i < mainTopTen.length; i++) {
    mainTopTen[i].push(setMarker(mainTopTen[i][2], (i + 1).toString() + selectSufix(i + 1), "#57068c"));
  }

  drawDistrictPolygons();
}

function selectSufix(i) {
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

function goToDistrict(i) {
  if (rankingDistrictsID[i] != undefined) {

    var center = districtsInfo[rankingDistrictsID[i]][3];

    latLng = new google.maps.LatLng(center[0], (center[1] - getMapOffset()));

    if (previousHighlightedDistrict != districtsInfo[rankingDistrictsID[i]]) setMapCenter(latLng);

    if (!districtsInfo[rankingDistrictsID[i]][10]) {
      districtsInfo[rankingDistrictsID[i]][10] = true;
      districtsInfo[rankingDistrictsID[i]][9].open(map);
    }

    highlightDistrict(districtsInfo[rankingDistrictsID[i]]);
    for (var j = 0; j < 10; j++) {
      if (i != j) {
        unHighlightDistrict(districtsInfo[rankingDistrictsID[j]]);
      }
    }

    districtsInfo.forEach(function (districtInfo) {
      if (districtsInfo[rankingDistrictsID[i]][0] != districtInfo[0]) {
        districtInfo[10] = false;
        closeSpecialInfoPanels(districtsInfo.indexOf(districtInfo));
        districtInfo[9].close();
      }
    });

    previousHighlightedDistrict = districtsInfo[rankingDistrictsID[i]];
  }
}

function setRankingData(params) {
  console.log(mainTopTen);

  var rankingPosition;
  var rankingID;
  var rankingBorough;
  var topOneScoresContent = '';
  var tableHeaderContent =
    '<div class="ranking_header_data">' +
    '<h4>Position</h4>' +
    '</div>' +
    '<div class="ranking_header_data">' +
    '<h4>District ID</h4>' +
    '</div>';


  if (params[0] != 0) {
    topOneScoresContent = topOneScoresContent +
      '<div class="top_one_internal_margin"></div>' +
      '<div class="top_one_score_container">' +
      '<h3>Distance:</h3>' +
      '<h4>' + "&nbsp&nbsp" + mainTopTen[0][4].toFixed(0).toString() + 'm</h4>' +
      '</div>' +
      '<div class="top_one_internal_margin"></div>';

    tableHeaderContent = tableHeaderContent +
      '<div class="ranking_header_data">' +
      '<h4>Distance</h4>' +
      '</div>';
  }

  if (params[1] != 0) {
    topOneScoresContent = topOneScoresContent +
      '<div class="top_one_internal_margin"></div>' +
      '<div class="top_one_score_container">' +
      '<h3>Crimes:</h3>' +
      '<h4>' + "&nbsp&nbsp" + mainTopTen[0][5].toString() + '</h4>' +
      '</div>' +
      '<div class="top_one_internal_margin"></div>';

    tableHeaderContent = tableHeaderContent +
      '<div class="ranking_header_data">' +
      '<h4>Crimes</h4>' +
      '</div>';
  }

  if (params[2] != 0) {
    topOneScoresContent = topOneScoresContent +
      '<div class="top_one_internal_margin"></div>' +
      '<div class="top_one_score_container">' +
      '<h3>Affordable units:</h3>' +
      '<h4>' + "&nbsp&nbsp" + mainTopTen[0][6].toString() + '</h4>' +
      '</div>' +
      '<div class="top_one_internal_margin"></div>';

    tableHeaderContent = tableHeaderContent +
      '<div class="ranking_header_data">' +
      '<h4>Affordable units</h4>' +
      '</div>';
  }

  if (params[3] != 0) {
    topOneScoresContent = topOneScoresContent +
      '<div class="top_one_internal_margin"></div>' +
      '<div class="top_one_score_container">' +
      '<h3>Museums:</h3>' +
      '<h4>' + "&nbsp&nbsp" + mainTopTen[0][7].toString() + '</h4>' +
      '</div>' +
      '<div class="top_one_internal_margin"></div>';

    tableHeaderContent = tableHeaderContent +
      '<div class="ranking_header_data">' +
      '<h4>Museums</h4>' +
      '</div>';
  }

  if (params[4] != 0) {
    var airQualityTopOne = '';
    if (Number(mainTopTen[0][8][0]) != 0) {
      airQualityTopOne = mainTopTen[0][8][0].toString();
    } else {
      airQualityTopOne = "No data";
    }

    topOneScoresContent = topOneScoresContent +
      '<div class="top_one_internal_margin"></div>' +
      '<div class="top_one_score_container">' +
      '<h3>Air quality:</h3>' +
      '<h4>' + "&nbsp&nbsp" + airQualityTopOne + '</h4>' +
      '</div>' +
      '<div class="top_one_internal_margin"></div>';

    tableHeaderContent = tableHeaderContent +
      '<div class="ranking_header_data">' +
      '<h4>Pollution</h4>' +
      '</div>';
  }

  if (params[5] != 0) {
    topOneScoresContent = topOneScoresContent +
      '<div class="top_one_internal_margin"></div>' +
      '<div class="top_one_score_container">' +
      '<h3>Art galleries:</h3>' +
      '<h4>' + "&nbsp&nbsp" + mainTopTen[0][9].toString() + '</h4>' +
      '</div>' +
      '<div class="top_one_internal_margin"></div>';

    tableHeaderContent = tableHeaderContent +
      '<div class="ranking_header_data">' +
      '<h4>Galleries</h4>' +
      '</div>';
  }

  if (params[6] != 0) {
    topOneScoresContent = topOneScoresContent +
      '<div class="top_one_internal_margin"></div>' +
      '<div class="top_one_score_container">' +
      '<h3>Farmer markets:</h3>' +
      '<h4>' + "&nbsp&nbsp" + mainTopTen[0][10].toString() + '</h4>' +
      '</div>' +
      '<div class="top_one_internal_margin"></div>';

    tableHeaderContent = tableHeaderContent +
      '<div class="ranking_header_data">' +
      '<h4>Markets</h4>' +
      '</div>';
  }

  tableHeaderContent = tableHeaderContent +
    '<div class="ranking_header_data">' +
    '<h4 class="link_header_txt">Link</h4>' +
    '</div>';

  rankingID = "#top_one_id";
  rankingBorough = "#top_one_borough";

  $(rankingID).html("&nbsp" + mainTopTen[0][0]);

  if (mainTopTen[0][1] == "Staten Island") {
    $(rankingBorough).html("S.Island");
  } else {
    $(rankingBorough).html(mainTopTen[0][1]);
  }

  $(".top_one_scores_container").html(topOneScoresContent);
  $(".ranking_header").html(tableHeaderContent);

  rankingDistrictsID[0] = [];

  for (var n = 0; n < districtsInfo.length; n++) {
    if (districtsInfo[n][0] == mainTopTen[0][0]) {
      rankingDistrictsID[0].push(n);
    }
  }


  for (var i = 1; i < mainTopTen.length; i++) {
    var rankigRowContent = '';
    var index = i.toString();

    rankigRowContent = rankigRowContent +
      '<div class="ranking_data">' +
      '<h4>' + "&nbsp&nbsp" + (i + 1).toString() + selectSufix(i + 1) + '</h4>' +
      '</div>' +
      '<div class="ranking_data">' +
      '<h4>' + "&nbsp&nbsp" + mainTopTen[i][0].toString() + '</h4>' +
      '</div>';

    if (params[0] != 0) {
      rankigRowContent = rankigRowContent +
        '<div class="ranking_data">' +
        '<h4>' + "&nbsp&nbsp" + mainTopTen[i][4].toFixed(0).toString() + 'm</h4>' +
        '</div>';
    }

    if (params[1] != 0) {
      rankigRowContent = rankigRowContent +
        '<div class="ranking_data">' +
        '<h4>' + "&nbsp&nbsp" + mainTopTen[i][5].toString() + '</h4>' +
        '</div>';
    }

    if (params[2] != 0) {
      rankigRowContent = rankigRowContent +
        '<div class="ranking_data">' +
        '<h4>' + "&nbsp&nbsp" + mainTopTen[i][6].toString() + '</h4>' +
        '</div>';
    }

    if (params[3] != 0) {
      rankigRowContent = rankigRowContent +
        '<div class="ranking_data">' +
        '<h4>' + "&nbsp&nbsp" + mainTopTen[i][7].toString() + '</h4>' +
        '</div>';
    }

    if (params[4] != 0) {
      var airQualityRanking = '';
      if (Number(mainTopTen[i][8][0]) != 0) {
        airQualityRanking = mainTopTen[i][8][0].toString();
      } else {
        airQualityRanking = "No data";
      }

      rankigRowContent = rankigRowContent +
        '<div class="ranking_data">' +
        '<h4>' + "&nbsp&nbsp" + airQualityRanking + '</h4>' +
        '</div>';
    }

    if (params[5] != 0) {
      rankigRowContent = rankigRowContent +
        '<div class="ranking_data">' +
        '<h4>' + "&nbsp&nbsp" + mainTopTen[i][9].toString() + '</h4>' +
        '</div>';
    }

    if (params[6] != 0) {
      rankigRowContent = rankigRowContent +
        '<div class="ranking_data">' +
        '<h4>' + "&nbsp&nbsp" + mainTopTen[i][10].toString() + '</h4>' +
        '</div>';
    }

    rankigRowContent = rankigRowContent +
      '<div class="ranking_button_container">' +
      '<div id="' + index + '_ranking_district_map_button" class="ranking_button" onclick="goToDistrict(' + index + ')">' +
      '<h6>Map</h6>' +
      '</div>' +
      '</div>';

    rankingDistrictsID[i] = [];

    for (var j = 0; j < districtsInfo.length; j++) {
      if (districtsInfo[j][0] == mainTopTen[i][0]) {
        rankingDistrictsID[i].push(j);
      }
    }

    $("#row_content_" + index).html(rankigRowContent);
  }
}

function districtListButtonsAction(i) {
  if (districtsInfo[i][5]) {
    var center = districtsInfo[i][3];

    latLng = new google.maps.LatLng(center[0], (center[1] - getMapOffset()));
    if (previousHighlightedDistrict != districtsInfo[i]) setMapCenter(latLng);

    if (!districtsInfo[i][10]) {
      districtsInfo[i][10] = true;
      districtsInfo[i][9].open(map);
    }

    highlightDistrict(districtsInfo[i]);
    for (var j = 0; j < districtsInfo.length; j++) {
      if ((i != j) && (districtsInfo[j][5])) {
        unHighlightDistrict(districtsInfo[j]);
      }
    }

    districtsInfo.forEach(function (districtInfo) {
      if (districtsInfo[i][0] != districtInfo[0]) {
        districtInfo[10] = false;
        closeSpecialInfoPanels(districtsInfo.indexOf(districtInfo));
        districtInfo[9].close();
      }
    });

    previousHighlightedDistrict = districtsInfo[i];
  }
}

function exportToCsv(filename, rows) {
  var processRow = function (row) {
    var finalVal = '';
    for (var j = 0; j < row.length; j++) {
      var innerValue = row[j] === undefined ? '' : row[j].toString() + ", ";
      finalVal += innerValue;
    }
    return finalVal + '\n';
  };

  var csvFile;
  if (filename == "Districts Information") {
    csvFile = "District ID, Borough, Center latitude, Center longitude, Neighborhoods, Distance to NYU, " +
      "Crimes, Affordable units, Museums, Air quality, Art galleries, " +
      "Farmers markets\n";
  } else {
    csvFile = "District ID, Borough, Center latitude, Center longitude, Distance to NYU, " +
      "Crimes, Affordable units, Museums, Air quality, Art galleries, " +
      "Farmers markets\n";
  }

  for (var i = 0; i < rows.length; i++) {
    csvFile += processRow(rows[i]);
  }

  var blob = new Blob([csvFile], {
    type: 'text/csv;charset=utf-8;'
  });
  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    var link = document.createElement("a");
    link.setAttribute("style", "visibility:hidden");
    if (link.download !== undefined) { // feature detection
      // Browsers that support HTML5 download attribute
      var url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    if (link.download !== undefined) {
      link.setAttribute("download", filename);
    } else {
      link.setAttribute("target", "_blank");
    }
  }
}

$(document).ready(function () {

  $("#check_1").prop('checked', true);
  $(".menu_button_1").css("color", "#B71C1C");
  $(".menu_button_1 i").removeClass("fas fa-filter");
  $(".menu_button_1 i").addClass("fas fa-chevron-left");
  $(".button_1_txt").css("color", "#B71C1C");
  $(".button_1_txt").text("Hide tab");

  var infoActivated = false;
  var infoButtonActivated = false;

  function fillHabitableDistrictsList(callback) {

    var listContent =
      '<div class="districts_list_header">' +
      '<div class="districts_list_data">' +
      '<h4>District ID</h4>' +
      '</div>' +
      '<div class="districts_list_data">' +
      '<h4>Borough</h4>' +
      '</div>' +
      '<div class="districts_list_data">' +
      '<h4>&nbsp Latitude &nbsp center</h4>' +
      '</div>' +
      '<div class="districts_list_data">' +
      '<h4>Longitude Center</h4>' +
      '</div>' +
      '<div class="districts_list_data">' +
      '<h4>Number of neighborhoods</h4>' +
      '</div>' +
      '<div class="districts_list_data">' +
      '<h4>Map link</h4>' +
      '</div>' +
      '</div>';

    var borough = "";

    for (var i = 0; i < districtsInfo.length; i++) {
      if (districtsInfo[i][5]) {

        if (districtsInfo[i][1] == "Staten Island") {
          borough = "S.Island";
        } else {
          borough = (districtsInfo[i][1]).toString();
        }
        listContent = listContent +
          '<div id="districts_list_row_' + i + '" class="districts_list_row">' +
          '<div id="districts_list_row_content_' + i + '" class="districts_list_row_content">' +
          '<div class="districts_list_data">' +
          '<h4 id="' + i + '_districts_list_district_id">' + (districtsInfo[i][0]).toString() + '</h4>' +
          '</div>' +
          '<div class="districts_list_data">' +
          '<h4 id="' + i + '_districts_list_district_borough">' + borough + '</h4>' +
          '</div>' +
          '<div class="districts_list_data">' +
          '<h4 id="' + i + '_districts_list_district_latitude">' + ((districtsInfo[i][3][0]).toFixed(4)).toString() + '</h4>' +
          '</div>' +
          '<div class="districts_list_data">' +
          '<h4 id="' + i + '_districts_list_district_longitude">' + ((districtsInfo[i][3][1]).toFixed(4)).toString() + '</h4>' +
          '</div>' +
          '<div class="districts_list_data">' +
          '<h4 id="' + i + '_districts_list_district_no_hoods">' + (districtsInfo[i][4].length).toString() + '</h4>' +
          '</div>' +
          '<div class="districts_list_button_container">' +
          '<div id="' + i + '_districts_list_district_map_button" class="districts_list_button" onclick="districtListButtonsAction(' + i + ')">' +
          '<h6>Map</h6>' +
          '</div>' +
          '</div>' +
          '</div>' +
          '</div>';
      }
    }
    $(".districts_table").html(listContent);
    callback();
  }

  function addTableAnimations() {

    var delay = 0;

    for (var i = 0; i < districtsInfo.length; i++) {
      if (districtsInfo[5]) {
        $("#districts_list_row_" + i.toString()).css("transition-property", "width");
        $("#districts_list_row_" + i.toString()).css("transition-duration", "0.8s");
        $("#districts_list_row_" + i.toString()).css("transition-delay", "" + delay.toString() + "s");
        $("#districts_list_row_" + i.toString()).css("transition-timing-function", "cubic-bezier(0.25, 0.46, 0.45, 0.94)");

        $("#districts_list_row_content_" + i.toString()).css("transition-property", "opacity");
        $("#districts_list_row_content_" + i.toString()).css("transition-duration", "0.8s");
        $("#districts_list_row_content_" + i.toString()).css("transition-delay", "" + (delay + 0.1).toString() + "s");
        $("#districts_list_row_content_" + i.toString()).css("transition-timing-function", "cubic-bezier(0.25, 0.46, 0.45, 0.94)");

        delay += 0.05;
      }
    }
  }

  function removeTableAnimations() {

    var delay = 0;

    for (var i = 0; i < districtsInfo.length; i++) {
      if (districtsInfo[5]) {
        $("#districts_list_row_" + i.toString()).css("transition-property", "");
        $("#districts_list_row_" + i.toString()).css("transition-duration", "");
        $("#districts_list_row_" + i.toString()).css("transition-delay", "");
        $("#districts_list_row_" + i.toString()).css("transition-timing-function", "");

        $("#districts_list_row_content_" + i.toString()).css("transition-property", "");
        $("#districts_list_row_content_" + i.toString()).css("transition-duration", "");
        $("#districts_list_row_content_" + i.toString()).css("transition-delay", "");
        $("#districts_list_row_content_" + i.toString()).css("transition-timing-function", "");

        delay += 0.05;
      }
    }
  }

  function showDistrictList() {

    $(".districts_list_header").css("opacity", "1");
    $(".districts_list_title_container").css("opacity", "1");

    for (var i = 0; i < districtsInfo.length; i++) {
      if (districtsInfo[5]) {
        $("#districts_list_row_" + i.toString()).css("width", "100%");
        $("#districts_list_row_content_" + i.toString()).css("opacity", "1");
      }
    }
  }

  function hideDistrictList() {

    $(".districts_list_header").css("opacity", "0");
    $(".districts_list_title_container").css("opacity", "0");

    for (var i = 0; i < districtsInfo.length; i++) {
      if (districtsInfo[5]) {
        $("#districts_list_row_" + i.toString()).css("width", "0%");
        $("#districts_list_row_content_" + i.toString()).css("opacity", "0");
      }
    }
  }

  $("#info_button").click(function () {
    if (!infoActivated) {
      infoActivated = true;
      infoButtonActivated = true;
      $("#info_button").css("color", "white");
      $("#info_button").css("background-color", "black");
      $("#info_button_close").css("color", "black");
      $("#info_button_close").css("background-color", "white");
      $(".info_container").css("left", "41.2%");
      $("#info_button").css("opacity", "0");
      $("#info_button_close").css("opacity", "1");
      $("#info_button").css("pointer-events", "none");
      $("#info_button_close").css("pointer-events", "all");
    } else {
      infoButtonActivated = false;
    }
  });

  $("#info_button").hover(function () {
    $("#info_button").css("color", "white");
    $("#info_button").css("background-color", "black");
  }, function () {
    $("#info_button").css("color", "black");
    $("#info_button").css("background-color", "white");
  });

  $("#info_button_close").click(function () {
    if (infoActivated) {
      infoActivated = false;
      $("#info_button_close").css("color", "white");
      $("#info_button_close").css("background-color", "black");
      $("#info_button").css("color", "black");
      $("#info_button").css("background-color", "white");
      $(".info_container").css("left", "5%");
      $("#info_button_close").css("opacity", "0");
      $("#info_button").css("opacity", "1");
      $("#info_button_close").css("pointer-events", "none");
      $("#info_button").css("pointer-events", "all");
    }
  });

  $("#info_button_close").hover(function () {
    $("#info_button_close").css("color", "white");
    $("#info_button_close").css("background-color", "black");
  }, function () {
    $("#info_button_close").css("color", "black");
    $("#info_button_close").css("background-color", "white");
  });

  $("#museums_list_button_close").click(function () {
    if (districtsInfo[districtInfoWindowIndex][24][0]) {
      districtsInfo[districtInfoWindowIndex][24] = [false, false, false];
      $("#museums_list_button_close").css("color", "black");
      $("#museums_list_button_close").css("background-color", "white");
      color = colorPicker(districtsInfo[districtInfoWindowIndex][0].toString().substring(0, 1));
      districtsInfo[districtInfoWindowIndex][25][0].style.color = color;
      districtsInfo[districtInfoWindowIndex][25][0].style.backgroundColor = "white";
      $(".museums_list_container").css("left", "100%");
      $("#museums_list_button_close").css("opacity", "0");
    }
  });

  $("#museums_list_button_close").hover(function () {
    $("#museums_list_button_close").css("color", "white");
    $("#museums_list_button_close").css("background-color", "black");
  }, function () {
    $("#museums_list_button_close").css("color", "black");
    $("#museums_list_button_close").css("background-color", "white");
  });

  $("#art_galleries_list_button_close").click(function () {
    if (districtsInfo[districtInfoWindowIndex][24][1]) {
      districtsInfo[districtInfoWindowIndex][24] = [false, false, false];
      $("#art_galleries_list_button_close").css("color", "black");
      $("#art_galleries_list_button_close").css("background-color", "white");
      color = colorPicker(districtsInfo[districtInfoWindowIndex][0].toString().substring(0, 1));
      districtsInfo[districtInfoWindowIndex][25][1].style.color = color;
      districtsInfo[districtInfoWindowIndex][25][1].style.backgroundColor = "white";
      $(".art_galleries_list_container").css("left", "100%");
      $("#art_galleries_list_button_close").css("opacity", "0");
    }
  });

  $("#art_galleries_list_button_close").hover(function () {
    $("#art_galleries_list_button_close").css("color", "white");
    $("#art_galleries_list_button_close").css("background-color", "black");
  }, function () {
    $("#art_galleries_list_button_close").css("color", "black");
    $("#art_galleries_list_button_close").css("background-color", "white");
  });

  $("#markets_list_button_close").click(function () {
    if (districtsInfo[districtInfoWindowIndex][24][2]) {
      districtsInfo[districtInfoWindowIndex][24] = [false, false, false];
      $("#markets_list_button_close").css("color", "black");
      $("#markets_list_button_close").css("background-color", "white");
      color = colorPicker(districtsInfo[districtInfoWindowIndex][0].toString().substring(0, 1));
      districtsInfo[districtInfoWindowIndex][25][2].style.color = color;
      districtsInfo[districtInfoWindowIndex][25][2].style.backgroundColor = "white";
      $(".markets_list_container").css("left", "100%");
      $("#markets_list_button_close").css("opacity", "0");
    }
  });

  $("#markets_list_button_close").hover(function () {
    $("#markets_list_button_close").css("color", "white");
    $("#markets_list_button_close").css("background-color", "black");
  }, function () {
    $("#markets_list_button_close").css("color", "black");
    $("#markets_list_button_close").css("background-color", "white");
  });


  var selectedMainGraph = 14;

  function showGraphsLoader() {
    $('#main_graphs_content').css("display", "none");
    $('.graphs_loader').css("display", "flex");
    $('.graphs_loader').css("opacity", "1");
  }

  function hideGraphsLoader() {
    setTimeout(function () {
      $('.graphs_loader').css("opacity", "0");
      $('.graphs_loader').css("display", "none");
      $('#main_graphs_content').css("display", "flex");
    }, 1500);
    $('#main_graphs_content').css("visibility", "visible");
  }

  function showMainGraphs() {
    setTimeout(function () {
      setMainCharts(selectedMainGraph, function () {
        setTimeout(function () {
          hideGraphsLoader();
        }, 1500);
      });
    }, 250);
  }

  function hideMainGraphs() {
    $("#graph_container").html('');
    $('#main_graphs_content').css("visibility", "hidden");
  }


  function check1() {
    $("#check_2").prop('checked', false);
    $("#check_3").prop('checked', false);
    $("#check_4").prop('checked', false);
    $("#check_5").prop('checked', false);
    $("#check_6").prop('checked', false);

    hideMainGraphs();

    $("#check_1").prop('checked', true);
    $(".left_panel_1").css("left", "0");
    $(".left_panel_2").css("left", "-43%");
    $(".left_panel_3").css("left", "-43%");
    $(".left_panel_4").css("left", "-43%");
    $(".left_panel_5").css("left", "-43%");
    $(".left_panel_6").css("left", "-43%");

    $(".menu_button_1").css("color", "#B71C1C");
    $(".menu_button_1 i").removeClass("fas fa-filter");
    $(".menu_button_1 i").addClass("fas fa-chevron-left");
    $(".button_1_txt").css("color", "#B71C1C");
    $(".button_1_txt").text("Hide tab");

    $(".menu_button_2").css("color", "#03A9F4");
    $(".menu_button_2 i").removeClass("fas fa-chevron-left");
    $(".menu_button_2 i").addClass("fas fa-chart-bar");
    $(".button_2_txt").css("color", "#03A9F4");
    $(".button_2_txt").text("Main charts");

    $(".menu_button_3").css("color", "#673AB7");
    $(".menu_button_3 i").removeClass("fas fa-chevron-left");
    $(".menu_button_3 i").addClass("fas fa-chart-pie");
    $(".button_3_txt").css("color", "#673AB7");
    $(".button_3_txt").text("Top 3 charts");

    $(".menu_button_4").css("color", "#558B2F");
    $(".menu_button_4 i").removeClass("fas fa-chevron-left");
    $(".menu_button_4 i").addClass("fas fa-map-marked-alt");
    $(".button_4_txt").css("color", "#558B2F");
    $(".button_4_txt").text("Districts");

    $(".menu_button_5").css("color", "#F9A825");
    $(".menu_button_5 i").removeClass("fas fa-chevron-left");
    $(".menu_button_5 i").addClass("fas fa-equals");
    $(".button_5_txt").css("color", "#F9A825");
    $(".button_5_txt").text("Comparision");

    $(".menu_button_6").css("color", "#000000");
    $(".menu_button_6 i").removeClass("fas fa-chevron-left");
    $(".menu_button_6 i").addClass("fas fa-question");
    $(".button_6_txt").css("color", "#000000");
    $(".button_6_txt").text("About");

    setTimeout(function () {
      removeTableAnimations();
      hideDistrictList();
    }, 425);

    if (infoActivated) {
      $(".info_container").css("left", "41.2%");
    } else {
      $(".info_container").css("left", "5%");
    }
  }

  function unCheck1() {
    $("#check_1").prop('checked', false);
    $(".left_panel_1").css("left", "-43%");
    $(".left_panel_2").css("left", "-43%");
    $(".left_panel_3").css("left", "-43%");
    $(".left_panel_4").css("left", "-43%");
    $(".left_panel_5").css("left", "-43%");
    $(".left_panel_6").css("left", "-43%");

    $(".menu_button_1").css("color", "#FF5722");
    $(".menu_button_1 i").removeClass("fas fa-chevron-left");
    $(".menu_button_1 i").addClass("fas fa-filter");
    $(".button_1_txt").css("color", "#FF5722");
    $(".button_1_txt").text("Filters");
    $(".info_container").css("left", "-16%");
  }

  $("#check_1").change(function () {
    if ($("#check_1").is(":checked")) {
      check1();
    } else {
      unCheck1();
    }
  });


  function check2() {
    $("#check_1").prop('checked', false);
    $("#check_3").prop('checked', false);
    $("#check_4").prop('checked', false);
    $("#check_5").prop('checked', false);
    $("#check_6").prop('checked', false);

    hideMainGraphs();

    $("#check_2").prop('checked', true);
    $(".left_panel_1").css("left", "-43%");
    $(".left_panel_2").css("left", "0");
    $(".left_panel_3").css("left", "-43%");
    $(".left_panel_4").css("left", "-43%");
    $(".left_panel_5").css("left", "-43%");
    $(".left_panel_6").css("left", "-43%");

    $(".menu_button_2").css("color", "#B71C1C");
    $(".menu_button_2 i").removeClass("fas fa-chart-bar");
    $(".menu_button_2 i").addClass("fas fa-chevron-left");
    $(".button_2_txt").css("color", "#B71C1C");
    $(".button_2_txt").text("Hide tab");

    $(".menu_button_1").css("color", "#FF5722");
    $(".menu_button_1 i").removeClass("fas fa-chevron-left");
    $(".menu_button_1 i").addClass("fas fa-filter");
    $(".button_1_txt").css("color", "#FF5722");
    $(".button_1_txt").text("Filters");

    $(".menu_button_3").css("color", "#673AB7");
    $(".menu_button_3 i").removeClass("fas fa-chevron-left");
    $(".menu_button_3 i").addClass("fas fa-chart-pie");
    $(".button_3_txt").css("color", "#673AB7");
    $(".button_3_txt").text("Top 3 charts");

    $(".menu_button_4").css("color", "#558B2F");
    $(".menu_button_4 i").removeClass("fas fa-chevron-left");
    $(".menu_button_4 i").addClass("fas fa-map-marked-alt");
    $(".button_4_txt").css("color", "#558B2F");
    $(".button_4_txt").text("Districts");

    $(".menu_button_5").css("color", "#F9A825");
    $(".menu_button_5 i").removeClass("fas fa-chevron-left");
    $(".menu_button_5 i").addClass("fas fa-equals");
    $(".button_5_txt").css("color", "#F9A825");
    $(".button_5_txt").text("Comparision");

    $(".menu_button_6").css("color", "#000000");
    $(".menu_button_6 i").removeClass("fas fa-chevron-left");
    $(".menu_button_6 i").addClass("fas fa-question");
    $(".button_6_txt").css("color", "#000000");
    $(".button_6_txt").text("About");

    showGraphsLoader();
    showMainGraphs();

    if (infoActivated) {
      $(".info_container").css("left", "41.2%");
    } else {
      $(".info_container").css("left", "5%");
    }
  }

  function unCheck2() {

    hideMainGraphs();

    $("#check_2").prop('checked', false);
    $(".left_panel_1").css("left", "-43%");
    $(".left_panel_2").css("left", "-43%");
    $(".left_panel_3").css("left", "-43%");
    $(".left_panel_4").css("left", "-43%");
    $(".left_panel_5").css("left", "-43%");
    $(".left_panel_6").css("left", "-43%");

    $(".menu_button_2").css("color", "#03A9F4");
    $(".menu_button_2 i").removeClass("fas fa-chevron-left");
    $(".menu_button_2 i").addClass("fas fa-chart-bar");
    $(".button_2_txt").css("color", "#03A9F4");
    $(".button_2_txt").text("Main charts");
    $(".info_container").css("left", "-16%");
  }

  $("#check_2").change(function () {
    if (this.checked) {
      check2();
    } else {
      unCheck2();
    }
  });

  function check3() {
    $("#check_1").prop('checked', false);
    $("#check_2").prop('checked', false);
    $("#check_4").prop('checked', false);
    $("#check_5").prop('checked', false);
    $("#check_6").prop('checked', false);

    hideMainGraphs();

    $("#check_3").prop('checked', true);
    $(".left_panel_1").css("left", "-43%");
    $(".left_panel_2").css("left", "-43%");
    $(".left_panel_3").css("left", "0");
    $(".left_panel_4").css("left", "-43%");
    $(".left_panel_5").css("left", "-43%");
    $(".left_panel_6").css("left", "-43%");

    $(".menu_button_3").css("color", "#B71C1C");
    $(".menu_button_3 i").removeClass("fas fa-chart-pie");
    $(".menu_button_3 i").addClass("fas fa-chevron-left");
    $(".button_3_txt").css("color", "#B71C1C");
    $(".button_3_txt").text("Hide tab");

    $(".menu_button_1").css("color", "#FF5722");
    $(".menu_button_1 i").removeClass("fas fa-chevron-left");
    $(".menu_button_1 i").addClass("fas fa-filter");
    $(".button_1_txt").css("color", "#FF5722");
    $(".button_1_txt").text("Filters");

    $(".menu_button_2").css("color", "#03A9F4");
    $(".menu_button_2 i").removeClass("fas fa-chevron-left");
    $(".menu_button_2 i").addClass("fas fa-chart-bar");
    $(".button_2_txt").css("color", "#03A9F4");
    $(".button_2_txt").text("Main charts");

    $(".menu_button_4").css("color", "#558B2F");
    $(".menu_button_4 i").removeClass("fas fa-chevron-left");
    $(".menu_button_4 i").addClass("fas fa-map-marked-alt");
    $(".button_4_txt").css("color", "#558B2F");
    $(".button_4_txt").text("Districts");

    $(".menu_button_5").css("color", "#F9A825");
    $(".menu_button_5 i").removeClass("fas fa-chevron-left");
    $(".menu_button_5 i").addClass("fas fa-equals");
    $(".button_5_txt").css("color", "#F9A825");
    $(".button_5_txt").text("Comparision");

    $(".menu_button_6").css("color", "#000000");
    $(".menu_button_6 i").removeClass("fas fa-chevron-left");
    $(".menu_button_6 i").addClass("fas fa-question");
    $(".button_6_txt").css("color", "#000000");
    $(".button_6_txt").text("About");

    if (infoActivated) {
      $(".info_container").css("left", "41.2%");
    } else {
      $(".info_container").css("left", "5%");
    }
  }

  function unCheck3() {
    $("#check_3").prop('checked', false);
    $(".left_panel_1").css("left", "-43%");
    $(".left_panel_2").css("left", "-43%");
    $(".left_panel_3").css("left", "-43%");
    $(".left_panel_4").css("left", "-43%");
    $(".left_panel_5").css("left", "-43%");
    $(".left_panel_6").css("left", "-43%");

    $(".menu_button_3").css("color", "#673AB7");
    $(".menu_button_3 i").removeClass("fas fa-chevron-left");
    $(".menu_button_3 i").addClass("fas fa-chart-pie");
    $(".button_3_txt").css("color", "#673AB7");
    $(".button_3_txt").text("Top 3 charts");
    $(".info_container").css("left", "-16%");

    setTimeout(function () {
      removeTableAnimations();
      hideDistrictList();
    }, 425);
  }

  $("#check_3").change(function () {
    if (this.checked) {
      check3();
    } else {
      unCheck3();
    }
  });

  function check4() {
    $("#check_1").prop('checked', false);
    $("#check_2").prop('checked', false);
    $("#check_3").prop('checked', false);
    $("#check_5").prop('checked', false);
    $("#check_6").prop('checked', false);

    hideMainGraphs();

    $("#check_4").prop('checked', true);
    $(".left_panel_1").css("left", "-43%");
    $(".left_panel_2").css("left", "-43%");
    $(".left_panel_3").css("left", "-43%");
    $(".left_panel_4").css("left", "0");
    $(".left_panel_5").css("left", "-43%");
    $(".left_panel_6").css("left", "-43%");

    $(".left_panel_4").scrollTop(0);
    addTableAnimations();
    showDistrictList();

    $(".menu_button_4").css("color", "#B71C1C");
    $(".menu_button_4 i").removeClass("fas fa-map-marked-alt");
    $(".menu_button_4 i").addClass("fas fa-chevron-left");
    $(".button_4_txt").css("color", "#B71C1C");
    $(".button_4_txt").text("Hide tab");

    $(".menu_button_1").css("color", "#FF5722");
    $(".menu_button_1 i").removeClass("fas fa-chevron-left");
    $(".menu_button_1 i").addClass("fas fa-filter");
    $(".button_1_txt").css("color", "#FF5722");
    $(".button_1_txt").text("Filters");

    $(".menu_button_2").css("color", "#03A9F4");
    $(".menu_button_2 i").removeClass("fas fa-chevron-left");
    $(".menu_button_2 i").addClass("fas fa-chart-bar");
    $(".button_2_txt").css("color", "#03A9F4");
    $(".button_2_txt").text("Main charts");

    $(".menu_button_3").css("color", "#673AB7");
    $(".menu_button_3 i").removeClass("fas fa-chevron-left");
    $(".menu_button_3 i").addClass("fas fa-chart-pie");
    $(".button_3_txt").css("color", "#673AB7");
    $(".button_3_txt").text("Top 3 charts");

    $(".menu_button_5").css("color", "#F9A825");
    $(".menu_button_5 i").removeClass("fas fa-chevron-left");
    $(".menu_button_5 i").addClass("fas fa-equals");
    $(".button_5_txt").css("color", "#F9A825");
    $(".button_5_txt").text("Comparision");

    $(".menu_button_6").css("color", "#000000");
    $(".menu_button_6 i").removeClass("fas fa-chevron-left");
    $(".menu_button_6 i").addClass("fas fa-question");
    $(".button_6_txt").css("color", "#000000");
    $(".button_6_txt").text("About");

    if (infoActivated) {
      $(".info_container").css("left", "41.2%");
    } else {
      $(".info_container").css("left", "5%");
    }

  }

  function unCheck4() {
    $("#check_4").prop('checked', false);
    $(".left_panel_1").css("left", "-43%");
    $(".left_panel_2").css("left", "-43%");
    $(".left_panel_3").css("left", "-43%");
    $(".left_panel_4").css("left", "-43%");
    $(".left_panel_5").css("left", "-43%");
    $(".left_panel_6").css("left", "-43%");

    $(".menu_button_4").css("color", "#558B2F");
    $(".menu_button_4 i").removeClass("fas fa-chevron-left");
    $(".menu_button_4 i").addClass("fas fa-map-marked-alt");
    $(".button_4_txt").css("color", "#558B2F");
    $(".button_4_txt").text("Districts");
    $(".info_container").css("left", "-16%");
  }

  $("#check_4").change(function () {
    if (this.checked) {
      check4();
    } else {
      unCheck4();
    }
  });


  function check5() {
    $("#check_1").prop('checked', false);
    $("#check_2").prop('checked', false);
    $("#check_3").prop('checked', false);
    $("#check_4").prop('checked', false);
    $("#check_6").prop('checked', false);

    hideMainGraphs();

    $("#check_5").prop('checked', true);
    $(".left_panel_1").css("left", "-43%");
    $(".left_panel_2").css("left", "-43%");
    $(".left_panel_3").css("left", "-43%");
    $(".left_panel_4").css("left", "-43%");
    $(".left_panel_5").css("left", "0");
    $(".left_panel_6").css("left", "-43%");

    $(".menu_button_5").css("color", "#B71C1C");
    $(".menu_button_5 i").removeClass("fas fa-equals");
    $(".menu_button_5 i").addClass("fas fa-chevron-left");
    $(".button_5_txt").css("color", "#B71C1C");
    $(".button_5_txt").text("Hide tab");

    $(".menu_button_1").css("color", "#FF5722");
    $(".menu_button_1 i").removeClass("fas fa-chevron-left");
    $(".menu_button_1 i").addClass("fas fa-filter");
    $(".button_1_txt").css("color", "#FF5722");
    $(".button_1_txt").text("Filters");

    $(".menu_button_2").css("color", "#03A9F4");
    $(".menu_button_2 i").removeClass("fas fa-chevron-left");
    $(".menu_button_2 i").addClass("fas fa-chart-bar");
    $(".button_2_txt").css("color", "#03A9F4");
    $(".button_2_txt").text("Main charts");

    $(".menu_button_3").css("color", "#673AB7");
    $(".menu_button_3 i").removeClass("fas fa-chevron-left");
    $(".menu_button_3 i").addClass("fas fa-chart-pie");
    $(".button_3_txt").css("color", "#673AB7");
    $(".button_3_txt").text("Top 3 charts");

    $(".menu_button_4").css("color", "#558B2F");
    $(".menu_button_4 i").removeClass("fas fa-chevron-left");
    $(".menu_button_4 i").addClass("fas fa-map-marked-alt");
    $(".button_4_txt").css("color", "#558B2F");
    $(".button_4_txt").text("Districts");

    $(".menu_button_6").css("color", "#000000");
    $(".menu_button_6 i").removeClass("fas fa-chevron-left");
    $(".menu_button_6 i").addClass("fas fa-question");
    $(".button_6_txt").css("color", "#000000");
    $(".button_6_txt").text("About");

    setTimeout(function () {
      removeTableAnimations();
      hideDistrictList();
    }, 425);

    if (infoActivated) {
      $(".info_container").css("left", "41.2%");
    } else {
      $(".info_container").css("left", "5%");
    }
  }

  function unCheck5() {
    $("#check_5").prop('checked', false);
    $(".left_panel_1").css("left", "-43%");
    $(".left_panel_2").css("left", "-43%");
    $(".left_panel_3").css("left", "-43%");
    $(".left_panel_4").css("left", "-43%");
    $(".left_panel_5").css("left", "-43%");
    $(".left_panel_6").css("left", "-43%");

    $(".menu_button_5").css("color", "#F9A825");
    $(".menu_button_5 i").removeClass("fas fa-chevron-left");
    $(".menu_button_5 i").addClass("fas fa-equals");
    $(".button_5_txt").css("color", "#F9A825");
    $(".button_5_txt").text("Comparision");
    $(".info_container").css("left", "-16%");
  }

  $("#check_5").change(function () {
    if (this.checked) {
      check5();
    } else {
      unCheck5();
    }
  });

  function check6() {
    $("#check_1").prop('checked', false);
    $("#check_2").prop('checked', false);
    $("#check_3").prop('checked', false);
    $("#check_4").prop('checked', false);
    $("#check_5").prop('checked', false);

    hideMainGraphs();

    $("#check_6").prop('checked', true);
    $(".left_panel_1").css("left", "-43%");
    $(".left_panel_2").css("left", "-43%");
    $(".left_panel_3").css("left", "-43%");
    $(".left_panel_4").css("left", "-43%");
    $(".left_panel_5").css("left", "-43%");
    $(".left_panel_6").css("left", "0");

    $(".menu_button_6").css("color", "#B71C1C");
    $(".menu_button_6 i").removeClass("fas fa-question");
    $(".menu_button_6 i").addClass("fas fa-chevron-left");
    $(".button_6_txt").css("color", "#B71C1C");
    $(".button_6_txt").text("Hide tab");

    $(".menu_button_1").css("color", "#FF5722");
    $(".menu_button_1 i").removeClass("fas fa-chevron-left");
    $(".menu_button_1 i").addClass("fas fa-filter");
    $(".button_1_txt").css("color", "#FF5722");
    $(".button_1_txt").text("Filters");

    $(".menu_button_2").css("color", "#03A9F4");
    $(".menu_button_2 i").removeClass("fas fa-chevron-left");
    $(".menu_button_2 i").addClass("fas fa-chart-bar");
    $(".button_2_txt").css("color", "#03A9F4");
    $(".button_2_txt").text("Main charts");

    $(".menu_button_3").css("color", "#673AB7");
    $(".menu_button_3 i").removeClass("fas fa-chevron-left");
    $(".menu_button_3 i").addClass("fas fa-chart-pie");
    $(".button_3_txt").css("color", "#673AB7");
    $(".button_3_txt").text("Top 3 charts");

    $(".menu_button_4").css("color", "#558B2F");
    $(".menu_button_4 i").removeClass("fas fa-chevron-left");
    $(".menu_button_4 i").addClass("fas fa-map-marked-alt");
    $(".button_4_txt").css("color", "#558B2F");
    $(".button_4_txt").text("Districts");

    $(".menu_button_5").css("color", "#F9A825");
    $(".menu_button_5 i").removeClass("fas fa-chevron-left");
    $(".menu_button_5 i").addClass("fas fa-equals");
    $(".button_5_txt").css("color", "#F9A825");
    $(".button_5_txt").text("Comparision");

    setTimeout(function () {
      removeTableAnimations();
      hideDistrictList();
    }, 425);

    if (infoActivated) {
      $(".info_container").css("left", "41.2%");
    } else {
      $(".info_container").css("left", "5%");
    }
  }

  function unCheck6() {
    $("#check_6").prop('checked', false);
    $(".left_panel_1").css("left", "-43%");
    $(".left_panel_2").css("left", "-43%");
    $(".left_panel_3").css("left", "-43%");
    $(".left_panel_4").css("left", "-43%");
    $(".left_panel_5").css("left", "-43%");
    $(".left_panel_6").css("left", "-43%");

    $(".menu_button_6").css("color", "#000000");
    $(".menu_button_6 i").removeClass("fas fa-chevron-left");
    $(".menu_button_6 i").addClass("fas fa-question");
    $(".button_6_txt").css("color", "#000000");
    $(".button_6_txt").text("About");
    $(".info_container").css("left", "-16%");
  }

  $("#check_6").change(function () {
    if (this.checked) {
      check6();
    } else {
      unCheck6();
    }
  });


  $(".menu_button_1").click(function () {
    $(".button_1_txt").css("padding-left", "36px");
  });

  $(".menu_button_1").hover(function () {
    $(".button_1_txt").css("padding-left", "72px");
  }, function () {
    $(".button_1_txt").css("padding-left", "36px");
  });

  $(".button_1_txt").click(function () {
    if (!$("#check_1").is(":checked")) {
      $(".button_1_txt").css("padding-left", "36px");
      check1();
    } else {
      $(".button_1_txt").css("padding-left", "36px");
      unCheck1();
    }
  });

  $(".button_1_txt").hover(function () {
    $(".button_1_txt").css("padding-left", "72px");
  }, function () {
    $(".button_1_txt").css("padding-left", "36px");
  });



  $(".menu_button_2").click(function () {
    $(".button_2_txt").css("padding-left", "36px");
  });

  $(".menu_button_2").hover(function () {
    $(".button_2_txt").css("padding-left", "72px");
  }, function () {
    $(".button_2_txt").css("padding-left", "36px");
  });

  $(".button_2_txt").click(function () {
    if (!$("#check_2").is(":checked")) {
      $(".button_2_txt").css("padding-left", "36px");
      check2();
    } else {
      $(".button_2_txt").css("padding-left", "36px");
      unCheck2();
    }
  });

  $(".button_2_txt").hover(function () {
    $(".button_2_txt").css("padding-left", "72px");
  }, function () {
    $(".button_2_txt").css("padding-left", "36px");
  });


  $(".menu_button_3").click(function () {
    $(".button_3_txt").css("padding-left", "36px");
  });

  $(".menu_button_3").hover(function () {
    $(".button_3_txt").css("padding-left", "72px");
  }, function () {
    $(".button_3_txt").css("padding-left", "36px");
  });

  $(".button_3_txt").click(function () {
    if (!$("#check_3").is(":checked")) {
      $(".button_3_txt").css("padding-left", "36px");
      check3();
    } else {
      $(".button_3_txt").css("padding-left", "36px");
      unCheck3();
    }
  });

  $(".button_3_txt").hover(function () {
    $(".button_3_txt").css("padding-left", "72px");
  }, function () {
    $(".button_3_txt").css("padding-left", "36px");
  });



  $(".menu_button_4").click(function () {
    $(".button_4_txt").css("padding-left", "36px");
  });

  $(".menu_button_4").hover(function () {
    $(".button_4_txt").css("padding-left", "72px");
  }, function () {
    $(".button_4_txt").css("padding-left", "36px");
  });

  $(".button_4_txt").click(function () {
    if (!$("#check_4").is(":checked")) {
      $(".button_4_txt").css("padding-left", "36px");
      check4();
    } else {
      $(".button_4_txt").css("padding-left", "36px");
      unCheck4();
    }
  });

  $(".button_4_txt").hover(function () {
    $(".button_4_txt").css("padding-left", "72px");
  }, function () {
    $(".button_4_txt").css("padding-left", "36px");
  });


  $(".menu_button_5").click(function () {
    $(".button_5_txt").css("padding-left", "36px");
  });

  $(".menu_button_5").hover(function () {
    $(".button_5_txt").css("padding-left", "72px");
  }, function () {
    $(".button_5_txt").css("padding-left", "36px");
  });

  $(".button_5_txt").click(function () {
    if (!$("#check_5").is(":checked")) {
      $(".button_5_txt").css("padding-left", "36px");
      check5();
    } else {
      $(".button_5_txt").css("padding-left", "36px");
      unCheck5();
    }
  });

  $(".button_5_txt").hover(function () {
    $(".button_5_txt").css("padding-left", "72px");
  }, function () {
    $(".button_5_txt").css("padding-left", "36px");
  });


  $(".menu_button_6").click(function () {
    $(".button_6txt").css("padding-left", "36px");
  });

  $(".menu_button_6").hover(function () {
    $(".button_6_txt").css("padding-left", "72px");
  }, function () {
    $(".button_6_txt").css("padding-left", "36px");
  });

  $(".button_6_txt").click(function () {
    if (!$("#check_6").is(":checked")) {
      $(".button_6_txt").css("padding-left", "36px");
      check6();
    } else {
      $(".button_6_txt").css("padding-left", "36px");
      unCheck6();
    }
  });

  $(".button_6_txt").hover(function () {
    $(".button_6_txt").css("padding-left", "72px");
  }, function () {
    $(".button_6_txt").css("padding-left", "36px");
  });

  var selectedTabMain = "main filters";
  $("#button_main_txt_1").css("font-weight", "600");

  $("#main_filter_button").click(function () {
    if (selectedTabMain != "main filters") {
      selectedTabMain = "main filters";
      hideRanking();
      hideRankingWarning();
      scrollTo("#main_filters_container");
      $(".menu_indicator_1").css("margin-left", "128px");
      $("#button_main_txt_1").css("font-weight", "600");
      $("#button_main_txt_2").css("font-weight", "400");
      $("#button_main_txt_3").css("font-weight", "400");
    }

  });

  $("#main_filter_button").hover(function () {
    $(".menu_indicator_1").css("margin-left", "128px");

  }, function () {
    if (selectedTabMain == "main filters") {
      $(".menu_indicator_1").css("margin-left", "128px");
    } else if (selectedTabMain == "special filters") {
      $(".menu_indicator_1").css("margin-left", "230px");
    } else if (selectedTabMain == "ranking") {
      $(".menu_indicator_1").css("margin-left", "331px");
    }
  });

  $("#special_filter_button").click(function () {
    if (selectedTabMain != "special filters") {
      hideRanking();
      hideRankingWarning();
      selectedTabMain = "special filters";
      scrollTo("#special_filters_container");
      $(".menu_indicator_1").css("margin-left", "230px");
      $("#button_main_txt_1").css("font-weight", "400");
      $("#button_main_txt_2").css("font-weight", "600");
      $("#button_main_txt_3").css("font-weight", "400");
    }

  });

  $("#special_filter_button").hover(function () {
    $(".menu_indicator_1").css("margin-left", "230px");
  }, function () {
    if (selectedTabMain == "main filters") {
      $(".menu_indicator_1").css("margin-left", "128px");
    } else if (selectedTabMain == "special filters") {
      $(".menu_indicator_1").css("margin-left", "230px");
    } else if (selectedTabMain == "ranking") {
      $(".menu_indicator_1").css("margin-left", "331px");
    }
  });

  $("#ranking_button").click(function () {
    if (selectedTabMain != "ranking") {
      setTimeout(function () {
        showRanking();
        showRankingWarning();
      }, 400);
      selectedTabMain = "ranking";
      scrollTo("#ranking_container");
      $(".menu_indicator_1").css("margin-left", "331px");
      $("#button_main_txt_1").css("font-weight", "400");
      $("#button_main_txt_2").css("font-weight", "400");
      $("#button_main_txt_3").css("font-weight", "600");
    }

  });

  $("#ranking_button").hover(function () {
    $(".menu_indicator_1").css("margin-left", "331px");
  }, function () {
    if (selectedTabMain == "main filters") {
      $(".menu_indicator_1").css("margin-left", "128px");
    } else if (selectedTabMain == "special filters") {
      $(".menu_indicator_1").css("margin-left", "230px");
    } else if (selectedTabMain == "ranking") {
      $(".menu_indicator_1").css("margin-left", "331px");
    }
  });

  var autoScroll = false;

  function scrollTo(targetStr) {
    var target = $(targetStr);
    if (target.length) {
      var top = (target[0].offsetTop) - 131;
      autoScroll = true;
      $(".left_panel_1").animate({
        scrollTop: top
      }, 460);
      setTimeout(function () {
        autoScroll = false;
      }, 701);
      return false;
    }
  }

  $(".left_panel_1").scroll(function () {
    if (!autoScroll) {
      var panel = $(".left_panel_1");
      var mainFilter = $("#main_filters_container");
      var specialFilter = $("#special_filters_container");
      var ranking = $("#ranking_container");

      if (((panel[0].scrollTop) + 200 >= (mainFilter[0].offsetTop) - 131) &&
        ((panel[0].scrollTop) + 200 < (specialFilter[0].offsetTop) - 131)) {
        selectedTabMain = "main filters";
        $(".menu_indicator_1").css("margin-left", "128px");
        $("#button_main_txt_1").css("font-weight", "600");
        $("#button_main_txt_2").css("font-weight", "400");
        $("#button_main_txt_3").css("font-weight", "400");
        hideRanking();
        hideRankingWarning();

      } else if (((panel[0].scrollTop) + 200 >= (specialFilter[0].offsetTop) - 131) &&
        ((panel[0].scrollTop) + 350 < (ranking[0].offsetTop) - 131)) {
        selectedTabMain = "special filters";
        $(".menu_indicator_1").css("margin-left", "230px");
        $("#button_main_txt_1").css("font-weight", "400");
        $("#button_main_txt_2").css("font-weight", "600");
        $("#button_main_txt_3").css("font-weight", "400");
        hideRanking();
        hideRankingWarning();

      } else if ((panel[0].scrollTop) + 350 >= (ranking[0].offsetTop) - 131) {
        selectedTabMain = "ranking";
        $(".menu_indicator_1").css("margin-left", "331px");
        $("#button_main_txt_1").css("font-weight", "400");
        $("#button_main_txt_2").css("font-weight", "400");
        $("#button_main_txt_3").css("font-weight", "600");
        showRanking();
        showRankingWarning();

      }
    }

  });

  function showRanking() {
    $(".top_one_container").css("opacity", "1");
    $(".ranking_header").css("opacity", "1");
    $(".ranking_row").css("width", "100%");
    $(".ranking_row_content").css("opacity", "1");
  }

  function hideRanking() {
    $(".top_one_container").css("opacity", "0");
    $(".ranking_header").css("opacity", "0");
    $(".ranking_row").css("width", "0%");
    $(".ranking_row_content").css("opacity", "0");
  }

  function hideRankingWarning() {
    $(".ranking_warning_container").css("opacity", "0");
  }

  function showRankingWarning() {
    $(".ranking_warning_container").css("opacity", "1");
  }


  $("#top_one_map_link").click(function () {
    goToDistrict(0);
  });


  $('.location_filter_button').css({
    'height': $('.location_filter_button').width() + 'px'
  });
  $('.safety_filter_button').css({
    'height': $('.location_filter_button').width() + 'px'
  });
  $('.affordability_filter_button').css({
    'height': $('.location_filter_button').width() + 'px'
  });
  $('.main_filters_container').css({
    'height': ($('.main_filters_container').width() * 0.36) + 'px'
  });

  var locationSlider = document.getElementById("location_slider");
  var safetySlider = document.getElementById("safety_slider");
  var affordabilitySlider = document.getElementById("affordability_slider");

  var locationButtonActive = false;
  var safetyButtonActive = false;
  var affordabilityButtonActive = false;

  var specialFilter1Active = false;
  var specialFilter1Value = 0;

  var specialFilter2Active = false;
  var specialFilter2Value = 0;

  var specialFilter3Active = false;
  var specialFilter3Value = 0;

  var specialFilter4Active = false;
  var specialFilter4Value = 0;

  var locationSliderOutput = document.getElementById("location_slider_output");
  locationSliderOutput.innerHTML = locationSlider.value;
  locationSlider.oninput = function () {
    setLabelTxt(locationSliderOutput, this.value);
    calculateDistrictRanking([locationButtonActive, safetyButtonActive, affordabilityButtonActive],
      [locationSlider.value, safetySlider.value, affordabilitySlider.value],
      [specialFilter1Active, specialFilter1Value], [specialFilter2Active, specialFilter2Value],
      [specialFilter3Active, specialFilter3Value], [specialFilter4Active, specialFilter4Value]);
  };


  var safetySliderOutput = document.getElementById("safety_slider_output");
  safetySliderOutput.innerHTML = safetySlider.value;
  safetySlider.oninput = function () {
    setLabelTxt(safetySliderOutput, this.value);
    calculateDistrictRanking([locationButtonActive, safetyButtonActive, affordabilityButtonActive],
      [locationSlider.value, safetySlider.value, affordabilitySlider.value],
      [specialFilter1Active, specialFilter1Value], [specialFilter2Active, specialFilter2Value],
      [specialFilter3Active, specialFilter3Value], [specialFilter4Active, specialFilter4Value]);
  };

  var affordabilitySliderOutput = document.getElementById("affordability_slider_output");
  affordabilitySliderOutput.innerHTML = affordabilitySlider.value;
  affordabilitySlider.oninput = function () {
    setLabelTxt(affordabilitySliderOutput, this.value);
    calculateDistrictRanking([locationButtonActive, safetyButtonActive, affordabilityButtonActive],
      [locationSlider.value, safetySlider.value, affordabilitySlider.value],
      [specialFilter1Active, specialFilter1Value], [specialFilter2Active, specialFilter2Value],
      [specialFilter3Active, specialFilter3Value], [specialFilter4Active, specialFilter4Value]);
  };

  setLabelTxt(locationSliderOutput, locationSlider.value);
  setLabelTxt(safetySliderOutput, safetySlider.value);
  setLabelTxt(affordabilitySliderOutput, affordabilitySlider.value);

  function setLabelTxt(label, sliderValue) {
    if (sliderValue === '1') {
      label.innerHTML = 'low';
    } else if (sliderValue === '2') {
      label.innerHTML = 'medium';
    } else {
      label.innerHTML = 'high';
    }
  }

  $("#location_title_conatiner").click(function () {
    if (locationButtonActive) {
      locationButtonActive = false;
      $(".location_filter_button").css("background-color", "white");
      $('.location_filter_button').css({
        'height': $('.location_filter_button').width() + 'px'
      });
      $("#location_title_conatiner").css("height", "100%");
      $("#location_check_message").css("color", "#03A9F4");
      $("#location_button_icon").css("padding", "18px 22px 18px 22px");
      $("#location_button_icon").removeClass('fas fa-times').addClass('fas fa-map-marker-alt');
      location_check_message.innerHTML = "";
      $("#location_button_icon").css("background-color", "#03A9F4");
      $("#location_button_icon").css("color", "white");
      $("#location_button_title").css("color", "#03A9F4");
      $("#location_slider_title").css("display", "none");
      $("#location_slider").css("display", "none");
      $("#location_slider_output").css("display", "none");
      calculateDistrictRanking([locationButtonActive, safetyButtonActive, affordabilityButtonActive],
        [locationSlider.value, safetySlider.value, affordabilitySlider.value],
        [specialFilter1Active, specialFilter1Value], [specialFilter2Active, specialFilter2Value],
        [specialFilter3Active, specialFilter3Value], [specialFilter4Active, specialFilter4Value]);
    } else {
      locationButtonActive = true;
      $(".location_filter_button").css("background-color", "#03A9F4");
      $('.location_filter_button').css("height", "100%");
      $("#location_title_conatiner").css("height", "45%");
      $("#location_check_message").css("color", "white");
      $("#location_button_icon").css("padding", "18px 22px 18px 22px");
      $("#location_button_icon").removeClass('fas fa-check').addClass('fas fa-map-marker-alt');
      location_check_message.innerHTML = "";
      $("#location_button_icon").css("background-color", "white");
      $("#location_button_icon").css("color", "#03A9F4");
      $("#location_button_title").css("color", "white");
      $("#location_slider_title").css("display", "inline");
      $("#location_slider").css("display", "inline");
      $("#location_slider_output").css("display", "inline");
      calculateDistrictRanking([locationButtonActive, safetyButtonActive, affordabilityButtonActive],
        [locationSlider.value, safetySlider.value, affordabilitySlider.value],
        [specialFilter1Active, specialFilter1Value], [specialFilter2Active, specialFilter2Value],
        [specialFilter3Active, specialFilter3Value], [specialFilter4Active, specialFilter4Value]);
    }
  });

  $("#location_title_conatiner").hover(function () {
    if (!locationButtonActive) {
      $('.location_filter_button').css("height", "100%");
      $("#location_button_icon").css("padding", "18px 18px 18px 18px");
      $("#location_button_icon").removeClass('fas fa-map-marker-alt').addClass('fas fa-check');
      location_check_message.innerHTML = "Check?";
    } else {
      $("#location_button_icon").css("padding", "18px 23px 18px 23px");
      $("#location_button_icon").removeClass('fas fa-map-marker-alt').addClass('fas fa-times');
      location_check_message.innerHTML = "Uncheck?";
    }
  }, function () {
    $("#location_button_icon").css("padding", "18px 22px 18px 22px");
    location_check_message.innerHTML = "";
    if (!locationButtonActive) {
      $("#location_button_icon").removeClass('fas fa-check').addClass('fas fa-map-marker-alt');
      $('.location_filter_button').css({
        'height': $('.location_filter_button').width() + 'px'
      });
    } else {
      $("#location_button_icon").removeClass('fas fa-times').addClass('fas fa-map-marker-alt');
    }
  });

  $("#safety_title_conatiner").click(function () {
    if (safetyButtonActive) {
      safetyButtonActive = false;
      $(".safety_filter_button").css("background-color", "white");
      $('.safety_filter_button').css({
        'height': $('.safety_filter_button').width() + 'px'
      });
      $("#safety_title_conatiner").css("height", "100%");
      $("#safety_check_message").css("color", "#D32F2F");
      $("#safety_button_icon").css("padding", "18px 14px 18px 14px");
      $("#safety_button_icon").removeClass('fas fa-times').addClass('fas fa-user-shield');
      safety_check_message.innerHTML = "";
      $("#safety_button_icon").css("background-color", "#D32F2F");
      $("#safety_button_icon").css("color", "white");
      $("#safety_button_title").css("color", "#D32F2F");
      $("#safety_slider_title").css("display", "none");
      $("#safety_slider").css("display", "none");
      $("#safety_slider_output").css("display", "none");
      calculateDistrictRanking([locationButtonActive, safetyButtonActive, affordabilityButtonActive],
        [locationSlider.value, safetySlider.value, affordabilitySlider.value],
        [specialFilter1Active, specialFilter1Value], [specialFilter2Active, specialFilter2Value],
        [specialFilter3Active, specialFilter3Value], [specialFilter4Active, specialFilter4Value]);
    } else {
      safetyButtonActive = true;
      $(".safety_filter_button").css("background-color", "#D32F2F");
      $('.safety_filter_button').css("height", "100%");
      $("#safety_title_conatiner").css("height", "45%");
      $("#safety_check_message").css("color", "white");
      $("#safety_button_icon").css("padding", "18px 14px 18px 14px");
      $("#safety_button_icon").removeClass('fas fa-check').addClass('fas fa-user-shield');
      safety_check_message.innerHTML = "";
      $("#safety_button_icon").css("background-color", "white");
      $("#safety_button_icon").css("color", "#D32F2F");
      $("#safety_button_title").css("color", "white");
      $("#safety_slider_title").css("display", "inline");
      $("#safety_slider").css("display", "inline");
      $("#safety_slider_output").css("display", "inline");
      calculateDistrictRanking([locationButtonActive, safetyButtonActive, affordabilityButtonActive],
        [locationSlider.value, safetySlider.value, affordabilitySlider.value],
        [specialFilter1Active, specialFilter1Value], [specialFilter2Active, specialFilter2Value],
        [specialFilter3Active, specialFilter3Value], [specialFilter4Active, specialFilter4Value]);
    }
  });

  $("#safety_title_conatiner").hover(function () {
    if (!safetyButtonActive) {
      $('.safety_filter_button').css("height", "100%");
      $("#safety_button_icon").css("padding", "18px 18px 18px 18px");
      $("#safety_button_icon").removeClass('fas fa-user-shield').addClass('fas fa-check');
      safety_check_message.innerHTML = "Check?";
    } else {
      $("#safety_button_icon").css("padding", "18px 23px 18px 23px");
      $("#safety_button_icon").removeClass('fas fa-user-shield').addClass('fas fa-times');
      safety_check_message.innerHTML = "Uncheck?";
    }
  }, function () {
    $("#safety_button_icon").css("padding", "18px 14px 18px 14px");
    safety_check_message.innerHTML = "";
    if (!safetyButtonActive) {
      $("#safety_button_icon").removeClass('fas fa-check').addClass('fas fa-user-shield');
      $('.safety_filter_button').css({
        'height': $('.safety_filter_button').width() + 'px'
      });
    } else {
      $("#safety_button_icon").removeClass('fas fa-times').addClass('fas fa-user-shield');
    }
  });

  $("#affordability_title_conatiner").click(function () {
    if (affordabilityButtonActive) {
      affordabilityButtonActive = false;
      $(".affordability_filter_button").css("background-color", "white");
      $('.affordability_filter_button').css({
        'height': $('.affordability_filter_button').width() + 'px'
      });
      $("#affordability_title_conatiner").css("height", "100%");
      $("#affordability_check_message").css("color", "#F9A825");
      $("#affordability_button_icon").css("padding", "18px 17px 18px 17px");
      $("#affordability_button_icon").removeClass('fas fa-times').addClass('fas fa-hand-holding-usd');
      affordability_check_message.innerHTML = "";
      $("#affordability_button_icon").css("background-color", "#F9A825");
      $("#affordability_button_icon").css("color", "white");
      $("#affordability_button_title").css("color", "#F9A825");
      $("#affordability_slider_title").css("display", "none");
      $("#affordability_slider").css("display", "none");
      $("#affordability_slider_output").css("display", "none");
      calculateDistrictRanking([locationButtonActive, safetyButtonActive, affordabilityButtonActive],
        [locationSlider.value, safetySlider.value, affordabilitySlider.value],
        [specialFilter1Active, specialFilter1Value], [specialFilter2Active, specialFilter2Value],
        [specialFilter3Active, specialFilter3Value], [specialFilter4Active, specialFilter4Value]);
    } else {
      affordabilityButtonActive = true;
      $(".affordability_filter_button").css("background-color", "#F9A825");
      $('.affordability_filter_button').css("height", "100%");
      $("#affordability_title_conatiner").css("height", "45%");
      $("#affordability_check_message").css("color", "white");
      $("#affordability_button_icon").css("padding", "18px 17px 18px 17px");
      $("#affordability_button_icon").removeClass('fas fa-check').addClass('fas fa-hand-holding-usd');
      affordability_check_message.innerHTML = "";
      $("#affordability_button_icon").css("background-color", "white");
      $("#affordability_button_icon").css("color", "#F9A825");
      $("#affordability_button_title").css("color", "white");
      $("#affordability_slider_title").css("display", "inline");
      $("#affordability_slider").css("display", "inline");
      $("#affordability_slider_output").css("display", "inline");
      calculateDistrictRanking([locationButtonActive, safetyButtonActive, affordabilityButtonActive],
        [locationSlider.value, safetySlider.value, affordabilitySlider.value],
        [specialFilter1Active, specialFilter1Value], [specialFilter2Active, specialFilter2Value],
        [specialFilter3Active, specialFilter3Value], [specialFilter4Active, specialFilter4Value]);
    }
  });

  $("#affordability_title_conatiner").hover(function () {
    if (!affordabilityButtonActive) {
      $('.affordability_filter_button').css("height", "100%");
      $("#affordability_button_icon").css("padding", "18px 18px 18px 19px");
      $("#affordability_button_icon").removeClass('fas fa-hand-holding-usd').addClass('fas fa-check');
      affordability_check_message.innerHTML = "Check?";
    } else {
      $("#affordability_button_icon").css("padding", "18px 23px 18px 23px");
      $("#affordability_button_icon").removeClass('fas fa-hand-holding-usd').addClass('fas fa-times');
      affordability_check_message.innerHTML = "Uncheck?";
    }
  }, function () {
    $("#affordability_button_icon").css("padding", "18px 17px 18px 17px");
    affordability_check_message.innerHTML = "";
    if (!affordabilityButtonActive) {
      $("#affordability_button_icon").removeClass('fas fa-check').addClass('fas fa-hand-holding-usd');
      $('.affordability_filter_button').css({
        'height': $('.affordability_filter_button').width() + 'px'
      });
    } else {
      $("#affordability_button_icon").removeClass('fas fa-times').addClass('fas fa-hand-holding-usd');
    }
  });


  $("#special_filter_1").click(function () {
    if (specialFilter1Active) {
      specialFilter1Active = false;
      specialFilter1Value = 0;
      $('#special_filter_1').css("width", "91%");
      $('#special_filter_1').css("background-color", "white");
      $('#special_filter_1').css("color", "#558B2F");
      $('#special_filter_button_title_1').css("left", "50%");
      $('#special_filter_button_title_1').css("transform", "perspective(1px) translateX(-50%)");
      $('#special_filter_1_button_icon').css("background-color", "#558B2F");
      $('#special_filter_1_button_icon').css("color", "white");
      $('#check_icon_1').css("display", "none");
      calculateDistrictRanking([locationButtonActive, safetyButtonActive, affordabilityButtonActive],
        [locationSlider.value, safetySlider.value, affordabilitySlider.value],
        [specialFilter1Active, specialFilter1Value], [specialFilter2Active, specialFilter2Value],
        [specialFilter3Active, specialFilter3Value], [specialFilter4Active, specialFilter4Value]);
    } else {
      specialFilter1Active = true;
      specialFilter1Value = 1;
      $('#special_filter_1').css("width", "100%");
      $('#special_filter_1').css("background-color", "#558B2F");
      $('#special_filter_1').css("color", "white");
      $('#special_filter_button_title_1').css("left", "0%");
      $('#special_filter_button_title_1').css("transform", "perspective(1px) translateX(0%)");
      $('#special_filter_1').css("justify-content", "space-between");
      $('#special_filter_1_button_icon').css("background-color", "white");
      $('#special_filter_1_button_icon').css("color", "#558B2F");
      $('#check_icon_1').css("display", "inline-block");
      calculateDistrictRanking([locationButtonActive, safetyButtonActive, affordabilityButtonActive],
        [locationSlider.value, safetySlider.value, affordabilitySlider.value],
        [specialFilter1Active, specialFilter1Value], [specialFilter2Active, specialFilter2Value],
        [specialFilter3Active, specialFilter3Value], [specialFilter4Active, specialFilter4Value]);
    }
  });

  $("#special_filter_1").hover(function () {
    $('#special_filter_1').css("width", "100%");
  }, function () {
    if (!specialFilter1Active) {
      $('#special_filter_1').css("width", "91%");
    } else {
      $('#special_filter_1').css("width", "100%");
    }
  });

  $("#special_filter_2").click(function () {
    if (specialFilter2Active) {
      specialFilter2Active = false;
      specialFilter2Value = 0;
      $('#special_filter_2').css("width", "91%");
      $('#special_filter_2').css("background-color", "white");
      $('#special_filter_2').css("color", "#558B2F");
      $('#special_filter_button_title_2').css("left", "50%");
      $('#special_filter_button_title_2').css("transform", "perspective(1px) translateX(-50%)");
      $('#special_filter_2_button_icon').css("background-color", "#558B2F");
      $('#special_filter_2_button_icon').css("color", "white");
      $('#check_icon_2').css("display", "none");
      calculateDistrictRanking([locationButtonActive, safetyButtonActive, affordabilityButtonActive],
        [locationSlider.value, safetySlider.value, affordabilitySlider.value],
        [specialFilter1Active, specialFilter1Value], [specialFilter2Active, specialFilter2Value],
        [specialFilter3Active, specialFilter3Value], [specialFilter4Active, specialFilter4Value]);
    } else {
      specialFilter2Active = true;
      specialFilter2Value = 1;
      $('#special_filter_2').css("width", "100%");
      $('#special_filter_2').css("background-color", "#558B2F");
      $('#special_filter_2').css("color", "white");
      $('#special_filter_button_title_2').css("left", "0%");
      $('#special_filter_button_title_2').css("transform", "perspective(1px) translateX(0%)");
      $('#special_filter_2').css("justify-content", "space-between");
      $('#special_filter_2_button_icon').css("background-color", "white");
      $('#special_filter_2_button_icon').css("color", "#558B2F");
      $('#check_icon_2').css("display", "inline-block");
      calculateDistrictRanking([locationButtonActive, safetyButtonActive, affordabilityButtonActive],
        [locationSlider.value, safetySlider.value, affordabilitySlider.value],
        [specialFilter1Active, specialFilter1Value], [specialFilter2Active, specialFilter2Value],
        [specialFilter3Active, specialFilter3Value], [specialFilter4Active, specialFilter4Value]);
    }
  });

  $("#special_filter_2").hover(function () {
    $('#special_filter_2').css("width", "100%");
  }, function () {
    if (!specialFilter2Active) {
      $('#special_filter_2').css("width", "91%");
    } else {
      $('#special_filter_2').css("width", "100%");
    }
  });

  $("#special_filter_3").click(function () {
    if (specialFilter3Active) {
      specialFilter3Active = false;
      specialFilter3Value = 0;
      $('#special_filter_3').css("width", "91%");
      $('#special_filter_3').css("background-color", "white");
      $('#special_filter_3').css("color", "#558B2F");
      $('#special_filter_button_title_3').css("left", "50%");
      $('#special_filter_button_title_3').css("transform", "perspective(1px) translateX(-50%)");
      $('#special_filter_3_button_icon').css("background-color", "#558B2F");
      $('#special_filter_3_button_icon').css("color", "white");
      $('#check_icon_3').css("display", "none");
      calculateDistrictRanking([locationButtonActive, safetyButtonActive, affordabilityButtonActive],
        [locationSlider.value, safetySlider.value, affordabilitySlider.value],
        [specialFilter1Active, specialFilter1Value], [specialFilter2Active, specialFilter2Value],
        [specialFilter3Active, specialFilter3Value], [specialFilter4Active, specialFilter4Value]);
    } else {
      specialFilter3Active = true;
      specialFilter3Value = 1;
      $('#special_filter_3').css("width", "100%");
      $('#special_filter_3').css("background-color", "#558B2F");
      $('#special_filter_3').css("color", "white");
      $('#special_filter_button_title_3').css("left", "0%");
      $('#special_filter_button_title_3').css("transform", "perspective(1px) translateX(0%)");
      $('#special_filter_3').css("justify-content", "space-between");
      $('#special_filter_3_button_icon').css("background-color", "white");
      $('#special_filter_3_button_icon').css("color", "#558B2F");
      $('#check_icon_3').css("display", "inline-block");
      calculateDistrictRanking([locationButtonActive, safetyButtonActive, affordabilityButtonActive],
        [locationSlider.value, safetySlider.value, affordabilitySlider.value],
        [specialFilter1Active, specialFilter1Value], [specialFilter2Active, specialFilter2Value],
        [specialFilter3Active, specialFilter3Value], [specialFilter4Active, specialFilter4Value]);
    }
  });

  $("#special_filter_3").hover(function () {
    $('#special_filter_3').css("width", "100%");
  }, function () {
    if (!specialFilter3Active) {
      $('#special_filter_3').css("width", "91%");
    } else {
      $('#special_filter_3').css("width", "100%");
    }
  });

  $("#special_filter_4").click(function () {
    if (specialFilter4Active) {
      specialFilter4Active = false;
      specialFilter4Value = 0;
      $('#special_filter_4').css("width", "91%");
      $('#special_filter_4').css("background-color", "white");
      $('#special_filter_4').css("color", "#558B2F");
      $('#special_filter_button_title_4').css("left", "50%");
      $('#special_filter_button_title_4').css("transform", "perspective(1px) translateX(-50%)");
      $('#special_filter_4_button_icon').css("background-color", "#558B2F");
      $('#special_filter_4_button_icon').css("color", "white");
      $('#check_icon_4').css("display", "none");
      calculateDistrictRanking([locationButtonActive, safetyButtonActive, affordabilityButtonActive],
        [locationSlider.value, safetySlider.value, affordabilitySlider.value],
        [specialFilter1Active, specialFilter1Value], [specialFilter2Active, specialFilter2Value],
        [specialFilter3Active, specialFilter3Value], [specialFilter4Active, specialFilter4Value]);
    } else {
      specialFilter4Active = true;
      specialFilter4Value = 1;
      $('#special_filter_4').css("width", "100%");
      $('#special_filter_4').css("background-color", "#558B2F");
      $('#special_filter_4').css("color", "white");
      $('#special_filter_button_title_4').css("left", "0%");
      $('#special_filter_button_title_4').css("transform", "perspective(1px) translateX(0%)");
      $('#special_filter_4').css("justify-content", "space-between");
      $('#special_filter_4_button_icon').css("background-color", "white");
      $('#special_filter_4_button_icon').css("color", "#558B2F");
      $('#check_icon_4').css("display", "inline-block");
      calculateDistrictRanking([locationButtonActive, safetyButtonActive, affordabilityButtonActive],
        [locationSlider.value, safetySlider.value, affordabilitySlider.value],
        [specialFilter1Active, specialFilter1Value], [specialFilter2Active, specialFilter2Value],
        [specialFilter3Active, specialFilter3Value], [specialFilter4Active, specialFilter4Value]);
    }
  });

  $("#special_filter_4").hover(function () {
    $('#special_filter_4').css("width", "100%");
  }, function () {
    if (!specialFilter4Active) {
      $('#special_filter_4').css("width", "91%");
    } else {
      $('#special_filter_4').css("width", "100%");
    }
  });

  $(".export_button_top_ten").click(function () {
    var exportedData = [];
    mainTopTen.forEach(function (mainTopTenDistrict) {

      exportedData.push([mainTopTenDistrict[0], mainTopTenDistrict[1], (mainTopTenDistrict[2][0]).toFixed(4),
        (mainTopTenDistrict[2][1]).toFixed(4), mainTopTenDistrict[4].toFixed(2), mainTopTenDistrict[5],
        mainTopTenDistrict[6], mainTopTenDistrict[7], mainTopTenDistrict[8][0], mainTopTenDistrict[9], mainTopTenDistrict[10]
      ]);
    });

    exportToCsv("Top ten districts to live", exportedData);

  });

  $(".export_button_district_list").click(function () {
    var exportedData = [];

    districtsInfo.forEach(function (districtInfo) {
      if (districtInfo[5]) {
        exportedData.push([districtInfo[0], districtInfo[1], (districtInfo[3][0]).toFixed(4), (districtInfo[3][1]).toFixed(4),
          districtInfo[4].length, districtInfo[14].toFixed(2), districtInfo[15], districtInfo[16], districtInfo[17],
          districtInfo[19][0], districtInfo[20], districtInfo[22]
        ]);
      }
    });

    exportToCsv("Districts Information", exportedData);
  });

  var closenessGraphSelected = true;
  var safetyGraphSelected = false;
  var affordabilityGraphSelected = false;
  var museumsGraphSelected = false;
  var airQualityGraphSelected = false;
  var artGalleriesGraphSelected = false;
  var marketsGraphSelected = false;

  function desactivateAllGraphsButtons() {
    $("#closeness_graph_icon").css("background-color", "white");
    $("#closeness_graph_icon").css("color", "#03A9F4");
    $("#closeness_graph_button_text").css("font-weight", "400");

    $("#safety_graph_icon").css("background-color", "white");
    $("#safety_graph_icon").css("color", "#03A9F4");
    $("#safety_graph_button_text").css("font-weight", "400");

    $("#affordability_graph_icon").css("background-color", "white");
    $("#affordability_graph_icon").css("color", "#03A9F4");
    $("#affordability_graph_button_text").css("font-weight", "400");

    $("#museums_graph_icon").css("background-color", "white");
    $("#museums_graph_icon").css("color", "#03A9F4");
    $("#museums_graph_button_text").css("font-weight", "400");

    $("#air_quality_graph_icon").css("background-color", "white");
    $("#air_quality_graph_icon").css("color", "#03A9F4");
    $("#air_quality_graph_button_text").css("font-weight", "400");

    $("#art_galleries_graph_icon").css("background-color", "white");
    $("#art_galleries_graph_icon").css("color", "#03A9F4");
    $("#art_galleries_graph_button_text").css("font-weight", "400");

    $("#markets_graph_icon").css("background-color", "white");
    $("#markets_graph_icon").css("color", "#03A9F4");
    $("#markets_graph_button_text").css("font-weight", "400");

  }

  $("#closeness_graph_button_text").css("font-weight", "1000");

  $("#closeness_graph_icon").click(function () {
    if (!closenessGraphSelected) {
      closenessGraphSelected = true;
      safetyGraphSelected = false;
      affordabilityGraphSelected = false;
      museumsGraphSelected = false;
      airQualityGraphSelected = false;
      artGalleriesGraphSelected = false;
      marketsGraphSelected = false;

      desactivateAllGraphsButtons();

      $("#closeness_graph_icon").css("background-color", "#03A9F4");
      $("#closeness_graph_icon").css("color", "white");
      $("#closeness_graph_button_text").css("font-weight", "1000");

      $("#main_graph_title").html("Closeness graphic");
      $(".graph_label_1").html("Far");
      $(".graph_label_2").html("Close");

      selectedMainGraph = 14;
      showGraphsLoader();
      setMainCharts(14, function () {
        setTimeout(function () {
          hideGraphsLoader();
        }, 1500);
      });

    }
  });


  $("#safety_graph_icon").click(function () {
    if (!safetyGraphSelected) {
      closenessGraphSelected = false;
      safetyGraphSelected = true;
      affordabilityGraphSelected = false;
      museumsGraphSelected = false;
      airQualityGraphSelected = false;
      artGalleriesGraphSelected = false;
      marketsGraphSelected = false;

      desactivateAllGraphsButtons();

      $("#safety_graph_icon").css("background-color", "#03A9F4");
      $("#safety_graph_icon").css("color", "white");
      $("#safety_graph_button_text").css("font-weight", "1000");

      $("#main_graph_title").html("Safety graphic");
      $(".graph_label_1").html("Safe");
      $(".graph_label_2").html("Dangerous");

      selectedMainGraph = 15;
      showGraphsLoader();
      setMainCharts(15, function () {
        setTimeout(function () {
          hideGraphsLoader();
        }, 1500);
      });

    }
  });


  $("#affordability_graph_icon").click(function () {
    if (!affordabilityGraphSelected) {
      closenessGraphSelected = false;
      safetyGraphSelected = false;
      affordabilityGraphSelected = true;
      museumsGraphSelected = false;
      airQualityGraphSelected = false;
      artGalleriesGraphSelected = false;
      marketsGraphSelected = false;

      desactivateAllGraphsButtons();

      $("#affordability_graph_icon").css("background-color", "#03A9F4");
      $("#affordability_graph_icon").css("color", "white");
      $("#affordability_graph_button_text").css("font-weight", "1000");

      $("#main_graph_title").html("Affordability graphic");
      $(".graph_label_1").html("Not affordable");
      $(".graph_label_2").html("Affordable");

      selectedMainGraph = 16;
      showGraphsLoader();
      setMainCharts(16, function () {
        setTimeout(function () {
          hideGraphsLoader();
        }, 1500);
      });

    }
  });


  $("#museums_graph_icon").click(function () {
    if (!museumsGraphSelected) {
      closenessGraphSelected = false;
      safetyGraphSelected = false;
      affordabilityGraphSelected = false;
      museumsGraphSelected = true;
      airQualityGraphSelected = false;
      artGalleriesGraphSelected = false;
      marketsGraphSelected = false;

      desactivateAllGraphsButtons();

      $("#museums_graph_icon").css("background-color", "#03A9F4");
      $("#museums_graph_icon").css("color", "white");
      $("#museums_graph_button_text").css("font-weight", "1000");

      $("#main_graph_title").html("Museums graphic");
      $(".graph_label_1").html("less museums");
      $(".graph_label_2").html("More museums");

      selectedMainGraph = 17;
      showGraphsLoader();
      setMainCharts(17, function () {
        setTimeout(function () {
          hideGraphsLoader();
        }, 1500);
      });

    }
  });


  $("#air_quality_graph_icon").click(function () {
    if (!airQualityGraphSelected) {
      closenessGraphSelected = false;
      safetyGraphSelected = false;
      affordabilityGraphSelected = false;
      museumsGraphSelected = false;
      airQualityGraphSelected = true;
      artGalleriesGraphSelected = false;
      marketsGraphSelected = false;

      desactivateAllGraphsButtons();

      $("#air_quality_graph_icon").css("background-color", "#03A9F4");
      $("#air_quality_graph_icon").css("color", "white");
      $("#air_quality_graph_button_text").css("font-weight", "1000");

      $("#main_graph_title").html("Air quality graphic");
      $(".graph_label_1").html("Clean");
      $(".graph_label_2").html("Contaminated");

      selectedMainGraph = 19;
      showGraphsLoader();
      setMainCharts(19, function () {
        setTimeout(function () {
          hideGraphsLoader();
        }, 1500);
      });

    }
  });


  $("#art_galleries_graph_icon").click(function () {
    if (!artGalleriesGraphSelected) {
      closenessGraphSelected = false;
      safetyGraphSelected = false;
      affordabilityGraphSelected = false;
      museumsGraphSelected = false;
      airQualityGraphSelected = false;
      artGalleriesGraphSelected = true;
      marketsGraphSelected = false;

      desactivateAllGraphsButtons();

      $("#art_galleries_graph_icon").css("background-color", "#03A9F4");
      $("#art_galleries_graph_icon").css("color", "white");
      $("#art_galleries_graph_button_text").css("font-weight", "1000");

      $("#main_graph_title").html("Art galleries graphic");
      $(".graph_label_1").html("Less galleries");
      $(".graph_label_2").html("More galleries");

      selectedMainGraph = 20;
      showGraphsLoader();
      setMainCharts(20, function () {
        setTimeout(function () {
          hideGraphsLoader();
        }, 1500);
      });

    }
  });


  $("#markets_graph_icon").click(function () {
    if (!marketsGraphSelected) {
      closenessGraphSelected = false;
      safetyGraphSelected = false;
      affordabilityGraphSelected = false;
      museumsGraphSelected = false;
      airQualityGraphSelected = false;
      artGalleriesGraphSelected = false;
      marketsGraphSelected = true;

      desactivateAllGraphsButtons();

      $("#markets_graph_icon").css("background-color", "#03A9F4");
      $("#markets_graph_icon").css("color", "white");
      $("#markets_graph_button_text").css("font-weight", "1000");

      $("#main_graph_title").html("Farmer markets graphic");
      $(".graph_label_1").html("Less markets");
      $(".graph_label_2").html("More markets");

      selectedMainGraph = 22;
      showGraphsLoader();
      setMainCharts(22, function () {
        setTimeout(function () {
          hideGraphsLoader();
        }, 1500);
      });

    }
  });



  var selectedTabGraph = "instructions";

  $("#instructions_button").click(function () {
    if (selectedTabMain != "instructions") {
      selectedTabGraph = "instructions";
      scrollToGraph("#instructions_container");
      $(".menu_indicator_3").css("margin-left", "140px");
      $("#button_graphs_txt_1").css("font-weight", "600");
      $("#button_graphs_txt_2").css("font-weight", "400");
      $("#button_graphs_txt_3").css("font-weight", "400");
      $("#button_graphs_txt_4").css("font-weight", "400");
    }

  });

  $("#instructions_button").hover(function () {
    $(".menu_indicator_3").css("margin-left", "140px");

  }, function () {
    if (selectedTabGraph == "instructions") {
      $(".menu_indicator_3").css("margin-left", "140px");
    } else if (selectedTabGraph == "first") {
      $(".menu_indicator_3").css("margin-left", "252px");
    } else if (selectedTabGraph == "second") {
      $(".menu_indicator_3").css("margin-left", "352px");
    } else if (selectedTabGraph == "third") {
      $(".menu_indicator_3").css("margin-left", "449px");
    }
  });


  $("#first_button").click(function () {
    if (selectedTabMain != "first") {
      selectedTabGraph = "first";
      scrollToGraph("#first_container");
      $(".menu_indicator_3").css("margin-left", "252px");
      $("#button_graphs_txt_1").css("font-weight", "400");
      $("#button_graphs_txt_2").css("font-weight", "600");
      $("#button_graphs_txt_3").css("font-weight", "400");
      $("#button_graphs_txt_4").css("font-weight", "400");
    }

  });

  $("#first_button").hover(function () {
    $(".menu_indicator_3").css("margin-left", "252px");

  }, function () {
    if (selectedTabGraph == "instructions") {
      $(".menu_indicator_3").css("margin-left", "140px");
    } else if (selectedTabGraph == "first") {
      $(".menu_indicator_3").css("margin-left", "257px");
    } else if (selectedTabGraph == "second") {
      $(".menu_indicator_3").css("margin-left", "352px");
    } else if (selectedTabGraph == "third") {
      $(".menu_indicator_3").css("margin-left", "449px");
    }
  });


  $("#second_button").click(function () {
    if (selectedTabMain != "second") {
      selectedTabGraph = "second";
      scrollToGraph("#second_container");
      $(".menu_indicator_3").css("margin-left", "352px");
      $("#button_graphs_txt_1").css("font-weight", "400");
      $("#button_graphs_txt_2").css("font-weight", "400");
      $("#button_graphs_txt_3").css("font-weight", "600");
      $("#button_graphs_txt_4").css("font-weight", "400");
    }

  });

  $("#second_button").hover(function () {
    $(".menu_indicator_3").css("margin-left", "352px");
  }, function () {
    if (selectedTabGraph == "instructions") {
      $(".menu_indicator_3").css("margin-left", "140px");
    } else if (selectedTabGraph == "first") {
      $(".menu_indicator_3").css("margin-left", "252px");
    } else if (selectedTabGraph == "second") {
      $(".menu_indicator_3").css("margin-left", "352px");
    } else if (selectedTabGraph == "third") {
      $(".menu_indicator_3").css("margin-left", "449px");
    }
  });

  $("#third_button").click(function () {
    if (selectedTabGraph != "third") {
      selectedTabGraph = "third";
      scrollToGraph("#third_container");
      $(".menu_indicator_3").css("margin-left", "449px");
      $("#button_graphs_txt_1").css("font-weight", "400");
      $("#button_graphs_txt_2").css("font-weight", "400");
      $("#button_graphs_txt_3").css("font-weight", "400");
      $("#button_graphs_txt_4").css("font-weight", "600");
    }

  });

  $("#third_button").hover(function () {
    $(".menu_indicator_3").css("margin-left", "449px");
  }, function () {
    if (selectedTabGraph == "instructions") {
      $(".menu_indicator_3").css("margin-left", "140px");
    } else if (selectedTabGraph == "first") {
      $(".menu_indicator_3").css("margin-left", "252px");
    } else if (selectedTabGraph == "second") {
      $(".menu_indicator_3").css("margin-left", "352px");
    } else if (selectedTabGraph == "third") {
      $(".menu_indicator_3").css("margin-left", "449px");
    }
  });

  var autoScrollGraph = false;

  function scrollToGraph(targetStr) {
    var target = $(targetStr);
    if (target.length) {
      var top = (target[0].offsetTop) - 14;
      autoScrollGraph = true;
      $(".left_panel_3").animate({
        scrollTop: top
      }, 460);
      setTimeout(function () {
        autoScrollGraph = false;
      }, 701);
      return false;
    }
  }

  $(".left_panel_3").scroll(function () {
    if (!autoScrollGraph) {
      var panel = $(".left_panel_3");
      var instructions = $("#instructions_container");
      var first = $("#first_container");
      var second = $("#second_container");
      var third = $("#third_container");

      if (((panel[0].scrollTop) >= (instructions[0].offsetTop) - 16) &&
        ((panel[0].scrollTop) + 100 < (first[0].offsetTop) - 131)) {
        selectedTabGraph = "instructions";
        $(".menu_indicator_3").css("margin-left", "140px");
        $("#button_graphs_txt_1").css("font-weight", "600");
        $("#button_graphs_txt_2").css("font-weight", "400");
        $("#button_graphs_txt_3").css("font-weight", "400");
        $("#button_graphs_txt_4").css("font-weight", "400");

      } else if (((panel[0].scrollTop) + 200 >= (first[0].offsetTop) - 16) &&
        ((panel[0].scrollTop) + 230 < (second[0].offsetTop) - 16)) {
        selectedTabGraph = "first";
        $(".menu_indicator_3").css("margin-left", "252px");
        $("#button_graphs_txt_1").css("font-weight", "400");
        $("#button_graphs_txt_2").css("font-weight", "600");
        $("#button_graphs_txt_3").css("font-weight", "400");
        $("#button_graphs_txt_4").css("font-weight", "400");

      } else if (((panel[0].scrollTop) + 230 >= (second[0].offsetTop) - 16) &&
        ((panel[0].scrollTop) + 260 < (third[0].offsetTop) - 16)) {
        selectedTabGraph = "second";
        $(".menu_indicator_3").css("margin-left", "352px");
        $("#button_graphs_txt_1").css("font-weight", "400");
        $("#button_graphs_txt_2").css("font-weight", "400");
        $("#button_graphs_txt_3").css("font-weight", "600");
        $("#button_graphs_txt_4").css("font-weight", "400");

      } else if ((panel[0].scrollTop) + 260 >= (third[0].offsetTop) - 16) {
        selectedTabGraph = "third";
        $(".menu_indicator_3").css("margin-left", "449px");
        $("#button_graphs_txt_1").css("font-weight", "400");
        $("#button_graphs_txt_2").css("font-weight", "400");
        $("#button_graphs_txt_3").css("font-weight", "400");
        $("#button_graphs_txt_4").css("font-weight", "600");

      }
    }

  });

  var selectedTabComparision = "set districts";
  $("#button_main_5_txt_1").css("font-weight", "600");

  $("#set_districts_button").click(function () {
    if (selectedTabComparision != "set districts") {
      selectedTabComparision = "set districts";
      scrollToComparision(".select_menu_container");
      $(".menu_indicator_5").css("margin-left", "198px");
      $("#button_main_5_txt_1").css("font-weight", "600");
      $("#button_main_5_txt_2").css("font-weight", "400");
    }

  });

  $("#set_districts_button").hover(function () {
    $(".menu_indicator_5").css("margin-left", "198px");

  }, function () {
    if (selectedTabComparision == "set districts") {
      $(".menu_indicator_5").css("margin-left", "198px");
    } else if (selectedTabComparision == "summary") {
      $(".menu_indicator_5").css("margin-left", "320px");
    }
  });

  $("#summary_button").click(function () {
    if (selectedTabComparision != "summary") {
      selectedTabComparision = "summary";
      scrollToComparision(".summary_container");
      $(".menu_indicator_5").css("margin-left", "320px");
      $("#button_main_5_txt_1").css("font-weight", "400");
      $("#button_main_5_txt_2").css("font-weight", "600");
    }

  });

  $("#summary_button").hover(function () {
    $(".menu_indicator_5").css("margin-left", "320px");
  }, function () {
    if (selectedTabComparision == "set districts") {
      $(".menu_indicator_5").css("margin-left", "198px");
    } else if (selectedTabComparision == "summary") {
      $(".menu_indicator_5").css("margin-left", "320px");
    }
  });

  var autoScrollComparision = false;

  function scrollToComparision(targetStr) {
    var target = $(targetStr);
    if (target.length) {
      var top = (target[0].offsetTop) - 130;
      autoScroll = true;
      $(".left_panel_5").animate({
        scrollTop: top
      }, 460);
      setTimeout(function () {
        autoScroll = false;
      }, 701);
      return false;
    }
  }

  $(".left_panel_5").scroll(function () {
    if (!autoScroll) {
      var panel = $(".left_panel_5");
      var setDistricts = $(".select_menu_container");
      var summary = $(".summary_container");

      if (((panel[0].scrollTop) + 200 >= (setDistricts[0].offsetTop) - 131) &&
        ((panel[0].scrollTop) + 200 < (summary[0].offsetTop) - 131)) {
        selectedTabComparision = "set districts";
        $(".menu_indicator_5").css("margin-left", "198px");
        $("#button_main_5_txt_1").css("font-weight", "600");
        $("#button_main_5_txt_2").css("font-weight", "400");

      } else if ((panel[0].scrollTop) + 350 >= (summary[0].offsetTop) - 131) {
        selectedTabComparision = "summary";
        $(".menu_indicator_5").css("margin-left", "320px");
        $("#button_main_5_txt_1").css("font-weight", "400");
        $("#button_main_5_txt_2").css("font-weight", "600");

      }
    }

  });


  var selectedTabAbout = "website";
  $("#button_main_6_txt_1").css("font-weight", "600");

  $("#website_button").click(function () {
    if (selectedTabAbout != "website") {
      selectedTabAbout = "website";
      scrollToAbout(".about_website_container");
      $(".menu_indicator_6").css("margin-left", "129px");
      $("#button_main_6_txt_1").css("font-weight", "600");
      $("#button_main_6_txt_2").css("font-weight", "400");
    }

  });

  $("#website_button").hover(function () {
    $(".menu_indicator_6").css("margin-left", "129px");

  }, function () {
    if (selectedTabAbout == "website") {
      $(".menu_indicator_6").css("margin-left", "129px");
    } else if (selectedTabAbout == "developer") {
      $(".menu_indicator_6").css("margin-left", "243px");
    }
  });

  $("#developer_button").click(function () {
    if (selectedTabAbout != "developer") {
      selectedTabAbout = "developer";
      scrollToAbout(".about_developer_container");
      $(".menu_indicator_6").css("margin-left", "243px");
      $("#button_main_6_txt_1").css("font-weight", "400");
      $("#button_main_6_txt_2").css("font-weight", "600");
    }

  });

  $("#developer_button").hover(function () {
    $(".menu_indicator_6").css("margin-left", "243px");
  }, function () {
    if (selectedTabAbout == "website") {
      $(".menu_indicator_6").css("margin-left", "129px");
    } else if (selectedTabAbout == "developer") {
      $(".menu_indicator_6").css("margin-left", "243px");
    }
  });

  var autoScrollAbout = false;

  function scrollToAbout(targetStr) {
    var target = $(targetStr);
    if (target.length) {
      var top = (target[0].offsetTop) - 128;
      autoScroll = true;
      $(".left_panel_6").animate({
        scrollTop: top
      }, 460);
      setTimeout(function () {
        autoScroll = false;
      }, 701);
      return false;
    }
  }

  $(".left_panel_6").scroll(function () {
    if (!autoScroll) {
      var panel = $(".left_panel_6");
      var website = $(".about_website_container");
      var developer = $(".about_developer_container");

      if (((panel[0].scrollTop) + 200 >= (website[0].offsetTop) - 132) &&
        ((panel[0].scrollTop) + 200 < (developer[0].offsetTop) - 132)) {
        selectedTabAbout = "website";
        $(".menu_indicator_6").css("margin-left", "129px");
        $("#button_main_6_txt_1").css("font-weight", "600");
        $("#button_main_6_txt_2").css("font-weight", "400");

      } else if ((panel[0].scrollTop) + 350 >= (developer[0].offsetTop) - 132) {
        selectedTabAbout = "developer";
        $(".menu_indicator_6").css("margin-left", "243px");
        $("#button_main_6_txt_1").css("font-weight", "400");
        $("#button_main_6_txt_2").css("font-weight", "600");

      }
    }

  });

  function loadEnd() {
    //Loading end
    $('body').addClass('loaded');

    setTimeout(function () {
      $(".loader").css("display", "none");
    }, 200);

    setTimeout(function () {
      infoActivated = true;
      $("#info_button").css("color", "white");
      $("#info_button").css("background-color", "black");
      $(".info_container").css("left", "41.2%");
      $("#info_button").css("opacity", "0");
    }, 800);

    setTimeout(function () {
      if (infoActivated && !infoButtonActivated) {
        infoActivated = false;
        $("#info_button").css("color", "black");
        $("#info_button").css("background-color", "white");
        $("#info_button").css("opacity", "1");

        if ($("#check_1")[0].checked) {
          $(".info_container").css("left", "5%");

        } else if ($("#check_2")[0].checked) {
          $(".info_container").css("left", "5%");

        } else if ($("#check_3")[0].checked) {
          $(".info_container").css("left", "5%");

        } else {
          $(".info_container").css("left", "-16%");

        }
      }
    }, 10000);
  }

  var comparisionSelected1 = false;
  var comparisionSelected3 = false;

  var comparisionDistrict1;
  var comparisionDistrict3;

  function showSummary() {
    if (comparisionSelected1 && comparisionSelected3) {

      var maxDistance = Math.max(comparisionDistrict1[14], comparisionDistrict3[14]);
      var minDistance = Math.min(comparisionDistrict1[14], comparisionDistrict3[14]);
      var distanceValue = (maxDistance - minDistance).toFixed(2).toString();
      var firstDistanceDistrictId;
      var secondDistanceDistrictId;

      if (minDistance == comparisionDistrict1[14]) {
        firstDistanceDistrictId = comparisionDistrict1[0].toString();
        secondDistanceDistrictId = comparisionDistrict3[0].toString();
      } else {
        firstDistanceDistrictId = comparisionDistrict3[0].toString();
        secondDistanceDistrictId = comparisionDistrict1[0].toString();
      }

      var maxCrimes = Math.max(comparisionDistrict1[15], comparisionDistrict3[15]);
      var minCrimes = Math.min(comparisionDistrict1[15], comparisionDistrict3[15]);
      var safetyContent;

      if (minCrimes != maxCrimes) {
        var crimesValue = (maxCrimes - minCrimes).toString();
        var firstCrimesDistrictId;
        var secondCrimesDistrictId;

        if (minCrimes == comparisionDistrict1[15]) {
          firstCrimesDistrictId = comparisionDistrict1[0].toString();
          secondCrimesDistrictId = comparisionDistrict3[0].toString();
        } else {
          firstCrimesDistrictId = comparisionDistrict3[0].toString();
          secondCrimesDistrictId = comparisionDistrict1[0].toString();
        }

        safetyContent = '<p class="description_text">District <span class="description_text_bold" ' +
          'style="color: ' + colorPicker(firstCrimesDistrictId.substring(0, 1)) + '">' +
          firstCrimesDistrictId + '</span>' +
          ' had <span class="description_text_bold">' + crimesValue + ' fewer crimes</span>' +
          ' than district <span class="description_text_bold" ' +
          'style="color: ' + colorPicker(secondCrimesDistrictId.substring(0, 1)) + '">' +
          secondCrimesDistrictId + '</span> (December 31, 2015)</p>';

      } else {
        safetyContent = '<p class="description_text">Both distrcits have the <span class="description_text_bold">same amount of crimes</span>' +
          '(December 31, 2015)</p>';
      }


      var maxAffordability = Math.max(comparisionDistrict1[16], comparisionDistrict3[16]);
      var minAffordability = Math.min(comparisionDistrict1[16], comparisionDistrict3[16]);
      var affordabilityContent;

      if (maxAffordability != minAffordability) {
        var affordabilityValue = (maxAffordability - minAffordability).toString();
        var firstAffordabilityDistrictId;
        var secondAffordabilityDistrictId;

        if (maxAffordability == comparisionDistrict1[16]) {
          firstAffordabilityDistrictId = comparisionDistrict1[0].toString();
          secondAffordabilityDistrictId = comparisionDistrict3[0].toString();
        } else {
          firstAffordabilityDistrictId = comparisionDistrict3[0].toString();
          secondAffordabilityDistrictId = comparisionDistrict1[0].toString();
        }

        affordabilityContent = '<p class="description_text">District <span class="description_text_bold" ' +
          'style="color: ' + colorPicker(firstAffordabilityDistrictId.substring(0, 1)) + '">' +
          firstAffordabilityDistrictId + '</span>' +
          ' has <span class="description_text_bold">' + affordabilityValue + ' more affordable units</span>' +
          ' than district <span class="description_text_bold" ' +
          'style="color: ' + colorPicker(secondAffordabilityDistrictId.substring(0, 1)) + '">' +
          secondAffordabilityDistrictId + '</span></p>';
      } else {
        affordabilityContent = '<p class="description_text">Both distrcits have the <span class="description_text_bold">same amount of affordable units</span></p>';
      }


      var maxMuseums = Math.max(comparisionDistrict1[17], comparisionDistrict3[17]);
      var minMuseums = Math.min(comparisionDistrict1[17], comparisionDistrict3[17]);
      var museumsContent;

      if (maxMuseums != minMuseums) {
        var museumsValue = (maxMuseums - minMuseums).toString();
        var firstMuseumsDistrictId;
        var secondMuseumsDistrictId;

        if (maxMuseums == comparisionDistrict1[17]) {
          firstMuseumsDistrictId = comparisionDistrict1[0].toString();
          secondMuseumsDistrictId = comparisionDistrict3[0].toString();
        } else {
          firstMuseumsDistrictId = comparisionDistrict3[0].toString();
          secondMuseumsDistrictId = comparisionDistrict1[0].toString();
        }

        museumsContent = '<p class="description_text">District <span class="description_text_bold" ' +
          'style="color: ' + colorPicker(firstMuseumsDistrictId.substring(0, 1)) + '">' +
          firstMuseumsDistrictId + '</span>' +
          ' has <span class="description_text_bold">' + museumsValue + ' more museums</span>' +
          ' than district <span class="description_text_bold" ' +
          'style="color: ' + colorPicker(secondMuseumsDistrictId.substring(0, 1)) + '">' +
          secondMuseumsDistrictId + '</span></p>';
      } else {
        museumsContent = '<p class="description_text">Both distrcits have the <span class="description_text_bold">same amount of museums</span></p>';
      }



      var airQualityContent;
      if (Number(comparisionDistrict1[19][0]) != 0 && Number(comparisionDistrict3[19][0]) != 0) {
        var maxAirquality = Math.max(comparisionDistrict1[19], comparisionDistrict3[19]);
        var minAirquality = Math.min(comparisionDistrict1[19], comparisionDistrict3[19]);
        var airqualityValue = (maxAirquality - minAirquality).toFixed(2).toString();
        var firstAirqualityDistrictId;
        var secondAirqualityDistrictId;

        if (minAirquality == comparisionDistrict1[19]) {
          firstAirqualityDistrictId = comparisionDistrict1[0].toString();
          secondAirqualityDistrictId = comparisionDistrict3[0].toString();
        } else {
          firstAirqualityDistrictId = comparisionDistrict3[0].toString();
          secondAirqualityDistrictId = comparisionDistrict1[0].toString();
        }

        airQualityContent = '<p class="description_text">District <span class="description_text_bold" ' +
          'style="color: ' + colorPicker(firstAirqualityDistrictId.substring(0, 1)) + '">' +
          firstAirqualityDistrictId + '</span>' +
          ' has <span class="description_text_bold">' + airqualityValue + ' less air pollution</span>' +
          ' than district <span class="description_text_bold" ' +
          'style="color: ' + colorPicker(secondAirqualityDistrictId.substring(0, 1)) + '">' +
          secondAirqualityDistrictId + '</span></p>';

      } else if (Number(comparisionDistrict1[19][0]) == 0 && Number(comparisionDistrict3[19][0]) == 0) {
        airQualityContent = '<p class="description_text"><span class="description_text_bold">None</span> of the 2 selected districts ' +
          ' <span class="description_text_bold">have air pollution data</span></p>';

      } else if (Number(comparisionDistrict3[19][0]) == 0) {
        airQualityContent = '<p class="description_text">District <span class="description_text_bold" ' +
          'style="color: ' + colorPicker(comparisionDistrict1[0].toString().substring(0, 1)) + '">' +
          comparisionDistrict1[0].toString() + '</span>' +
          ' has <span class="description_text_bold">' + comparisionDistrict1[19][0].toString() + ' points of air pollution</span>' +
          ' and district <span class="description_text_bold" ' +
          'style="color: ' + colorPicker(comparisionDistrict3[0].toString().substring(0, 1)) + '">' +
          comparisionDistrict3[0].toString() + '</span> has <span class="description_text_bold">no data</span></p>';

      } else if (Number(comparisionDistrict1[19][0]) == 0) {
        airQualityContent = '<p class="description_text">District <span class="description_text_bold" ' +
          'style="color: ' + colorPicker(comparisionDistrict3[0].toString().substring(0, 1)) + '">' +
          comparisionDistrict3[0].toString() + '</span>' +
          ' has <span class="description_text_bold">' + comparisionDistrict3[19][0] + ' points of air pollution</span>' +
          ' and district <span class="description_text_bold" ' +
          'style="color: ' + colorPicker(comparisionDistrict1[0].toString().substring(0, 1)) + '">' +
          comparisionDistrict1[0].toString() + '</span> has <span class="description_text_bold">no data</span></p>';
      }

      var maxArtGalleries = Math.max(comparisionDistrict1[20], comparisionDistrict3[20]);
      var minArtGalleries = Math.min(comparisionDistrict1[20], comparisionDistrict3[20]);
      var artGalleriesContent;

      if (maxArtGalleries != minArtGalleries) {
        var artGalleriesValue = (maxArtGalleries - minArtGalleries).toString();
        var firstArtGalleriesDistrictId;
        var secondArtGalleriesDistrictId;

        if (maxArtGalleries == comparisionDistrict1[20]) {
          firstArtGalleriesDistrictId = comparisionDistrict1[0].toString();
          secondArtGalleriesDistrictId = comparisionDistrict3[0].toString();
        } else {
          firstArtGalleriesDistrictId = comparisionDistrict3[0].toString();
          secondArtGalleriesDistrictId = comparisionDistrict1[0].toString();
        }

        artGalleriesContent = '<p class="description_text">District <span class="description_text_bold" ' +
          'style="color: ' + colorPicker(firstArtGalleriesDistrictId.substring(0, 1)) + '">' +
          firstArtGalleriesDistrictId + '</span>' +
          ' has <span class="description_text_bold">' + artGalleriesValue + ' more art galleries</span>' +
          ' than district <span class="description_text_bold" ' +
          'style="color: ' + colorPicker(secondArtGalleriesDistrictId.substring(0, 1)) + '">' +
          secondArtGalleriesDistrictId + '</span></p>';
      } else {
        artGalleriesContent = '<p class="description_text">Both distrcits have the <span class="description_text_bold">same amount of art galleries</span></p>';
      }


      var maxMarkets = Math.max(comparisionDistrict1[22], comparisionDistrict3[22]);
      var minMarkets = Math.min(comparisionDistrict1[22], comparisionDistrict3[22]);
      var marketsContent;

      if (maxMarkets != minMarkets) {
        var marketsValue = (maxMarkets - minMarkets).toString();
        var firstMarketsDistrictId;
        var secondMarketsDistrictId;

        if (maxMarkets == comparisionDistrict1[22]) {
          firstMarketsDistrictId = comparisionDistrict1[0].toString();
          secondMarketsDistrictId = comparisionDistrict3[0].toString();
        } else {
          firstMarketsDistrictId = comparisionDistrict3[0].toString();
          secondMarketsDistrictId = comparisionDistrict1[0].toString();
        }

        marketsContent = '<p class="description_text">District <span class="description_text_bold" ' +
          'style="color: ' + colorPicker(firstMarketsDistrictId.substring(0, 1)) + '">' +
          firstMarketsDistrictId + '</span>' +
          ' has <span class="description_text_bold">' + marketsValue + ' more farmer markets</span>' +
          ' than district <span class="description_text_bold" ' +
          'style="color: ' + colorPicker(secondMarketsDistrictId.substring(0, 1)) + '">' +
          secondMarketsDistrictId + '</span></p>';
      } else {
        marketsContent = '<p class="description_text">Both distrcits have the <span class="description_text_bold">same amount of farmer markets</span></p>';
      }


      var content = '<div class="description_container">' +
        '<i id="closeness_icon_summary" class="fas fa-map-marker-alt"></i>' +
        '<h4 class="description_title">Closeness</h4>' +
        '<p class="description_text">District <span class="description_text_bold" ' +
        'style="color: ' + colorPicker(firstDistanceDistrictId.substring(0, 1)) + '">' +
        firstDistanceDistrictId + '</span>' +
        ' is <span class="description_text_bold">' + distanceValue + ' meters closer</span>' +
        ' to NYU than district <span class="description_text_bold" ' +
        'style="color: ' + colorPicker(secondDistanceDistrictId.substring(0, 1)) + '">' +
        secondDistanceDistrictId + '</span></p>' +
        '</div>' +
        '<div class="description_container">' +
        '<i id="safety_icon_summary" class="fas fa-user-shield"></i>' +
        '<h4 class="description_title">Safety</h4>' +
        safetyContent +
        '</div>' +
        '<div class="description_container">' +
        '<i id="affordability_icon_summary" class="fas fa-hand-holding-usd"></i>' +
        '<h4 class="description_title">Affordability</h4>' +
        affordabilityContent +
        '</div>' +
        '<div class="description_container">' +
        '<i id="museums_icon_summary" class="fas fa-landmark"></i>' +
        '<h4 class="description_title">Museums</h4>' +
        museumsContent +
        '</div>' +
        '<div class="description_container">' +
        '<i id="air_quality_icon_summary" class="fas fa-wind"></i>' +
        '<h4 class="description_title">Air quality</h4>' +
        airQualityContent +
        '</div>' +
        '<div class="description_container">' +
        '<i id="art_galleries_icon_summary" class="fas fa-paint-brush"></i>' +
        '<h4 class="description_title">Art galleries</h4>' +
        artGalleriesContent +
        '</div>' +
        '<div class="description_container">' +
        '<i id="markets_icon_summary" class="fas fa-shopping-basket"></i>' +
        '<h4 class="description_title">Farmer markets</h4>' +
        marketsContent +
        '</div>';

      $(".summary_warning_container").css("display", "none");
      $(".summary_descriptions_container").html(content);
      $(".summary_descriptions_container").css("opacity", "1");
    }
  }

  function hideSummary() {
    $(".summary_descriptions_container").css("opacity", "0");
    setTimeout(function () {
      $(".summary_descriptions_container").html('');
      $(".summary_warning_container").css("display", "flex");
    }, 600);
  }

  function hideDistrictCard(elementID) {
    var content =
      '<div class="district_info_card_warning">' +
      '<i id="district_info_card_warning_icon" class="fas fa-info"></i>' +
      '<p class="district_info_card_warning_text">Select a ditrict ID to see its information</p>' +
      '</div>';

    $(".district_info_card_" + elementID).css("border-color", "black");
    $(".district_info_card_" + elementID).html(content);
  }

  function setDistrictCardsInfo(districtID, elementID) {
    var content = '';
    var BreakException = {};

    hideDistrictCard(elementID);

    try {
      districtsInfo.forEach(function (districtInfo, index) {
        if (districtInfo[0] == districtID) {

          if (elementID == 1) {
            comparisionDistrict1 = districtInfo;
            comparisionSelected1 = true;
          } else if (elementID == 3) {
            comparisionDistrict3 = districtInfo;
            comparisionSelected3 = true;
          }

          elementID = elementID.toString();
          var districtBorough = districtInfo[1].toString();
          var districtCenter = new google.maps.LatLng(districtInfo[3][0], districtInfo[3][1]);
          var districtCloseness = "  " + districtInfo[14].toFixed(2).toString() + " meters";
          var districtSafety = "  " + districtInfo[15].toString();
          var districtAffordability = "  " + districtInfo[16].toString();

          var districtAirQuality;
          if (Number(districtInfo[19][0]) == 0) {
            districtAirQuality = "No data";
          } else {
            districtAirQuality = Number(districtInfo[19][0]).toString();
          }

          var districtNumberOfMuseums = (districtInfo[17]).toString();
          var districtNumberOfArtGalleries = (districtInfo[20]).toString();
          var districtNumberOfMarkets = (districtInfo[22]).toString();

          content = content +
            '<div class="district_info_card_' + elementID + '_title">' +
            '<h1 style="color: ' + colorPicker(districtID.substring(0, 1)) + '">' + districtBorough + '</h1>' +
            '<h2>' + districtID + '</h2>' +
            '</div>' +
            '<div class="district_info_card_' + elementID + '_data_container">' +
            '<div class="district_info_card_' + elementID + '_data">' +
            '<h3>Distance to NYU: </h3>' +
            '<h4>' + districtCloseness + '</h4>' +
            '</div>' +
            '<div class="district_info_card_' + elementID + '_data">' +
            '<h3>crimes: </h3>' +
            '<h4>' + districtSafety + '</h4>' +
            '</div>' +
            '<div class="district_info_card_' + elementID + '_data">' +
            '<h3>Affordable units: </h3>' +
            '<h4>' + districtAffordability + '</h4>' +
            '</div>' +
            '<div class="district_info_card_' + elementID + '_data">' +
            '<h3>Air quality: </h3>' +
            '<h4>' + districtAirQuality + '</h4>' +
            '</div>' +
            '<div class="district_info_card_' + elementID + '_data">' +
            '<h3>Museums: </h3>' +
            '<h4>' + districtNumberOfMuseums + '</h4>' +
            '</div>' +
            '<div class="district_info_card_' + elementID + '_data">' +
            '<h3>Art galleries: </h3>' +
            '<h4>' + districtNumberOfArtGalleries + '</h4>' +
            '</div>' +
            '<div class="district_info_card_' + elementID + '_data">' +
            '<h3>Farmers Markets: </h3>' +
            '<h4>' + districtNumberOfMarkets + '</h4>' +
            '</div>' +
            '</div>' +
            '<div class="district_info_card_' + elementID + '_button_container">' +
            '<div class="district_info_card_' + elementID + '_button" style="background-color: ' + color + ';"' +
            ' onclick="districtListButtonsAction(' + index + ')">' +
            '<h6>See in map</h6>' +
            '</div>' +
            '</div>';
          throw BreakException;
        }

      });
    } catch (e) {
      if (e !== BreakException) throw e;
    }

    $(".district_info_card_" + elementID).css("border-color", color);
    $(".district_info_card_" + elementID).html(content);
    showSummary();
  }

  function changeColorsByBorough(borough, id) {
    var color = "#000000"; //black: default
    if (borough == 'Manhattan') {
      color = "#F9A825"; //yellow: manhattan
    } else if (borough == 'Bronx') {
      color = "#558B2F"; //greeen: bronx
    } else if (borough == 'Brooklyn') {
      color = "#AB47BC"; //light purple: brooklyn
    } else if (borough == 'Queens') {
      color = "#03A9F4"; //blue: queens
    } else if (borough == 'Staten Island') {
      color = "#FF5722"; //orange: state island
    }

    $(".select_title_number_" + id.toString()).css("color", color);
    $(".custom-select-" + id.toString()).find(".select-selected").css("background-color", color);
    $(".custom-select-" + id.toString()).find(".select-items").css("background-color", color);
    $(".custom-select-" + (id + 1).toString()).find(".select-selected").css("background-color", color);
    $(".custom-select-" + (id + 1).toString()).find(".select-items").css("background-color", color);
  }

  function setSelectMenuOptions(Borough, id) {
    var options = '<select>' +
      '<option value="0">Select district ID</option>';
    districtsInfo.forEach(function (districtInfo) {
      if (districtInfo[5]) {
        if (districtInfo[1] == Borough) {
          var districtID = districtInfo[0].toString();
          options = options + '<option value="' + districtID + '">' + districtID + '</option>';
        }

      }

    });

    options = options + '</select>';
    $(".custom-select-" + id.toString()).html(options);
    setSelectMenu((id));
  }

  function setSelectMenu(id) {

    var element1;
    var element2;
    var element3;
    var element4;
    var x, i, j, selElmnt, a, b, c;

    x = document.getElementsByClassName("custom-select-" + id.toString());
    for (i = 0; i < x.length; i++) {
      selElmnt = x[i].getElementsByTagName("select")[0];
      a = document.createElement("DIV");
      a.setAttribute("class", "select-selected");
      a.innerHTML = selElmnt.options[selElmnt.selectedIndex].innerHTML;
      x[i].appendChild(a);
      b = document.createElement("DIV");
      b.setAttribute("class", "select-items select-hide");
      for (j = 1; j < selElmnt.length; j++) {
        c = document.createElement("DIV");
        c.innerHTML = selElmnt.options[j].innerHTML;
        c.addEventListener("click", function (e) {
          var y, i, k, s, h;
          s = this.parentNode.parentNode.getElementsByTagName("select")[0];
          h = this.parentNode.previousSibling;
          for (i = 0; i < s.length; i++) {
            if (s.options[i].innerHTML == this.innerHTML) {
              s.selectedIndex = i;
              h.innerHTML = this.innerHTML;
              if (id == 1) {
                hideDistrictCard((id));
                setSelectMenuOptions(h.innerHTML, (id + 1));
                changeColorsByBorough(h.innerHTML, id);
                comparisionSelected1 = false;
                hideSummary();

              } else if (id == 3) {
                hideDistrictCard((id));
                setSelectMenuOptions(h.innerHTML, (id + 1));
                changeColorsByBorough(h.innerHTML, id);
                comparisionSelected3 = false;
                hideSummary();

              } else {
                setDistrictCardsInfo(h.innerHTML, (id - 1));

              }

              y = this.parentNode.getElementsByClassName("same-as-selected");
              for (k = 0; k < y.length; k++) {
                y[k].removeAttribute("class");
              }
              this.setAttribute("class", "same-as-selected");
              break;
            }
          }
          h.click();
        });
        b.appendChild(c);
      }
      x[i].appendChild(b);
      a.addEventListener("click", function (e) {

        e.stopPropagation();
        closeAllSelect(this);
        this.nextSibling.classList.toggle("select-hide");
        this.classList.toggle("select-arrow-active");
      });
    }
  }

  function closeAllSelect(element) {
    var x, y, i, arrNo = [];
    x = document.getElementsByClassName("select-items");
    y = document.getElementsByClassName("select-selected");
    for (i = 0; i < y.length; i++) {
      if (element == y[i]) {
        arrNo.push(i);
      } else {
        y[i].classList.remove("select-arrow-active");
      }
    }
    for (i = 0; i < x.length; i++) {
      if (arrNo.indexOf(i)) {
        x[i].classList.add("select-hide");
      }
    }
  }

  getDataFromURL(DISTRICT_GEOSHAPES, "district_geoshapes", function () {
    setDistrictPolygons(function () {
      setCenterOfDistricts();
      getDataFromURL(NEIGHBORHOOD_NAMES_GIS, "neighborhoods_data", function () {
        setDistrictNeighboorhoods(function () {
          filterHabitableDistricts(function () {
            drawDistrictPolygons();
            addListenersOnPolygon();
            getDataFromURL(HOUSING, "housing", function () {
              setDistrictHousing();
              getDataFromURL(CRIMES, "crimes", function () {
                setDistrictCrimes();
                setDistrictScores(function () {
                  fillHabitableDistrictsList(addTableAnimations);
                  getDataFromURL(MUSEUMS, "museums", function () {
                    setDistrictMuseums();
                    getDataFromURL(AIR_QUALITY, "air_quality", function () {
                      setDistrictAirQuality();
                      getDataFromURL(ART_GALLERIES, "art_galleries", function () {
                        setDistrictArtGalleries();
                        getDataFromURL(FARMERS_MARKETS, "farmers_markets", function () {
                          setDistrictFarmerMarkets(function () {
                            setDistrictInfoWindow();
                            getMaxDistance(getDistanceScores);
                            getMaxCrimes(getSafetyScores);
                            getAffordabilityScores();
                            getMuseumsScores();
                            getMaxAirQuality(getAirQualityScores);
                            getArtGalleriesScores();
                            setSelectMenu(1);
                            setSelectMenu(3);
                            console.log(districtsInfo);
                            getMarketScores(loadEnd);
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });


});
