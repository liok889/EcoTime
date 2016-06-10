/* =============================================
 * Tempo: time column
 * (C) Khairi Reda
 * =============================================
 */

// how much vertical space between scatterplot views within one column
var SCATTER_SPACING = 0;

function TimeColumn(group, columnVariable)
{
	this.group = group;
	this.w = DEF_SCATTER_W;
	this.columnVariable = columnVariable;
	this.views = [];
}
TimeColumn.prototype.getGroup = function()
{
	return this.group;
}

TimeColumn.prototype.getW = function()
{
	return this.w;
}

TimeColumn.prototype.getScreenOffset = function()
{
	return [this.screenOffset[0], this.screenOffset[1]];
}
TimeColumn.prototype.setScreenOffset = function(offset)
{
	this.screenOffset = [offset[0], offset[1]];
}

TimeColumn.prototype.addView = function(varName, scatterHeight)
{
	// calculate y Offset
	var yOffset = 0;
	for (var i=0, N=this.views.length; i<N; i++) {
		yOffset += this.views[i].getH() + SCATTER_SPACING;
	}

	// make a group
	var group = this.group.append("g")
		.attr("transform", "translate(" + 0 + "," + yOffset + ")");

	var scatterView = new ScatterView(this, group, this.columnVariable, varName, this.w, scatterHeight);
	this.views.push(scatterView);

	return this.views[ this.views.length-1 ];
}

TimeColumn.prototype.getScatterHeights = function()
{
	var heights = [];
	for (var i=0, N=this.views.length; i<N; i++) {
		heights.push(this.views[i].getH());
	}
	return heights;
}

TimeColumn.prototype.updateScatterSize = function(instigator, newW, newH)
{
	var oldW = this.getW();
	var yOffset = 0;
	var scatterHeights = [];

	for (var i=0, N=this.views.length; i<N; i++) 
	{
		var view = this.views[i];
		
		// update size
		if ((instigator && instigator == view) || !instigator)
		{
			view.updateSize(newW, Array.isArray(newH) ? newH[i] : newH);
		} 
		else if (instigator && instigator != view)
		{
			view.updateSize(newW);
		}

		// set a new offset
		view.getGroup()
			.attr("transform", "translate(0," + yOffset + ")");
	
		// store view height
		scatterHeights.push( view.getH() );
		
		// keep track of running offset
		yOffset += view.getH() + SCATTER_SPACING;

	}

	if (oldW != newW) {
		// update the position of the rest the columns
		this.w = newW;
	}

	if (instigator) {
		tempo.realignColumns(this, scatterHeights);
	}
}

TimeColumn.prototype.getViews = function()
{
	return this.views;
}
