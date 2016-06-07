/* =============================================
 * Tempo: time column
 * (C) Khairi Reda
 * =============================================
 */


// default dimensions of the scatterplot view
var DEF_SCATTER_W = 150;
var DEF_SCATTER_H = 150;

// padding inside the scatterplot view
var SCATTER_PAD = 5;


function TimeColumn(group, columnVariable)
{
	this.group = group;
	this.w = DEF_SCATTER_W;
	this.columnVariable = columnVariable;

}

TimeColumn.prototype.getW = function()
{
	return this.w;
}

TimeColumn.prototype.addView = function(xSeries, ySeries)
{

}

