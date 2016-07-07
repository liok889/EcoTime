/* =============================================
 * Tempo: connected scatterplot view
 * (C) Khairi Reda
 * =============================================
 */

// default dimensions of the scatterplot view
var DEF_SCATTER_W = 180;
var DEF_SCATTER_H = 115;

// size of inline buttons
var BUTTON_SIZE = 10;

// padding inside the scatterplot view
var SCATTER_PAD = 12;
var LINECHART_PAD_W = 4;
var LINECHART_PAD_H = 2;
// size of the text
var VAR_TEXT_SIZE = 9;

// dimensions of variable selection popup list
var VAR_SELECTION_POPUP_W = 200;
var VAR_SELECTION_POPUP_H = 350;

// default linechart
var DEF_LINECHART_VISIBILITY = false;
var DEF_LINECHART_H = 30;
var EXPAND_DURATION = 150;

// line chart modes (superimposed of separate)
var LINECHART_MODE_ONE = 1;
var LINECHART_MODE_TWO = 2;
var DEF_LINECHART_MODE = LINECHART_MODE_ONE;

// counter of views
var SCATTER_ID = 0;
var COLLAPSED_HEIGHT = 10;

function ScatterView(parentColumn, group, xVar, yVar, width, height, linechartH, linechartVisibility)
{
	this.scatterID = SCATTER_ID++;	// internal ID to uniquely identify defs
	this.column = parentColumn
	this.group = group;
	this.xVar = xVar;
	this.yVar = yVar;

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
		// create brush
		scatterview.brushGroup = scatterview.group.append("g")
			.attr("transform", 'translate(' + SCATTER_PAD + ',' + SCATTER_PAD + ')');

		scatterview.xB = d3.scale.identity().domain([0, scatterview.w - SCATTER_PAD*2]);
		scatterview.yB = d3.scale.identity().domain([0, scatterview.h - SCATTER_PAD*2]);
		scatterview.brush = d3.svg.brush()
			.x(scatterview.xB).y(scatterview.yB)
			.on("brushstart", function() 
			{
				tempo.startBrush(scatterview);
				
				// clear my linebrush
				scatterview.linechartGroup.select("g.brush").call(scatterview.linechartBrush.clear());
			})
			.on("brush", function() 
			{
				scatterview.doScatterBrush();
			})
			.on("brushend", function() {
			});
		scatterview.brushGroup.append('g')
			.attr('class', 'brush')
			.call(scatterview.brush);

		// create variable text
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


	this.linechartW = DEF_SCATTER_W;
	this.linechartH = linechartH || DEF_LINECHART_H;
	this.linechartMode = DEF_LINECHART_MODE;

	// create a clipping rectangle for linechart view
	var defs = d3.select(getSVG(this.group.node())).select("defs");
	this.clipPathID = "linechartClip" + this.scatterID;
	this.clipPath = defs.append("clipPath")
		.attr("id", this.clipPathID);
	this.clipRect = this.clipPath.append("rect")
		.attr("width", this.w - LINECHART_PAD_W*2)
		.attr("height", this.linechartH - LINECHART_PAD_H*2);

	// create a group to show a linechart view of the time series
	this.linechartVisibility = linechartVisibility !== undefined ? linechartVisibility : DEF_LINECHART_VISIBILITY;
	this.linechartGroup = this.group.append("g")
		.style("visibility", this.linechartVisibility ? "visible" : "hidden")
		.attr("transform", "translate(0," + this.h + ")");

	this.linechartContent = this.linechartGroup.append("g")
		.style("visibility", this.linechartVisibility ? "visible" : "hidden")
		.attr('clip-path', 'url(#' + this.clipPathID + ')');

	// border rectangle for linechart view
	this.linechartRect = this.linechartGroup.append("rect")
		.attr("class", "scatterBorderRect")
		.attr("width", this.linechartW)
		.attr("height", this.linechartVisibility ? linechartH : 0);

	// line chart brush
	(function(scatterview) {
		scatterview.linechartBrush = d3.svg.brush()
			.x(d3.scale.identity().domain([0, scatterview.w-LINECHART_PAD_W*2]))
			.on("brushstart", function() {
				tempo.startBrush(scatterview);

				// clear my scatter brush
				scatterview.brushGroup.select('.brush').call(scatterview.brush.clear());
			})
			.on("brush", function() {
				scatterview.doLinechartBrush();
			});
	})(this)

	this.linechartGroup.append("g")
		.attr('transform', 'translate(' + LINECHART_PAD_W + ',' + LINECHART_PAD_H + ')')
		.append('g')
			.attr('class', 'brush')
			.call(this.linechartBrush)
			.selectAll('rect')
				.attr('y', -LINECHART_PAD_H).attr('height', this.linechartH);

	// data group
	var linechartData = this.linechartContent.append("g")
		.attr("class", "linechartData");
	
	// group for X and Y timeseries
	linechartData.append("g").attr("class", "xLinechart");
	linechartData.append("g").attr("class", "yLinechart");


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
	this.resizeLinechart.visible(this.linechartVisibility);

	this.expandButton = new InlineButton(
		this.group,
		1, this.h - BUTTON_SIZE-1,
		BUTTON_SIZE, BUTTON_SIZE,
		'assets/expand.png'
	);

	this.linechartModeButton = new InlineButton(
		this.group,
		1 + BUTTON_SIZE, this.h - BUTTON_SIZE-1,
		BUTTON_SIZE, BUTTON_SIZE,
		'assets/linechart.png'
	);

	this.collapseButton = new InlineButton(
		this.group,
		1, 1, BUTTON_SIZE, BUTTON_SIZE, 'assets/show-less-fold-button.png'
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
			var newLH = Math.max(scatterview.linechartH + dMouse[1],Math.max(10,2*LINECHART_PAD_H));
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

		scatterview.linechartModeButton.on("click", function() {
			var mode = scatterview.setLinechartMode(null, true)
			if (shiftKey) {
				tempo.setLinechartMode(mode);
			}
		})

		scatterview.collapseButton.on('click', function() 
		{
			if (scatterview.linechartVisibility) {
				scatterview.column.initiateToggleLinechartView(scatterview, function() {
					tempo.toggleCollapseExpand(scatterview.matrixIndex[1]);
				});
			}
			else
			{
				tempo.toggleCollapseExpand(scatterview.matrixIndex[1]);
			}
		});

	})(this);
}

