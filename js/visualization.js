//setGraph(1);
//setGraph(2);
//setGraph(3);

function setGraph(i) {
    var elementID = "d3Graph" + i.toString();
    var el = document.getElementById(elementID);
    var rect = el.getBoundingClientRect();

    var width = 500,
        height = 500,
        radius = Math.min(width, height) / 2,
        innerRadius = 0.3 * radius;

    var pie = d3.layout.pie()
        .sort(null)
        .value(function (d) {
            return d.width;
        });

    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([0, 0])
        .html(function (d) {
            return d.data.label + ": &nbsp <span style='color:#D1C4E9'>" + d.data.value + "</span>";
        });


    var arc = d3.svg.arc()
        .innerRadius(innerRadius)
        .outerRadius(function (d) {
            return (radius - innerRadius) * (d.data.score / 30000.0) + innerRadius;
        });

    var outlineArc = d3.svg.arc()
        .innerRadius(innerRadius)
        .outerRadius(radius);

    var svg = d3.select(el).append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    svg.call(tip);

    d3.csv('.data/chart_' + i.toString() + '.csv', function (error, data) {

        data.forEach(function (d) {
            d.id = d.id;
            d.order = +d.order;
            d.color = d.color;
            d.value = d.value;
            d.weight = +d.weight;
            d.score = +d.score;
            d.width = +d.weight;
            d.label = d.label;
        });
        // for (var i = 0; i < data.score; i++) { console.log(data[i].id) }

        var path = svg.selectAll(".solidArc")
            .data(pie(data))
            .enter().append("path")
            .attr("fill", function (d) {
                return d.data.color;
            })
            .attr("class", "solidArc")
            .attr("stroke", "white")
            .attr("d", arc)
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide);

        var outerPath = svg.selectAll(".outlineArc")
            .data(pie(data))
            .enter().append("path")
            .attr("fill", "none")
            .attr("stroke", "white")
            .attr("class", "outlineArc")
            .attr("d", outlineArc);

        svg.append("svg:text")
            .attr("class", "aster-score")
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .attr("color", "#311B92") // text-align: right
            .text(data[0].id);

    });
}

var geojsonURL = "https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nycd/FeatureServer/0/query?where=1=1&outFields=*&outSR=4326&f=geojson";
var infoArray = [];
var maxValue;
var minValue;
var typeID = 0;

function setMainChart(graphType, color, callback) {
    var el = document.getElementById("d3MainGraph");

    var width = 500,
        height = 450,
        radius = Math.min(width, height) / 2,
        innerRadius = 0.3 * radius;

    var svg = d3.select(el).append("svg")
        .attr("width", width)
        .attr("height", height);

    typeID = graphType;
    getInfoArray();

    var projection = d3.geo.mercator()
        .scale(45000)
        .center([-74.0965, 40.7291])
        .translate([width / 3.6, height / 2.2]);

    var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    d3.json(geojsonURL, function (error, geoData) {

        var path = d3.geo.path()
            .projection(projection);

        svg.selectAll("path")
            .data(geoData.features)
            .enter()
            .append("path")
            .attr("d", path)
            .style('fill', color)
            .style('stroke', color)
            .attr("stroke-width", "1.5px")
            .attr("fill-opacity", setOpacity)
            .attr("stroke-opacity", 1)
            .on("mouseover", function (d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                tooltip.html(getHoverContent(d, color))
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 10) + "px");
            })
            .on("mouseout", function (d) {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

    });
    callback();
}

function getInfoArray() {
    infoArray = [];
    if (typeID == 14) {
        districtsInfo.forEach(function (districtInfo) {
            if (districtInfo[5]) infoArray.push(35000 - districtInfo[typeID]);
        });

        maxValue = Math.max.apply(null, infoArray);
        minValue = Math.min.apply(null, infoArray);

        infoArray = [];
        districtsInfo.forEach(function (districtInfo) {
            if (districtInfo[5]) {
                var info = 35000 - districtInfo[typeID];
                infoArray.push((info - minValue) / (maxValue - minValue));
            } else {
                infoArray.push(0);
            }
        });
    } else {
        districtsInfo.forEach(function (districtInfo) {
            if (districtInfo[5]) infoArray.push(Number(districtInfo[typeID]));
        });

        maxValue = Math.max.apply(null, infoArray);
        minValue = Math.min.apply(null, infoArray);

        infoArray = [];
        districtsInfo.forEach(function (districtInfo) {
            if (districtInfo[5]) {
                var info = Number(districtInfo[typeID]);
                infoArray.push((info - minValue) / (maxValue - minValue));
            } else {
                infoArray.push(0);
            }
        });
    }
}

