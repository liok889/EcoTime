/* =============================================
 * Tempo: connected scatterplot view
 * (C) Khairi Reda
 * =============================================
 */

// default dimensions of the scatterplot view
var DEF_SCATTER_W = 150;
var DEF_SCATTER_H = 150;

// padding inside the scatterplot view
var SCATTER_PAD = 7;

// size of the text
var VAR_TEXT_SIZE = 9;

function ScatterView(group, xVar, yVar, width, height)
{
	this.group = group;
	this.xVar = xVar;
	this.yVar = yVar;

	// get the intersection between the two series
	this.xSeries = theData.generateOneSeries(xVar);
	this.ySeries = theData.generateOneSeries(yVar);

	this.w = width  || DEF_SCATTER_W;
	this.h = height || DEF_SCATTER_H;

	// create rectangle
	this.group.append("rect")
		.attr("width", this.w)
		.attr("height", this.h)
		.attr("class", "scatterBorderRect");

	// create variable name
	this.vVarText = this.group.append("text")
		.html(yVar)
		.style("font-size", (1+VAR_TEXT_SIZE) + "px")
		.attr("class", "variableName")
		.attr("text-anchor", "middle")
		.attr("transform", "translate(" + VAR_TEXT_SIZE + "," + this.h/2 + "),rotate(-90)");

	this.xVarText = this.group.append("text")
		.html(xVar)
		.style("font-size", (1+VAR_TEXT_SIZE) + "px")
		.attr("class", "variableName")
		.attr("text-anchor", "middle")
		.attr("x", this.w/2).attr("y", VAR_TEXT_SIZE);
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

ScatterView.prototype.getH = function()
{
	return this.h;
}

ScatterView.prototype.getXDomain = function()
{
	return this.xSeries.getExtents();
}
ScatterView.prototype.getYDomain = function()
{
	return this.ySeries.getExtents();
}

ScatterView.prototype.updateGraphics = function()
{
	this.xScale = d3.scale.linear()
		.domain(this.xSeries.getExtents())
		.range([SCATTER_PAD, this.w - SCATTER_PAD*2]);
	
	this.yScale = d3.scale.linear()
		.domain(this.ySeries.getExtents())
		.range([SCATTER_PAD, this.h - SCATTER_PAD*2]);

	// update the graphics
}

var glCache = d3.map();
function getGLData(glContext, xVar, yVar)
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
		var gl = glContext;
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

			for (var i=0; i<N; i++) 
			{
				var v1 = xSeries[i]; var b1 = v1 !== null && v1 !== undefined;
				var v2 = ySeries[i]; var b2 = v2 !== null && v2 !== undefined;
				
				if (b1 && b2)  
				{
					vertices.push( v1 );
					vertices.push( v2 );		
				
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
				}
			}

			// create 2 buffers (vertices and colors) and upload
			var vertexBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

			var colorBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

			glData = {
				vertexBuffer: vertexBuffer,
				colorBuffer: colorBuffer,
				indices: indices,
				vertexCount: vertexCount
			};

			// store in cache
			glCache.set(cacheName, glData);
		}
	}
	return glData;
}




