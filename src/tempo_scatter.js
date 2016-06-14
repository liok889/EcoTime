/* =============================================
 * Tempo: connected scatterplot view
 * (C) Khairi Reda
 * =============================================
 */

// default dimensions of the scatterplot view
var DEF_SCATTER_W = 120;
var DEF_SCATTER_H = 120;

// size of inline buttons
var BUTTON_SIZE = 10;

// padding inside the scatterplot view
var SCATTER_PAD = 10;
var LINECHART_PAD_W = 4;
var LINECHART_PAD_H = 2;
// size of the text
var VAR_TEXT_SIZE = 9;

// dimensions of variable selection popup list
var VAR_SELECTION_POPUP_W = 200;
var VAR_SELECTION_POPUP_H = 350;

// default linechart
var DEF_LINECHART_VISIBILITY = false;
var DEF_LINECHART_H = 40;
var EXPAND_DURATION = 150;


function ScatterView(parentColumn, group, xVar, yVar, width, height, linechartH, linechartVisibility)
{
	this.column = parentColumn
	this.group = group;
	this.xVar = xVar;
	this.yVar = yVar;

	this.defs = getSVG(this.group).select("defs");


	// get the intersection between the two series
	this.xSeries = theData.generateOneSeries(xVar);
	this.ySeries = theData.generateOneSeries(yVar);

	this.w = width  || DEF_SCATTER_W;
	this.h = height || DEF_SCATTER_H;

	// create background rectangle
	this.bgRect = this.group.append("rect")
		.attr("width", this.w)
		.attr("height", this.h)
		.attr("class", "scatterBorderRect");

	// create text to show variable names
	(function(scatterview, group)
	{
		scatterview.yVarText = group.append("text")
			.html(scatterview.yVar)
			.style("font-size", (1+VAR_TEXT_SIZE) + "px")
			.attr("class", "variableName")
			.attr("text-anchor", "middle")
			.attr("transform", "translate(" + VAR_TEXT_SIZE + "," + scatterview.h/2 + "),rotate(-90)")
			.on("click", function() {

			 	// open up a selection menu with list of variable to choose from
			 	var mouse = d3.mouse(document.body);
				var selectionDiv = new ListSelection(
					mouse[0], mouse[1], 
					VAR_SELECTION_POPUP_W, VAR_SELECTION_POPUP_H, theData.getFields()
				);
				selectionDiv.setCallbacks(function(varName) 
				{
					if (!shiftKey) {
						tempo.setYVar(scatterview.matrixIndex[1], varName);
					}
					else
					{
						scatterview.setYVar(varName);
					}
				});
			})
			.on("mouseover", function() {
				d3.select(this).attr('class', 'variableNameHover');
			})
			.on("mouseout", function() {
				d3.select(this).attr('class', 'variableName');
			});

		scatterview.xVarText = group.append("text")
			.html(scatterview.xVar)
			.style("font-size", (1+VAR_TEXT_SIZE) + "px")
			.attr("class", "variableName")
			.attr("text-anchor", "middle")
			.attr("x", scatterview.w/2).attr("y", VAR_TEXT_SIZE)
			.on("click", function() 
			{
			 	// open up a selection menu with list of variable to choose from
			 	var mouse = d3.mouse(document.body);
				var selectionDiv = new ListSelection(
					mouse[0], mouse[1], 
					VAR_SELECTION_POPUP_W, VAR_SELECTION_POPUP_H, theData.getFields()
				);
				selectionDiv.setCallbacks(function(varName) 
				{
					if (!shiftKey) {
						tempo.setXVar(scatterview.matrixIndex[0], varName);
					}
					else {
						scatterview.setXVar(varName);
					}
				});
			})
			.on("mouseover", function() {
				d3.select(this).attr('class', 'variableNameHover');
			})
			.on("mouseout", function() {
				d3.select(this).attr('class', 'variableName');
			});

	})(this, this.group);

	// create a group to show a linechart view of the time series
	this.linechartVisibility = linechartVisibility !== undefined ? linechartVisibility : DEF_LINECHART_VISIBILITY;
	this.linechartGroup = this.group.append("g")
		.style("visibility", this.linechartVisibility ? "visible" : "hidden")
		.attr("transform", "translate(0," + this.h + ")");

	this.linechartW = DEF_SCATTER_W;
	this.linechartH = linechartH || DEF_LINECHART_H;

	this.linechartContent = this.linechartGroup.append("g")
		.style("visibility", this.linechartVisibility ? "visible" : "hidden")
	var linechartData = this.linechartContent.append("g").attr("class", "linechartData")
	linechartData.append("g").attr("class", "xLinechart");
	linechartData.append("g").attr("class", "yLinechart");


	this.linechartRect = this.linechartGroup.append("rect")
		.attr("class", "scatterBorderRect")
		.attr("width", this.linechartW)
		.attr("height", this.linechartVisibility ? DEF_LINECHART_H : 0);

	// append a resize rectangle at the lower-left corner
	this.resizeScatter = new InlineButton(
		this.group,
		this.w - BUTTON_SIZE-1,
		this.h - BUTTON_SIZE-1,
		BUTTON_SIZE, BUTTON_SIZE,
		'assets/resize.png'
	);

	this.resizeLinechart = new InlineButton(
		this.group,
		this.w - BUTTON_SIZE-1,
		this.h + this.linechartH - BUTTON_SIZE-1,
		BUTTON_SIZE, BUTTON_SIZE,
		'assets/resize.png'
	);

	this.expandButton = new InlineButton(
		this.group,
		1, this.h - BUTTON_SIZE-1,
		BUTTON_SIZE, BUTTON_SIZE,
		'assets/expand.png'
	);

	(function(scatterview) 
	{
		scatterview.resizeScatter.on("resize", function(dMouse) 
		{		
			// calculate new size
			var newW = Math.max(scatterview.w + dMouse[0],30);
			var newH = Math.max(scatterview.h + dMouse[1],30);
			scatterview.column.updateScatterSize(scatterview, newW, {
				scatter: newH,
				linechart: scatterview.linechartH
			});
		});

		scatterview.resizeLinechart.on("resize", function(dMouse) {
			// calculate new size
			var newW = Math.max(scatterview.w + dMouse[0],30);
			var newH = scatterview.h
			var newLH = Math.max(scatterview.linechartH + dMouse[1],10);
			scatterview.column.updateScatterSize(scatterview, newW, 
			{
				scatter: newH,
				linechart: newLH			
			});
		});

		scatterview.expandButton.on("click", function() 
		{
			scatterview.column.initiateToggleLinechartView(scatterview);
		});

	})(this);
}

