
var SELECTION_HOVER_COLOR = "#ffd699";
var LIST_SELECTION_OPEN = false;

var DEFAULT_SELECTION_LIST_W = 150;
var DEFUALT_SELECTION_LIST_H = 250;

function ListSelection(x, y, width, height, selections)
{
	if (LIST_SELECTION_OPEN) {
		// another list is open somewhere else. don't do anything
		return;
	}

	// store selections
	this.selections = selections;

	// create a new div element
	this.div = d3.select("body").append("div")
		.attr("class", "listSelectionDiv")
		.style("width", (width || DEFAULT_SELECTION_LIST_W) + "px")
		//.style("height", (height || DEFUALT_SELECTION_LIST_H) + "px")
		.style("left", x + "px")
		.style("top", y + "px");

	
	this.input = this.div.append("input")
		.attr("class", "listSelectionInput")
		.attr("type", "text")
		.style("margin-bottom", "5px")
		.style("width", ((width || DEFAULT_SELECTION_LIST_W)-10) + "px");

	this.contentDiv = this.div.append("div")
		.style("overflow-y", "scroll")
		.style("padding", "0px 0px")
		.style("height", (height || DEFUALT_SELECTION_LIST_H) + "px")

	this.populateList(selections);

	// populate list with span items
	(function(thisSelector) 
	{
		// on textbox change, search the seleciton list
		thisSelector.input
			.on("keydown", function() {
				var keyCode = d3.event.keyCode;
				switch (keyCode)
				{
				case 38:
					// UP
					if (thisSelector.hoveredItem === null || thisSelector.hoveredItem === undefined) 
					{
						thisSelector.hoveredItem = 0;
						thisSelector.hoverIndex(thisSelector.hoveredItem);
					}
					else
					{
						if (thisSelector.hoveredItem > 0) {
							thisSelector.hoveredItem--;
							thisSelector.hoverIndex(thisSelector.hoveredItem);
						}
					}
					break;
				case 40:
					// down key
					if (thisSelector.hoveredItem === null || thisSelector.hoveredItem === undefined) 
					{
						thisSelector.hoveredItem = 0;
						thisSelector.hoverIndex(thisSelector.hoveredItem);
					}
					else
					{
						if (thisSelector.hoveredItem < thisSelector.theList.data().length-1 ) {
							thisSelector.hoveredItem++;
							thisSelector.hoverIndex(thisSelector.hoveredItem);
						}
					}
					break;
				case 13:
					// enter
					if (thisSelector.hoveredItem !== null && thisSelector.hoveredItem !== undefined)
					{
						var entries = thisSelector.theList.data();
						var item = entries[thisSelector.hoveredItem];
						thisSelector.clickCallback(item);
						thisSelector.close();
					}
					break;
				}
			})
			.on("keyup", function() 
			{
				var searchStr = this.value; searchStr = searchStr.toLowerCase();
				var matches = searchStr.length == 0 ? thisSelector.selections : [];

				switch (d3.event.keyCode)
				{

				case 38:
				case 40:
				case 13:
					break;
				default:
					if (thisSelector.lastSearch != searchStr)
					{
						if (searchStr.length > 0) 
						{
							for (var i=0; i < thisSelector.selections.length; i++) 
							{
								var entry = thisSelector.selections[i].toLowerCase();
								if (entry.indexOf(searchStr) != -1) 
								{
									matches.push(thisSelector.selections[i]);
								}
							}
						}
						thisSelector.populateList(matches);
						thisSelector.hoveredItem = null;
						thisSelector.lastSearch = searchStr;
					}
				}
			});

		// make a body.click event to close the selection when user clicks anywhere outside
		setTimeout(function() {
			d3.select(document.body).on("click.closeListSelection", function() 
			{
				if (document.activeElement != thisSelector.input.node()) {
					thisSelector.close();
					d3.select(document.body).on("click.closeListSelection", null);
				}
			});
		}, 100);

		// set the textbox to be active
		thisSelector.input.node().focus();
	})(this);

	// see which corner to anchor the list at, depending
	// on how much space we have available in the window
	var winW = window.innerWidth; var winH = window.innerHeight;
	var bounds = this.div.node().getBoundingClientRect();
	var divW = bounds.right-bounds.left, divH = bounds.bottom-bounds.top;
	if (x + divW > winW) { x -= divW; this.div.style("left", (x+2) + "px"); }
	if (y + divH > winH) { y -= divH; this.div.style("top",  (y+2) + "px"); }
}

