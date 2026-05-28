"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "../theme-provider";

const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_texture;
  uniform vec2 u_resolution;
  uniform vec3 u_color;

  void main() {
    vec4 tex = texture2D(u_texture, v_texCoord);
    float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));

    // discard background pixels - make them transparent
    if (luma > 0.85) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    float dotSize = 5.0;
    float angle = 1.1868; // ~68 degrees
    vec2 p = gl_FragCoord.xy;
    float s = sin(angle);
    float c = cos(angle);
    vec2 rotated = vec2(
      p.x * c - p.y * s,
      p.x * s + p.y * c
    );

    vec2 cell = floor(rotated / dotSize) * dotSize + dotSize * 0.5;
    float dist = length(rotated - cell);
    float radius = dotSize * 0.5 * (1.0 - luma);
    float dotValue = smoothstep(radius + 0.5, radius - 0.5, dist);

    // Only render the dots, make everything else transparent
    float alpha = dotValue;
    gl_FragColor = vec4(u_color * dotValue, alpha);
  }
`;

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

export function ShaderCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animRef = useRef<number>(0);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      return shader;
    };

    const vs = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 1, 1, 1, 0, 0,
      0, 0, 1, 1, 1, 0,
    ]), gl.STATIC_DRAW);
    const texLoc = gl.getAttribLocation(program, "a_texCoord");
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const resLoc = gl.getUniformLocation(program, "u_resolution");
    const colorLoc = gl.getUniformLocation(program, "u_color");

    // Enable transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const render = () => {
      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

        const fg = theme === "dark" ? hexToRgb("#93c5fd") : hexToRgb("#021093");

        gl.clearColor(0, 0, 0, 0); // Clear with transparent
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(resLoc, canvas.width, canvas.height);
        gl.uniform3f(colorLoc, ...fg);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      animRef.current = requestAnimationFrame(render);
    };

    video.play().catch(() => {});
    render();

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [theme]);

  return (
    <div className="relative w-40 h-40 sm:w-48 sm:h-48 ml-[10px]">
      <video
        ref={videoRef}
        src="/wolf.mp4"
        loop
        muted
        playsInline
        className="hidden"
      />
      <canvas
        ref={canvasRef}
        width={192}
        height={192}
        className="w-full h-full"
      />
    </div>
  );
}
