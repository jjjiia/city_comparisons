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
	nyc: null,
	nycdata: null,
	boston:null,
	bostondata:null,
	sf:null,
	sfdata:null,
	usMapWidth:400,
	usMapHeight:400
	
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
	drawFilter()
	
	global.nyc = nyc
	global.nycdata = nycdata
	global.boston = boston
	global.bostondata = bostondata
	global.sf = sf
	global.sfdata = sfdata
	//call map function like this: initNycMap(path, data, column, svg, max for scale)
	
//	var nycdata = filterData(nycdata,0,10000000)
	initNycMap(nyc, nycdata, "Income", "#svg-nyc", 250000)
	
//	var bostondata = filterData(bostondata,0,10000000)
	initNycMap(boston, bostondata, "Income", "#svg-boston", 250000)
	
//	var filteredSf = filterData(sfdata,0,10000000)
	initNycMap(sf, sfdata, "Income", "#svg-sf", 250000)
}


function redrawFilteredMaps(low,high){
	//d3.select("#svg-nyc svg").remove()
	//d3.select("#svg-boston svg").remove()
	//d3.select("#svg-sf svg").remove()
	
	var nycdata = filterData(global.nycdata,low,high)
	renderNycMap(nycdata, "Income", "#svg-nyc", 250000)
	
	var bostondata = filterData(global.bostondata,low,high)
	renderNycMap(bostondata, "Income", "#svg-boston", 250000)
	
	var filteredSf = filterData(global.sfdata,low,high)
//	initNycMap(global.sf, filteredSf, "Income", "#svg-sf", 250000)
	renderNycMap(filteredSf, "Income", "#svg-sf", 250000)
	
	d3.select(".filterHighlight").remove()
	
	var y = d3.scale.linear().range([0,400]).domain([0, 250000]);
	drawFilterHighlight(y(high),y(low))
	console.log([high,low])
	console.log([y(high),y(low)])
	//var map = d3.select(#svg-sf).selectAll(".map-item")
	d3.select("#svg-sf").selectAll(".map-item").attr("stroke-opacity", .3).attr("stroke","#999")
	d3.select("#svg-nyc").selectAll(".map-item").attr("stroke-opacity", .3).attr("stroke","#999")
	d3.select("#svg-boston").selectAll(".map-item").attr("stroke-opacity", .3).attr("stroke","#999")
	
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

function drawFilter(){
	var height = 600
	var width = 100
	var key = d3.select("#filters").append("svg").attr("width",width).attr("height",height)
	var legend = key.append("defs").append("svg:linearGradient").attr("id", "gradient").attr("x1", "100%").attr("y1", "0%").attr("x2", "100%").attr("y2", "100%").attr("spreadMethod", "pad");
	legend.append("stop").attr("offset", "0%").attr("stop-color", "#a20000").attr("stop-opacity", 1);
	legend.append("stop").attr("offset", "100%").attr("stop-color", "#fff").attr("stop-opacity", 1);
	key.append("rect").attr("width", width-80).attr("height",height-200).style("fill", "url(#gradient)").attr("transform", "translate(0,0)");
	var y = d3.scale.linear().range([height-200, 0]).domain([1, 250000]);
	var yAxis = d3.svg.axis().scale(y).orient("right");
	key.append("g").attr("class", "y axis").attr("transform", "translate(41,0)").call(yAxis).append("text").attr("transform", "rotate(-90)").attr("y", -15).attr("dy", ".71em").style("text-anchor", "end").text("median household income");
	drawFilterHighlight(height-200,0)
}
function drawFilterHighlight(high,low){
	d3.select("#filters svg")
	.append("rect")
	.attr("class","filterHighlight")
	.attr("width", 20)
	.attr("height",(high)-parseInt(low))
	.attr("y",400-high)
	.attr("stroke","red")
	.attr("opacity",.8)
	.attr("stroke-width",2).attr("fill","none")
}
function filterData(data,low,high){
	//console.log(data)
	var filteredData = table.filter(table.group(data, ["Income"]), function(list, income) {
		income = parseFloat(income)
		return (income >= low && income <= high)
	})
	//console.log(filteredData)
	return filteredData
}


function initNycMap(paths, data, column, svg, max) {
	renderMap(paths, svg, global.usMapWidth,global.usMapHeight)
	renderNycMap(data, column,svg,max)
}

//sets scale of each initial map to fit svg
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
		var scale = d3.scale.linear().domain([1,max]).range(["#fff", "#a20000"]); 
		var x = companiesByZipcode[d.properties.GEOID]
		if(!x){
			return scale(0)
		}else{
			if(isNaN(x[0][column])) {
				return scale(0)
			}
			return scale(x[0][column])
		}
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
			var currentIncome = table.group(data, ["Id"])[currentZipcode][0][column]
			if(table.group(data, ["Id"])[currentZipcode]){
				tipText = "median household income: $"+ currentIncome
				tip.html(function(d){return tipText})
				tip.show()
			}else{
				tip.html("not in income range")
				tip.show()
			}
			
		})
		.on('mouseout', function(d){
			tip.hide()
		})
		.on("click",function(d){
			var currentZipcode = d.properties.GEOID
			var currentIncome = table.group(data, ["Id"])[currentZipcode][0][column]			
			var high = parseInt(currentIncome*1.1)
			//var low = 0
			var low = parseInt(currentIncome*0.9)
			d3.select("#income-label").html("You selected household income of $"+currentIncome
			+"<br/>Showing areas with income 10% above and below selection: $"+low+" - $"+high
			+ "<br/> and additional info  - in % of areas in each city etc")
			tip.hide()
			redrawFilteredMaps(low,high)
		})
	return map
}
