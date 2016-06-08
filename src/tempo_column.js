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
	this.screenOffset = offset;
}

TimeColumn.prototype.addView = function(varName)
{
	// calculate y Offset
	var yOffset = 0;
	for (var i=0, N=this.views.length; i<N; i++) {
		yOffset += this.views[i].getH() + SCATTER_SPACING;
	}

	// make a group
	var group = this.group.append("g")
		.attr("transform", "translate(" + 0 + "," + yOffset + ")");

	var scatterView = new ScatterView(group, this.columnVariable, varName, this.w);
	this.views.push(scatterView);
}

TimeColumn.prototype.getViews = function()
{
	return this.views;
}
