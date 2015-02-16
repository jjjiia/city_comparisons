//TODO: fix when zipcode or country has no companies

var config = {
	zoom: .95,
	timeline: {
		timer: null,
		width: 1100,
		barWidth: 6,
		// TODO: Update this and remove this "magic" constant for the width '1100'
		xScale: d3.scale.linear().domain([1880,2014]).range([20, 950])
	}
}





var global = {
	data: null,
	nycPaths: null,
	usMapWidth:600,
	usMapHeight:600
	
}
$(function() {
	queue()
		.defer(d3.json, cityGeojson)
		.defer(d3.csv, csv)
		.defer(d3.json, bostonGeo)
		.defer(d3.csv, boston)
		.defer(d3.json, sfGeo)
		.defer(d3.csv, sf)
	
		.await(dataDidLoad);
})

function dataDidLoad(error, nyc, nycdata, boston, bostondata, sf, sfdata) {
	//var nycMap = initNycMap(ny, data, column, svg, max)
	initNycMap(nyc, nycdata, "Income", "#svg-nyc", 250000)
	initNycMap(boston, bostondata, "Income", "#svg-boston", 250000)
	initNycMap(sf, sfdata, "Income", "#svg-sf", 250000)
	
	//renderNycMap(bostondata,"Income","#svg-boston",250000)	
	//initNycMap(nyc, nycdata, "Total", "#svg-nyc-total", 1000)	
	//initNycMap(nyc, nycdata, "Less than 5 minutes", "#svg-nyc-0", 1000)
	//initNycMap(nyc, nycdata, "90 or more minutes", "#svg-nyc-90", 1000)
	drawIncome()
}

//put currentSelection in to global
var currentSelection = {
	zipcode: null,
	jurisdiction: null
}

var utils = {
	range: function(start, end) {
		var data = []

		for (var i = start; i < end; i++) {
			data.push(i)
		}

		return data
	}
}

var table = {
	group: function(rows, fields) {
		var view = {}
		var pointer = null

		for(var i in rows) {
			var row = rows[i]

			pointer = view
			for(var j = 0; j < fields.length; j++) {
				var field = fields[j]

				if(!pointer[row[field]]) {
					if(j == fields.length - 1) {
						pointer[row[field]] = []
					} else {
						pointer[row[field]] = {}
					}
				}

				pointer = pointer[row[field]]
			}

			pointer.push(row)
		}

		return view
	},

	maxCount: function(view) {
		var largestName = null
		var largestCount = null

		for(var i in view) {
			var list = view[i]

			if(!largestName) {
				largestName = i
				largestCount = list.length
			} else {
				if(list.length > largestCount) {
					largestName = i
					largestCount = list.length
				}
			}
		}

		return {
			name: largestName,
			count: largestCount
		}
	},

	filter: function(view, callback) {
		var data = []

		for(var i in view) {
			var list = view[i]
			if(callback(list, i)) {
				data = data.concat(list)
			}
		}

		return data
	}
}


function drawIncome(){
	var key = d3.select("#filters").append("svg").attr("width",200).attr("height",200)
	var legend = key.append("defs").append("svg:linearGradient").attr("id", "gradient").attr("x1", "100%").attr("y1", "0%").attr("x2", "100%").attr("y2", "100%").attr("spreadMethod", "pad");
	legend.append("stop").attr("offset", "0%").attr("stop-color", "#a20000").attr("stop-opacity", 1);
	legend.append("stop").attr("offset", "100%").attr("stop-color", "#fff").attr("stop-opacity", 1);
	key.append("rect").attr("width", 20).attr("height",200).style("fill", "url(#gradient)").attr("transform", "translate(0,10)");
	var y = d3.scale.sqrt().range([200, 0]).domain([1, 250000]);
	var yAxis = d3.svg.axis().scale(y).orient("right");
	key.append("g").attr("class", "y axis").attr("transform", "translate(41,10)").call(yAxis).append("text").attr("transform", "rotate(-90)").attr("y", -15).attr("dy", ".71em").style("text-anchor", "end").text("median household income");

	
	
	
}

function initNycMap(paths, data, column, svg, max) {
	renderMap(paths, svg, global.usMapWidth,global.usMapHeight)
	renderNycMap(data, column,svg,max)	
}

function renderMap(data, selector,width,height) {
	var projection = d3.geo.mercator().scale(1).translate([0, 0])
	var path = d3.geo.path().projection(projection);
	var b = path.bounds(data)
	var s = config.zoom / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height)
	var t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2]
	//console.log([b,s,t])

	projection.scale(s).translate(t);

	var svg = d3.select(selector).append("svg")
		.attr('height', width)
		.attr('width', height);

	var map = svg.selectAll(".map")
		.data(data.features)
		.enter().append("path")
		.attr("d", path)
		.attr("class", "map-item")
		.attr("cursor", "pointer");

	return map
}

function renderNycMap(data, column,svg,max) {
	var map = d3.select(svg).selectAll(".map-item")

	var companiesByZipcode = table.group(data, ["Id"])
	//	var largest = table.maxCount(companiesByZipcode)

	//console.log(companiesByZipcode)
	var colorScale = function(d) {
		var scale = d3.scale.sqrt().domain([1,max]).range(["#fff", "#a20000"]); 
		var x = companiesByZipcode[d.properties.GEOID]
		if(isNaN(x[0][column])) {
			return scale(0)
		}
		return scale(x[0][column])
	}

	map.attr("stroke-opacity", 1)
		.attr("stroke",colorScale)
		.attr("fill-opacity", 1)
		.attr("fill", colorScale)
		
		var tip = d3.tip()
		  .attr('class', 'd3-tip-nyc')
		  .offset([-10, 0])
	
		map.call(tip);
		map.on('mouseover', function(d){
			var currentZipcode = d.properties.GEOID
			if(table.group(data, ["Id"])[currentZipcode]){
				tipText = "median household income: $"+ table.group(data, ["Id"])[currentZipcode][0][column]
				tip.html(function(d){return tipText})
				tip.show()
			}else{
				tip.html("not in data")
				tip.show()
			}
		})
		.on('mouseout', function(d){
			tip.hide()
		})
	return map
}
