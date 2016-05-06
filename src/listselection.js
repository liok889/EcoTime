
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

	// create a new div element
	this.div = d3.select("body").append("div")
		.attr("class", "listSelectionDiv")
		.style("width", (width || DEFAULT_SELECTION_LIST_W) + "px")
		.style("height", (height || DEFUALT_SELECTION_LIST_H) + "px")
		.style("left", x + "px")
		.style("top", y + "px");

	// populate list with span items
	(function(thisSelector) {
		
		thisSelector.text = thisSelector.div.selectAll("span.listSelection").data(selections)
			.enter().append("span")
			.attr("class", "listSelection")
			.html(function(d) { return d + "<br>"})
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
				d3.select(this).style("background-color", "");
			})
			.on("click", function(d) {
				if (thisSelector.clickCallback) {
					thisSelector.clickCallback(d)
				}
				thisSelector.close();
			})

		// make a body.click event to close the selection when user clicks anywhere outside
		setTimeout(function() {
			d3.select(document.body).on("click.closeListSelection", function() 
			{
				thisSelector.close();
				d3.select(document.body).on("click.closeListSelection", null);
			});
		}, 100);
	})(this);
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