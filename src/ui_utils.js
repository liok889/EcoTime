/* =============================================
 * UI Utils
 * (C) Khairi Reda
 * =============================================
 */

function Button(svg, x, y, w, h, img, hoverImg, callback)
{
	this.button = svg.append("image")
		.attr("x", x).attr("y", y)
		.attr("width", w).attr("height", h)
		.attr("xlink:href", img);

	this.x = x; this.y = y;
	this.img = img;
	this.hoverImg = hoverImg;		
	
	// register callbacks
	(function(thisButton) 
	{
		thisButton.button
			.on("mouseover", function() {
				if (thisButton.hoverImg) {
					d3.select(this).attr("xlink:href", thisButton.hoverImg);
				}
			})
			.on("mouseout", function() {
				if (thisButton.hoverImg) {
					d3.select(this).attr("xlink:href", thisButton.img);
				}
			})
			.on("mousedown", function() {
				// offset the button by two pixels to simulate a push down
				d3.select(this)
					.attr("x", thisButton.x + 1).attr("y", thisButton.y+1);

				// add a callback to window so we can return button offset to normal on mouse up
				d3.select(window).on("mouseup.buttonRelease", function() {
					thisButton.button.attr("x", thisButton.x).attr("y", thisButton.y);
					d3.select(window).on("mouseup.buttonRelease", null);
				});
			})
			.on("click", function() {
				if (thisButton.callback) {
					thisButton.callback();
				}
			});

	})(this);
	this.callback = callback;
}

Button.prototype.setCallback = function(callback) {
	this.callback = callback;
}

function putNodeOnTop(node)
{
	var n = jQuery(node);
	n.parent().append(n.detach());
}