ScatterView.prototype.setTimeRange = function(timeRange)
{
	var updated = false;
	if (!this.timeRange) {
		this.timeRange = [timeRange[0], timeRange[1]];
		updated = true;
	}
	else
	{
		if (this.timeRange[0] != timeRange[0] || this.timeRange[1] != timeRange[1]) {
			this.timeRange = [timeRange[0], timeRange[1]];
			updated = true;
		}
	}
	this.updateLinechart();
}

ScatterView.prototype.getLinechartVisibility = function()
{
	return this.linechartVisibility;
}

ScatterView.prototype.toggleLinechartView = function(startCallback, endCallback)
{
	return (function(scatterview, start, end)
	{
		if (!scatterview.linechartVisibility)
		{
			// show
			scatterview.linechartVisibility = true;
			scatterview.linechartGroup.style("visibility", "visible");
			scatterview.linechartRect.transition().duration(EXPAND_DURATION)
				.attr("height", scatterview.linechartH)
				.each("start", function() {
					if (start) {
						start();
					}
				})
				.each("end", function() 
				{
					scatterview.updateLinechart();

					scatterview.linechartContent
						.style("visibility", "visible");
					if (end) {
						end();
					}
				});
		}
		else
		{
			// hide
			scatterview.linechartVisibility = false;
			scatterview.linechartContent.style("visibility", "hidden");
			scatterview.linechartRect.transition().duration(EXPAND_DURATION)
				.attr("height", 0)
				.each("start", function() {
					if (start) {
						start();
					}
				})
				.each("end", function() {
					scatterview.linechartGroup
						.style("visibility", "hidden");
					if (end) {
						end();
					}
				});
		}

		// toggle
		return scatterview.linechartVisibility;
	})(this, startCallback, endCallback);
}

ScatterView.prototype.setMatrixIndex = function(index)
{
	this.matrixIndex = [index[0], index[1]];
}
ScatterView.prototype.getMatrixIndex = function()
{
	return this.matrixIndex;
}

ScatterView.prototype.getGroup = function()
{
	return this.group;
}

ScatterView.prototype.updateSize = function(w, h)
{
	this.w = w || this.w;
	this.h = h ? h.scatter : this.h;
	this.linechartH = h ? h.linechart : this.linechartH;

	this.bgRect
		.attr("width", this.w)
		.attr("height", this.h)

	this.yVarText
		.attr("transform", "translate(" + VAR_TEXT_SIZE + "," + this.h/2 + "),rotate(-90)");
	this.xVarText
		.attr("x", this.w/2).attr("y", VAR_TEXT_SIZE);
	this.resizeScatter
		.attr("x", this.w-BUTTON_SIZE-1)
		.attr("y", this.h-BUTTON_SIZE-1);
	this.expandButton
		.attr("x", "1").attr("y", this.h - BUTTON_SIZE-1);

	// linechart group
	this.linechartGroup
		.attr("transform", "translate(0," + this.h + ")");
	this.linechartRect
		.attr("width", this.w);

	// update line chart
	this.updateLinechart();
}


