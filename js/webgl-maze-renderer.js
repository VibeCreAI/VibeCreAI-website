/**
 * WebGL-Based Maze Bot Renderer
 * High-performance GPU-accelerated sprite rendering
 * Maintains pixel-perfect appearance while drastically improving performance
 */

class WebGLMazeRenderer {
    constructor(canvas, spriteSystem) {
        this.canvas = canvas;
        this.spriteSystem = spriteSystem;
        this.gl = null;
        this.program = null;
        this.textureAtlas = null;
        this.isReady = false;

        // Sprite atlas configuration
        this.atlasLayout = {
            up: { x: 0, y: 0 },
            down: { x: 1, y: 0 },
            left: { x: 2, y: 0 },
            right: { x: 3, y: 0 },
            idle: { x: 4, y: 0 }
        };
        this.spriteSize = 3200; // Each sprite sheet is 3200x3200
        this.atlasWidth = this.spriteSize * 5; // 5 directions
        this.atlasHeight = this.spriteSize;

        // Color filter mappings (RGB values for shader)
        this.colorFilters = {
            'solid1': { r: 1.0, g: 0.42, b: 0.42 },  // Red #ff6b6b
            'solid2': { r: 0.31, g: 0.80, b: 0.77 }, // Teal #4ecdc4
            'solid3': { r: 0.64, g: 0.61, b: 1.0 },  // Purple #a29bfe
            'solid4': { r: 1.0, g: 0.92, b: 0.65 }   // Yellow #ffeaa7
        };

        this.initialize();
    }

    initialize() {
        // Try to get WebGL2 context
        this.gl = this.canvas.getContext('webgl2', {
            alpha: true,
            antialias: false,
            premultipliedAlpha: false
        });

        if (!this.gl) {
            console.warn('WebGL2 not supported, falling back to Canvas2D');
            return false;
        }

        const gl = this.gl;

        // Set up WebGL state
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

        // Create shader program
        if (!this.createShaderProgram()) {
            return false;
        }

        // Create texture atlas (async - will set isReady when complete)
        this.createTextureAtlas().catch(err => {
            console.warn('⚠️ WebGL texture creation failed (likely CORS/local file issue):', err.message);
            this.isReady = false;
            this.gl = null; // Signal WebGL is not usable
        });

        return true;
    }

    createShaderProgram() {
        const gl = this.gl;

        // Vertex shader - positions sprites and handles animation frames
        const vertexShaderSource = `#version 300 es
            precision highp float;

            // Per-vertex attributes
            in vec2 a_position;      // Quad corner (0-1)
            in vec2 a_texCoord;      // Texture coordinate

            // Per-instance attributes
            in vec2 a_spritePos;     // Screen position
            in vec2 a_spriteSize;    // Sprite size
            in float a_frameIndex;   // Animation frame (0-11)
            in float a_direction;    // Direction index (0-4)
            in float a_opacity;      // Opacity for trails

            out vec2 v_texCoord;
            out float v_opacity;

            uniform vec2 u_resolution;

            void main() {
                // Calculate frame position in sprite sheet (3 cols x 4 rows)
                float col = mod(a_frameIndex, 3.0);
                float row = floor(a_frameIndex / 3.0);

                // Each sprite sheet is 1/5 of atlas width
                float spriteSheetWidth = 1.0 / 5.0;
                
                // Calculate which sprite sheet (direction)
                float directionOffset = a_direction * spriteSheetWidth;
                
                // Calculate frame position WITHIN the sprite sheet (0-1 range)
                // Then scale to the sprite sheet size in the atlas
                float frameU = ((col + a_texCoord.x) / 3.0) * spriteSheetWidth;
                float frameV = (row + a_texCoord.y) / 4.0;

                // Output texture coordinate
                v_texCoord = vec2(
                    directionOffset + frameU,
                    frameV
                );
                v_opacity = a_opacity;

                // Position sprite on screen
                vec2 position = a_spritePos + a_position * a_spriteSize;
                vec2 clipSpace = (position / u_resolution) * 2.0 - 1.0;
                clipSpace.y = -clipSpace.y; // Flip Y

                gl_Position = vec4(clipSpace, 0.0, 1.0);
            }
        `;

        // Fragment shader - applies color filters
        const fragmentShaderSource = `#version 300 es
            precision highp float;

            in vec2 v_texCoord;
            in float v_opacity;

            uniform sampler2D u_texture;
            uniform vec3 u_colorFilter;  // RGB color to apply

            out vec4 outColor;

            void main() {
                vec4 texColor = texture(u_texture, v_texCoord);

                // Apply color filter (multiply white sprite by target color)
                vec3 filteredColor = texColor.rgb * u_colorFilter;
                outColor = vec4(filteredColor, texColor.a * v_opacity);
            }
        `;

        // Compile shaders
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!vertexShader || !fragmentShader) {
            console.error('Failed to compile shaders');
            return false;
        }

