/* ---------------------------------------
 * slider mechanism
 * ---------------------------------------
 */

var SLIDER_MIN_LENGTH = 30;
var SLIDER_LENGTH = 40;
var SLIDER_THICKNESS = 10;
var SLIDER_EDGE_SIZE = 5;


function RangeSlider(group, orientation, range, position, length, thickness, minLength)
{
	this.group = group.append("g");
	this.orientation = orientation;

	this.range = range;
	this.position = position;
	this.length = length;
	this.thickness = thickness || SLIDER_THICKNESS;
	this.minLength = minLength || SLIDER_MIN_LENGTH;

	(function(slider) 
	{
		slider.widget = slider.group.append("rect")
			
			.attr("x", function() { return slider.orientation == 'horizontal' ? slider.position : 0; })
			.attr("y", function() { return slider.orientation == 'vertical'   ? slider.position : 0; })
			.attr("width", function() {  return slider.orientation == 'horizontal' ? slider.length : slider.thickness; })
			.attr("height", function() { return slider.orientation == 'vertical'   ? slider.length : slider.thickness; })
			.attr("class", "rangeSlider")
			.on("mouseover", function() { d3.select(this).style("stroke", "red"); })
			.on("mouseout", function() { d3.select(this).style("stroke", "none"); })
			.on("mousedown", function() 
			{
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
				}
				else if (mousePos >= slider.length-SLIDER_EDGE_SIZE)
				{
					// dragging bottom edge
					slider.dragControl = 3;
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
						

						if (delta != 0 && (position != _position || length != _length)) 
						{					
							// update the slider
							slider.position = position;
							slider.length = length;

							slider.widget
								.attr(slider.orientation == 'horizontal' ? 'x' : 'y', position)
								.attr(slider.orientation == 'horizontal' ? 'width' : 'height', length);
							
							if (slider.callback) {
								slider.callback(position, length);
							}
						}
					})
					.on("mouseup.sliderDragEvent", function() 
					{
						slider.dragControl = undefined;
						d3.select(document).on("mouseup.sliderDragEvent", null).on("mousemove.sliderDragEvent", null);
					});
			});
	})(this);

}