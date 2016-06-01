
var BEGIN_HOUR			= 0; //4;
var BEGIN_MINUTE  		= 0;
var END_HOUR			= 23; //19;
var END_MINUTE			= 30;
var INCREMENT_MINUTE	= 30;

function EcoTimeseries(urls, completeCallback)
{
	this.urls = urls;
	this.urlCount = 0;

	// var cache: one dimensional series for each variable separately, cached
	this.varCache = d3.map();

	// names of data fields
	this.fields = [];
	this.fieldsMap = d3.map();

	// the actual time series
	this.timeseries = [];

	// map of days
	this.days = d3.map();

	// map of readings, indexed by date.getTime()
	this.readings = d3.map();

	// callback
	this.completeCallback = completeCallback;

	// start/end date
	this.startDate = Number.MAX_VALUE;
	this.endDate = -Number.MAX_VALUE;

	if (this.urls.length > 0) {
		this.parse(this.urls[0]);
	}
}

EcoTimeseries.prototype.parse = function(url)
{
	var lineCount = 0;
	(function(ecoTimeseries, url, lineCount) 
	{
		Papa.parse(url, {
			download: true,
			header: true,
			dynamicTyping: true,
			complete: function(results) 
			{
				// read field names
				var theseFields = [];
				var meta = results.meta;	
				for (var i=0, M=meta.fields.length; i<M; i++) 
				{
					var field = meta.fields[i];
					if (
						field != "flux_aws_collected_at" && 
						field != "Year" && 
						field != "DoY" && 
						field != "Hour" &&
						field != "mm/dd/yyyy hh:mm"
					) 
					{
						if (!ecoTimeseries.fieldsMap.get(field)) {
							ecoTimeseries.fields.push(field);
							ecoTimeseries.fieldsMap.set(field, true);
						}
						theseFields.push(field);
					}	
				}

				for (var row=0, R=results.data.length; row<R; row++)
				{
					// we should only have one record
					var record = results.data[row];

					// get the date/time and conver it to a Date object
					var timestamp = record.flux_aws_collected_at || record["mm/dd/yyyy hh:mm"]
					var thisTime = new Date(timestamp);

					// make sure we have a valid, properly formatted date
					if (isNaN(thisTime.getTime())) 
					{
							
						// try reading a julian day
						var year = record.Year;
						var doy = record.DoY;
						var hour = record.Hour;
						if (year !== undefined && doy !== undefined && hour !== undefined) 
						{
							var firstDayOfYear = new Date(year + "-1-1 00:00:00");
							var minutes = (hour % 1) * 60; hour = Math.floor(hour);
							var seconds = Math.floor((minutes % 1) * 60); minutes = Math.floor(minutes);

							thisTime = new Date( firstDayOfYear.getTime() + (doy-1)*24*60*60*1000 );
							thisTime.setHours(hour);
							thisTime.setMinutes(minutes);
							thisTime.setSeconds(seconds);
						}	
						else
						{
							// nope, couldn't read a julian date
							continue;
						}
					}

					// figure out which day it is 
					var thisDay = new Date(thisTime.getTime());
					thisDay.setHours(0); thisDay.setMinutes(0); thisDay.setSeconds(0); thisDay.setMilliseconds(0);

					// maintain start/end time
					if (ecoTimeseries.startDate > thisDay.getTime()) {
						ecoTimeseries.startDate = thisDay.getTime();
					}
					if (ecoTimeseries.endDate < thisDay.getTime()) {
							ecoTimeseries.endDate = thisDay.getTime();
					}

					// make a new reading
					var reading = ecoTimeseries.readings.get(thisTime.getTime());
					if (!reading)
					{
						reading = { timestamp: thisTime, lineCount: lineCount };
					}
					else
					{
						var x=0;
					}

					// put fields into timeseries
					for (var i=0, M=theseFields.length; i<M; i++)
					{
						var field = theseFields[i];
						reading[field] = EcoSpecReading(record[field]);
					}

					// store it
					ecoTimeseries.readings.set( thisTime.getTime(), reading );

					// increment number of records
					lineCount++;
				}
				ecoTimeseries.parseComplete(url, lineCount);
			},
		})

	})(this, url, lineCount);
}

