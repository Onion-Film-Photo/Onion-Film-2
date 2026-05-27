// WebGL-based film stock processor. Applied once at shutter press (not live preview).

const VERT = `
  attribute vec2 a_pos;
  attribute vec2 a_uv;
  varying vec2 v_uv;
  void main() { gl_Position = vec4(a_pos, 0.0, 1.0); v_uv = a_uv; }
`

const FRAG = `
  precision highp float;
  uniform sampler2D u_img;
  uniform mat3 u_matrix;
  uniform vec3 u_offset;
  uniform float u_sat;
  uniform float u_contrast;
  uniform float u_lift;
  uniform float u_grain;
  uniform float u_vignette;
  uniform float u_seed;
  varying vec2 v_uv;

  float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec3 c = texture2D(u_img, v_uv).rgb;

    // Color matrix + offset
    c = u_matrix * c + u_offset;
    c = clamp(c, 0.0, 1.0);

    // Saturation
    float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(lum), c, u_sat);
    c = clamp(c, 0.0, 1.0);

    // Shadow lift (film base + fog)
    c += u_lift * (1.0 - c);

    // S-curve contrast: mix(linear, smoothstep, strength)
    vec3 s = c * c * (3.0 - 2.0 * c);
    c = mix(c, s, u_contrast);
    c = clamp(c, 0.0, 1.0);

    // Film grain
    float g = (rand(v_uv * 1000.0 + u_seed) - 0.5) * u_grain;
    c = clamp(c + g, 0.0, 1.0);

    // Vignette
    vec2 d = v_uv - 0.5;
    c *= 1.0 - u_vignette * dot(d, d) * 4.0;
    c = clamp(c, 0.0, 1.0);

    gl_FragColor = vec4(c, 1.0);
  }
`

export type GlParams = {
  // Row-major 3×3 color matrix: [R_fromR, R_fromG, R_fromB, G_fromR, ...]
  matrix: readonly [number,number,number, number,number,number, number,number,number]
  offset: readonly [number, number, number]
  saturation: number  // 0 = grayscale, 1 = unchanged
  contrast: number    // 0 = flat, 1 = hard S-curve
  shadowLift: number  // 0 = none, 0.05 = airy feel
  grain: number       // 0 = none, 0.04 = strong
  vignette: number    // 0 = none, 0.5 = strong
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  return s
}

export function applyFilmGL(
  source: HTMLCanvasElement | HTMLVideoElement,
  params: GlParams,
  w: number,
  h: number,
): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = w
  out.height = h

  const gl = out.getContext('webgl')
  if (!gl) {
    // WebGL unavailable — fall back to plain copy
    const ctx = out.getContext('2d')!
    ctx.drawImage(source, 0, 0, w, h)
    return out
  }

  const prog = gl.createProgram()!
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  gl.useProgram(prog)

  // Full-screen quad
  const pos = new Float32Array([-1,-1, 1,-1, -1,1, 1,1])
  const uvs = new Float32Array([0,0,  1,0,  0,1,  1,1])

  const posLoc = gl.getAttribLocation(prog, 'a_pos')
  const pb = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, pb)
  gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(posLoc)
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

  const uvLoc = gl.getAttribLocation(prog, 'a_uv')
  const ub = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, ub)
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(uvLoc)
  gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0)

  // Upload source as texture (flip Y so canvas top-left = texCoord 0,0 bottom-left)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)

  // Uniforms — matrix is row-major in JS, WebGL expects column-major
  const m = params.matrix
  gl.uniformMatrix3fv(
    gl.getUniformLocation(prog, 'u_matrix'), false,
    [m[0],m[3],m[6], m[1],m[4],m[7], m[2],m[5],m[8]],
  )
  gl.uniform3fv(gl.getUniformLocation(prog, 'u_offset'),   params.offset as number[])
  gl.uniform1f(gl.getUniformLocation(prog, 'u_sat'),       params.saturation)
  gl.uniform1f(gl.getUniformLocation(prog, 'u_contrast'),  params.contrast)
  gl.uniform1f(gl.getUniformLocation(prog, 'u_lift'),      params.shadowLift)
  gl.uniform1f(gl.getUniformLocation(prog, 'u_grain'),     params.grain)
  gl.uniform1f(gl.getUniformLocation(prog, 'u_vignette'),  params.vignette)
  gl.uniform1f(gl.getUniformLocation(prog, 'u_seed'),      Math.random())

  gl.viewport(0, 0, w, h)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

  return out
}
