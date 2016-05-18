
// scatterplot dimensions
// ======================

// padding
var SCATTER_PAD_W = 10;
var SCATTER_PAD_H = 10;

// dimensions
var SCATTER_W = 180;
var SCATTER_H = 180;
var SCATTER_X_OFFSET = 0;

// list seleciton
var SELECTION_LIST_W = 200;
var SELECTION_LIST_H = 350;

// scatterplot circle radius
var SCATTER_CIRCLE_RADIUS = 2;

// controls visibility of points / connection lines
var POINT_VISIBILITY = true;
var CONNECTED_VISIBILITY = false;
var ANIMATION_VISIBILITY = false;

// map for all scatterplots
var SCATTER_COUNTER = 0;
var scatterMap = d3.map();

// streamline paramters
var PARTICLE_AGE = 4;			// in seconds
var PARTICLE_SPEED = 2.0;		// in t/second
var PARTICLE_TRAIL = 40;		// length of trail (for each particle)
var PARTICLE_MAX_COUNT = 30;	// max number of particles
var PARTICLE_SPAWN_TIME = 0.08;	// spawn particles every X seconds
var PARTICLE_SPAWN_COUNT = 10;	// max number of particles to spawn
var PARTICLE_MAX_OPACITY = 0.5;
var PARTICLE_TRAIL_WIDTH = 1;

function Scatterplot(group, width, height, ySeries, xSeries, timeRange, xOffset, yOffset)
{
	// add to map of scatterplots
	this.id = SCATTER_COUNTER++;
	scatterMap.set(this.id, this);

	// SVG group and scatterplot dimensions
	this.group = group;
	this.w = width;
	this.h = height;

	// offset
	if (xOffset && yOffset) {
		this.setContentOffset(xOffset, yOffset);
	}

	// set time series
	this.xSeries = xSeries;		// goes to Y axis
	this.ySeries = ySeries;		// goes to X axis

	this.globalScale = false;
	this.timeRange = timeRange || [0, ySeries.size()-1];

	// create groups and the various scatterplot elements
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

	// update & draw static scatterplot elements
	this.update();

	if (canvasDIV)
	{
		var canvasW = this.w, canvasH = this.h;
		if (window.devicePixelRatio) {
			canvasW *= window.devicePixelRatio;
			canvasH *= window.devicePixelRatio;
			this.canvasScale = window.devicePixelRatio;
		}

		// create a canvas
		var contentOffset = this.getContentOffset();
		this.canvas = canvasDIV.append("canvas")
			.attr("class", "scatterCanvas")
			.attr("id", "canvas" + this.id)
			.attr("width", canvasW)
			.attr("height", canvasH)
			.style("width", this.w + "px")
			.style("height", this.h + "px")
			.style("left", contentOffset[0] + "px")
			.style("top", contentOffset[1] + "px");

		// create an array for particles
		this.particles = [];
	}
}

function catmull_rom(p0, p1, p2, p3, t)
{			
	var t2 = Math.pow(t,2);
	var t3 = t*t2;
	var x = 0.5 *(  	
		(2 * p1.x) +
 		(-p0.x + p2.x) * t +
		(2*p0.x - 5*p1.x + 4*p2.x - p3.x) * t2 +
		(-p0.x + 3*p1.x- 3*p2.x + p3.x) * t3
	);
	var y = 0.5 *(  	
		(2 * p1.y) +
 		(-p0.y + p2.y) * t +
		(2*p0.y - 5*p1.y + 4*p2.y - p3.y) * t2 +
		(-p0.y + 3*p1.y- 3*p2.y + p3.y) * t3
	);
	
	return {x: x, y: y};
}

Scatterplot.prototype.moveParticles = function(deltaTime)
{
	var points = this.scatterPoints;
	var particles = this.particles;

	// move particles to the next point
	for (var k=0; k<particles.length; k++) 
	{
		var part = particles[k];
			
		if (part.age >= 0) 
		{
			// age particle
			part.age -= deltaTime;
		}
		
		if (part.age >= 0) 
		{
			// still alive, advance t
			part.t += PARTICLE_SPEED * deltaTime;
			if (part.t > 1.0) {
				part.t = part.t % 1;
				part.i++;
			}
		}
		else
		{
		}

		// advance position
		this.advanceParticlePosition(part);
	}
}

