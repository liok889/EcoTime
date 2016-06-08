/* =============================================
 * Tempo: main visual interface
 * (C) Khairi Reda
 * =============================================
 */

var TIMELINE_X = 35;
var TIMELINE_Y = 25;
var TIMELINE_MAX_W = 600;
var TIMELINE_END_R = 3;
var BUTTON_W = 20, BUTTON_H = 20;
var TIMELINE_SLIDER_THICKNESS = 25;

// offset of the column view
var COLUMN_X = 10;
var COLUMN_Y = 50;
var COLUMN_SPACING = 5;

// default column variable
var DEF_COLUMN_VARIABLE = 'fc';

// list of interesting variables to choose from
var INTERESTING_VARS = ['PRIsn', 'LE', 'Tair', 'VPD'];
var ADD_ALL_INTERESTING = true;

function Tempo()
{
	this.vis = d3.select("#visSVG");
	this.canvas = d3.select("#visCanvas");
	this.interact = d3.select("#interactSVG");

	// columns
	this.columns = [];

	// initialize the basic IU
	var svgSize = this.getSVGSize();
	this.init(svgSize.w, svgSize.h);
}

Tempo.prototype.init = function()
{
	// make groups and basic UI elements for the Tempo interface
	var svgSize = this.getSVGSize();
	var w = svgSize.w;
	var h = svgSize.h;

	// make the timeline
	group = this.vis.append("g")
		.attr("class", "timelineGroup")
		.attr("transform", "translate(" + TIMELINE_X + "," + TIMELINE_Y + ")");
		
	// a line that represents the timeline
	var timelineW = Math.min(TIMELINE_MAX_W, w - 2*TIMELINE_X);

	var timeline = group.append("line")
		.attr("class", "timeline")
		.attr("x1", 0).attr("y1", 0)
		.attr("x2", timelineW).attr("y1", 0);

	// two circles at either end of the line
	var c1 = group.append("circle")
		.attr("r", TIMELINE_END_R + "px")
		.attr("class", "timeline")
		.attr("cx", -TIMELINE_END_R).attr("cy", 0);
	
	var c2 = group.append("circle")
		.attr("r", TIMELINE_END_R + "px")
		.attr("class", "timeline")
		.attr("cx", timelineW+TIMELINE_END_R).attr("cy", 0);

	this.timeline = timeline;
	this.timelineCircles = [c1, c2];
	this.timelineGroup = group;

	// 'add view' button
	this.addViewButton = (function(tempo) {
		return new Button(tempo.vis,
			5, TIMELINE_Y-BUTTON_H/2, BUTTON_W, BUTTON_H,
			"assets/add.png", "assets/add_hover.png", function() {
				tempo.addColumn();
			});
	})(this);

	// store timeline width
	this.timelineW = timelineW;

	// slider group
	this.sliderGroup = this.vis.append("g")
		.attr("class", "sliderGroup")
		.attr("transform", "translate(" + TIMELINE_X + "," + (TIMELINE_Y-TIMELINE_SLIDER_THICKNESS/2) + ")");

	// column group
	this.columnGroup = this.vis.append("g")
		.attr("class", "columnGroup")
		.attr("transform", "translate(" + COLUMN_X + "," + COLUMN_Y + ")")
}

Tempo.prototype.addColumn = function()
{
	// add a slider to this column
	var slider = new RangeSlider(this.sliderGroup, {
		orientation: "horizontal",
		range: [0, this.timelineW],
		position: 0,
		length: 30,
		minLength: 15,
		rx: 3, ry: 3,
		hoverColor: '#777777',
		dragColor: '#ff5050',
		thickness: TIMELINE_SLIDER_THICKNESS
	});

		
	(function(tempo, slider) {
		slider.setCallback(function() {
			tempo.renderGL(gl);
		});
	})(this, slider);

	// figure out the X offset of the row
	var xOffset = 0;
	for (var i=0, N=this.columns.length; i<N; i++) {
		xOffset += this.columns[i].column.getW() + COLUMN_SPACING;
	}

	var group = this.columnGroup.append("g")
		.attr("transform", "translate(" + xOffset + "," + 0 + ")")

	// add column
	var column = new TimeColumn(group, DEF_COLUMN_VARIABLE);
	this.columns.push({
		column: column,
		slider: slider,
		group: group
	});

	// add one variable to the column 
	if (ADD_ALL_INTERESTING)
	{
		var varList = INTERESTING_VARS;
		for (var i=0; i<varList.length; i++) {
			column.addView(varList[i]);
		}
	}
	else if (INTERESTING_VARS.length > 0) 
	{
		// (choose at random from a list of 'interesting' variables)
		var r = Math.floor(.5 + Math.random() * (INTERESTING_VARS.length-1));
		column.addView(INTERESTING_VARS[r]);
	}
}

Tempo.prototype.resizeWindow = function()
{
	var svgSize = this.getSVGSize();
	var w = svgSize.w;
	var h = svgSize.h;

	this.timelineW = Math.min(TIMELINE_MAX_W, w - 2*TIMELINE_X);

	this.timeline.attr("x2", this.timelineW);
	this.timelineCircles[1].attr("cx", this.timelineW+TIMELINE_END_R);
}

Tempo.prototype.getSVGSize = function()
{
	var visNode = this.vis.node();
	var bounding = visNode.getBoundingClientRect();
	var w = bounding.right - bounding.left;
	var h = bounding.bottom - bounding.top
	return {
		w: w, h: h 
	};
}

