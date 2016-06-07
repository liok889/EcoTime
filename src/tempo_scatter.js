/* =============================================
 * Tempo: connected scatterplot view
 * (C) Khairi Reda
 * =============================================
 */

// default dimensions of the scatterplot view
var DEF_SCATTER_W = 150;
var DEF_SCATTER_H = 150;

// padding inside the scatterplot view
var SCATTER_PAD = 5;

function ScatterView(xVar, yVar, width, height)
{
	this.xVar = xVar;
	this.yVar = yVar;

	// get the intersection between the two series
	this.xSeries = theData.generateOneSeries(xVar);
	this.ySeries = theData.generateOneSeries(yVar);
	this.intersection = theData.getIntersectionSeries(xVar, yVar);

	this.w = width  || DEF_SCATTER_W;
	this.h = height || DEF_SCATTER_H; 
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

ScatterView.prototype.uploadGLData = function()
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
		// delete old buffer if exist
		if (this.vertexBuffer !== undefined) { 
			gl.deleteBuffer(this.vertexBuffer); 
			this.vertexBuffer = undefined; 
		}
		if (this.colorBuffer !== undefined) {
			gl.deleteBuffer(this.colorBuffer);
			this.colorBuffer = undefined;
		}
		
		// create arrays for vertices and colors
		var xSeries = this.xSeries.getSeries();
		var ySeries = this.ySeries.getSeries();
		var N = Math.min(xSeries.length, ySeries.length);

		// begining / end timestep
		var beginTime = ts.getStartDate().getTime();
		var timestepOffset = ts.getTimestepOffset();

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

		// create buffers and upload vertices
		this.vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

		this.colorBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

		this.vertexCount = vertexCount;
		this.vertexIndices = indices;

	}
}



