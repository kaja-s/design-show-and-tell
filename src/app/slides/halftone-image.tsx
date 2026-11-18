"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "../theme-provider";
import { HALFTONE_INK, VERTEX_SHADER, hexToRgb } from "../components/shader-canvas";

// A still photo as a print-style halftone, inked in the theme color. Same screen
// angle and look as the wolf, but built for stills shown large:
//  - the canvas renders at the real device resolution (CSS size × slide scale ×
//    devicePixelRatio), so dot edges are crisp instead of upscaled;
//  - each dot takes ONE tone, sampled at its cell centre from a pre-averaged copy
//    of the image, so dots are clean circles rather than shapes that follow the
//    photo's detail.
// `cells` is the number of dots across, which fixes the look at any size.
// Sources are square, grayscale on white; tones above 0.85 (the background) drop out.

const FRAGMENT = `
  precision highp float;
  uniform sampler2D u_texture;
  uniform vec2 u_resolution;
  uniform vec3 u_color;
  uniform float u_dot;

  void main() {
    float a = 1.1868; // ~68°, same screen angle as the wolf
    float s = sin(a);
    float c = cos(a);
    vec2 p = gl_FragCoord.xy;
    vec2 r = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
    vec2 cell = floor(r / u_dot) * u_dot + u_dot * 0.5;
    // back from the rotated grid to canvas pixels, then to texture space
    vec2 cp = vec2(cell.x * c + cell.y * s, -cell.x * s + cell.y * c);
    vec2 uv = vec2(cp.x / u_resolution.x, 1.0 - cp.y / u_resolution.y);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0); return; }

    float luma = dot(texture2D(u_texture, uv).rgb, vec3(0.299, 0.587, 0.114));
    if (luma > 0.85) { gl_FragColor = vec4(0.0); return; }

    float radius = u_dot * 0.5 * (1.0 - luma);
    float d = length(r - cell);
    float aa = 0.75; // ~1.5 device px of antialiasing
    float v = smoothstep(radius + aa, radius - aa, d);
    gl_FragColor = vec4(u_color * v, v);
  }
`;

export function HalftoneImage({ src, cells, className }: { src: string; cells: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl");
    if (!canvas || !gl) return;
    let alive = true;
    let ready = false;

    const compile = (type: number, code: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, code);
      gl.compileShader(sh);
      return sh;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    gl.useProgram(program);

    const attr = (name: string, data: number[]) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    };
    attr("a_position", [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    attr("a_texCoord", [0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]);

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const draw = () => {
      if (!ready) return;
      // match the backing store to the pixels actually on screen (the slide stage is CSS-scaled)
      const px = Math.max(1, Math.round(canvas.getBoundingClientRect().width * devicePixelRatio));
      if (canvas.width !== px) canvas.width = canvas.height = px;
      gl.viewport(0, 0, px, px);
      gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), px, px);
      gl.uniform3f(gl.getUniformLocation(program, "u_color"), ...hexToRgb(HALFTONE_INK[theme]));
      gl.uniform1f(gl.getUniformLocation(program, "u_dot"), px / cells);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      // average the photo down to ~2 samples per dot: one sample per cell then reads
      // the cell's mean tone instead of whatever single pixel lands at its centre
      const n = cells * 2;
      const small = document.createElement("canvas");
      small.width = small.height = n;
      const ctx = small.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, n, n);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, small);
      ready = true;
      draw();
    };
    img.src = src;

    window.addEventListener("resize", draw);
    return () => {
      alive = false;
      window.removeEventListener("resize", draw);
    };
  }, [src, cells, theme]);

  return <canvas ref={canvasRef} width={1} height={1} className={className} aria-hidden="true" />;
}
