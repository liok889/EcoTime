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

function Tempo(urls)
{
	this.vis = d3.select("#visSVG");
	this.canvas = d3.select("#visCanvas");
	this.interact = d3.select("#interactSVG");

	if (urls)
	{
		(function(tempo, urls) 
		{
			new EcoTimeseries(urls, function(data) {
				tempo.dataReady(data);
			});
		})(this, urls);
	}

	// initialize the basic IU
	var svgSize = this.getSVGSize();
	this.init(svgSize.w, svgSize.h);
}

Tempo.prototype.dataReady = function(data)
{
	theData = data;
	this.data = data;
	this.columns = [];

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

	
	// figure out the X offset of the row
	var xOffset = 0;
	for (var i=0, N=this.columns.length; i<N; i++) {
		xOffset += this.columns[i].getW() + COLUMN_SPACING;
	}
	// add column
	var column = new TimeColumn()

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