Scatterplot.prototype.animate = function(deltaTime)
{
	// schedule particle spawning
	if (ANIMATION_VISIBILITY)
	{
		if (!this.particleSpawn) {
			this.particleSpawn = randomSpawn();
		}
		else
		{
			this.particleSpawn.time -= deltaTime;
			if (this.particleSpawn.time <= 0) 
			{
				var created = 0;
				for (var i=0, N=this.particleSpawn.count; i<N; i++) 
				{
					if (!this.spawnParticle()) {
						break;
					}
					else {
						created++;
					}
				}
				//console.log("spawned " + created + " particles. total particles: " + this.particles.length);
				this.particleSpawn = randomSpawn();
			}
		}
	}
	else
	{
		this.particleSpawn = undefined;
	}

	// move particles
	this.moveParticles(deltaTime);

	// draw them
	this.drawParticles();

	// return true if has at least one particle
	return this.particles.length > 0 || this.particleSpawn !== undefined;

	function randomSpawn()
	{
		return {
			time: PARTICLE_SPAWN_TIME + (Math.random() > 0.5 ? 1 : -1) * Math.random() * (PARTICLE_SPAWN_TIME/1.5),
			count: Math.floor((1+PARTICLE_SPAWN_COUNT) * Math.random())
		};
	}
}

Scatterplot.prototype.drawParticles = function()
{
	var xScale = this.getXScale();
	var yScale = this.getYScale();
	var particles = this.particles;

	// canvas propeties
	var scale = this.canvasScale;
	var context = this.canvas.node().getContext("2d");
	

	// clear the canvas
	context.clearRect(0, 0, scale*this.w, scale*this.h);

	// set line width / color
	context.lineWidth = PARTICLE_TRAIL_WIDTH * scale;

	for (var k=0; k<particles.length; k++) 
	{
		var part = particles[k];
		var trail = part.trail;
		var p1 = part.position, pp1 = null;
		var gapCount = 0, jump = false;

		if (p1) {
			pp1 = {x: xScale(p1.x)+SCATTER_PAD_W, y: yScale(p1.y)+SCATTER_PAD_H };
		}

		for (var j=0, i=trail.length-1; i>=0; i--, j++) 
		{
			var p2 = trail[i];
			var pp2 = p2 ? { x: xScale(p2.x)+SCATTER_PAD_W, y: yScale(p2.y)+SCATTER_PAD_H } : null
			if (pp1 && pp2) 
			{
				var alpha = (PARTICLE_TRAIL-j) / PARTICLE_TRAIL;
				alpha *= PARTICLE_MAX_OPACITY;
				
				context.strokeStyle = 'rgba(204, 0, 0, ' + alpha + ')';	;
				context.beginPath();
				context.moveTo(scale * pp1.x, scale * pp1.y);
				context.lineTo(scale * pp2.x, scale * pp2.y);
				context.stroke();
			}
			else
			{
				gapCount++;
			}

			pp1 = pp2;
		}

		if (gapCount >= PARTICLE_TRAIL) 
		{
			// kill particle
			particles.splice(k, 1); k--;
		}
	}

	//console.log("drawCount: " + drawCount + ", killCount: " + killCount);
}

Scatterplot.prototype.advanceParticlePosition = function(part)
{
	var oldPosition = part.position;
	if (part.age > 0)
	{
		var points = this.scatterPoints;
		var p0 = part.i > 0 ? points[part.i-1] : null;
		var p1 = part.i >= 0 && part.i < points.length ? points[part.i] : null;
		var p2 = part.i < points.length-1 ? points[part.i+1] : null;
		var p3 = part.i < points.length-2 ? points[part.i+2] : null;

		if (!p1 || !p2) 
		{
			// out of range
			part.position = null;
		}
		else if (p0 && p3) 
		{
			// can do catmull_rom
			part.position = catmull_rom(p0, p1, p2, p3, part.t)
		}
		else
		{
			// linear interpolation between p1 and p2
			part.position = {
				x: part.t * (p2.x-p1.x) + p1.x,
				y: part.t * (p2.y-p1.y) + p1.y
			};
		}
	}
	else
	{
		part.position = null;
	}

	if (oldPosition !== undefined) 
	{
		part.trail.push(oldPosition);
		if (part.trail.length > PARTICLE_TRAIL) {
			part.trail.shift();
		}
	}
}

