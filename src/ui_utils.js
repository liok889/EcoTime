/* =============================================
 * UI Utils
 * (C) Khairi Reda
 * =============================================
 */

// Button
// =======
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

// Inline button
// ==============
function InlineButton(svg, x, y, w, h, img)
{
	this.dragging = false;
	this.group = svg.append("g");
	this.image = this.group.append("image")
		.attr("xlink:href", img)
		.attr("x", x).attr("y", y)
		.attr("width", w).attr("height", h)
		.style("visibility", "hidden");

	this.button = (function(x, y, w, h, button) 
	{
		var selection = button.group.selectAll("rect.inlineButton").data([button]);
		selection.enter().append("rect")
			.attr("x", x).attr("y", y)
			.attr("width", w).attr("height", h)
			.attr("class", "inlineButton")
			.style("fill", "white").style("stroke", "none")
			.style("fill-opacity", "0.0")
			.on("mousemove", function() {
				button.image.style("visibility", "visible")
			})
			.on("mouseout", function() {
				if (!button.dragging) {
					button.image.style("visibility", "hidden");
				}
			});
		return selection;
	})(x, y, w, h, this);
}

InlineButton.prototype.dragOn = function()
{
	this.dragging = true;
}

InlineButton.prototype.dragOff = function()
{
	this.dragging = false;
	this.image.style("visibility", "hidden");
}

InlineButton.prototype.on = function(event, callback)
{
	(function(button) 
	{
		button.on(event, function(d) 
		{
			var thisContext = this;
			callback.call(thisContext, d);
		});
	})(this.button);
	return this;
}

InlineButton.prototype.attr = function(attribute, value)
{
	this.image.attr(attribute, value);
	this.button.attr(attribute, value);
	return this;
}

InlineButton.prototype.node = function()
{
	return this.button.node();
}

// Misc UI functions
// ==================
function putNodeOnTop(node)
{
	var n = jQuery(node);
	n.parent().append(n.detach());
}


// WebGL Shader
// ============
function Shader(gl, vertexSource, fragmentSource, attributes, uniforms)
{
	// shader source
	var shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexSource);
	gl.attachShader(shaderProgram, fragmentSource);
	gl.linkProgram(shaderProgram);

	// if creating the program failed, alert,
	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Unable to initialize the shader program: " + gl.getProgramInfoLog(shaderProgram));
		return null;
	}
	else
	{
		var attribMap = {}, uniformMap = {};
		for (var i=0; i<attributes.length; i++) {

			var attribLocation = gl.getAttribLocation(shaderProgram, attributes[i]);
			attribMap[ attributes[i] ] = attribLocation;
		}
		
		for (var i=0; i<uniforms.length; i++) {
			var uniformLocation = gl.getUniformLocation(shaderProgram, uniforms[i]);
			uniformMap[ uniforms[i] ] = uniformLocation;
		}
		
		// store attribute/uniform list/maps
		this.attribList = attributes;
		this.uniformList = uniforms;

		this.attribMap = attribMap;
		this.uniformMap = uniformMap;

		// reference to shader program
		this.shaderProgram = shaderProgram;

		// and WebGL context
		this.gl = gl;
	}
}

Shader.prototype.isOK = function()
{
	return this.shaderProgram !== undefined;
}
Shader.prototype.useShaderNoBind = function()
{
	var gl = this.gl;
	gl.useProgram(this.shaderProgram);	
}
Shader.prototype.useShader = function()
{
	var gl = this.gl;
	gl.useProgram(this.shaderProgram);

	// enable attributes
	for (var i=0; i<this.attribList.length; i++) {
		gl.enableVertexAttribArray(this.attribMap[this.attribList[i]]);
	}
}
Shader.prototype.unuseShader = function()
{
	var gl = this.gl;

	// enable attributes
	for (var i=0; i<this.attribList.length; i++) {
		gl.disableVertexAttribArray(this.attribMap[this.attribList[i]]);
	}
}

Shader.prototype.attrib = function(attribName)
{
	return this.attribMap[attribName];
}

Shader.prototype.uniform = function(uniformName)
{
	return this.uniformMap[uniformName];
}

Shader.prototype.attrib2buffer = function(attribName, vertexBuffer, size)
{
	this.gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	this.gl.vertexAttribPointer(this.attribMap[attribName], size, gl.FLOAT, false, 0, 0);
}

