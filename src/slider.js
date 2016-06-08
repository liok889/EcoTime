/* ---------------------------------------
 * slider mechanism
 * ---------------------------------------
 */

var DEFAULT_SLIDER_MIN_LENGTH = 20;
var DEFAULT_SLIDER_LENGTH = 40;
var DEFAULT_SLIDER_THICKNESS = 10;
var SLIDER_EDGE_SIZE = 5;

var SLIDER_DRAG_EVENT = false;
var SLIDER_HOVER_COLOR = "magenta";
var SLIDER_DRAG_COLOR = "red";

function RangeSlider(group, orientation, range, position, length, thickness, minLength)
{
	this.group = group.append("g");
	if ((typeof orientation === "object") && orientation !== null) 
	{
		var options = orientation;

		this.orientation = options.orientation;
		this.range = options.range;
		this.position = options.position || 0;
		this.length = options.length || DEFAULT_SLIDER_LENGTH;
		this.thickness = options.thickness || DEFAULT_SLIDER_THICKNESS;
		this.minLength = options.minLength || DEFAULT_SLIDER_MIN_LENGTH;
		
		this.hoverColor = options.hoverColor || SLIDER_HOVER_COLOR;
		this.dragColor = options.dragColor || SLIDER_DRAG_COLOR;
		this.fillColor = options.fillColor;
		this.fillOpacity = options.fillOpacity;
		this.rx = options.rx;
		this.ry = options.ry;
	}
	else
	{
		this.orientation = orientation;
		this.range = range;
		this.position = position || 0;
		this.length = length || DEFAULT_SLIDER_LENGTH;
		this.thickness = thickness || DEFAULT_SLIDER_THICKNESS;
		this.minLength = minLength || DEFAULT_SLIDER_MIN_LENGTH;
	}

	(function(slider) 
	{
		slider.widget = slider.group.append("rect")
			.attr("x", function() { return slider.orientation == 'horizontal' ? slider.position : 0; })
			.attr("y", function() { return slider.orientation == 'vertical'   ? slider.position : 0; })
			.attr("width", function() {  return slider.orientation == 'horizontal' ? slider.length : slider.thickness; })
			.attr("height", function() { return slider.orientation == 'vertical'   ? slider.length : slider.thickness; })
			.attr("class", "rangeSlider")
			.attr("rx", slider.rx).attr("ry", slider.ry)
			.style("fill-opacity", slider.fillOpacity || "")
			.style("fill", slider.fillColor || "")
			.on("mouseover", function() {
				if (!SLIDER_DRAG_EVENT) {
					slider.putOnTop();
				}
			})
			.on("mousemove", function() { 
				if (!SLIDER_DRAG_EVENT) {
					d3.select(this).style("stroke", slider.hoverColor || SLIDER_HOVER_COLOR); 
				
					var mouse = d3.mouse(this);
					mouse[0] -= +d3.select(this).attr("x");
					mouse[1] -= +d3.select(this).attr("y");
						
					// choose selector based on slider's orientation
					var mousePos = slider.orientation == 'horizontal' ? mouse[0] : mouse[1];
					
					if (mousePos <= SLIDER_EDGE_SIZE) 
					{
						// over the top edge					
						if (!slider.topEdge)
						{
							slider.topEdge = slider.group.append("rect")
								.style("pointer-events", "none")
								.style("fill", slider.hoverColor || SLIDER_HOVER_COLOR).style("stroke", "none")
								.attr("rx", slider.rx).attr("ry", slider.ry)
								.attr('x', slider.orientation == 'horizontal' ? slider.position : 0)
								.attr('y', slider.orientation == 'vertical'   ? slider.position : 0)
								.attr('width', slider.orientation == 'horizontal' ? SLIDER_EDGE_SIZE : slider.thickness)
								.attr('height', slider.orientation == 'vertical' ?  SLIDER_EDGE_SIZE : slider.thickness);
						}
						slider.removeBottomEdge();
					}
					else if (mousePos >= slider.length-SLIDER_EDGE_SIZE)
					{
						// over the bottom edge
						if (!slider.bottomEdge) {
							slider.bottomEdge = slider.group.append("rect")
								.style("pointer-events", "none")
								.style("fill", slider.hoverColor || SLIDER_HOVER_COLOR).style("stroke", "none")
								.attr("rx", slider.rx).attr("ry", slider.ry)
								.attr('x', slider.orientation == 'horizontal' ? slider.position+slider.length-SLIDER_EDGE_SIZE : 0)
								.attr('y', slider.orientation == 'vertical'   ? slider.position+slider.length-SLIDER_EDGE_SIZE : 0)
								.attr('width', slider.orientation == 'horizontal' ? SLIDER_EDGE_SIZE : slider.thickness)
								.attr('height', slider.orientation == 'vertical' ?  SLIDER_EDGE_SIZE : slider.thickness);
						}
						slider.removeTopEdge();
					}
					else
					{
						slider.removeBothEdges();	
					}
				}
				else
				{
			
				}
			})
			.on("mouseout", function() 
			{ 
				if (!SLIDER_DRAG_EVENT) {
					d3.select(this).style("stroke", "none"); 
					slider.removeBothEdges();
				}
			})
			.on("mousedown", function() 
			{
				SLIDER_DRAG_EVENT = true;
				slider.widget.style("stroke", slider.dragColor || SLIDER_DRAG_COLOR);
				var mouse = d3.mouse(this);
				mouse[0] -= +d3.select(this).attr("x");
				mouse[1] -= +d3.select(this).attr("y");
				
				// mouse coordinate on mousedown event
				slider.mouseDown = d3.mouse(slider.group.node());
			
				// choose selector based on slider's orientation
				var mousePos = slider.orientation == 'horizontal' ? mouse[0] : mouse[1];
				
				if (mousePos <= SLIDER_EDGE_SIZE) {
					// dragging top edge					
					slider.dragControl = 2;
					if (slider.topEdge) {
						slider.topEdge.style("fill", slider.dragColor || SLIDER_DRAG_COLOR);
					}
				}
				else if (mousePos >= slider.length-SLIDER_EDGE_SIZE)
				{
					// dragging bottom edge
					slider.dragControl = 3;
					if (slider.bottomEdge) {
						slider.bottomEdge.style("fill", slider.dragColor || SLIDER_DRAG_COLOR);
					}
				}
				else
				{
					// dragging middle
					slider.dragControl = 1;
				}

				d3.select(document)
					.on("mousemove.sliderDragEvent", function() 
					{
						var mode = slider.dragControl;
						var mouse = d3.mouse(slider.group.node());
						var dMouse = [ mouse[0]-slider.mouseDown[0], mouse[1]-slider.mouseDown[1] ];
						var delta = slider.orientation == 'horizontal' ? dMouse[0] : dMouse[1];
						
						// update mousedown position so we can accurate keep track of dMouse
						slider.mouseDown = mouse;

						// widget control
						var position = slider.position, _position = slider.position;
						var length   = slider.length  , _length = slider.length;

						if (delta > 0) 
						{
							if (mode == 1)
							{
								var openSpace = slider.range[1] - (position + length);
								if (openSpace > 0) {
									delta = Math.min(openSpace, delta);
									position += delta;
								}
							}
							else if (mode == 2)
							{
								var openSpace = length-slider.minLength;
								if (openSpace > 0) 
								{
									delta = Math.min(openSpace, delta);
									position += delta; length -= delta
								}
							}
							else if (mode == 3)
							{
								var openSpace = slider.range[1] - (position + length);
								if (openSpace > 0) 
								{
									delta = Math.min(openSpace, delta);
									length += delta;
								}
							}
						}
						else if (delta < 0)
						{
							if (mode == 1)
							{
								var openSpace = position - slider.range[0];
								if (openSpace > 0)
								{
									delta = Math.min(openSpace, -delta);
									position -= delta;
								}
							}
							else if (mode == 2)
							{
								var openSpace = position - slider.range[0];
								if (openSpace > 0)
								{
									delta = Math.min(openSpace, -delta);
									position -= delta; length += delta;
								}									
							}
							else if (mode == 3)
							{
								var openSpace = length - slider.minLength;
								if (openSpace > 0) 
								{
									delta = Math.min(openSpace, delta);
									length += delta;
								}							
							}
						}
						
						if (slider.fixedPosition) {
							position = _position;
						}
						if (delta != 0 && (position != _position || length != _length)) 
						{					
							// update the slider
							slider.position = position;
							slider.length = length;

							slider.widget
								.attr(slider.orientation == 'horizontal' ? 'x' : 'y', position)
								.attr(slider.orientation == 'horizontal' ? 'width' : 'height', length);
							
							if (slider.dragControl == 3 && slider.bottomEdge) {
								slider.bottomEdge
									.attr('x', slider.orientation == 'horizontal' ? slider.position+slider.length-SLIDER_EDGE_SIZE : 0)
									.attr('y', slider.orientation == 'vertical'   ? slider.position+slider.length-SLIDER_EDGE_SIZE : 0)
							}
 							else if (slider.dragControl == 2 && slider.topEdge) {
 								slider.topEdge
									.attr('x', slider.orientation == 'horizontal' ? slider.position : 0)
									.attr('y', slider.orientation == 'vertical'   ? slider.position : 0)
 							}

							if (slider.callback) {
								slider.callback(slider.getNormalizedRange());
							}
						}
					})
					.on("mouseup.sliderDragEvent", function() 
					{
						SLIDER_DRAG_EVENT = false;
						slider.widget.style("stroke", "none").style("stroke-width", "");
						slider.dragControl = undefined;
						d3.select(document).on("mouseup.sliderDragEvent", null).on("mousemove.sliderDragEvent", null);
						slider.removeBothEdges();
					});
			});
	})(this);

}

