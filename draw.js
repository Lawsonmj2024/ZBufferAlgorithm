/** Simple program to demonstrate z-buffer */

"use strict";

// Allow entire script to load
var run = function() {
	// Variable for WebGL functions
	var gl;

	// Scale pixels by 1/2 canvas width
	var pScale;

	// Arrays to load into buffers
	var pixels = [];
	var colors = [];

	// Z buffer
	var zBuffer = [];

	// Cheat sheet
	var red = vec4(1.0, 0.0, 0.0, 1.0);
	var green = vec4(0.0, 1.0, 0.0, 1.0);
	var blue = vec4(0.0, 0.0, 1.0, 1.0);

	// Instantiate squares
	var model = [
		new Square("Red Square", red),
		new Square("Blue Square", blue),
		new Square("Green Square", green)
	];

	// Offset two squares from center and adjust depth to avoid overlap
	model[0].move(0.3, -0.3, 0.5);
	model[2].move(-0.3, 0.3, -0.5);

	// Initialize
	window.onload = function init() {
		// Start WebGL Context
		var canvas = document.getElementById("gl-canvas");
		gl = canvas.getContext('webgl2');
		if (!gl) alert("WebGL 2.0 isn't available");

		//  Configure WebGL
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(1.0, 1.0, 1.0, 1.0);

		//  Load shaders
		var program = initShaders(gl, "vertex-shader", "fragment-shader");
		gl.useProgram(program);

		// Scale pixels by 1/2 canvas width
		pScale = canvas.width / 2;

		// Color Pixels through z-buffer algorithm
		zBufferAlgorithm();

		// Load pixels to GPU
		var vBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pixels), gl.STATIC_DRAW);

		// Associate out shader variables with data buffer
		var positionLoc = gl.getAttribLocation(program, "aPosition");
		gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(positionLoc);

		// Load colors to GPU
		var cBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW); 

		// Associate out shader variables with data buffer
		var colorLoc = gl.getAttribLocation(program, "aColor");
		gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(colorLoc);

		// Event handling: Change depth of blue square
		document.getElementById("Button0").onclick = function() {
			model[1].move(0, 0, 1);
			init();
		};
		document.getElementById("Button1").onclick = function() {
			model[1].move(0, 0, -1);
			init();
		};

		// Render scene
		render();

		// Write z axes to console
		zLog();
	};

	// Draws scene after clearing color buffer
	function render() {
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.POINTS, 0, pixels.length / 2);
	}

	// Clears buffers
	function clearBuffers() {
		// Overwrite zBuffer to -1
		for (var x = 0; x < pScale * 2; x++) {
			zBuffer[x] = [];
			for (var y = 0; y < pScale * 2; y++)
				zBuffer[x][y] = -1;
		}

		// Empty colors and pixels arrays
		pixels = [];
		colors = [];
	}
	
	// Manual zBuffer Algorithm for academic demonstration
	function zBufferAlgorithm() {
		// Clear pixel, color, and zbuffer arrays
		clearBuffers();

		// Load arrays
		for (var m of model) {
			// Identify boundaries of model, scale to pixel coordinates
			var y1 = Math.round((1 + m.yMin) * (pScale));
			var y2 = Math.round((1 + m.yMax) * (pScale));
			var x1 = Math.round((1 + m.xMin) * (pScale));
			var x2 = Math.round((1 + m.xMax) * (pScale));

			// Loop through all required pixel coordinates
			for (var y = y1; y <= y2; y++) {
				for (var x = x1; x <= x2; x++) {
					// Check depth of this model against depth buffer
					if (m.depth < zBuffer[x][y] || zBuffer[x][y] == -1) {
						pixels.push((x / pScale) - 1);// Push x coordinate
						pixels.push((y / pScale) - 1);// Push y coordinate
						colors.push(m.color);		// Push pixel color
						zBuffer[x][y] = m.depth;	// Remember depth
					}
				}
			}
		}
	}

	// Write z-axis for each model to console
	function zLog() {
		console.clear();
		for (var m of model) {
			m.toConsole();
		}
	}
};

// Encapsulates object values for a 2D Square
class Square {
	// Instantiate with selected color and default center location
	constructor(n, c) {
		this.name = n;
		this.color = c;
		this.vector = [
			vec2(-0.5, -0.5),
			vec2(0.5, -0.5),
			vec2(0.5, 0.5),
			vec2(-0.5, 0.5)
		];

		// Preload min max values
		this.yMax = 0.5;
		this.yMin = -0.5;
		this.xMax = 0.5;
		this.xMin = -0.5;

		// Start at depth of 2
		this.depth = 2;
	}

	// Move square by x, y, z amount
	move(x, y, z) {
		// Change all vectors by x, y
		for (var i = 0; i < this.vector.length; i++) {
			this.vector[i][0] += x;
			this.vector[i][1] += y;
		}

		// Test z for boundary, inclusively between 0 and 5
		var zTest = this.depth + z;
		if (0 <= zTest && zTest <= 5)
			this.depth += z;
		else
			alert("Blue square cannot move there"); // Announce boundary to user

		// find new min max values
		this.setMinMax();
	}

	// Identify minimum and maximum values of 
	setMinMax() {
		// Initialize x's and y's to vector 0 values
		var y1 = this.vector[0][1];
		var y2 = this.vector[0][1];
		var x1 = this.vector[0][0];
		var x2 = this.vector[0][0];

		// Check all vectors
		for (var i = 1; i < this.vector.length; i++) {
			// Compare to current, overwrite as needed
			if (this.vector[i][0] < x1) x1 = this.vector[i][0];
			if (this.vector[i][0] > x2) x2 = this.vector[i][0];
			if (this.vector[i][1] < y1) y1 = this.vector[i][1];
			if (this.vector[i][1] > y2) y2 = this.vector[i][1];
		}

		// Save min and max values
		this.yMax = y2;
		this.yMin = y1;
		this.xMax = x2;
		this.xMin = x1;
	}

	toConsole() {
		var msg = " [" + this.name + "]";
		for (var i = msg.length; i < 16; i++)
			msg += " ";

		console.log(msg + " depth = " + this.depth.toFixed(1));
	}
} run();