ScatterView.prototype.setXVar = function(xVar, dontRender)
{
	this.xVar = xVar;
	this.xVarText.html(xVar);
	this.xSeries = theData.generateOneSeries(xVar);
	tempo.renderGL();
	this.updateLinechart();
}
ScatterView.prototype.setYVar = function(yVar, dontRender)
{
	this.yVar = yVar;
	this.yVarText.html(yVar);
	this.ySeries = theData.generateOneSeries(yVar);
	tempo.renderGL();
	this.updateLinechart();
}


ScatterView.prototype.getXVar = function()
{
	return this.xVar;
}
ScatterView.prototype.getYVar = function()
{
	return this.yVar;
}

ScatterView.prototype.getW = function()
{
	return this.w;
}

// returns the instantaneous height
ScatterView.prototype.getCurrentH = function()
{
	var attrH = this.linechartRect.attr("height")
	var linechartH = isNaN(attrH) ? 0 : +attrH;
	return this.h + linechartH;
}

ScatterView.prototype.getH = function()
{
	var height = this.h + (this.linechartVisibility ? this.linechartH : 0);
	return height;
}

ScatterView.prototype.getScatterH = function()
{
	return this.h;
}
ScatterView.prototype.getLinechartH = function()
{
	return this.linechartH;
}

ScatterView.prototype.getXDomain = function()
{
	return this.xSeries.getExtents();
}
ScatterView.prototype.getYDomain = function()
{
	return this.ySeries.getExtents();
}

ScatterView.prototype.updateLinechart = function()
{
	if (!this.linechartVisibility)
	{
		return;
	}
	
	if (!this.linechartTimeRange || this.linechartTimeRange[0] != this.timeRange[0] || this.linechartTimeRange[1] != this.timeRange[1])
	{
		var pairedSeries = getPairedTimeseries(this.xVar, this.yVar);

		var xChunks = pairedSeries.xChunks;
		var yChunks = pairedSeries.yChunks;

		// determine range of chunks
		var xRange = [ xChunks.chunkIndices[this.timeRange[0]], xChunks.chunkIndices[this.timeRange[1]] ];
		var yRange = [ yChunks.chunkIndices[this.timeRange[0]], yChunks.chunkIndices[this.timeRange[1]] ];

		// plot the chunks
		var pathGenerator = d3.svg.line()
			.x(function(d) { return d.x; })
			.y(function(d) { return d.y; });

		var xChunkData = [];
		for (var i=Math.max(0, xRange[0]); i<=xRange[1]; i++) {
			xChunkData.push({index: i, chunk: xChunks.chunks[i]});
		}

		var yChunkData = [];
		for (var i=Math.max(0, yRange[0]); i<=yRange[1]; i++) {
			yChunkData.push({index: i, chunk: yChunks.chunks[i]});
		}

		var xGroup = this.linechartContent.select("g.xLinechart");
		var yGroup = this.linechartContent.select("g.yLinechart");

		var xUpdate = xGroup.selectAll("path").data(xChunkData, function(d) { return d.index; });
		xUpdate.enter().append("path");
		xUpdate
			.attr("vector-effect", "non-scaling-stroke")
			.attr("d", function(d) { return pathGenerator(d.chunk); });
		xUpdate.exit().remove();

		
		var yUpdate = yGroup.selectAll("path").data(yChunkData, function(d) { return d.index; });
		yUpdate.enter().append("path");
		yUpdate
			.attr("vector-effect", "non-scaling-stroke")
			.attr("d", function(d) { return pathGenerator(d.chunk); });
		yUpdate.exit().remove();
		

		this.linechartTimeRange = [ this.timeRange[0], this.timeRange[1] ];	
	}

	// update the transform
	var xScaleFactor = (this.w - LINECHART_PAD_W*2) / (this.timeRange[1]-this.timeRange[0]);
	var xTranslate = -this.timeRange[0];

	var yScaleFactor = this.linechartH - LINECHART_PAD_H*2
	var yTranslate = 0;

	var transform = 	
		'translate(' + LINECHART_PAD_W + ',' + LINECHART_PAD_H + ') ' +
		'scale(' + xScaleFactor + ',' + yScaleFactor + ') '	+
		'translate(' + xTranslate + ',' + yTranslate + ')';

	this.linechartContent.select("g.linechartData")
		.attr("transform", transform);
}