ScatterView.prototype.collapse_expand = function(startCallback, endCallback, duration)
{
	var newHeight;
	if (this.collapsed) {
		newHeight = this.oldHeight;
		this.collapsed = false;
	}
	else
	{
		this.oldHeight = this.h;
		newHeight = COLLAPSED_HEIGHT;
		this.collapsed = true;
		this.yVarText.style('visibility', 'hidden');
		this.resizeScatter.visible(false);
		this.resizeLinechart.visible(false);
		this.linechartModeButton.visible(false);
	}

	// new height
	this.h = newHeight;

	(function(scatterview, start, end) 
	{
		scatterview.bgRect.transition()
			.duration(duration !== undefined ? duration : EXPAND_DURATION)
			.attr("height", scatterview.h)
			.each("start", function() {
				if (start) {
					start();
				}
			})
			.each("end", function() {
				if (end) {
					end();
				}
				scatterview.updateSize(scatterview.w);
				if (!scatterview.collapsed) 
				{
					scatterview.yVarText.style('visibility', 'visible');
					scatterview.resizeScatter.visible(true);
					scatterview.resizeLinechart.visible(true);
					scatterview.linechartModeButton.visible(true);
				}
			});
	})(this, startCallback, endCallback);
}
ScatterView.prototype.doLinechartBrush = function()
{
	var brush = this.linechartBrush;
	var e = brush.extent();

	if (e[0] == e[1] || brush.empty())
	{
		// brush is pretty much empty
		tempo.setTimeFilter();
	}
	else {
		
		var tInverseScale = d3.scale.linear()
			.domain([0, this.w - LINECHART_PAD_W*2])
			.range(this.timeRange);

		var w0 = Math.floor(tInverseScale(e[0]) + 0.5);
		var w1 = Math.min(Math.floor(tInverseScale(e[1]) + 0.5), theData.getTimeLength()-1);


		var timeFilter = {
			timeWindow: [w0, w1],
		};
		tempo.setTimeFilter(timeFilter);
	}
}

