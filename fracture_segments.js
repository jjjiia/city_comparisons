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
	city1:null,
	geojson1: null,
	city2:null,
	geojson2:null,
	usMapWidth:1200,
	usMapHeight:900,
	max:200000,
	maxIncome:999999999,
	gradientStart:"#fff",
	gradientEnd:"#ddd",
	scale:80000,
	center:[-74.1, 40.8],
	neighbors:null,
	translate:[0,0],
	translateScale:1
}
$(function() {
	queue()
		.defer(d3.json, geojson1)
		.defer(d3.csv, csv1)
		.defer(d3.csv,overlap)
		.defer(d3.json, boroughs)
		.defer(d3.json,neighbors)
		.await(dataDidLoad);
})

$("#topDifferences .hideTop").hide()

function dataDidLoad(error, geojson1, city1, overlap, boroughs, neighbors) {
	global.neighbors = neighbors
	global.city1 = city1
	global.geojson1 = geojson1
	window.location.hash = JSON.stringify([global.translate, global.translateScale])

	initNycMap(geojson1, city1, "Median", "#svg-1",0,global.maxIncome*100000,boroughs,neighbors,overlap)
	$("#topDifferences .showTop").click(hideTop)
	$("#topDifferences .hideTop").click(showTop)
	d3.selectAll("#svg-1 svg g .topDifferences").attr("opacity",0)
	drawScale()
}
function hideTop(){
	//console.log("show graph")
	$("#topDifferences .showTop").hide()
	$("#topDifferences .hideTop").show()
	d3.selectAll("#svg-1 svg g .topDifferences").attr("opacity",1)
	
}
function showTop(){
//	console.log("hide graph")
	$("#topDifferences .hideTop").hide()
	$("#topDifferences .showTop").show()
	d3.selectAll("#svg-1 svg g .topDifferences").attr("opacity",0)
}
function getSizeOfObject(obj){
    var size = 0, key;
     for (key in obj) {
         if (obj.hasOwnProperty(key)) size++;
     }
     return size;
}
function sumEachColumnChartData(data,column){
	//console.log(data)
	//console.log(data)
	var groupLength = getSizeOfObject(data)
	var sum = 0
	for(var i =0; i<groupLength; i++){
		//var columns = getSizeOfObject(data[i])
		var columnValue = parseInt(data[i][column])
		sum += columnValue
	}
	return sum
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
function sortObjectByValue(toSort){
	var sorted = toSort.sort(function(a,b){return a["Median"]-b["Median"]})
	return sorted
}
function zoomed() {
	//console.log("calling zoomed" + d3.event.scale + ", translate: "+ d3.event.translate )
	map.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
  	map.select(".map-item").style("stroke-width", 1.5 / d3.event.scale + "px");
	var newScaleDistance = Math.round((5/d3.event.scale)* 100) / 100
	d3.select("#scale .scale-text").text(newScaleDistance+"km")
	window.location.hash = JSON.stringify([d3.event.translate, d3.event.scale])
}
function initNycMap(paths, data, column, svg,low,high,boroughs,neighbors,overlap) {
	renderMap(paths,svg, global.usMapWidth,global.usMapHeight)
	renderNycMap(data,column,svg,low,high)
	//renderBoroughs(boroughs,svg,global.usMapWidth,global.usMapHeight)
	drawDifferences(data,svg,overlap)
	var differenceData = formatDifferenceData(data,svg,overlap)
	drawTopDifferences(differenceData)
		
	var parsedTranslate = JSON.parse(window.location.hash.substring(1))[0]
	var parsedScale = JSON.parse(window.location.hash.substring(1))[1]
	global.translate = parsedTranslate
	global.translateScale = parsedScale
	map.attr("transform", "translate(" + global.translate + ")scale(" + global.translateScale + ")");

}
function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km
  return d;
}
function deg2rad(deg) {
  return deg * (Math.PI/180)
}
function renderBoroughs(data,svg,width,height){
	var boroughs = d3.select("#svg-1 svg")
	var projection = d3.geo.mercator().scale(global.scale).center(global.center)
	var path = d3.geo.path().projection(projection);
	//console.log(data)
	boroughs.selectAll(".boroughs")
		.data(data.features)
		.enter()
		.append("path")
		.attr("d", path)
		.attr("class", "boroughs")
		.attr("cursor", "pointer")
		.attr("stroke","#eee")
		.attr("fill","#eee")
		.attr("stroke-width",.5)
}
function drawDifferences(data,svg,overlapData){
	var differenceData = formatDifferenceData(data,svg,overlapData)
	var projection = d3.geo.mercator().scale(global.scale).center(global.center)
	
	var differenceMap = d3.select("#svg-1 svg g")
	var dataById = table.group(data, ["Id"])
	var minDifference = 25000
	var colorScale = d3.scale.linear().domain([0,200000]).range(["#aaa","red"])
	//console.log(dataById["360010131001"][0]["Median"])
	var strokeScale = d3.scale.linear().domain([minDifference,200000]).range([0,3])
	var differenceOpacityScale = d3.scale.linear().domain([0,200000]).range([0,1])

	var line = d3.svg.line()
	var path = d3.geo.path().projection(projection);
	
	var zoom = d3.behavior.zoom()
		.translate([0, 0])
		.scale(1)
		.scaleExtent([1, 8])
		.on("zoom", zoomed);	
	var tip = d3.tip()
		.attr('class', 'd3-tip-nyc-difference')
		.offset([-10, 0])
	
	differenceMap.call(tip);
		
	differenceMap.selectAll(".map")
		.data(differenceData)
		.enter()
		.append("line")
		.attr("class","map")
		.attr("x1", function(d){
			//console.log(d)
			//return 5
			var lng1 = d["lng1"]
			var lat1 = d["lat1"]
			var x1 = (projection([lng1,lat1])[0])
			return x1
		})
		.attr("y1", function(d){
			//return 5
			var lng1 = d["lng1"]
			var lat1 = d["lat1"]
			var y1 = (projection([lng1,lat1])[1])
			//console.log(y)
			return y1
		})
		.attr("x2", function(d){
			var lng = d["lng2"]
			var lat = d["lat2"]
			var x2 = (projection([lng,lat])[0])
			return x2
		})
		.attr("y2", function(d){
			var lng = d["lng2"]
			var lat = d["lat2"]
			var y2 = (projection([lng,lat])[1])
			//console.log(y)
			return y2
		})
		.attr("opacity",1)
		.attr("stroke-width",function(d){
			var difference = d["difference"]
			if(isNaN(difference) || difference < minDifference){
				return 0
			}
			return strokeScale(difference)
		})
		.attr("stroke",function(d){
			var difference = d["difference"]
			if(isNaN(difference) || difference < minDifference){
				return "black"
			}
			return colorScale(difference)
		})
		.attr("fill","none")
		.attr("stroke-linecap","round")
		.call(zoom)
		.on("mouseover",function(d){
			var difference = d["difference"]
			tipText = "Difference: $"+difference
			tip.html(function(d){return tipText})
			tip.show()
		})
		.on("mouseout",function(d){
			tip.hide()
		})
}
function isInArray(value, array) {
  return array.indexOf(value) > -1;
}
function calculateScaleSize(){
	var projection = d3.geo.mercator().scale(global.scale).center(global.center)
	var lat1 = global.center[1]
	var lng1 = global.center[0]
	var lat2 = lat1+0.1
	var lng2 = global.center[0]+0.1
	var distance = getDistanceFromLatLonInKm(lat1,lng1,lat2,lng2)
	//console.log(distance+"km")
	var x1 = projection([lng1,lat1])[0]
	var y1 = projection([lng1,lat1])[1]
	var x2 = projection([lng2,lat2])[0]
	var y2 = projection([lng2,lat2])[1]
	var screenDistance = Math.sqrt(Math.pow(Math.abs(x2-x1),2)+Math.pow(Math.abs(y2-y1),2))
//	console.log([x1,x2,y1,y2,screenDistance])
	
	var screenDistance1km = screenDistance/distance
	var screenDistance100km = screenDistance1km*100
	//console.log(screenDistance1km)
	return screenDistance1km
}
function drawScale(){
	var kmInPixels = calculateScaleSize()
//	console.log(kmInPixels)
	var scale = d3.select("#scale")
			.append("svg")
			.attr("width",kmInPixels*6)
			.attr("height",50)
		scale.append("rect")
			.attr("class","scale")
			.attr("x",20)
			.attr("y",20)
			.attr("width",kmInPixels*5)
			.attr("height",1)
			.attr("fill","#000")
		
		scale.append("text")
			.attr("class","scale-text")
			.text("5 km")
			.attr("x",40)
			.attr("y",35)
			.attr("font-size",12)
}
function drawTopDifferences(data){
	var topFive = data.splice(0,35)
	var centroids = []
	var differences = []
	for(var i in topFive){
		var distance = getDistanceFromLatLonInKm(topFive[i]["lat1"],topFive[i]["lng1"],topFive[i]["lat2"],topFive[i]["lng2"])
		//console.log(distance)
		var centerLat = (parseFloat(topFive[i]["lat1"]) + parseFloat(topFive[i]["lat2"]))/2
		var centerLng = (parseFloat(topFive[i]["lng1"]) + parseFloat(topFive[i]["lng2"]))/2
		//console.log([centerLat,centerLng])
		if(!isInArray(topFive[i]["difference"], differences)){
			centroids.push({lat:centerLat,lng:centerLng,difference:topFive[i]["difference"],distance:distance})
			differences.push(topFive[i]["difference"])
		}
	}	
	var topCircles = d3.select("#svg-1 svg g")
	var projection = d3.geo.mercator().scale(global.scale).center(global.center)
	
	topCircles.selectAll("circle")
		.data(centroids)
		.enter()
		.append("circle")
		.attr("class","topDifferences")
		.attr("cx",function(d){
			return projection([d.lng,d.lat])[0]
		})
		.attr("cy",function(d){
			return projection([d.lng,d.lat])[1]
		})
		.attr("r",function(d){
			return 10
			return d.distance*100
		})
		.attr("stroke", "#000")
		.attr("fill","none")
		.attr("opacity",.5)
		
	topCircles.selectAll("text")	
		.data(centroids)
		.enter()
		.append("text")
		.attr("class","topDifferences")
		.attr("x", function(d){
			return projection([d.lng,d.lat])[0]+10
		})
		.attr("y",function(d){
			return projection([d.lng,d.lat])[1]+5
		})
		.text(function(d){ 
			return "$"+d.difference
		})
		.attr("font-size","10")
}
function renderMap(data, selector,width,height) {
	var projection = d3.geo.mercator().scale(global.scale).center(global.center)
	var path = d3.geo.path().projection(projection);
	
	var zoom = d3.behavior.zoom()
	    .translate([0, 0])
	    .scale(1)
	    .scaleExtent([1, 10])
	    .on("zoom", zoomed);
		
	var svg = d3.select(selector).append("svg")
		.attr('height', height)
		.attr('width', width);
		
	map =  svg.append("g")
		
//	map.append("rect")
//	    .attr("class", "overlay")
//	    .attr("width", width)
//	    .attr("height", height)
//	 	.call(zoom);
				
	map.selectAll(".map").append("path")
		.data(data.features)
		.enter()
		.append("path")
		.attr("d", path)
		.attr("class", "map-item")
		.attr("cursor", "pointer")
		.attr("fill","#fff")
	    .call(zoom);
	return map
}
function formatDifferenceData(data,svg,overlapData){
	var dataById = table.group(data, ["Id"])
	var incomes = []
	for(var i in overlapData){
		var id1 = overlapData[i]["id1"]
		var id2 = overlapData[i]["id2"]
		var income1 = parseInt(dataById[id1][0]["Median"])
		var income2 = parseInt(dataById[id2][0]["Median"])
		var incomeDifference = Math.abs(income1-income2)
		incomes.push({lng1:overlapData[i]["lng1"],lat1:overlapData[i]["lat1"],lng2:overlapData[i]["lng2"],lat2:overlapData[i]["lat2"],difference:incomeDifference})
	}
	//console.log(incomes)
	var sortedIncomes = incomes.sort(function(a,b){return a["difference"]-b["difference"]}).reverse()
	return sortedIncomes
}
function renderNycMap(data, column,svg,low,high) {
	var map = d3.select(svg).selectAll(".map-item")
	var companiesByZipcode = table.group(data, ["Id"])
	//	var largest = table.maxCount(companiesByZipcode)
	//console.log(companiesByZipcode)
	var colorScale = function(d) {
		var scale = d3.scale.linear().domain([1,global.max]).range([global.gradientStart, global.gradientEnd]); 
		var x = companiesByZipcode[d.properties.GEOID]
		if(!x){
			return scale(1)
		}else{
			if(isNaN(x[0][column])) {
				return scale(1)
			}
			if(x[0][column] < low ||x[0][column] > high){
				return "#eee"
			}
			return scale(x[0][column])
		}
	}

	map.attr("stroke-opacity", 1)
		.attr("stroke","none")
		.attr("fill-opacity", 1)
		.attr("fill",colorScale)
		.attr("stroke-width",.5)
			
		
		var tip = d3.tip()
		  .attr('class', 'd3-tip-nyc')
		  .offset([-10, 0])
	
		map.call(tip);
		map.on('mouseover', function(d){
			var currentZipcode = d.properties.GEOID
			var currentIncome = table.group(data, ["Id"])[currentZipcode][0][column]
			if(table.group(data, ["Id"])[currentZipcode]){
				if(isNaN(currentIncome)){
					tipText = "no data"
					d3.selectAll("#svg-2 svg").remove()
				}
				else{
				tipText = "block group: "+currentZipcode+"<br/>median household income:$"+ currentIncome
				var test = "test"
				tip.html(function(d){return tipText})
				tip.show()
				d3.select("#current-details").html("Adjacent Median Incomes</br> Census block group "+currentZipcode+" has median household income of $"+currentIncome)
				drawNeighborsGraph(companiesByZipcode, currentZipcode)
				}
			}
		})
		.on('mouseout', function(d){
			d3.select("#current-details").html("")
			tip.hide()
			d3.selectAll("#svg-2 svg").remove()
		})
	return map
}
function drawNeighborsGraph(data, id){
	d3.selectAll("#svg-2 svg").remove()
	var height = 140
	var width = 400
	var chart = d3.selectAll("#svg-2")
			.append("svg")
			.attr("width",width)
			.attr("height",height)
			.append("g")
			.attr("transform","translate(80,20)")
	var margin = 80
	var neighborsMedians = []
	var incomeScale = d3.scale.linear().domain([0,250000]).range([0,height-margin])
	var incomeScaleReverse = d3.scale.linear().domain([0,250000]).range([height-margin,0])
	
	var selectedIdMedian = parseInt(data[id][0]["Median"])
	neighborsMedians.push({"id":id,"Median": selectedIdMedian})
	var marginLeft = 30
	var yAxis = d3.svg.axis().scale(incomeScaleReverse).orient("left").ticks(4)
	
	var neighborsList = global.neighbors[id]
	for(var neighbor in neighborsList){
		var currentId = neighborsList[neighbor]
		var income = parseInt(data[currentId][0]["Median"])
		
		if(!isNaN(income)){
			neighborsMedians.push({"id":currentId,"Median":income})
		}
	}

	var neighbors = neighborsMedians.items;
	//console.log(neighbors)
	chart.selectAll("rect")
		.data(sortObjectByValue(neighborsMedians))
		.enter()
		.append("rect")
		.attr("x", function(d,i){
			return i*12+10
		})
		.attr("y", function(d){
			return height-margin-incomeScale(d.Median)
		})
		.attr("width", 10)
		.attr("height", function(d){
			return incomeScale(d.Median)
		})
		.attr("fill",function(d){
			if(d.id == id){
				return "red"
			}else{
				return "black"
			}
		})
	chart.append("g").attr("class", "y axis").call(yAxis)
}
function showHide(shID) {
   if (document.getElementById(shID)) {
      if (document.getElementById(shID+'-show').style.display != 'none') {
         document.getElementById(shID+'-show').style.display = 'none';
         document.getElementById(shID).style.display = 'block';
      }
      else {
         document.getElementById(shID+'-show').style.display = 'inline';
         document.getElementById(shID).style.display = 'none';
      }
   }
}