        // Link program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Shader program failed to link:', gl.getProgramInfoLog(this.program));
            return false;
        }

        gl.useProgram(this.program);

        // Get attribute and uniform locations
        this.locations = {
            a_position: gl.getAttribLocation(this.program, 'a_position'),
            a_texCoord: gl.getAttribLocation(this.program, 'a_texCoord'),
            a_spritePos: gl.getAttribLocation(this.program, 'a_spritePos'),
            a_spriteSize: gl.getAttribLocation(this.program, 'a_spriteSize'),
            a_frameIndex: gl.getAttribLocation(this.program, 'a_frameIndex'),
            a_direction: gl.getAttribLocation(this.program, 'a_direction'),
            a_opacity: gl.getAttribLocation(this.program, 'a_opacity'),
            u_resolution: gl.getUniformLocation(this.program, 'u_resolution'),
            u_texture: gl.getUniformLocation(this.program, 'u_texture'),
            u_colorFilter: gl.getUniformLocation(this.program, 'u_colorFilter')
        };

        // Set up static quad geometry
        this.setupQuadGeometry();

        return true;
    }

    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    setupQuadGeometry() {
        const gl = this.gl;

        // Quad vertices (2 triangles)
        const vertices = new Float32Array([
            0, 0,    // Top-left
            1, 0,    // Top-right
            0, 1,    // Bottom-left
            1, 1     // Bottom-right
        ]);

        const texCoords = new Float32Array([
            0, 0,
            1, 0,
            0, 1,
            1, 1
        ]);

        // Create and bind vertex buffer
        this.quadVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.locations.a_position);
        gl.vertexAttribPointer(this.locations.a_position, 2, gl.FLOAT, false, 0, 0);

        // Create and bind texcoord buffer
        this.texCoordVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordVBO);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.locations.a_texCoord);
        gl.vertexAttribPointer(this.locations.a_texCoord, 2, gl.FLOAT, false, 0, 0);

        // Create instance data buffer (will be updated each frame)
        this.instanceVBO = gl.createBuffer();
    }

    async createTextureAtlas() {
        const gl = this.gl;

        // Wait for sprite sheets to load
        if (!this.spriteSystem.loaded) {
            await Promise.all(this.spriteSystem.loadPromises);
        }

        // For local files, we can't avoid CORS issues with canvas
        // Try direct image upload approach (works if server has CORS enabled)
        const directions = ['up', 'down', 'left', 'right', 'idle'];
        
        // Create texture atlas manually by uploading each sprite directly
        this.textureAtlas = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.textureAtlas);
        
        // Allocate texture memory for full atlas
        const level = 0;
        const internalFormat = gl.RGBA;
        const border = 0;
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;
        const data = null; // Allocate but don't fill yet
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                     this.atlasWidth, this.atlasHeight, border,
                     format, type, data);
        
        // Upload each sprite image directly using texSubImage2D
        try {
            directions.forEach((dir, index) => {
                const img = this.spriteSystem.spriteSheets[dir];
                if (img && img.complete) {
                    const xOffset = index * this.spriteSize;
                    gl.texSubImage2D(gl.TEXTURE_2D, 0, xOffset, 0, gl.RGBA, gl.UNSIGNED_BYTE, img);
                }
            });
        } catch (err) {
            throw new Error('Cannot upload images to WebGL (CORS issue). Please run via HTTP server.');
        }
        
        // Use NEAREST filtering for pixel-perfect sprites
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        this.isReady = true;
    }

    render(bots, trails, directionMap) {
        if (!this.isReady || !this.gl) return false;

        const gl = this.gl;

        // Clear canvas
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        if (bots.length === 0 && trails.length === 0) return true;

        gl.useProgram(this.program);

        // Set resolution uniform
        gl.uniform2f(this.locations.u_resolution, this.canvas.width, this.canvas.height);

        // Bind texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textureAtlas);
        gl.uniform1i(this.locations.u_texture, 0);

        // Render trails first, then bots
        this.renderInstances(trails, directionMap, true);
        this.renderInstances(bots, directionMap, false);

        return true;
    }

    renderInstances(instances, directionMap, isTrail) {
        const gl = this.gl;

        // Group instances by color for batch rendering
        const batches = {};

        instances.forEach(instance => {
            const className = isTrail ? instance.className : instance.className;
            if (!batches[className]) batches[className] = [];
            batches[className].push(instance);
        });

        // Render each color batch
        Object.entries(batches).forEach(([className, batch]) => {
            const color = this.colorFilters[className] || { r: 1, g: 1, b: 1 };
            gl.uniform3f(this.locations.u_colorFilter, color.r, color.g, color.b);

            // Build instance data
            const instanceData = [];
            batch.forEach(item => {
                const x = isTrail ? item.x : (item.col * item.size);
                const y = isTrail ? item.y : (item.row * item.size);
                const size = isTrail ? item.size : (item.size - 1);
                const direction = isTrail ? item.direction : (item.isIdle ? 'idle' : item.direction);
                const spriteDir = directionMap[direction] || direction;
                const dirIndex = { up: 0, down: 1, left: 2, right: 3, idle: 4 }[spriteDir] || 0;
                const frameIndex = isTrail ? item.frameIndex : item.frameIndex;
                const opacity = isTrail ? (item.opacity || 0.6) : 1.0;

                instanceData.push(
                    x, y,           // spritePos
                    size, size,     // spriteSize
                    frameIndex,     // frameIndex
                    dirIndex,       // direction
                    opacity         // opacity
                );
            });

            // Upload instance data
            gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceVBO);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instanceData), gl.DYNAMIC_DRAW);

            const stride = 7 * 4; // 7 floats per instance
            gl.enableVertexAttribArray(this.locations.a_spritePos);
            gl.vertexAttribPointer(this.locations.a_spritePos, 2, gl.FLOAT, false, stride, 0);
            gl.vertexAttribDivisor(this.locations.a_spritePos, 1);

            gl.enableVertexAttribArray(this.locations.a_spriteSize);
            gl.vertexAttribPointer(this.locations.a_spriteSize, 2, gl.FLOAT, false, stride, 8);
            gl.vertexAttribDivisor(this.locations.a_spriteSize, 1);

            gl.enableVertexAttribArray(this.locations.a_frameIndex);
            gl.vertexAttribPointer(this.locations.a_frameIndex, 1, gl.FLOAT, false, stride, 16);
            gl.vertexAttribDivisor(this.locations.a_frameIndex, 1);

            gl.enableVertexAttribArray(this.locations.a_direction);
            gl.vertexAttribPointer(this.locations.a_direction, 1, gl.FLOAT, false, stride, 20);
            gl.vertexAttribDivisor(this.locations.a_direction, 1);

            gl.enableVertexAttribArray(this.locations.a_opacity);
            gl.vertexAttribPointer(this.locations.a_opacity, 1, gl.FLOAT, false, stride, 24);
            gl.vertexAttribDivisor(this.locations.a_opacity, 1);

            // Draw instances
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, batch.length);
        });
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    destroy() {
        if (!this.gl) return;

        const gl = this.gl;
        if (this.program) gl.deleteProgram(this.program);
        if (this.textureAtlas) gl.deleteTexture(this.textureAtlas);
        if (this.quadVBO) gl.deleteBuffer(this.quadVBO);
        if (this.texCoordVBO) gl.deleteBuffer(this.texCoordVBO);
        if (this.instanceVBO) gl.deleteBuffer(this.instanceVBO);
    }
}

// Export for use in maze system
window.WebGLMazeRenderer = WebGLMazeRenderer;