/* =============================================
 * Tempo: main visual interface
 * (C) Khairi Reda
 * =============================================
 */

var TIMELINE_X = 45;
var TIMELINE_Y = 21;
var TIMELINE_MAX_W = 800;
var TIMELINE_END_R = 3;
var BUTTON_W = 20, BUTTON_H = 20;
var TIMELINE_SLIDER_THICKNESS = 15;

// offset of the column view
var COLUMN_X = 10;
var COLUMN_Y = 100;
var COLUMN_SPACING = 0;

// default column variable
var DEF_COLUMN_VARIABLE = 'GPP_WithUstar_f';
var DEF_SLIDER_LENGTH = 110;
var DEF_SLIDER_MIN_LENGTH = 15;

// list of interesting variables to choose from
var INTERESTING_VARS = ['Ustar', 'LE', 'Tair', 'VPD', 'hour'];
var ADD_ALL_INTERESTING = true;
var SLIDER_OPACITY = 0.8;

// default visibility
var SHOW_SCATTER_POINTS = true;
var SHOW_SCATTER_LINES = false;
var SHOW_TIME_AXIS = true;

// size/opacity of gl points
var POINT_OPACITY = 0.2;
var POINT_SIZE = 10.0;

// width of lines
var LINE_WIDTH = 2.0;

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

	// ribbon group: connect the slider to their TimeColumn
	this.ribbonGroup = this.vis.append("g")
		.attr("class", "ribbonGroup");

	// a line that represents the timeline
	var timelineW = Math.min(TIMELINE_MAX_W, w - 2*TIMELINE_X);

	var timeline = group.append("line")
		.attr("class", "timeline")
		.style("stroke", "#444444")
		.attr("x1", 0).attr("y1", 0)
		.attr("x2", timelineW).attr("y1", 0);
	
	if (SHOW_TIME_AXIS) 
	{
		var timeScale = d3.time.scale()
			.domain([theData.getStartDate(), theData.getEndDate()])
			.range([0, timelineW ]);

		var timeAxis = d3.svg.axis()
			.scale(timeScale)
			.orient('top')
			.tickFormat(d3.time.format('%m/%d'))
			.tickSize(2);

		group.append('g')
			.attr('class', 'timeAxis')
			.call(timeAxis);
	}

	// two circles at either end of the line
	var c1 = group.append("circle")
		.attr("r", TIMELINE_END_R + "px")
		.attr("class", "timeline")
		.attr("cx", -TIMELINE_END_R+2).attr("cy", 0);
	
	var c2 = group.append("circle")
		.attr("r", TIMELINE_END_R + "px")
		.attr("class", "timeline")
		.attr("cx", timelineW+TIMELINE_END_R-2).attr("cy", 0);

	this.timeline = timeline;
	this.timelineCircles = [c1, c2];
	this.timelineGroup = group;

	// 'add view' button
	(function(tempo) {
		tempo.addViewButton = new Button(tempo.vis,
			5, TIMELINE_Y-10-BUTTON_H/2, BUTTON_W, BUTTON_H,
			"assets/add.png", "assets/add_hover.png", function() {
				tempo.addColumn();
			});
		
		tempo.addViewButton = new Button(tempo.vis,
			5, TIMELINE_Y-10-BUTTON_H/2 + BUTTON_H+1, BUTTON_W, BUTTON_H,
			"assets/delete.png", "assets/delete_hover.png", function() {
				tempo.removeColumn();
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

var SLIDER_COLORS = [
	'#fbb4ae',
	'#b3cde3',
	'#ccebc5',
	'#decbe4',
	'#fed9a6',
].reverse();
var SLIDER_DEFAULT_COLOR = "#cccccc";



function connectSliderToColumn(ribbon, slider, column)
{
	function generateRibbonPath(p1, p2, thickness)
	{
		if (!thickness) {
			thickness = 15;
		}
		var s = -30;
		var b = thickness / 2;

		var d = "M" + (p1[0]-b) + " " + p1[1] + " ";

		d += "C " + (p1[0]-b) + " " + (p1[1]-s) + ", " + (p2[0]-b) + ' ' + (p2[1]+s) + ', ' + (p2[0]-b) + ' ' + p2[1] + ' ';
		d += "H " + (p2[0]+b) + " ";
		d += "C " + (p2[0]+b) + " " + (p2[1]+s) + ", " + (p1[0]+b) + ' ' + (p1[1]-s) + ', ' + (p1[0]+b) + ' ' + p1[1] + ' Z';
		return d;	 
	}

	var sliderOffset = slider.getScreenOffset();
	var p1 = [
		sliderOffset[0] + TIMELINE_X + slider.getPosition() + slider.getLength()/2,
		sliderOffset[1] + TIMELINE_Y + TIMELINE_SLIDER_THICKNESS/2+1
	];
	var p2 = column.getScreenOffset();
	p2[0] += column.getW()/2;
	ribbon.attr("d", generateRibbonPath(p1, p2));
}

Tempo.prototype.addColumn = function()
{
	var scatterHeights = [];
	if (this.columns.length > 0) {
		scatterHeights = this.columns[this.columns.length-1].column.getScatterHeights();
	}

	var sliderColor = SLIDER_DEFAULT_COLOR;
	if (SLIDER_COLORS.length > 0) {
		sliderColor = SLIDER_COLORS.pop();
	}

	// find a new position for the slider
	var lastSlider = 0;
	for (var i=0; i < this.columns.length; i++) 
	{
		var slider = this.columns[i].slider;
		lastSlider = Math.max(lastSlider, slider.getPosition() + slider.getLength()); 
	}

	// figure out the position of the slider
	var availableSpace = this.timelineW - lastSlider;
	var sliderLen = Math.min(availableSpace, DEF_SLIDER_LENGTH);
	var sliderPos = lastSlider;
	if (sliderLen < DEF_SLIDER_MIN_LENGTH) {
		// pick up random position
		sliderPos = Math.floor(Math.random() * (this.timelineW-DEF_SLIDER_LENGTH-10));
		sliderLen = DEF_SLIDER_LENGTH;
	}

	// add a slider to this column
	var sliderOffset = [0, 0];
	sliderOffset[1] += 1+TIMELINE_SLIDER_THICKNESS/2 //+ TIMELINE_SLIDER_THICKNESS/2*this.columns.length;

	var slider = new RangeSlider(this.sliderGroup, {
		orientation: "horizontal",
		range: [0, this.timelineW],
		position: sliderPos,
		length: sliderLen,
		minLength: DEF_SLIDER_MIN_LENGTH,
		rx: 3, ry: 3,
		fillOpacity: SLIDER_OPACITY,
		fillColor: sliderColor,
		hoverColor: '#777777',
		dragColor: '#ff5050',
		screenOffset: sliderOffset,
		thickness: TIMELINE_SLIDER_THICKNESS
	});

	// figure out the X offset of the row
	var xOffset = 0;
	for (var i=0, N=this.columns.length; i<N; i++) {
		xOffset += this.columns[i].column.getW() + COLUMN_SPACING;
	}

	var group = this.columnGroup.append("g")
		.attr("transform", "translate(" + xOffset + "," + 0 + ")")

	// add column
	var column = new TimeColumn(group, DEF_COLUMN_VARIABLE);
	column.setScreenOffset([COLUMN_X + xOffset, COLUMN_Y]);

	// add ribon
	var ribbon = (function(ribbonGroup, slider) 
	{
		return ribbonGroup.append("path")
			.style("fill", sliderColor)
			.style("stroke", sliderColor)
			.style("stroke-width", "1px")
			.style("fill-opacity", SLIDER_OPACITY || "")
			.on("mouseover", function() {
				if (!SLIDER_DRAG_EVENT) {
					slider.putOnTop();
				}
			});
	})(this.ribbonGroup, slider);

	// add a ribon to the column
	connectSliderToColumn(ribbon, slider, column);

	this.columns.push(
	{
		column: column,
		slider: slider,
		ribbon: ribbon,
	});
	var columnIndex = this.columns.length-1;

	// slider to callback
	(function(tempo, slider, column, ribbon) 
	{
		slider.setCallback(function() 
		{
			// re-render
			tempo.renderGL();
			
			// update the ribbon
			connectSliderToColumn(ribbon, slider, column);
		});

		slider.setOnTopCallback(function() {
			putNodeOnTop(ribbon.node());
		});
	})(this, slider, column, ribbon);


	// add one variable to the column 
	if (ADD_ALL_INTERESTING)
	{
		var varList = INTERESTING_VARS;
		for (var i=0; i<varList.length; i++) 
		{
			var view = column.addView(varList[i], scatterHeights[i]);
			view.setMatrixIndex([columnIndex, i]);
		}
	}

	this.renderGL();
}

Tempo.prototype.toggleLinechartView = function(viewIndex)
{
	for (var i=0; i<this.columns.length; i++) {
		this.columns[i].column.toggleLinechartView(
			viewIndex,

			// pass glStartAnimation, glEndAnimation for first column only
			i == 0 ? glStartAnimation : undefined,
			i == 0 ? glEndAnimation: undefined
		);
	}
}

var glAnimation = null;
function glStartAnimation()
{
	if (glAnimation === null) 
	{
		glAnimation = requestAnimationFrame(function() 
		{
			glAnimation = null;
			tempo.renderGL();

			// schedule another animation
			glStartAnimation();
		});
	}
}

function glEndAnimation()
{
	if (glAnimation !== null) {
		cancelAnimationFrame(glAnimation);
		glAnimation = null;

		// one more render
		tempo.renderGL();
	}
}

Tempo.prototype.removeColumn = function()
{
	if (this.columns.length > 0) 
	{
		var column = this.columns.pop();
		column.column.getGroup().remove();
		
		// return color to be re-used again
		var sliderColor = column.slider.getFillColor();
		if (sliderColor !== undefined && sliderColor !== SLIDER_DEFAULT_COLOR) {
			SLIDER_COLORS.push(sliderColor);
		}
		column.slider.remove();
		column.ribbon.remove();
		this.renderGL();
	}
}

Tempo.prototype.setXVar = function(columnIndex, xVar)
{
	var column = this.columns[columnIndex].column;
	var views = column.getViews();
	for (var i=0; i<views.length; i++) {
		views[i].setXVar(xVar, true)
	}

	// re-render
	this.renderGL();
}


Tempo.prototype.setYVar = function(rowIndex, yVar)
{
	for (var i=0; i<this.columns.length; i++) {
		var column = this.columns[i].column;
		var view = column.getViews()[rowIndex];
		view.setYVar(yVar, true);
	}
	INTERESTING_VARS[rowIndex] = yVar;

	// re-render
	this.renderGL();
}


Tempo.prototype.resizeWindow = function()
{
	/*
	var svgSize = this.getSVGSize();
	var w = svgSize.w;
	var h = svgSize.h;

	this.timelineW = Math.min(TIMELINE_MAX_W, w - 2*TIMELINE_X);

	this.timeline.attr("x2", this.timelineW);
	this.timelineCircles[1].attr("cx", this.timelineW+TIMELINE_END_R);
	*/
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

Tempo.prototype.realignColumns = function(instigator, scatterHeights)
{
	var xOffset = 0;
	for (var i=0; i<this.columns.length; i++)
	{
		var column = this.columns[i].column;
		if (column != instigator) 
		{
			column.updateScatterSize(null, column.getW(), scatterHeights);
		}
		column.setScreenOffset([COLUMN_X+xOffset, COLUMN_Y]);
		column.getGroup()
			.attr("transform", "translate(" + xOffset + "," + 0 + ")");
		xOffset += column.getW() + COLUMN_SPACING;
	
		// realign ribbon
		connectSliderToColumn(this.columns[i].ribbon, this.columns[i].slider, column)
	}

	this.renderGL();
	
}

Tempo.prototype.setScatterFilter = function(filter)
{
	this.scatterFilter = filter;
	this.renderGL();
}

Tempo.prototype.startBrush = function(instigator)
{
	for (var i=0, N=this.columns.length; i<N; i++) 
	{
		var column = this.columns[i].column;
		var views = column.getViews();
		for (var j=0, M=views.length; j<M; j++) 
		{
			if (views[j] != instigator) 
			{
				views[j].clearBrush();
			}
		}
	}
}
Tempo.prototype.renderGL = function()
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
	// set blending, clear color, and disable depth test
	gl.clearColor(0.0, 0.0, 0.0, 0.0);
	gl.disable(gl.DEPTH_TEST);

	// viewport
	gl.viewport(0, 0, canvasSize.w, canvasSize.h);

	// line size
	gl.lineWidth(LINE_WIDTH);

	// initialize shader
	if (!this.pointsShader) 
	{
		this.pointsShader = new Shader(gl,
			getShader(gl, 'shader-vs-points'),
			getShader(gl, 'shader-fs-points'), 
			['aVertexPosition', 'aVertexFilter'],
			[	'pointOpacity', 'pointSize',
				'uPMatrix', 'uMVMatrix', 'rangeMin', 'rangeLen', 'domainMin', 'domainLen',
				'filter', 'filterMin', 'filterMax'
			]
		);
	}

	if (!this.linesShader) 
	{
		this.linesShader = new Shader(gl,
			getShader(gl, 'shader-vs-lines'),
			getShader(gl, 'shader-fs-lines'), 
			['aVertexPosition', 'aVertexColor', 'aVertexFilter'],
			[
				'singleColor', 'uPMatrix', 'uMVMatrix', 'rangeMin', 'rangeLen', 'domainMin', 'domainLen',
				'filter', 'filterMin', 'filterMax'
			]
		);
	}


	// clear
	gl.clear(gl.COLOR_BUFFER_BIT);

	// use the shader
	var ls = this.linesShader;
	var ps = this.pointsShader;

	ls.useShaderNoBind();
	gl.uniformMatrix4fv(ls.uniform('uPMatrix'), false, new Float32Array(projectionMatrix.flatten()));
	gl.uniformMatrix4fv(ls.uniform('uMVMatrix'), false, new Float32Array(mvMatrix.flatten()));

	ps.useShaderNoBind();
	gl.uniformMatrix4fv(ps.uniform('uPMatrix'), false, new Float32Array(projectionMatrix.flatten()));
	gl.uniformMatrix4fv(ps.uniform('uMVMatrix'), false, new Float32Array(mvMatrix.flatten()));

	// update uniforms (projection and modelview matrices)

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

			// set time range for this view
			view.setTimeRange( timeRange );

			rangeLen[1] = view.getScatterH() - SCATTER_PAD*2

			var xDomain = view.getXDomain();
			var yDomain = view.getYDomain();

			var domainMin = [xDomain[0], yDomain[0]];
			var domainLen = [
				xDomain[1] - xDomain[0], 
				yDomain[1] - yDomain[0]
			];

			// render
			var glData = getPairedTimeseries(view.getXVar(), view.getYVar());
			var filterBuffer = null;

			// see if we have a filter set
			if (this.scatterFilter)
			{
				var xFilterVar = this.scatterFilter.xFilterVar;
				var yFilterVar = this.scatterFilter.yFilterVar;

				// see if we have a cached filter for this paired series and filter pair
				if (!glData.filters) glData.filters = d3.map();
				var filterKey = xFilterVar + "_$$_" + yFilterVar;
				filterBuffer = glData.filters.get(filterKey);

				if (!filterBuffer) 
				{
					// construct a filter for this pair
					filterBuffer = getPairedFilter(view.getXVar(), view.getYVar(), xFilterVar, yFilterVar);

					// store it
					glData.filters.set(filterKey, filterBuffer);
				}
			}


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
					// update the uniform
					if (SHOW_SCATTER_POINTS)
					{
						//gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
						gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

						gl.enable(gl.BLEND);

						ps.useShader();
						gl.uniform2fv(ps.uniform('rangeMin'), new Float32Array(rangeMin));
						gl.uniform2fv(ps.uniform('rangeLen'), new Float32Array(rangeLen));
						gl.uniform2fv(ps.uniform('domainMin'), new Float32Array(domainMin));
						gl.uniform2fv(ps.uniform('domainLen'), new Float32Array(domainLen));
						gl.uniform1f(ps.uniform('pointSize'), POINT_SIZE);
						gl.uniform1f(ps.uniform('pointOpacity'), POINT_OPACITY);
						
						// only apply point filter (i.e., brushing) if we're not showing lines
						// otherwise the color of the brushed points intefers with line perception
						var pointFilter = SHOW_SCATTER_LINES ? false : this.scatterFilter ? true : false;
						gl.uniform1i(ps.uniform('filter'), pointFilter ? 1 : 0);
						
						if (this.scatterFilter) 
						{
							var xFilterRange = this.scatterFilter.xFilterRange;
							var yFilterRange = this.scatterFilter.yFilterRange;
							var filterMin = [xFilterRange[0], yFilterRange[0]];
							var filterMax = [xFilterRange[1], yFilterRange[1]];

							gl.uniform2fv(ps.uniform('filterMin'), new Float32Array(filterMin));
							gl.uniform2fv(ps.uniform('filterMax'), new Float32Array(filterMax));
						}
						
						ps.attrib2buffer('aVertexPosition', glData.vertexBuffer, 2);
						ps.attrib2buffer('aVertexFilter', filterBuffer !== null ? filterBuffer : glData.vertexBuffer, 2);

						gl.drawArrays(gl.POINTS, i0, drawLen);

						ps.unuseShader();
						gl.disable(gl.BLEND);
					}
				
					if (SHOW_SCATTER_LINES)
					{
						gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
						//gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
						gl.enable(gl.BLEND);

						// update the uniform
						ls.useShader();
						gl.uniform1i(ls.uniform('filter'), this.scatterFilter ? 1 : 0);
						
						if (this.scatterFilter) 
						{
							var xFilterRange = this.scatterFilter.xFilterRange;
							var yFilterRange = this.scatterFilter.yFilterRange;
							var filterMin = [xFilterRange[0], yFilterRange[0]];
							var filterMax = [xFilterRange[1], yFilterRange[1]];

							gl.uniform2fv(ls.uniform('filterMin'), new Float32Array(filterMin));
							gl.uniform2fv(ls.uniform('filterMax'), new Float32Array(filterMax));
						}

						gl.uniform2fv(ls.uniform('rangeMin'), new Float32Array(rangeMin));
						gl.uniform2fv(ls.uniform('rangeLen'), new Float32Array(rangeLen));
						gl.uniform2fv(ls.uniform('domainMin'), new Float32Array(domainMin));
						gl.uniform2fv(ls.uniform('domainLen'), new Float32Array(domainLen));
						
						ls.attrib2buffer('aVertexPosition', glData.vertexBuffer, 2);
						ls.attrib2buffer('aVertexColor', glData.colorBuffer, 4);
						ls.attrib2buffer('aVertexFilter', filterBuffer !== null ? filterBuffer : glData.vertexBuffer, 2);
						

						/*
						gl.uniform1i(ls.uniform('filter'), this.scatterFilter ? 1 : 0);
						if (this.scatterFilter) {
							gl.uniform2fv(ls.uniform('xFilterRange'), new Float32Array(this.scatterFilter.xFilterRange));
							gl.uniform2fv(ls.uniform('yFilterRange'), new Float32Array(this.scatterFilter.yFilterRange));
						}
						*/
						
						gl.uniform1i(ls.uniform('singleColor'), 1);
						gl.drawArrays(gl.LINE_STRIP, i0, drawLen);

						gl.uniform1i(ls.uniform('singleColor'), 0);
						gl.drawArrays(gl.LINE_STRIP, i0, drawLen);

						ls.unuseShader();
						gl.disable(gl.BLEND);
					}
				}
			}

			// offset Y to the next scatter plot
			rangeMin[1] += view.getCurrentH() + SCATTER_SPACING;
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