ScatterView.prototype.doScatterBrush = function()
{
	var e = this.brush.extent();

	if (e[0][0] == e[1][0] || e[0][1] == e[1][1] || this.brush.empty())
	{
		// brush is pretty much empty
		tempo.setScatterFilter();
	}
	else {
		var xInverseScale = d3.scale.linear()
			.domain([0, this.w - SCATTER_PAD*2])
			.range(this.getXDomain());
					
		var yDomain = this.getYDomain();
		var yInverseScale = d3.scale.linear()
			.domain([0, this.h - SCATTER_PAD*2])
			.range([yDomain[1], yDomain[0]]);

		var 
			x0 = xInverseScale(e[0][0]), 
			x1 = xInverseScale(e[1][0]), 
			y0 = yInverseScale(e[0][1]), 
			y1 = yInverseScale(e[1][1]);

		var scatterFilter = {
			xFilterVar: this.xVar,
			yFilterVar: this.yVar,
						
			// ranges
			xFilterRange: [
				Math.min( x0, x1 ),
				Math.max( x0, x1 )
			],
			
			yFilterRange: [
				Math.min( y0, y1 ),
				Math.max( y0, y1 )
			]
		};
		tempo.setScatterFilter(scatterFilter);
	}
}

ScatterView.prototype.clearBrushes = function()
{
	this.brushGroup.select('.brush').call(this.brush.clear());
	this.linechartGroup.select('.brush').call(this.linechartBrush.clear());
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

ScatterView.prototype.isLinechartVisible = function()
{
	return this.linechartContent.style("visibility") == "visible";
}
ScatterView.prototype.setLinechartMode = function(mode, toggle)
{
	if (mode !== undefined && mode !== null) {
		this.linechartMode = mode;
	}
	else if (toggle !== undefined && toggle !== null) {
		if (this.linechartMode == LINECHART_MODE_ONE) {
			this.linechartMode = LINECHART_MODE_TWO;
		}
		else {
			this.linechartMode = LINECHART_MODE_ONE;
		}
	}
	if (this.linechartVisibility) {
		this.updateLinechartTransform(true);
	}
	return this.linechartMode;
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
					scatterview.resizeLinechart.visible(true);

					scatterview.linechartContent
						.style("visibility", "visible");
					if (end) {
						end();
					}
				});
		}
		else
		{
			if (!scatterview.linechartBrush.empty()) {
				// clear the brush
				scatterview.linechartGroup.select("g.brush")
					.call(scatterview.linechartBrush.clear());
				tempo.setTimeFilter();

			}
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
					scatterview.resizeLinechart.visible(false);
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
	var oldW = this.w, oldH = this.h, oldLinechartH = this.linechartH;

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
	this.resizeLinechart
		.attr("x", this.w-BUTTON_SIZE-1)
		.attr("y", this.h-BUTTON_SIZE-1+this.linechartH);

	this.expandButton.attr("y", this.h - BUTTON_SIZE-1);
	this.linechartModeButton.attr("y", this.h - BUTTON_SIZE-1);

	// linechart group
	this.linechartGroup
		.attr("transform", "translate(0," + this.h + ")");
	
	this.linechartRect
		.attr("width", this.w);
	if (this.linechartVisibility) {
		this.linechartRect.attr("height", this.linechartH);
	}
	this.clipRect
		.attr("width", this.w - LINECHART_PAD_W*2)
		.attr("height", this.linechartH - LINECHART_PAD_H*2)
		.attr("x", LINECHART_PAD_W).attr("y", LINECHART_PAD_H);

	// update line chart
	this.updateLinechart();

	// brush parameters
	this.xB.domain([0, this.w - SCATTER_PAD*2]);
	this.yB.domain([0, this.h - SCATTER_PAD*2]);
	this.brush.x(this.xB).y(this.yB);

	if (!this.brush.empty()) 
	{
		// adapt brush extents
		var e = this.brush.extent();
		var xInverseScale = d3.scale.linear()
			.domain([0, oldW - SCATTER_PAD*2])
			.range(this.getXDomain());
					
		var yDomain = this.getYDomain();
		var yInverseScale = d3.scale.linear()
			.domain([0, oldH - SCATTER_PAD*2])
			.range([yDomain[1], yDomain[0]]);

		var xNewScale = d3.scale.linear()
			.domain(this.getXDomain())
			.range([0, this.w - SCATTER_PAD*2]);
		var yNewScale = d3.scale.linear()
			.domain(this.getYDomain())
			.range([this.h - SCATTER_PAD*2, 0]);
		var 
			x0 = xNewScale(xInverseScale(e[0][0])), 
			x1 = xNewScale(xInverseScale(e[1][0])), 
			y0 = yNewScale(yInverseScale(e[0][1])), 
			y1 = yNewScale(yInverseScale(e[1][1]));
			
		this.brush.extent([[x0, y0], [x1, y1]]);

	}

	this.linechartBrush
		.x(d3.scale.identity().domain([0, this.w-LINECHART_PAD_W*2]));
	
	if (!this.linechartBrush.empty())
	{
		// adapt brush extents to new dimensions
		var xInverseScale = d3.scale.linear()
			.domain([0, oldW - LINECHART_PAD_W*2])
			.range(this.timeRange);
					
		var xNewScale = d3.scale.linear()
			.domain([this.timeRange[0], this.timeRange[1]])
			.range([0, this.w - LINECHART_PAD_W*2]);

		var e = this.linechartBrush.extent();
		var 
			x0 = xNewScale(xInverseScale(e[0])), 
			x1 = xNewScale(xInverseScale(e[1]));
	
		this.linechartBrush.extent([x0, x1]);
	}

	// update the brushes
	this.linechartGroup.select("g.brush")
		.call(this.linechartBrush)
		.selectAll('rect')
			.attr('y', -LINECHART_PAD_H).attr('height', this.linechartH);

	this.brushGroup.select(".brush").call(this.brush);
}