function getHoverContent(data, color) {
    var value = "";
    if (typeID == 14) {
        if (districtsInfo[(data.properties.OBJECTID) - 1][5]) {
            value = districtsInfo[(data.properties.OBJECTID) - 1][typeID].toFixed(2).toString() + " meters";
        } else {
            value = "Non habitable";
        }
        return 'Distance to NYU: &nbsp <span style="color: ' + color + ' ">' + value + '</span>';

    } else if (typeID == 15) {
        if (districtsInfo[(data.properties.OBJECTID) - 1][5]) {
            value = districtsInfo[(data.properties.OBJECTID) - 1][typeID].toString() + " crimes";
        } else {
            value = "Non habitable";
        }
        return 'Number of crimes : &nbsp <span style="color: ' + color + ' ">' + value + '</span>';

    } else if (typeID == 16) {
        if (districtsInfo[(data.properties.OBJECTID) - 1][5]) {
            value = districtsInfo[(data.properties.OBJECTID) - 1][typeID].toString() + " units";
        } else {
            value = "Non habitable";
        }
        return 'Number of affordable units : &nbsp <span style="color: ' + color + ' ">' + value + '</span>';

    } else if (typeID == 17) {
        if (districtsInfo[(data.properties.OBJECTID) - 1][5]) {
            value = districtsInfo[(data.properties.OBJECTID) - 1][typeID].toString() + " museums";
        } else {
            value = "Non habitable";
        }
        return 'Number of museums : &nbsp <span style="color: ' + color + ' ">' + value + '</span>';

    } else if (typeID == 19) {
        if (districtsInfo[(data.properties.OBJECTID) - 1][5]) {
            value = districtsInfo[(data.properties.OBJECTID) - 1][typeID];
        } else {
            value = "Non habitable";
        }

        if (value == 0) {
            value = "No data";
        }
        return 'Contamination value : &nbsp <span style="color: ' + color + ' ">' + value + '</span>';

    } else if (typeID == 20) {
        if (districtsInfo[(data.properties.OBJECTID) - 1][5]) {
            value = districtsInfo[(data.properties.OBJECTID) - 1][typeID].toString() + " galleries";
        } else {
            value = "Non habitable";
        }
        return 'Number of art galleries : &nbsp <span style="color: ' + color + ' ">' + value + '</span>';

    } else if (typeID == 22) {
        if (districtsInfo[(data.properties.OBJECTID) - 1][5]) {
            value = districtsInfo[(data.properties.OBJECTID) - 1][typeID].toString() + " markets";
        } else {
            value = "Non habitable";
        }

        return 'Number of farmers markets : &nbsp <span style="color: ' + color + ' ">' + value + '</span>';
    }

}

function setOpacity(data) {
    if (typeID == 20) {
        if (infoArray[(data.properties.OBJECTID) - 1] != 0) return infoArray[(data.properties.OBJECTID) - 1] + 0.35;
    }

    if (typeID == 17) {
        if (infoArray[(data.properties.OBJECTID) - 1] != 0) return infoArray[(data.properties.OBJECTID) - 1] + 0.2;
    }

    if (typeID == 16) {
        if (infoArray[(data.properties.OBJECTID) - 1] != 0) return infoArray[(data.properties.OBJECTID) - 1] + 0.2;
    }

    return infoArray[(data.properties.OBJECTID) - 1];
}

function setMainCharts(graphType, callback) {

    $("#graph_container").html('');

    setTimeout(function () {
        $("#graph_container").html('<svg id="d3MainGraph"></svg>');
    }, 50);

    setTimeout(function () {
        setMainChart(graphType, "#03A9F4", callback);
    }, 100);
}
