/* =============================================
 * Tempo: time column
 * (C) Khairi Reda
 * =============================================
 */


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

TimeColumn.prototype.addView = function(varName)
{

}