EcoTimeseries.prototype.parseComplete = function(url, lineCount)
{
	console.log("Completed parsing: " + url + ", lines: " + lineCount);
	this.urlCount++;
	if (this.urlCount == this.urls.length) 
	{
		// fill time series
		this.fillTimeseries();

		// sort fields by alphabetically
		this.fields.sort();

		// callback
		if (this.completeCallback) {
			this.completeCallback(this);
		}
	}
	else
	{
		this.parse(this.urls[ this.urlCount ]);
	}
}


EcoTimeseries.prototype.getFields = function()
{
	return this.fields;
}

EcoTimeseries.prototype.fillTimeseries = function()
{
	var DAY_INCREMENT = 24*60*60*1000;
	var READING_INCREMENT = INCREMENT_MINUTE*60*1000;

	var timeLength = 0;
	for (var day=this.startDate; day <= this.endDate; day += DAY_INCREMENT)
	{
		// figure out start/end timestamp
		var start = new Date(day);
		var end = new Date(day);

		start.setHours(BEGIN_HOUR);
		start.setMinutes(BEGIN_MINUTE);
		end.setHours(END_HOUR);
		end.setMinutes(END_MINUTE);
		var endTime = end.getTime();
		
		// make a new timeseries
		var timeseries = new Timeseries();

		// build the timeseries
		for (var i=start.getTime(); i<= endTime; i += READING_INCREMENT, timeLength++) 
		{
			var read = this.readings.get(i);
			if (read) {
				timeseries.addReading(read);
			}
			else
			{
				timeseries.addReading(null);
			}
		}

		// add time series
		this.timeseries.push(timeseries);
		if (this.days.get(day)) {
			console.error("Opps. Days clashing: " + this.currentDay);
		}
		this.days.set( day, timeseries );
	}
	this.timeLength = timeLength;

}

EcoTimeseries.prototype.storeCurrentDay = function()
{
	// figure out start/end timestamp
	var start = new Date(this.currentDay.getTime());
	var end = new Date(this.currentDay.getTime());

	start.setHours(BEGIN_HOUR);
	start.setMinutes(BEGIN_MINUTE);
	end.setHours(END_HOUR);
	end.setMinutes(END_MINUTE);
	var endTime = end.getTime();
	
	// make a new timeseries
	var timeseries = new Timeseries();

	// build the timeseries
	for (var i=start.getTime(); i<= endTime; i += INCREMENT_MINUTE*60*1000) 
	{
		var read = this.readings.get(i);
		if (read) {
			timeseries.addReading(read);
		}
		else
		{
			timeseries.addReading(null);
		}
	}

	// add time series
	this.timeseries.push(timeseries);
	if (this.days.get(this.currentDay.getTime())) {
		console.error("Opps. Days clashing: " + this.currentDay);
	}
	this.days.set( this.currentDay.getTime(), timeseries );

	// clear readings
	this.readings = d3.map();
	this.currentDay = undefined;
}

EcoTimeseries.prototype.getTimeLength = function() 
{
	return this.timeLength;
}

EcoTimeseries.prototype.getStartDate = function() {
	return new Date(this.startDate);
}
EcoTimeseries.prototype.getEndDate = function() {
	return new Date(this.endDate + 24*60*60*1000);
}

EcoTimeseries.prototype.getTimestepOffset = function() 
{
	return INCREMENT_MINUTE * 60 * 1000;
}


EcoTimeseries.prototype.generateOneSeries = function(varName)
{
	// see if we have that var in the cache
	var ts = this.varCache.get(varName);
	if (!ts)
	{
		ts = new Timeseries();
		for (var i=0, N=this.timeseries.length; i<N; i++) {
			ts.concat(this.timeseries[i], varName);
		}
		this.varCache.set(varName, ts);
	}
	return ts;
}

EcoTimeseries.prototype.getAllSeries = function()
{
	return this.timeseries;
}








































function EcoSpecReading(val) {
	if (val === "" || isNaN(val) || val == 9999 || val == -9999) {
		return null;
	}
	else
	{
		return val;
	}
}


