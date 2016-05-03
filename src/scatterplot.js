
var SCATTER_PAD_W = 10;
var SCATTER_PAD_H = 10;

// scatterplot circle radius
var SCATTER_CIRCLE_RADIUS = 6;

function Scatterplot(group, width, height, series1, series2)
{
	this.group = group;
	this.w = width;
	this.h = height;

	this.series1 = series2;		// goes to Y axis
	this.series2 = series1;		// goes to X axis

	this.timeRange = [0, series1.size()-1];
	this.globalScale = false;
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
			.style("fill", "none")
			.style("shape-rendering", "crispEdges");

		// group for scatterplot
		this.pointGroup = this.group.append("g")
			.attr("transform", "translate(" + SCATTER_PAD_W + "," + SCATTER_PAD_H + ")");
		
		// group for lines
		this.lineGroup = this.group.append("g")
			.attr("transform", "translate(" + SCATTER_PAD_W + "," + SCATTER_PAD_H + ")");
	}
}

Scatterplot.prototype.setTimeRange = function(range)
{
	this.timeRange = range;
	this.update();
}

Scatterplot.prototype.update = function()
{
	var scatter = [];

	var localX = [Number.MAX_VALUE, -Number.MAX_VALUE];
	var localY = [Number.MAX_VALUE, -Number.MAX_VALUE];
	var series1 = this.series1.getSeries();
	var series2 = this.series2.getSeries();

	// construct the scatterplot
	for (var i=this.timeRange[0], N=this.timeRange[1]; i<=N; i++) 
	{
		var v1 = series1[i]; var b1 = v1 !== null && v1 !== undefined;
		var v2 = series2[i]; var b2 = v2 !== null && v2 !== undefined;
		
		if (b1 && b2)  {
			localX[0] = Math.min(v1, localX[0]); localX[1] = Math.max(v2, localX[1]);
			localY[0] = Math.min(v2, localY[0]); localY[1] = Math.max(v2, localY[1]);
			scatter.push({x: v1, y: v2});
		}
	}

	// update local scales
	this.localScale1 = d3.scale.linear().domain(localX).range([0, this.w-SCATTER_PAD_W*2]);
	this.localScale2 = d3.scale.linear().domain(localY).range([this.h-SCATTER_PAD_H*2, 0]);

	// update the graphics
	this.updateGraphics();
}

Scatterplot.prototype.updateGraphics = function()
{
	if (this.pointGroup) 
	{
		(function(pointGroup, thisScatterplot, xScale, yScale) 
		{
			var update = this.pointGroup.selectAll("circle").data(scatter)
			update.enter().append("circle")
				.attr("class", "scatterplotCircle")
				.attr("cx", 0).attr("cy", 0)
				.attr("r", SCATTER_CIRCLE_RADIUS +  "px");

			update.transition()
				.attr("cx", function(d) { return xScale(d.x); })
				.attr("cy", function(d) { return yScale(d.y); });

			update.exit().transition()
				.style("fill-opacity", 0.0)
				.style("stroke-opacity", 0.0)
				.remove();

		})(
			this.pointGroup,
			this,
			this.globalScale ? this.globalScale1 : this.localScale1,
			this.globalScale ? this.globalScale2 : this.localScale2
		);
	}

	// TODO: draw lines for connected scatterplots
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
	this.globalScale1 = d3.scale.linear().domain(scale1).range([0, this.w-SCATTER_PAD_W*2]);
	this.globalScale2 = d3.sclae.linear().domain(scale2).range([this.h-SCATTER_PAD_H*2, 0]);

	// update graphics rendering
	if (this.globalScale) {
		this.updateGraphics();
	}
}

/* ----------------------------------------------
 * Scatterplot row
 * ==============================================
 */
function ScatterRow(varName, otherVars)
{

}













