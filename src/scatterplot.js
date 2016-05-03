
var SCATTER_PAD_W = 20;
var SCATTER_PAD_H = 20;
var SCATTER_W = 150;
var SCATTER_H = 150;
var SCATTER_X_OFFSET = 0;

var SELECTION_LIST_W = 200;
var SELECTION_LIST_H = 350;

// scatterplot circle radius
var SCATTER_CIRCLE_RADIUS = 3;

// controls visibility of points / connection lines
var POINT_VISIBILITY = true;
var CONNECTED_VISIBILITY = false;

// map for all scatterplots
var SCATTER_COUNTER = 0;
var scatterMap = d3.map();

function Scatterplot(group, width, height, ySeries, xSeries, timeRange)
{
	this.group = group;
	this.w = width;
	this.h = height;

	this.xSeries = xSeries;		// goes to Y axis
	this.ySeries = ySeries;		// goes to X axis

	this.globalScale = false;
	this.timeRange = timeRange || [0, ySeries.size()-1];
	
	// draw and update
	this.draw();
	this.update();

	// add to map of scatterplots
	scatterMap.set(SCATTER_COUNTER++, this);
}

Scatterplot.prototype.draw = function()
{
	if (!this.pointGroup) 
	{
		// background rectangle
		this.rect = this.group.append("rect")
			.attr("width", this.w)
			.attr("height", this.h)
			.style("stroke", "#777777")
			.style("fill", "white")
			.style("shape-rendering", "crispEdges");

		// group for scatterplot
		this.pointGroup = this.group.append("g")
			.attr("transform", "translate(" + SCATTER_PAD_W + "," + SCATTER_PAD_H + ")")
			.attr("visibility", POINT_VISIBILITY ? "visible" : "hidden");
		
		// group for lines
		this.lineGroup = this.group.append("g")
			.attr("transform", "translate(" + SCATTER_PAD_W + "," + SCATTER_PAD_H + ")")
			.attr("visibility", CONNECTED_VISIBILITY ? "visible" : "hidden");
	
		this.textGroup = this.group.append("g");
	}
}

Scatterplot.prototype.toggleElementVisibility = function()
{
	this.pointGroup.attr("visibility", POINT_VISIBILITY ? "visible" : "hidden");
	this.lineGroup.attr("visibility", CONNECTED_VISIBILITY ? "visible" : "hidden");	
}

Scatterplot.prototype.setXSeries = function(xSeries, varName)
{
	this.xSeries = xSeries;
	this.update();
	if (varName) {
		this.setVarName(varName);
	}
}

Scatterplot.prototype.setYSeries = function(ySeries, varName)
{
	this.ySeries = ySeries;
	this.update();
	if (varName) {
		this.setVarName(undefined, varName);
	}
}

Scatterplot.prototype.setTimeRange = function(range)
{
	this.timeRange = range;
	this.update();
}

Scatterplot.prototype.getLocalYDomain = function()
{
	return this.localScale2.domain();
}

Scatterplot.prototype.update = function()
{
	var scatter = [];

	var localX = [Number.MAX_VALUE, -Number.MAX_VALUE];
	var localY = [Number.MAX_VALUE, -Number.MAX_VALUE];
	var xSeries = this.xSeries.getSeries();
	var ySeries = this.ySeries.getSeries();

	// construct the scatterplot
	for (var i=this.timeRange[0], N=this.timeRange[1]; i<=N; i++) 
	{
		var v1 = xSeries[i]; var b1 = v1 !== null && v1 !== undefined;
		var v2 = ySeries[i]; var b2 = v2 !== null && v2 !== undefined;
		
		if (b1 && b2)  {
			localX[0] = Math.min(v1, localX[0]); localX[1] = Math.max(v1, localX[1]);
			localY[0] = Math.min(v2, localY[0]); localY[1] = Math.max(v2, localY[1]);
			scatter.push({x: v1, y: v2});
		}
	}

	// update local scales
	this.localScale1 = d3.scale.linear().domain(localX).range([0, this.w-SCATTER_PAD_W*2]);
	this.localScale2 = d3.scale.linear().domain(localY).range([this.h-SCATTER_PAD_H*2, 0]);

	// update the points and graphics graphics
	this.scatterPoints = scatter;
	this.updateGraphics();
}