Scatterplot.prototype.spawnParticle = function()
{
	if (this.particles.length < PARTICLE_MAX_COUNT && this.scatterPoints.length > 1)
	{
		// select random gap (between to points in the scatterplot)
		// to spawn a particle in between
		var i = Math.floor(Math.random() * (this.scatterPoints.length-1));
		i = Math.min(this.scatterPoints.length-2, i);
		
		// add a fractional t
		var t = Math.random() * 0.85 + 0.1;

		// create particle
		var newParticle = {
			age: PARTICLE_AGE + (Math.random() > 0.5 ? 1 : -1) * (Math.random() * PARTICLE_AGE/2),
			i: i,
			t: t,
			timestep: this.scatterPoints[i].timestep,
			trail: [],
		};
		this.advanceParticlePosition(newParticle);

		// add to list of particles
		this.particles.push(newParticle);
		return true;
	}
	else
	{
		return false;
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
	var scatterSequence = [];
	scatterSequence.length = this.timeRange[1]-this.timeRange[0]+1;

	for (var i=this.timeRange[0], N=this.timeRange[1], t=0; i<=N; i++, t++) 
	{
		var v1 = xSeries[i]; var b1 = v1 !== null && v1 !== undefined;
		var v2 = ySeries[i]; var b2 = v2 !== null && v2 !== undefined;
		
		if (b1 && b2)  
		{
			localX[0] = Math.min(v1, localX[0]); localX[1] = Math.max(v1, localX[1]);
			localY[0] = Math.min(v2, localY[0]); localY[1] = Math.max(v2, localY[1]);
			
			var p = {x: v1, y: v2, timestep: i};
			scatter.push(p);
			scatterSequence[t] = p 
		}
		else
		{
			scatterSequence[t] = null;
		}
	}

	// update local scales
	this.localScale1 = d3.scale.linear().domain(localX).range([0, this.w-SCATTER_PAD_W*2]);
	this.localScale2 = d3.scale.linear().domain(localY).range([this.h-SCATTER_PAD_H*2, 0]);

	// store points
	this.scatterPoints = scatter;
	this.scatterSequence = scatterSequence;

	// clear particles
	this.particles = [];

	// update graphics
	this.updateGraphics();
}

Scatterplot.prototype.updateGraphics = function()
{
	if (this.pointGroup) 
	{
		// select scales (global or local)
		var xScale = this.getXScale();
		var yScale = this.getYScale(); 

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

Scatterplot.prototype.getXScale = function()
{
	var xScale = this.globalScale ? this.globalScale1 || this.localScale1 : this.localScale1;
	return xScale;
}

Scatterplot.prototype.getYScale = function()
{
	var yScale = this.globalScale ? this.globalScale2 || this.localScale2 : this.localScale2;
	return yScale;
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

Scatterplot.prototype.setContentOffset = function(xOffset, yOffset)
{
	this.contentOffset = [xOffset, yOffset];
}

Scatterplot.prototype.getContentOffset = function()
{
	/*
	var parentOffset = this.parent ? this.parent.getContentOffset() : [0, 0];
	return [this.contentOffset[0]+parentOffset[0], this.contentOffset[1]+parentOffset[1]];
	*/
	return this.contentOffset;
}

Scatterplot.prototype.remove = function()
{
	if (this.canvas) {
		this.canvas.remove();
		this.canvas = undefined;
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

	// set content offset
	if (xOffset && yOffset) {
		this.setContentOffset(xOffset, yOffset);
	}

	// get the time series
	var ySeries = ts.generateOneSeries(varName);

	for (var i=0, runningOffset = 0; i < otherVars.length; i++, runningOffset += SCATTER_W) 
	{
		var xSeries = ts.generateOneSeries(otherVars[i]);
		var scatterX = xOffset + i*SCATTER_X_OFFSET + runningOffset;
		var scatterY = yOffset;

		var g = this.group.append("g")
			.attr("transform", "translate(" + scatterX + "," + scatterY + ")");

		// create a new scatterplot view
		var scatterplot = new Scatterplot(g, SCATTER_W, SCATTER_H, ySeries, xSeries, timeRange, scatterX, scatterY, this);
		scatterplot.setVarName(otherVars[i]);
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

ScatterplotRow.prototype.remove = function()
{
	for (var i=0, N=this.scatterplots.length; i<N; i++) {
		this.scatterplots[i].remove();
	}
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

ScatterplotRow.prototype.setContentOffset = function(xOffset, yOffset)
{
	this.contentOffset = [xOffset, yOffset];
}

ScatterplotRow.prototype.getContentOffset = function()
{
	return this.contentOffset;
}

ScatterplotRow.prototype.getScatterplots = function()
{
	return this.scatterplots;
}