Tempo.prototype.renderGL = function(gl)
{
	// initialize the shader
	// =====================
	var canvasSize = this.getSVGSize();

	// initialize projection and modelview matrix
	var projectionMatrix = makeOrtho(0, canvasSize.w, canvasSize.h, 0, -1.0, 1.0);
	var mvMatrix = Matrix.I(4);
	
	if (window.devicePixelRatio)
	{
		canvasSize.w *= window.devicePixelRatio;
		canvasSize.h *= window.devicePixelRatio;
	}
	gl.viewport(0, 0, canvasSize.w, canvasSize.h);

	// compile shader
	if (!this.shaderProgram) 
	{
		// set viewport to match canvas pixel dimensions
		gl.clearColor(0.0, 0.0, 0.0, 0.0);
		gl.disable(gl.DEPTH_TEST);

		// shader source
		var fragmentShader = getShader(gl, "shader-fs");
		var vertexShader = getShader(gl, "shader-vs");
		var shaderProgram = gl.createProgram();

		gl.attachShader(shaderProgram, vertexShader);
		gl.attachShader(shaderProgram, fragmentShader);
		gl.linkProgram(shaderProgram);

		// if creating the program failed, alert,
		if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
			alert("Unable to initialize the shader program: " + gl.getProgramInfoLog(shaderProgram));
		}
		else
		{
			// get vertex attributes
			this.vertexPosAttrib = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
			gl.enableVertexAttribArray(this.vertexPosAttrib);

			this.vertexColorAttrib = gl.getAttribLocation(shaderProgram, 'aVertexColor');
			gl.enableVertexAttribArray(this.vertexColorAttrib);
				
			// matrix uniforms
			this.pUniform = gl.getUniformLocation(shaderProgram, 'uPMatrix');
			this.mvUniform = gl.getUniformLocation(shaderProgram, 'uMVMatrix');

			// range / domain variables
			this.rangeMin = gl.getUniformLocation(shaderProgram, "rangeMin");
			this.rangeLen = gl.getUniformLocation(shaderProgram, "rangeLen");
			this.domainMin = gl.getUniformLocation(shaderProgram, "domainMin");
			this.domainLen = gl.getUniformLocation(shaderProgram, "domainLen");

			// store shader program
			this.shaderProgram = shaderProgram;
		}
	}

	// clear
	gl.clear(gl.COLOR_BUFFER_BIT);

	// use the shader
	gl.useProgram(this.shaderProgram);
	gl.lineWidth(1.0);

	// update uniforms (projection and modelview matrices)
	gl.uniformMatrix4fv(this.pUniform, false, new Float32Array(projectionMatrix.flatten()));
	gl.uniformMatrix4fv(this.mvUniform, false, new Float32Array(mvMatrix.flatten()));

	// loop through all columns and render them
	// =========================================
	var columns = this.columns;
	var screenOffset= [COLUMN_X, COLUMN_Y];

	for (var i=0, N=columns.length; i<N; i++)
	{
		// column and slider
		var column = columns[i].column;
		var slider = columns[i].slider;

		// get the time range for the slider
		var timeRange = timeRangeFromNormalized(slider.getNormalizedRange());

		// screen offset
		var rangeMin = [
			screenOffset[0] + SCATTER_PAD, 
			screenOffset[1] + SCATTER_PAD
		];

		var rangeLen = [column.getW() - SCATTER_PAD*2, 0];

		// get the views of this column
		var views = column.getViews();
		for (var j=0; j < views.length; j++)
		{
			var view = views[j];

			rangeLen[1] = view.getH() - SCATTER_PAD*2

			var xDomain = view.getXDomain();
			var yDomain = view.getYDomain();

			var domainMin = [xDomain[0], yDomain[0]];
			var domainLen = [
				xDomain[1] - xDomain[0], 
				yDomain[1] - yDomain[0]
			];

			// update the uniform
			gl.uniform2fv(this.rangeMin, new Float32Array(rangeMin));
			gl.uniform2fv(this.rangeLen, new Float32Array(rangeLen));
			gl.uniform2fv(this.domainMin, new Float32Array(domainMin));
			gl.uniform2fv(this.domainLen, new Float32Array(domainLen));
			
			// render
			var glData = getGLData(gl, view.getXVar(), view.getYVar());

			// determine draw range
			var i0 = glData.indices[ timeRange[0] ];
			var i1 = glData.indices[ timeRange[1] ];
			if (!(i0 == -1 && i1 == -1))
			{
				i0 = Math.max(0, i0);
				i1 = Math.max(0, i1);
				var drawLen = i1-i0+1;
				if (drawLen > 0) 
				{
					gl.bindBuffer(gl.ARRAY_BUFFER, glData.vertexBuffer);
					gl.vertexAttribPointer(this.vertexPosAttrib, 2, gl.FLOAT, false, 0, 0);

					gl.bindBuffer(gl.ARRAY_BUFFER, glData.colorBuffer);		
					gl.vertexAttribPointer(this.vertexColorAttrib, 4, gl.FLOAT, false, 0, 0);
					gl.drawArrays(gl.LINE_STRIP, i0, drawLen);
				}
			}

			// offset Y to the next scatter plot
			rangeMin[1] += view.getH() + SCATTER_SPACING;
		}

		// run the offset
		screenOffset[0] += column.getW() + COLUMN_SPACING;
	}
}

function timeRangeFromNormalized(nRange)
{
	var N = theData.getTimeLength();		
	return [ Math.floor(nRange[0] * (N-1)+0.5), Math.min(N-1,Math.floor(nRange[1] * (N-1)+0.5)) ];
}



