Scatterplot.prototype.updateGraphics = function()
{
	if (this.pointGroup) 
	{
		// select scales (global or local)
		var xScale = this.globalScale ? this.globalScale1 || this.localScale1 : this.localScale1;
		var yScale = this.globalScale ? this.globalScale2 || this.localScale2 : this.localScale2;

		// create connected scatterplot
		var pathGenerator = (function() {
			return d3.svg.line().interpolate('linear')
				.x(function(d) { return xScale(d.x); })
				.y(function(d) { return yScale(d.y); });
		})(xScale, yScale);

		var connectedScatter = this.lineGroup.select("path.connectedScatter");
		if (connectedScatter.size() == 0) {
			connectedScatter = this.lineGroup.append("path")
				.attr("class", "connectedScatter");
		}
		connectedScatter.attr("d", pathGenerator(this.scatterPoints));

		// create points
		(function(thisPlot, xScale, yScale, pathGenerator) 
		{
			var update = thisPlot.pointGroup.selectAll("circle.scatterplotCircle").data(thisPlot.scatterPoints);
			update.enter().append("circle")
				.attr("class", "scatterplotCircle")
				.attr("cx", 0).attr("cy", 0)
				.attr("r", SCATTER_CIRCLE_RADIUS + "px");

			update
				//.attr("r", SCATTER_CIRCLE_RADIUS + "px")
				.attr("cx", function(d) { return xScale(d.x); })
				.attr("cy", function(d) { return yScale(d.y); });

			update.exit().remove();
		})(this, xScale, yScale, pathGenerator);
	}
}

Scatterplot.prototype.enableGlobalScale = function(enabled)
{
	if (this.globalScale != enabled) {
		this.globalScale = enabled;
		this.updateGraphics();
	}
}

Scatterplot.prototype.setGlobalRange = function(scale1, scale2)
{
	this.globalScale1 = scale1 ? d3.scale.linear().domain(scale1).range([0, this.w-SCATTER_PAD_W*2]) : undefined;
	this.globalScale2 = scale2 ? d3.scale.linear().domain(scale2).range([this.h-SCATTER_PAD_H*2, 0]) : undefined;

	// update graphics rendering
	if (this.globalScale) {
		this.updateGraphics();
	}
}

// make labels for the X and Y axes
Scatterplot.prototype.setVarName = function(xName, yName)
{
	if (xName !== null && xName !== undefined)
	{
		// make a variable name
		var xSelection = this.textGroup.select("text.xVarName");
		if (xSelection.size() == 0) {
			xSelection = this.textGroup.append("text")
				.attr("class", "xVarName")
		}

	
		(function(xSelection, xName, thisScatterplot) {
			xSelection
				.attr("x", thisScatterplot.w/2).attr("y", 12).attr("text-anchor", "middle")
				.html(xName)
				.on('click', function() {

				 	// open up a selection menu with list of variable to choose from
				 	var mouse = d3.mouse(document.body);
					var selectionDiv = new ListSelection(
						mouse[0], mouse[1], 
						SELECTION_LIST_W, SELECTION_LIST_H, ts.getFields()
					);
					selectionDiv.setCallbacks(
						function(varName) 
						{
							var xSeries = ts.generateOneSeries(varName);
							thisScatterplot.setXSeries(xSeries, varName);
						}
					);
				});
		})(xSelection, xName, this);
	}
}

function toggleScatterElementVisibility()
{
	scatterMap.forEach(function(id, scatterplot) 
	{
		scatterplot.toggleElementVisibility();
	});
}

