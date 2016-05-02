/* =================================
 * A multidimensional timeseries
 * =================================*/
 
function Timeseries()
{
	this.series = [];
}

Timeseries.prototype.size = function()
{
	return this.series.length;
}

Timeseries.prototype.addReading = function(data)
{
	this.series.push(data);
}

Timeseries.prototype.concat = function(otherSeries, varName)
{
	for (var i=0, N=otherSeries.series.length; i<N; i++) 
	{
		var reading = otherSeries.series[i];
		if (reading === null) {
			this.series.push(null);
		}
		else
		{
			var v = varName ? reading[varName] : reading;
			if (varName && isNaN(v))
			{
				this.series.push(null);
			}
			else
			{
				this.series.push( v );
			}
		}
	}
}

Timeseries.prototype.getExtents = function()
{
	if (!this.extents)
	{
		var minV = Number.MAX_VALUE, maxV = -Number.MAX_VALUE;
		for (var i=0, N=this.series.length; i<N; i++) {
			var v = this.series[i];
			if (v !== null) {
				if (v < minV) { minV = v; }
				if (v > maxV) { maxV = v; }
			}
		}
		this.extents = [minV, maxV];
		this.originalExtents = [minV, maxV];
	}
	return this.extents;
}

Timeseries.prototype.getOriginalExtents = function()
{
	if (!this.originalExtents) {
		this.getExtents();
	}
	return this.originalExtents;
}

Timeseries.prototype.normalize = function() 
{
	var extents = this.getExtents();
	var span = extents[1]-extents[0];
	for (var i=0, N=this.series.length; i<N; i++) 
	{
		var v = this.series[i];
		if (v !== null) {
			this.series[i] = (this.series[i] - extents[0]) / span;
		}
	}
	this.extents = [0,1];
	return this;
}

Timeseries.prototype.getSeries = function()
{
	return this.series;
}