// GL render
// ==============
// cache to store vertex buffers of the differnet time series combination
var glCache = d3.map();

// rendering function
function getPairedTimeseries(xVar, yVar)
{
	var cacheName = xVar + "_**_" + yVar;
	var glData = glCache.get(cacheName);
	if (!glData)
	{
		var COLOR_SCALE = [
			[178,24,43],
			[178,24,43],
			[239,138,98],
			[70, 70, 70],
			[103,169,207],
			[33,102,172],
			[33,102,172]
		].reverse();

		var colorScale = d3.scale.quantize().domain([0, 1]).range(d3.range(COLOR_SCALE.length));

		// create vertex array if we have an OpenGL context
		if (gl) 
		{	
			// create arrays for vertices and colors
			var xSeries = theData.generateOneSeries(xVar).getSeries();
			var ySeries = theData.generateOneSeries(yVar).getSeries();

			var N = Math.min(xSeries.length, ySeries.length);

			// begining / end timestep
			var beginTime = theData.getStartDate().getTime();
			var timestepOffset = theData.getTimestepOffset();

			var vertices = [], colors = [], indices = [];
			var vertexCount = 0;
			var lastIndex = -1;

			var ts1 = new Timeseries(N); var s1 = ts1.getSeries();
			var ts2 = new Timeseries(N); var s2 = ts2.getSeries();

			for (var i=0; i<N; i++) 
			{
				var v1 = xSeries[i]; var b1 = v1 !== null && v1 !== undefined;
				var v2 = ySeries[i]; var b2 = v2 !== null && v2 !== undefined;
				
				if (b1 && b2)  
				{
					vertices.push( v1 );
					vertices.push( v2 );

					s1[i] = v1;
					s2[i] = v2;		
				
					// determine color based on the time of the day
					var timestep = new Date(beginTime + i*timestepOffset);
					var dayOffset = timestep.getHours() * 60*60*1000 + timestep.getMinutes() * 60*1000;
					var dayOffsetN = dayOffset / (24*60*60*1000-1);
					
					// map to color
					var color = COLOR_SCALE[colorScale(dayOffsetN)];

					colors.push( color[0]/255 );
					colors.push( color[1]/255 );
					colors.push( color[2]/255 );
					colors.push(      1.0     );
				
					indices.push(vertexCount);
					lastIndex = vertexCount;
					vertexCount++;
				}
				else
				{
					indices.push(lastIndex);
					s1[i] = null;
					s2[i] = null;
				}
			}

			// create 2 buffers (vertices and colors) and upload
			var vertexBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

			var colorBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

			// normalize the timeseries
			ts1.normalize();
			ts2.normalize();

			glData = {
				vertexBuffer: vertexBuffer,
				colorBuffer: colorBuffer,
				indices: indices,
				vertexCount: vertexCount,
				xSeries: ts1,
				ySeries: ts2,

				xChunks: chunketize(s1, theData.getTimeLength()),
				yChunks: chunketize(s2, theData.getTimeLength())
			};

			// store in cache
			glCache.set(cacheName, glData);
		}
	}
	return glData;
}

var INDEX_NULL=0;
var INDEX_POINT=1;
var INDEX_CHUNK=2;

function chunketize(series, N)
{
	var chunk = null, chunks = [], points = [];
	var chunkIndices = []; chunkIndices.length = N;
	var pointIndices = []; pointIndices.length = N;
	var cIndex = -1, pIndex = -1;

	for (var i = 0; i <= N; i++) 
	{
		var v = (i<N) ? series[i] : null;
		if (v !== null && v !== undefined) 
		{
			if (!chunk) {
				chunk = [];
			}

			chunk.push({x: i, y: 1.0 - v});
			chunkIndices[i] = chunks.length;
			pointIndices[i] = pIndex;
		}
		else
		{
			if (chunk)
			{
				if (chunk.length == 1) 
				{
					chunkIndices[i-1]--;
					pointIndices[i-1] = points.length;
					pIndex = points.length;
					points.push(chunk[0]);
				}
				else
				{
					cIndex = chunks.length;
					chunks.push(chunk);

				}
				chunk = null;
			}

			if (i<N) {
				chunkIndices[i] = cIndex;
				pointIndices[i] = pIndex;
			}
		}
	}

	return {
		chunks: chunks,	chunkIndices: chunkIndices,
		points: points,	pointIndices: pointIndices
	};
}