RangeSlider.prototype.putOnTop = function()
{
	putNodeOnTop(this.group.node());
	if (this.onTopCallback) {
		this.onTopCallback();
	}
}

RangeSlider.prototype.getScreenOffset = function()
{
	return [this.screenOffset[0], this.screenOffset[1]];
}
RangeSlider.prototype.setScreenOffset = function(screenOffset)
{
	this.screenOffset = [screenOffset[0], screenOffset[1]];
}

RangeSlider.prototype.getPosition = function()
{
	return this.position;
}
RangeSlider.prototype.getLength = function()
{
	return this.length;
}

RangeSlider.prototype.removeTopEdge = function() 
{
	if (this.topEdge) {
		this.topEdge.remove();
		this.topEdge = undefined;
	}
}
RangeSlider.prototype.removeBottomEdge = function() 
{
	if (this.bottomEdge) {
		this.bottomEdge.remove();
		this.bottomEdge = undefined;
	}
}
RangeSlider.prototype.removeBothEdges = function()
{
	this.removeTopEdge();
	this.removeBottomEdge();
}

RangeSlider.prototype.setFixedPosition = function(fixed)
{
	this.fixedPosition = fixed;
}
RangeSlider.prototype.getNormalizedRange = function() 
{
	var rangeDiff = this.range[1]-this.range[0]+1;
	return [
		(this.position-this.range[0])/rangeDiff,
		(this.position+this.length-this.range[0])/rangeDiff
	];
}

RangeSlider.prototype.setCallback = function(callback) {
	this.callback = callback
}
RangeSlider.prototype.setOnTopCallback = function(callback) {
	this.onTopCallback = callback
}