/* ----------------------------------------------
 * Scatterplot row
 * ==============================================
 */
function ScatterplotRow(group, varName, otherVars, xOffset, yOffset, timeRange)
{
	this.group = group;
	this.scatterplots = [];

	// get the time series
	var ySeries = ts.generateOneSeries(varName);
	var runningOffset = 0;

	for (var i=0; i < otherVars.length; i++) 
	{
		var xSeries = ts.generateOneSeries(otherVars[i]);
		var g = this.group.append("g")
			.attr("transform", "translate(" + (xOffset + i*SCATTER_X_OFFSET + runningOffset) + "," + yOffset + ")");

		// create a new scatterplot view
		var scatterplot = new Scatterplot(g, SCATTER_W, SCATTER_H, ySeries, xSeries, timeRange);
		scatterplot.setVarName(otherVars[i]);
		runningOffset += scatterplot.w;
		this.scatterplots.push(scatterplot);
	}

	this.yAxisGroup = this.group.append("g")
		.attr("class", "axis")
		.attr("transform", "translate(" + (xOffset + this.scatterplots.length*SCATTER_X_OFFSET + runningOffset + 4) + "," + yOffset + ")");

	this.textGroup = this.group.append("g")
		.attr("transform", "translate(" + (xOffset + this.scatterplots.length*SCATTER_X_OFFSET + runningOffset + 4+28) + "," + yOffset + ")");

	// calculate global y range
	this.calcGlobalYScale();

	// add Y variable selection text
	this.yVarNameText = this.textGroup.append("text")
		.attr('class', 'yVarName')
		.attr('x', '0').attr('y', SCATTER_PAD_H + (SCATTER_H-SCATTER_PAD_H*2)/2+7)
		.html(varName);

	(function(thisRow, text) { 
		text.on("click", function() 
		{
		 	var mouse = d3.mouse(document.body);
			var selectionDiv = new ListSelection(
				mouse[0]+10, mouse[1], 
				SELECTION_LIST_W, SELECTION_LIST_H, ts.getFields()
			);
			selectionDiv.setCallbacks(
				function(varName) 
				{
					thisRow.changeYSeries(varName);
				}
			);				
		});
	})(this, this.yVarNameText);

}

ScatterplotRow.prototype.changeYSeries = function(varName)
{
	var ySeries = ts.generateOneSeries(varName);
	for (var i=0, N=this.scatterplots.length; i<N; i++)
	{
		this.scatterplots[i].setYSeries(ySeries);
	}
	this.calcGlobalYScale();
	this.yVarNameText.html(varName);
}

ScatterplotRow.prototype.calcGlobalYScale = function()
{
	// calculate the global range for the Y axis
	var globalYRange = [Number.MAX_VALUE, -Number.MAX_VALUE];
	for (var i=0, N=this.scatterplots.length; i<N; i++) 
	{
		var plot = this.scatterplots[i];
		var localY = plot.getLocalYDomain();
		globalYRange[0] = Math.min(globalYRange[0], localY[0]);
		globalYRange[1] = Math.max(globalYRange[1], localY[1]);
	}

	// set it for all scatterplots
	for (var i=0, N=this.scatterplots.length; i<N; i++) {
		this.scatterplots[i].setGlobalRange(undefined, globalYRange);
	}

	// make a y axis
	var yScale = d3.scale.linear().domain(globalYRange).range([SCATTER_H - SCATTER_PAD_H, SCATTER_PAD_H]);
	var yAxis = d3.svg.axis()
		.scale(yScale)
		.orient('right')
		.ticks(6).tickSize(3);
	this.yAxisGroup.call(yAxis);
}


ScatterplotRow.prototype.setTimeRange = function(timeRange)
{
	for (i=0; i<this.scatterplots.length; i++) 
	{
		this.scatterplots[i].setTimeRange(timeRange);
	}
	this.calcGlobalYScale();
}



