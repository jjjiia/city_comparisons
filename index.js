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
	usMapWidth:1200,
	usMapHeight:1200
	
}
$(function() {
	queue()
		.defer(d3.json, cityGeojson)
		.defer(d3.csv, csv)
		.await(dataDidLoad);
})

function dataDidLoad(error, nyc, nycdata) {
	//var nycMap = initNycMap(ny, data, column, svg, max)
	
	
	var nycMap = initNycMap(nyc, nycdata, "median income", "#svg-nyc-income", 250000)
	//initNycMap(nyc, nycdata, "Total", "#svg-nyc-total", 1000)	
	//initNycMap(nyc, nycdata, "Less than 5 minutes", "#svg-nyc-0", 1000)
	//initNycMap(nyc, nycdata, "90 or more minutes", "#svg-nyc-90", 1000)
	
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


function renderMap(data, selector,width,height) {

	var projection = d3.geo.mercator().scale(1).translate([0, 0])
	var path = d3.geo.path().projection(projection);

	var b = path.bounds(data)
	var s = config.zoom / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height)
	var t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2]

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

function initNycMap(paths, data, column, svg,max) {
	var map = renderMap(paths, svg, global.usMapWidth,global.usMapHeight)
//	console.log(data)
	renderNycMap(data, column,svg,max)
	
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
				tipText = "median household income: $"+ table.group(data, ["Id"])[currentZipcode][0]["median income"]
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