ListSelection.prototype.hoverIndex = function(index)
{
	if (index !== undefined && index !== null)
	{	
		(function(thisSelector, index) {
			thisSelector.theList
				.style("background-color", function(d, i) {
					return i==index ? SELECTION_HOVER_COLOR : ''
				});
			if (thisSelector.hoverCallback) {
				thisSelector.hoverCallback(thisSelector.theList.data()[index]);
			}
		})(this, index);
	}
	else
	{
		this.theList.style("background-color", "");
	}
}

ListSelection.prototype.populateList = function(entries)
{
	(function(thisSelector, entries) 
	{
		// update the list of data
		var update = thisSelector.contentDiv.selectAll("span.listSelection").data(entries);
		var enter = update.enter();
		enter.append('span')
			.attr('class', 'listSelection')
			.on("mouseover", function() {
				if (thisSelector.hoverCallback) {
					thisSelector.hoverCallback(d);
				}
				d3.select(this).style("background-color", SELECTION_HOVER_COLOR);
			})
			.on("mouseout", function() {
				if (thisSelector.hoverCallback) {
					thisSelector.hoverCallback();
				}
				thisSelector.hoverIndex(null);
			})
			.on("click", function(d) {
				if (thisSelector.clickCallback) {
					thisSelector.clickCallback(d)
				}
				thisSelector.close();
			});

		update
			.html(function(d) { return d + "<br>"; });

		update.exit().remove();

		thisSelector.theList = update;
	})(this, entries);
}

ListSelection.prototype.close = function()
{
	LIST_SELECTION_OPEN = false;
	if (this.div)
	{
		this.div.remove();
		this.div = undefined;
	}
}

ListSelection.prototype.setCallbacks = function(clickCallback, hoverCallback)
{
	this.clickCallback = clickCallback;
	this.hoverCallback = hoverCallback;
}

// ColorScaleSelection
// ====================

var COLOR_SELECTION_W = 80;
var COLOR_PALLET_H = 10;
var COLOR_PALLET_SEP = 1;

function ColorScaleSelection(x, y, colorList, callback)
{
	if (LIST_SELECTION_OPEN) {
		// another list is open somewhere else. don't do anything
		return;
	}
	LIST_SELECTION_OPEN = true;

	// store selections
	this.colorList = colorList;

	// create a new div element
	this.div = d3.select("body").append("div")
		.attr("class", "listSelectionDiv")
		//.style("width", (width || DEFAULT_SELECTION_LIST_W) + "px")
		//.style("height", (height || DEFUALT_SELECTION_LIST_H) + "px")
		.style("left", x + "px")
		.style("top", y + "px")
		.style("padding", "3px 3px");
	// attach an svg to the div
	this.svg = this.div.append("svg")
		.attr("height", colorList.length * (COLOR_PALLET_H+COLOR_PALLET_SEP))
		.attr("width", COLOR_SELECTION_W);

	// populate list with span items
	(function(thisSelector, callback) 
	{
		// group selection
		var group = thisSelector.svg.selectAll('g').data(colorList).enter().append("g")
			.attr("transform", function(d, i) { return "translate(0," + i*(COLOR_PALLET_H+COLOR_PALLET_SEP) + ')'; })
			.on("click", function(d, i) {
				callback(i, d);
				thisSelector.close();
			});

		group.selectAll("rect").data(function(d) 
		{ 
			var theColor = [];
			for (var i=0; i<d.length; i++) {
				theColor.push({
					color: d[i],
					palletSize: d.length
				});
			}
			return theColor;
		}).enter().append("rect")
			.style("stroke", "none")
			.style("fill", function(d) { return "rgb(" + d.color[0] + ", " + d.color[1] + ", " + d.color[2] + ")"; })
			.attr("x", function(d, i) { return i*(COLOR_SELECTION_W / d.palletSize); })
			.attr("width", function(d) { return COLOR_SELECTION_W / d.palletSize; })
			.attr("height", COLOR_PALLET_H);

		// make a body.click event to close the selection when user clicks anywhere outside
		setTimeout(function() {
			d3.select(document.body).on("click.closeListSelection", function() 
			{
				thisSelector.close();
				d3.select(document.body).on("click.closeListSelection", null);
			});
		}, 100);

	})(this, callback);

	var winW = window.innerWidth; var winH = window.innerHeight;
	var bounds = this.div.node().getBoundingClientRect();
	var divW = bounds.right-bounds.left, divH = bounds.bottom-bounds.top;
	if (x + divW > winW) { x -= divW; this.div.style("left", (x+2) + "px"); }
	if (y + divH > winH) { y -= divH; this.div.style("top",  (y+2) + "px"); }
}

ColorScaleSelection.prototype.close = function()
{
	LIST_SELECTION_OPEN = false;
	if (this.div)
	{
		this.div.remove();
		this.div = undefined;
	}
}