ScatterView.prototype.setXVar = function(xVar, dontRender)
{
	this.xVar = xVar;
	this.xVarText.html(xVar);
	this.xSeries = theData.generateOneSeries(xVar);
	this.updateLinechart(true);
	
	if (!this.brush.empty()) {
		this.doScatterBrush();	// <-- tempo.renderGL() happens here
	}
	else {
		tempo.renderGL();
	}
}
ScatterView.prototype.setYVar = function(yVar, dontRender)
{
	this.yVar = yVar;
	this.yVarText.html(yVar);
	this.ySeries = theData.generateOneSeries(yVar);
	this.updateLinechart(true);
	
	if (!this.brush.empty()) {
		this.doScatterBrush();	// <-- tempo.renderGL() happens here
	}
	else {
		tempo.renderGL();
	}
}

ScatterView.prototype.setBrushedTimePoints = function(list)
{
	this.brushedTimePoints = list;
}
ScatterView.prototype.getBrushedTimePoints = function() {
	return this.brushedTimePoints;
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
	return +(this.bgRect.attr('height')) + linechartH;
}

ScatterView.prototype.isCollapsed = function()
{
	return this.collapsed == true;
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
ScatterView.prototype.getCurrentScatterH = function()
{
	return +(this.bgRect.attr('height'));
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

ScatterView.prototype.updateLinechart = function(forceUpdate)
{
	if (!this.linechartVisibility)
	{
		return;
	}
	
	if (forceUpdate || !this.linechartTimeRange || this.linechartTimeRange[0] != this.timeRange[0] || this.linechartTimeRange[1] != this.timeRange[1])
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
		if (!this.linechartBrush.empty()) {
			this.doLinechartBrush();
		}
	}

	// update the transform
	/*
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
	*/
	this.updateLinechartTransform();

}

ScatterView.prototype.updateLinechartTransform = function(transition)
{
	var transform1, transform2;

	if (this.linechartMode == LINECHART_MODE_ONE)
	{
		var xScaleFactor = (this.w - LINECHART_PAD_W*2) / (this.timeRange[1]-this.timeRange[0]);
		var xTranslate = -this.timeRange[0];

		var yScaleFactor = this.linechartH - LINECHART_PAD_H*2
		var yTranslate = 0;

		var transform = 	
			'translate(' + LINECHART_PAD_W + ',' + LINECHART_PAD_H + ') ' +
			'scale(' + xScaleFactor + ',' + yScaleFactor + ') '	+
			'translate(' + xTranslate + ',' + yTranslate + ')';
		
		transform1 = transform;
		transform2 = transform;
	}
	else
	{
		var xScaleFactor = (this.w - LINECHART_PAD_W*2) / (this.timeRange[1]-this.timeRange[0]);
		var xTranslate = -this.timeRange[0];

		var yScaleFactor = (this.linechartH - LINECHART_PAD_H*2)/2 - 1
		var yTranslate = 0;

		transform1 = 	
			'translate(' + LINECHART_PAD_W + ',' + LINECHART_PAD_H + ') ' +
			'scale(' + xScaleFactor + ',' + yScaleFactor + ') '	+
			'translate(' + xTranslate + ',' + yTranslate + ')';

		transform2 =
			'translate(' + LINECHART_PAD_W + ',' + (LINECHART_PAD_H + yScaleFactor + 1) + ') ' +
			'scale(' + xScaleFactor + ',' + yScaleFactor + ') '	+
			'translate(' + xTranslate + ',' + yTranslate + ')';
	}
	
	var xLinechart = this.linechartContent.select("g.xLinechart");
	if (transition) {
		xLinechart = xLinechart.transition();
	}
	xLinechart.attr("transform", transform1);
	

	var yLinechart = this.linechartContent.select("g.yLinechart");
	if (transition) {
		yLinechart = yLinechart.transition();
	}		
	yLinechart.attr("transform", transform2);
}


// GL render
// ==============
// cache to store vertex buffers of the differnet time series combination
var glCache = d3.map();

// function to construct paired time series and put them in buffers
function getPairedTimeseries(xVar, yVar, xFilter, yFilter)
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

			var N = theData.getTimeLength();

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
					vertices.push(  v1  );
					vertices.push(  v2  );
					vertices.push(  i   );

					s1[i] = v1;
					s2[i] = v2;		
				
					// determine color based on the time of the day
					var timestep = new Date(beginTime + i*timestepOffset);
					var dayOffset = timestep.getHours() * 60*60*1000 + timestep.getMinutes() * 60*1000;
					var dayOffsetN = dayOffset / (24*60*60*1000-1);

					// add the day offset
					var colorIndex = colorScale(dayOffsetN);
					vertices.push( colorIndex );
					
					// map to color
					/*
					var color = COLOR_SCALE[ colorIndex ];
					colors.push( color[0]/255 );
					colors.push( color[1]/255 );
					colors.push( color[2]/255 );
					colors.push(      1.0     );
					*/
					
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

			/*
			var colorBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
			*/

			// normalize the timeseries
			ts1.normalize();
			ts2.normalize();

			glData = {
				vertexBuffer: vertexBuffer,
				//colorBuffer: colorBuffer,
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

function getPairedFilter(xVar, yVar, xFilterVar, yFilterVar)
{
	// create arrays for vertices and colors
	var xSeries = theData.generateOneSeries(xVar).getSeries();
	var ySeries = theData.generateOneSeries(yVar).getSeries();

	var xFilter = theData.generateOneSeries(xFilterVar).getSeries();
	var yFilter = theData.generateOneSeries(yFilterVar).getSeries();

	var filterVertices = [];

	for (var i=0, N=theData.getTimeLength(); i<N; i++) 
	{
		var v1 = xSeries[i]; var b1 = v1 !== null && v1 !== undefined;
		var v2 = ySeries[i]; var b2 = v2 !== null && v2 !== undefined;	
		var f1 = xFilter[i], f2 = yFilter[i];

		if (b1 && b2)  
		{
			if (f1 === null || f1 === undefined) { f1 = 9999.0; }
			if (f2 === null || f2 === undefined) { f2 = 9999.0; }

			filterVertices.push( f1 );
			filterVertices.push( f2 );
		}
	}

	// create 2 buffers (vertices and colors) and upload
	var filterBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, filterBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(filterVertices), gl.STATIC_DRAW);

	return filterBuffer;
}

var MAX_CHUNK_LEN = 200;

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

			if (MAX_CHUNK_LEN && chunk.length > MAX_CHUNK_LEN) {
				cIndex = chunks.length;
				chunks.push(chunk);
				chunk = [{x: i, y: 1.0 - v}];
			}
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


