// WebGL2 Pure 3D Motion Graphic Engine ported directly from motion3d.html

export interface Motion3DEngine {
  draw: (t: number) => void;
  setSize: (w: number, h: number) => void;
  destroy: () => void;
}

export function createMotion3DEngine(
  oc: HTMLCanvasElement,
  initW: number,
  initH: number,
  HOOK = false
): Motion3DEngine {
  const o2 = oc.getContext("2d")!;
  const gc = document.createElement("canvas");
  const gl = gc.getContext("webgl2", {
    antialias: true,
    preserveDrawingBuffer: true,
    alpha: false,
  });

  if (!gl) {
    throw new Error("WebGL2 not supported in this browser environment");
  }

  let W = initW;
  let H = initH;

  function setSize(w: number, h: number) {
    W = w;
    H = h;
    oc.width = w;
    oc.height = h;
    gc.width = w;
    gc.height = h;
  }

  setSize(initW, initH);

  // ============================================================ math
  const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const sm = (x: number) => {
    x = clamp(x);
    return x * x * (3 - 2 * x);
  };
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
  const lerp3 = (a: number[], b: number[], k: number) => [
    lerp(a[0], b[0], k),
    lerp(a[1], b[1], k),
    lerp(a[2], b[2], k),
  ];
  const win = (t: number, a0: number, a1: number, b0: number, b1: number) =>
    sm((t - a0) / (a1 - a0)) * (1 - sm((t - b0) / (b1 - b0)));

  function popS(t: number, a: number, dur = 0.45) {
    const x = clamp((t - a) / dur);
    if (x <= 0) return 0;
    const c1 = 1.70158,
      c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  const subv = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dotv = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const crossv = (a: number[], b: number[]) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const lenv = (a: number[]) => Math.hypot(a[0], a[1], a[2]);
  const normv = (a: number[]) => {
    const l = lenv(a) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  };
  const hex = (h: string) => [
    parseInt(h.slice(1, 3), 16) / 255,
    parseInt(h.slice(3, 5), 16) / 255,
    parseInt(h.slice(5, 7), 16) / 255,
  ];

  function mmul(a: Float32Array, b: Float32Array) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
        o[c * 4 + r] = s;
      }
    return o;
  }
  function mtrans(p: number[]) {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, p[0], p[1], p[2], 1]);
  }
  function mscale(s: number[]) {
    return new Float32Array([s[0], 0, 0, 0, 0, s[1], 0, 0, 0, 0, s[2], 0, 0, 0, 0, 1]);
  }
  function mrotX(a: number) {
    const c = Math.cos(a),
      s = Math.sin(a);
    return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
  }
  function mrotY(a: number) {
    const c = Math.cos(a),
      s = Math.sin(a);
    return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
  }
  function mrotZ(a: number) {
    const c = Math.cos(a),
      s = Math.sin(a);
    return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }
  function trs(p: number[], r: number[] | null, s: number[] | null) {
    let m = mtrans(p);
    if (r) {
      if (r[1]) m = mmul(m, mrotY(r[1]));
      if (r[0]) m = mmul(m, mrotX(r[0]));
      if (r[2]) m = mmul(m, mrotZ(r[2]));
    }
    return s ? mmul(m, mscale(s)) : m;
  }
  function persp(fovy: number, asp: number, n: number, f: number, shiftY: number) {
    const t = 1 / Math.tan(fovy / 2);
    const m = new Float32Array(16);
    m[0] = t / asp;
    m[5] = t;
    m[9] = -shiftY;
    m[10] = (f + n) / (n - f);
    m[11] = -1;
    m[14] = (2 * f * n) / (n - f);
    return m;
  }
  function lookAt(e: number[], tg: number[], up: number[]) {
    const z = normv(subv(e, tg)),
      x = normv(crossv(up, z)),
      y = crossv(z, x);
    return new Float32Array([
      x[0],
      y[0],
      z[0],
      0,
      x[1],
      y[1],
      z[1],
      0,
      x[2],
      y[2],
      z[2],
      0,
      -dotv(x, e),
      -dotv(y, e),
      -dotv(z, e),
      1,
    ]);
  }
  function nmat(m: Float32Array) {
    const c0 = [m[0], m[1], m[2]],
      c1 = [m[4], m[5], m[6]],
      c2 = [m[8], m[9], m[10]];
    const a = crossv(c1, c2),
      b = crossv(c2, c0),
      c = crossv(c0, c1);
    const d = dotv(c0, a) || 1;
    return new Float32Array([
      a[0] / d,
      a[1] / d,
      a[2] / d,
      b[0] / d,
      b[1] / d,
      b[2] / d,
      c[0] / d,
      c[1] / d,
      c[2] / d,
    ]);
  }

  // ============================================================ shaders
  function prog(vs: string, fs: string, binds: Record<string, number>) {
    const p = gl!.createProgram()!;
    for (const [t, s] of [
      [gl!.VERTEX_SHADER, vs],
      [gl!.FRAGMENT_SHADER, fs],
    ] as [number, string][]) {
      const sh = gl!.createShader(t)!;
      gl!.shaderSource(sh, s);
      gl!.compileShader(sh);
      if (!gl!.getShaderParameter(sh, gl!.COMPILE_STATUS))
        throw new Error(gl!.getShaderInfoLog(sh) || "Shader compile error");
      gl!.attachShader(p, sh);
    }
    for (const k in binds) gl!.bindAttribLocation(p, binds[k], k);
    gl!.linkProgram(p);
    if (!gl!.getProgramParameter(p, gl!.LINK_STATUS))
      throw new Error(gl!.getProgramInfoLog(p) || "Program link error");
    const u: Record<string, WebGLUniformLocation> = {};
    const n = gl!.getProgramParameter(p, gl!.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const nm = gl!.getActiveUniform(p, i)!.name;
      const loc = gl!.getUniformLocation(p, nm);
      if (loc) u[nm] = loc;
    }
    return { p, u };
  }

  const PL = prog(
    `#version 300 es
in vec3 aPos; in vec3 aNrm;
uniform mat4 uVP; uniform mat4 uModel; uniform mat3 uNmat;
out vec3 vN; out vec3 vW;
void main(){ vec4 w=uModel*vec4(aPos,1.0); vW=w.xyz; vN=normalize(uNmat*aNrm); gl_Position=uVP*w; }`,
    `#version 300 es
precision highp float;
in vec3 vN; in vec3 vW; out vec4 o;
uniform vec3 uColor; uniform float uAlpha; uniform float uUnlit; uniform vec3 uCam; uniform vec3 uL;
void main(){
  vec3 N=normalize(vN); float d=max(dot(N,normalize(uL)),0.0);
  vec3 sky=vec3(.84,.90,.98), gnd=vec3(.80,.68,.52);
  vec3 amb=mix(gnd,sky,N.y*.5+.5)*.84;
  vec3 V=normalize(uCam-vW); float rim=pow(1.0-max(dot(N,V),0.0),3.0)*.08;
  vec3 lit=uColor*(amb+vec3(1.0,.96,.88)*d*.58)+rim;
  vec3 c=mix(lit,uColor,uUnlit);
  float dist=length(uCam-vW); float f=smoothstep(10.0,36.0,dist); c=mix(c,vec3(.82,.91,1.0),f*.45);
  o=vec4(clamp(c,0.0,1.0),uAlpha);
}`,
    { aPos: 0, aNrm: 1 }
  );

  const PT = prog(
    `#version 300 es
in vec3 aPos; in vec2 aUV;
uniform mat4 uVP; uniform mat4 uModel; out vec2 vUV;
void main(){ vUV=aUV; gl_Position=uVP*uModel*vec4(aPos,1.0); }`,
    `#version 300 es
precision highp float;
in vec2 vUV; out vec4 o; uniform sampler2D uTex; uniform float uAlpha;
void main(){ vec4 c=texture(uTex,vUV); if(c.a<0.02) discard; o=vec4(c.rgb,c.a*uAlpha); }`,
    { aPos: 0, aUV: 2 }
  );

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // ============================================================ meshes
  function makeMesh(tris: number[][][]) {
    const P: number[] = [],
      N: number[] = [];
    for (const [a, b, c] of tris) {
      let n = crossv(subv(b, a), subv(c, a));
      const l = lenv(n);
      if (l < 1e-9) continue;
      n = [n[0] / l, n[1] / l, n[2] / l];
      const cen = [
        (a[0] + b[0] + c[0]) / 3,
        (a[1] + b[1] + c[1]) / 3,
        (a[2] + b[2] + c[2]) / 3,
      ];
      if (dotv(n, cen) < 0) n = [-n[0], -n[1], -n[2]];
      P.push(...a, ...b, ...c);
      N.push(...n, ...n, ...n);
    }
    const vao = gl!.createVertexArray();
    gl!.bindVertexArray(vao);
    const pb = gl!.createBuffer();
    gl!.bindBuffer(gl!.ARRAY_BUFFER, pb);
    gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array(P), gl!.STATIC_DRAW);
    gl!.enableVertexAttribArray(0);
    gl!.vertexAttribPointer(0, 3, gl!.FLOAT, false, 0, 0);
    const nb = gl!.createBuffer();
    gl!.bindBuffer(gl!.ARRAY_BUFFER, nb);
    gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array(N), gl!.STATIC_DRAW);
    gl!.enableVertexAttribArray(1);
    gl!.vertexAttribPointer(1, 3, gl!.FLOAT, false, 0, 0);
    return { vao, count: P.length / 3 };
  }

  function boxMesh() {
    const v: number[][] = [];
    for (const x of [-0.5, 0.5])
      for (const y of [-0.5, 0.5])
        for (const z of [-0.5, 0.5]) v.push([x, y, z]);
    const q = (a: number, b: number, c: number, d: number) => [
      [v[a], v[b], v[c]],
      [v[a], v[c], v[d]],
    ];
    return makeMesh([
      ...q(0, 1, 3, 2),
      ...q(4, 5, 7, 6),
      ...q(0, 1, 5, 4),
      ...q(2, 3, 7, 6),
      ...q(0, 2, 6, 4),
      ...q(1, 3, 7, 5),
    ]);
  }

  function cylMesh(seg = 16) {
    const T: number[][][] = [];
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2,
        b = ((i + 1) / seg) * Math.PI * 2;
      const b0 = [Math.cos(a), -0.5, Math.sin(a)],
        b1 = [Math.cos(b), -0.5, Math.sin(b)],
        t0 = [Math.cos(a), 0.5, Math.sin(a)],
        t1 = [Math.cos(b), 0.5, Math.sin(b)];
      T.push([b0, b1, t1], [b0, t1, t0], [[0, 0.5, 0], t0, t1], [[0, -0.5, 0], b1, b0]);
    }
    return makeMesh(T);
  }

  function sphMesh(lat = 8, lon = 12) {
    const P = (i: number, j: number) => {
      const ph = (i / lat) * Math.PI,
        th = (j / lon) * Math.PI * 2;
      return [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
    };
    const T: number[][][] = [];
    for (let i = 0; i < lat; i++)
      for (let j = 0; j < lon; j++) {
        const a = P(i, j),
          b = P(i + 1, j),
          c = P(i + 1, j + 1),
          d = P(i, j + 1);
        T.push([a, b, c], [a, c, d]);
      }
    return makeMesh(T);
  }

  function quadMesh() {
    const P = [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0];
    const U = [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1];
    const vao = gl!.createVertexArray();
    gl!.bindVertexArray(vao);
    const pb = gl!.createBuffer();
    gl!.bindBuffer(gl!.ARRAY_BUFFER, pb);
    gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array(P), gl!.STATIC_DRAW);
    gl!.enableVertexAttribArray(0);
    gl!.vertexAttribPointer(0, 3, gl!.FLOAT, false, 0, 0);
    const ub = gl!.createBuffer();
    gl!.bindBuffer(gl!.ARRAY_BUFFER, ub);
    gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array(U), gl!.STATIC_DRAW);
    gl!.enableVertexAttribArray(2);
    gl!.vertexAttribPointer(2, 2, gl!.FLOAT, false, 0, 0);
    return { vao, count: 6 };
  }

  const BOX = boxMesh(),
    CYL = cylMesh(16),
    CYL8 = cylMesh(8),
    SPH = sphMesh(8, 12),
    QUAD = quadMesh();

  // ============================================================ draw helpers
  let VP: Float32Array | null = null,
    EYE = [0, 0, 0],
    VIEW: Float32Array | null = null;
  const LIGHT = [-0.45, 0.9, 0.7];

  function useLit() {
    gl!.useProgram(PL.p);
    gl!.uniformMatrix4fv(PL.u.uVP, false, VP!);
    gl!.uniform3fv(PL.u.uCam, EYE);
    gl!.uniform3fv(PL.u.uL, LIGHT);
  }

  function drawLit(
    mesh: ReturnType<typeof makeMesh>,
    model: Float32Array,
    col: number[],
    alpha = 1,
    unlit = 0
  ) {
    gl!.uniformMatrix4fv(PL.u.uModel, false, model);
    gl!.uniformMatrix3fv(PL.u.uNmat, false, nmat(model));
    gl!.uniform3fv(PL.u.uColor, col);
    gl!.uniform1f(PL.u.uAlpha, alpha);
    gl!.uniform1f(PL.u.uUnlit, unlit);
    gl!.bindVertexArray(mesh.vao);
    gl!.drawArrays(gl!.TRIANGLES, 0, mesh.count);
  }

  function put(
    mesh: ReturnType<typeof makeMesh>,
    p: number[],
    s: number[],
    c: string | number[],
    r: number[] | null = null,
    alpha = 1,
    unlit = 0
  ) {
    drawLit(mesh, trs(p, r, s), typeof c === "string" ? hex(c) : c, alpha, unlit);
  }

  function limb(a: number[], b: number[], rad: number, c: string) {
    const y = subv(b, a),
      len = lenv(y);
    if (len < 1e-4) return;
    const yn = [y[0] / len, y[1] / len, y[2] / len];
    const h = Math.abs(yn[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const xn = normv(crossv(h, yn)),
      zn = crossv(xn, yn);
    const m = new Float32Array([
      xn[0] * rad,
      xn[1] * rad,
      xn[2] * rad,
      0,
      y[0],
      y[1],
      y[2],
      0,
      zn[0] * rad,
      zn[1] * rad,
      zn[2] * rad,
      0,
      (a[0] + b[0]) / 2,
      (a[1] + b[1]) / 2,
      (a[2] + b[2]) / 2,
      1,
    ]);
    drawLit(CYL8, m, hex(c));
  }

  const TEX: Record<
    string,
    { t: WebGLTexture; c: HTMLCanvasElement; w: number; h: number }
  > = {};

  function mkTex(
    name: string,
    w: number,
    h: number,
    fn: (c: CanvasRenderingContext2D, w: number, h: number) => void,
    mip = true
  ) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    fn(c.getContext("2d")!, w, h);
    const t = gl!.createTexture()!;
    gl!.bindTexture(gl!.TEXTURE_2D, t);
    gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, true);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, c);
    if (mip) {
      gl!.generateMipmap(gl!.TEXTURE_2D);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR_MIPMAP_LINEAR);
    } else {
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    }
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    TEX[name] = { t, c, w, h };
    return TEX[name];
  }

  function updTex(
    name: string,
    fn: (c: CanvasRenderingContext2D, w: number, h: number) => void
  ) {
    const T = TEX[name];
    fn(T.c.getContext("2d")!, T.w, T.h);
    gl!.bindTexture(gl!.TEXTURE_2D, T.t);
    gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, true);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, T.c);
    gl!.generateMipmap(gl!.TEXTURE_2D);
  }

  function useTex() {
    gl!.useProgram(PT.p);
    gl!.uniformMatrix4fv(PT.u.uVP, false, VP!);
    gl!.uniform1i(PT.u.uTex, 0);
    gl!.activeTexture(gl!.TEXTURE0);
  }

  function drawQuad(name: string, model: Float32Array, alpha = 1) {
    gl!.bindTexture(gl!.TEXTURE_2D, TEX[name].t);
    gl!.uniformMatrix4fv(PT.u.uModel, false, model);
    gl!.uniform1f(PT.u.uAlpha, alpha);
    gl!.bindVertexArray(QUAD.vao);
    gl!.drawArrays(gl!.TRIANGLES, 0, 6);
  }

  function billboardModel(p: number[], w: number, h: number) {
    const r = [VIEW![0], VIEW![4], VIEW![8]],
      u = [VIEW![1], VIEW![5], VIEW![9]],
      f = [VIEW![2], VIEW![6], VIEW![10]];
    return new Float32Array([
      r[0] * w,
      r[1] * w,
      r[2] * w,
      0,
      u[0] * h,
      u[1] * h,
      u[2] * h,
      0,
      f[0],
      f[1],
      f[2],
      0,
      p[0],
      p[1],
      p[2],
      1,
    ]);
  }

  // ============================================================ textures
  const FONT = (px: number, w = 800) => `${w} ${px}px Plus Jakarta Sans, Poppins, sans-serif`;

  function rrect(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function pillTex(
    name: string,
    w: number,
    h: number,
    txt: string,
    bg: string,
    fg: string,
    border: string | null,
    px: number
  ) {
    mkTex(name, w, h, (c) => {
      c.clearRect(0, 0, w, h);
      rrect(c, 6, 6, w - 12, h - 12, (h - 12) / 2);
      c.fillStyle = bg;
      c.fill();
      if (border) {
        c.lineWidth = 8;
        c.strokeStyle = border;
        c.stroke();
      }
      c.fillStyle = fg;
      c.font = FONT(px);
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(txt, w / 2, h / 2 + 4);
    });
  }

  const C = {
    ink: "#16202A",
    white: "#FFFFFF",
    teal: "#10B981",
    green: "#2E9E5B",
    blue: "#3D8BFD",
    yellow: "#FFC83D",
  };

  function initTextures() {
    pillTex("tag1", 512, 200, "2,4 m", C.white, C.ink, C.ink, 100);
    pillTex("tag2", 512, 200, "× harga", C.white, C.ink, C.ink, 100);
    pillTex("tag3", 512, 200, "+ ini itu", C.white, C.ink, C.ink, 100);
    pillTex("url", 1024, 170, "estimator.monefyi.com", C.ink, C.white, null, 80);
    pillTex("word", 700, 220, "Estimator", C.white, C.ink, C.ink, 118);

    mkTex("bubble", 384, 300, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      rrect(c, 8, 8, w - 16, h - 90, 44);
      c.fillStyle = C.white;
      c.fill();
      c.lineWidth = 10;
      c.strokeStyle = C.ink;
      c.stroke();
      c.beginPath();
      c.moveTo(w / 2 - 34, h - 84);
      c.lineTo(w / 2, h - 12);
      c.lineTo(w / 2 + 34, h - 84);
      c.closePath();
      c.fillStyle = C.white;
      c.fill();
      c.stroke();
      c.fillStyle = C.white;
      c.fillRect(w / 2 - 30, h - 90, 60, 12);
      c.fillStyle = C.ink;
      c.font = FONT(170);
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("?", w / 2, (h - 90) / 2 + 12);
    });

    mkTex("calc", 512, 200, (c, w, h) => {
      c.fillStyle = "#DFF7E8";
      c.fillRect(0, 0, w, h);
      c.fillStyle = C.ink;
      c.font = FONT(96);
      c.textAlign = "right";
      c.textBaseline = "middle";
      c.fillText("2,4 × 3,5", w - 24, h / 2 + 4);
    });

    mkTex("logoE", 256, 256, (c, w, h) => {
      c.fillStyle = C.teal;
      c.fillRect(0, 0, w, h);
      c.fillStyle = C.white;
      c.font = FONT(200);
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("E", w / 2, h / 2 + 10);
    });

    mkTex("screen", 760, 920, () => {});
  }

  function drawScreen(c: CanvasRenderingContext2D, w: number, h: number, t: number) {
    c.clearRect(0, 0, w, h);
    c.fillStyle = "#FFFFFF";
    c.fillRect(0, 0, w, h);
    c.fillStyle = C.teal;
    c.fillRect(0, 0, w, 130);
    c.fillStyle = "#FFFFFF";
    c.font = FONT(58);
    c.textAlign = "left";
    c.textBaseline = "middle";
    c.fillText("RAB Dapur", 40, 68);

    const fmt = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
    const rows = [
      ["Kabinet bawah 2,4 m", 6240000, 14.0],
      ["Kabinet atas 1,8 m", 3150000, 14.5],
      ["Countertop granit", 4900000, 15.0],
    ] as const;

    const e = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
    rows.forEach(([lab, val, st], i) => {
      const k = e((t - st) / 0.45),
        y = 215 + i * 135;
      c.globalAlpha = k;
      c.fillStyle = C.ink;
      c.font = FONT(36, 600);
      c.textAlign = "left";
      c.fillText(lab, 40 + (1 - k) * 50, y);
      c.font = FONT(40);
      c.textAlign = "right";
      c.fillText(fmt(val), w - 40, y);
      c.globalAlpha = 1;
      c.fillStyle = "rgba(22,32,42,0.14)";
      c.fillRect(40, y + 62, w - 80, 3);
    });

    c.globalAlpha = 1;
    c.fillStyle = C.ink;
    c.font = FONT(40, 700);
    c.textAlign = "left";
    c.fillText("Total estimasi", 40, 690);
    rrect(c, 40, 720, w - 80, 130, 26);
    c.fillStyle = "#DFF7E8";
    c.fill();
    c.lineWidth = 6;
    c.strokeStyle = C.ink;
    c.stroke();
    const tot = e((t - 15.4) / 2.2) * 14290000;
    c.fillStyle = C.ink;
    c.font = FONT(62);
    c.textAlign = "right";
    c.fillText(fmt(tot), w - 70, 790);
  }

  // ============================================================ scene
  const PAL = {
    wall: "#FFF3DC",
    floorA: "#E6B87C",
    floorB: "#DDA96B",
    cabLow: "#256E78",
    cabUp: "#3A93A0",
    top: "#F7F3EA",
    wood: "#E49A4E",
    woodL: "#EBA862",
    handle: "#C98B4B",
    dark: "#2A2F36",
    steel: "#B8C4CE",
    tile: "#F5D7A4",
  };

  function room() {
    // floor planks
    for (let i = 0; i < 22; i++)
      put(BOX, [0, -0.05, -3.2 + i * 0.5], [13, 0.1, 0.5], i % 2 ? PAL.floorA : PAL.floorB);
    // back wall, side walls, baseboard
    put(BOX, [0, 8, -3.15], [40, 16.4, 0.2], PAL.wall);
    put(BOX, [-6.4, 8, 2], [0.2, 16.4, 16], "#FFE6BE");
    put(BOX, [6.4, 8, 2], [0.2, 16.4, 16], "#FFE6BE");
    put(BOX, [0, 0.09, -3.03], [13, 0.18, 0.06], "#FFFFFF");
    // backsplash
    put(BOX, [0, 1.35, -3.03], [5.6, 0.9, 0.05], PAL.tile);
    // window
    put(BOX, [4.0, 2.15, -3.03], [1.7, 1.5, 0.08], "#FFFFFF");
    put(BOX, [4.0, 2.15, -2.98], [1.5, 1.3, 0.04], "#9FD3FF", null, 1, 1);
    put(BOX, [4.0, 2.15, -2.95], [0.06, 1.3, 0.05], "#FFFFFF");
    put(BOX, [4.0, 2.15, -2.95], [1.5, 0.06, 0.05], "#FFFFFF");
    // lower cabinets (kitchen set)
    put(BOX, [0, 0.45, -2.65], [5.2, 0.9, 0.7], PAL.cabLow);
    for (let i = -3; i <= 3; i++) {
      put(BOX, [i * 0.74, 0.45, -2.295], [0.7, 0.8, 0.03], "#3A93A0");
      put(BOX, [i * 0.74 + 0.28, 0.62, -2.27], [0.05, 0.18, 0.03], PAL.handle);
    }
    put(BOX, [0, 0.93, -2.65], [5.3, 0.07, 0.78], PAL.top);
    // sink + tap
    put(BOX, [-2.0, 0.965, -2.65], [0.9, 0.02, 0.5], PAL.steel);
    put(CYL8, [-2.0, 1.1, -2.85], [0.04, 0.3, 0.04], PAL.steel);
    put(BOX, [-2.0, 1.24, -2.75], [0.04, 0.04, 0.25], PAL.steel);
    // stove
    put(BOX, [0, 0.965, -2.65], [0.9, 0.03, 0.6], PAL.dark);
    for (const [dx, dz] of [
      [-0.2, -0.13],
      [0.2, -0.13],
      [-0.2, 0.13],
      [0.2, 0.13],
    ])
      put(CYL, [0 + dx, 0.99, -2.65 + dz], [0.12, 0.02, 0.12], "#555E69");
    // hood
    put(BOX, [0, 2.0, -2.85], [1.0, 0.3, 0.5], "#8E9AA6");
    put(BOX, [0, 2.55, -2.95], [0.3, 0.9, 0.25], "#8E9AA6");
    // upper cabinets
    for (const x of [-2.5, -1.7, -0.9, 0.9, 1.7, 2.5]) {
      put(BOX, [x, 1.95, -2.85], [0.78, 0.8, 0.42], PAL.cabUp);
      put(BOX, [x + 0.3, 1.65, -2.62], [0.05, 0.18, 0.03], PAL.handle);
    }
    // island (counter)
    put(BOX, [0, 0.45, 0.1], [4.6, 0.9, 0.9], PAL.wood);
    for (let i = -2; i <= 2; i++) {
      put(BOX, [i * 0.88, 0.45, 0.565], [0.8, 0.7, 0.03], PAL.woodL);
      put(BOX, [i * 0.88, 0.68, 0.6], [0.3, 0.04, 0.03], PAL.dark);
    }
    put(BOX, [0, 0.96, 0.1], [4.8, 0.08, 1.05], PAL.top);
    // plants
    for (const [px, pz] of [
      [-3.6, -2.4],
      [4.9, -1.4],
    ]) {
      put(CYL, [px, 0.25, pz], [0.28, 0.5, 0.28], "#C8643C");
      for (const [dx, dy, dz, sc] of [
        [0, 0.75, 0, 0.34],
        [0.2, 0.95, 0.05, 0.26],
        [-0.2, 0.9, -0.05, 0.28],
        [0.05, 1.2, 0.02, 0.22],
        [-0.1, 1.05, 0.15, 0.2],
      ])
        put(SPH, [px + dx, dy + 0.15, pz + dz], [sc, sc * 1.1, sc], "#3FAE5C");
    }
  }

  function shadows() {
    useLit();
    gl!.depthMask(false);
    put(BOX, [0, 0.003, 0.1], [5.2, 0.004, 1.5], "#000000", null, 0.14);
    put(CYL, [-1.1, 0.004, -0.55], [0.55, 0.004, 0.4], "#000000", null, 0.18);
    put(CYL, [1.1, 0.004, -0.55], [0.55, 0.004, 0.4], "#000000", null, 0.18);
    gl!.depthMask(true);
  }

  function character(o: {
    x: number;
    z: number;
    t: number;
    bob?: number;
    shirt: string;
    vest?: boolean;
    hair: string;
    hL: number[];
    hR: number[];
    tilt?: number[];
    thumb?: boolean;
  }) {
    const { x, z } = o;
    const bob = o.bob || 0;
    const skin = "#FFFFFF",
      pants = "#2B3A55";
    // legs
    for (const sx of [-1, 1]) {
      limb([x + sx * 0.14, 0.08, z], [x + sx * 0.14, 0.8 + bob * 0.3, z], 0.1, pants);
      put(BOX, [x + sx * 0.14, 0.05, z + 0.08], [0.18, 0.1, 0.32], "#1B2433");
    }
    // torso
    put(CYL, [x, 1.075 + bob, z], [0.3, 0.75, 0.24], o.shirt);
    put(SPH, [x, 1.43 + bob, z], [0.3, 0.09, 0.24], o.shirt);
    if (o.vest) {
      put(CYL, [x, 1.03 + bob, z], [0.325, 0.62, 0.265], "#2E9E5B");
      put(BOX, [x, 1.28 + bob, z + 0.268], [0.15, 0.15, 0.02], o.shirt, [0, 0, Math.PI / 4]);
    }
    // arms
    const shL = [x - 0.36, 1.33 + bob, z],
      shR = [x + 0.36, 1.33 + bob, z];
    for (const [sh, h] of [
      [shL, o.hL],
      [shR, o.hR],
    ]) {
      limb(sh, h, 0.085, o.shirt);
      put(SPH, sh, [0.1, 0.1, 0.1], o.shirt);
      put(SPH, h, [0.105, 0.105, 0.105], skin);
    }
    if (o.thumb) {
      const h = o.hR;
      put(BOX, [h[0], h[1] + 0.14, h[2]], [0.07, 0.16, 0.07], skin);
    }
    // head (floating, faceless) + hair
    const hy = 1.86 + bob * 1.3,
      tl = o.tilt || [0, 0, 0];
    const hm = trs([x, hy, z], [tl[0], tl[1], tl[2]], [0.3, 0.3, 0.3]);
    drawLit(SPH, hm, hex(skin));
    const hm2 = trs([x, hy, z], [tl[0], tl[1], tl[2]], null);
    drawLit(
      SPH,
      mmul(hm2, mmul(mtrans([-0.015, 0.095, -0.03]), mscale([0.312, 0.288, 0.312]))),
      hex(o.hair)
    );
  }

  function camAt(t: number) {
    const K = [
      [0.0, -38, 5.2, 1.75, 0.0, 1.4, -0.4],
      [3.0, -12, 4.6, 1.7, 0.0, 1.4, -0.35],
      [5.3, 22, 3.9, 1.6, 0.0, 1.35, -0.1],
      [7.6, 52, 3.5, 1.5, 0.0, 1.3, -0.05],
      [9.4, 24, 4.1, 1.75, -0.3, 1.65, -0.55],
      [11.4, -28, 3.5, 1.85, -0.7, 1.7, -0.6],
      [13.3, -50, 3.8, 1.85, -0.3, 1.7, -0.55],
      [14.4, -24, 4.0, 1.95, 0.0, 1.95, 1.0],
      [17.2, 0, 3.7, 1.95, 0.0, 1.95, 1.0],
      [19.9, 24, 3.7, 1.95, 0.0, 1.95, 1.0],
      [21.6, 46, 5.8, 2.55, 0.0, 2.45, -0.2],
      [24.1, -38, 5.4, 2.5, 0.0, 2.45, -0.2],
    ];
    let i = 0;
    while (i < K.length - 2 && t >= K[i + 1][0]) i++;
    const k0 = K[Math.max(0, i - 1)],
      k1 = K[i],
      k2 = K[i + 1],
      k3 = K[Math.min(K.length - 1, i + 2)];
    const u = clamp((t - k1[0]) / (k2[0] - k1[0])),
      h = k2[0] - k1[0];
    const u2 = u * u,
      u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1,
      h10 = u3 - 2 * u2 + u,
      h01 = -2 * u3 + 3 * u2,
      h11 = u3 - u2;
    const val = (j: number) => {
      const m1 = i === 0 ? 0 : (k2[j] - k0[j]) / (k2[0] - k0[0]);
      const m2 = i + 1 >= K.length - 1 ? 0 : (k3[j] - k1[j]) / (k3[0] - k1[0]);
      return h00 * k1[j] + h10 * h * m1 + h01 * k2[j] + h11 * h * m2;
    };
    const az = (val(1) * Math.PI) / 180,
      R = val(2),
      cy = val(3),
      tx = val(4),
      ty = val(5),
      tz = val(6);
    return {
      pos: [tx + R * Math.sin(az), cy, tz + R * Math.cos(az)],
      tg: [tx, ty, tz],
    };
  }

  function render(t: number) {
    const asp = W / H,
      hfov = (44 * Math.PI) / 180,
      vfov = 2 * Math.atan(Math.tan(hfov / 2) / asp);
    const cam = camAt(t);
    EYE = [
      cam.pos[0] + Math.sin(t * 0.7) * 0.03,
      cam.pos[1] + Math.cos(t * 0.9) * 0.02,
      cam.pos[2],
    ];
    const tg = [cam.tg[0] + Math.sin(t * 0.5) * 0.02, cam.tg[1], cam.tg[2]];
    VIEW = lookAt(EYE, tg, [0, 1, 0]);
    VP = mmul(persp(vfov, asp, 0.1, 60, H > W ? 0.1 : 0.08), VIEW);

    gl!.viewport(0, 0, W, H);
    // Soft bright sky clear color
    gl!.clearColor(0.75, 0.88, 1, 1);
    gl!.clear(gl!.COLOR_BUFFER_BIT | gl!.DEPTH_BUFFER_BIT);

    useLit();
    room();

    // --- character poses
    const bob = Math.sin(t * 3.2) * 0.012;
    const vx = -1.1,
      vz = -0.55,
      kx = 1.1,
      kz = -0.55;
    // vendor hands
    const vRestL = [vx - 0.52, 1.02, vz + 0.25],
      vRestR = [vx + 0.52, 1.02, vz + 0.25];
    let vR = vRestR;
    const wA = win(t, 0.3, 0.7, 3.3, 3.8),
      wC = win(t, 5.0, 5.5, 9.0, 9.5),
      wD = win(t, 9.2, 9.7, 13.4, 13.9),
      wF = win(t, 20.3, 20.9, 24, 24.1);
    const ext = sm((t - 5.4) / 1.2);
    const tapeX = -0.7,
      tapeEnd = tapeX + 0.8 * ext;
    vR = lerp3(vR, [vx + 0.62, 1.55 + 0.18 * Math.sin(t * 5), vz + 0.32], wA);
    vR = lerp3(vR, [tapeEnd + 0.02, 1.04, -0.05], wC);
    vR = lerp3(vR, [vx + 0.36, 1.97 + 0.05 * Math.sin(t * 14), vz + 0.14], wD);
    vR = lerp3(vR, [vx + 0.62, 2.0 + 0.04 * Math.sin(t * 5), vz + 0.3], wF);
    let vL = vRestL;
    vL = lerp3(vL, [vx - 0.6, 1.35 + 0.06 * Math.sin(t * 4 + 1), vz + 0.3], wA * 0.6);
    const vTilt = [
      0.05 * Math.sin(t * 3) * wA + 0.1 * wD,
      0,
      0.12 * Math.sin(t * 9) * wD,
    ];
    // client hands
    const kRestL = [kx - 0.52, 1.02, kz + 0.25],
      kRestR = [kx + 0.52, 1.02, kz + 0.25];
    let kL = kRestL;
    const wKA = win(t, 3.2, 3.7, 5.4, 5.9),
      wKD = win(t, 9.4, 9.8, 13.4, 13.9);
    kL = lerp3(kL, [kx - 0.58, 1.6 + 0.07 * Math.sin(t * 6), kz + 0.3], wKA);
    kL = lerp3(kL, [kx - 0.5, 1.0 + 0.07 * Math.abs(Math.sin(t * 7)), kz + 0.45], wKD);
    const kTilt = [0, 0, 0.06 * Math.sin(t * 2)];

    character({
      x: vx,
      z: vz,
      t,
      bob,
      shirt: "#1F8A8A",
      vest: true,
      hair: "#6B4630",
      hL: vL,
      hR: vR,
      tilt: vTilt,
      thumb: wF > 0.5,
    });
    character({
      x: kx,
      z: kz,
      t,
      bob: -bob * 0.6,
      shirt: "#3D8BFD",
      vest: false,
      hair: "#2A2A33",
      hL: kL,
      hR: kRestR,
      tilt: kTilt,
    });

    // --- props on island
    const topY = 0.995;
    const pT = popS(t, 5.2, 0.5);
    if (pT > 0) {
      put(CYL, [tapeX, topY + 0.045, -0.05], [0.18 * pT, 0.09 * pT, 0.18 * pT], "#FFC83D");
      put(CYL, [tapeX, topY + 0.095, -0.05], [0.07 * pT, 0.02, 0.07 * pT], "#D9A021");
      if (ext > 0) {
        put(
          BOX,
          [tapeX + 0.4 * ext, topY + 0.012, -0.05],
          [0.8 * ext, 0.012, 0.045],
          "#FFF1B8"
        );
        for (let i = 1; i <= 8; i++) {
          const xx = tapeX + i * 0.1;
          if (xx <= tapeEnd)
            put(BOX, [xx, topY + 0.02, -0.05], [0.008, 0.004, 0.04], "#16202A");
        }
        put(BOX, [tapeEnd, topY + 0.03, -0.05], [0.03, 0.06, 0.07], "#2A2F36");
      }
    }
    const pC = popS(t, 6.4, 0.5);
    if (pC > 0) {
      put(
        BOX,
        [0.55, topY + 0.03, -0.02],
        [0.34 * pC, 0.05 * pC, 0.48 * pC],
        "#156363",
        null,
        1,
        0
      );
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 3; c++)
          put(
            BOX,
            [0.55 - 0.1 + c * 0.1, topY + 0.06, -0.02 + 0.02 + r * 0.075],
            [0.07 * pC, 0.02, 0.055 * pC],
            "#FFFFFF"
          );
    }

    // 3D wall clock
    const pCl = popS(t, 10.8, 0.5) * (1 - sm((t - 13.4) / 0.4));
    if (pCl > 0.001) {
      const cp = [0.0, 2.75, -0.5],
        s = pCl;
      put(CYL, cp, [0.38 * s, 0.08 * s, 0.38 * s], "#16202A", [Math.PI / 2, 0, 0]);
      put(CYL, [cp[0], cp[1], cp[2] + 0.045], [0.33 * s, 0.05 * s, 0.33 * s], "#FFFFFF", [
        Math.PI / 2,
        0,
        0,
      ]);
      const a = t * 2.0;
      put(
        BOX,
        [cp[0] + Math.sin(a) * 0.1 * s, cp[1] + Math.cos(a) * 0.1 * s, cp[2] + 0.09],
        [0.03 * s, 0.22 * s, 0.02],
        "#16202A",
        [0, 0, -a]
      );
      const b = t * 0.2;
      put(
        BOX,
        [cp[0] + Math.sin(b) * 0.065 * s, cp[1] + Math.cos(b) * 0.065 * s, cp[2] + 0.095],
        [0.035 * s, 0.14 * s, 0.02],
        "#16202A",
        [0, 0, -b]
      );
    }

    // sweat drop
    const pS = popS(t, 9.8, 0.4) * (1 - sm((t - 13.4) / 0.4));
    if (pS > 0.001) {
      const fall = (t * 1.1) % 1;
      put(
        SPH,
        [vx + 0.42, 2.18 - fall * 0.35, vz + 0.1],
        [0.05 * pS, 0.075 * pS, 0.05 * pS],
        "#4AA8FF"
      );
    }

    shadows();

    // --- textured / billboards
    useTex();
    gl!.depthMask(false);
    const bp = popS(t, 3.2, 0.5) * (1 - sm((t - 5.3) / 0.35));
    if (bp > 0.001)
      drawQuad("bubble", billboardModel([kx + 0.15, 2.65, kz + 0.1], 0.95 * bp, 0.74 * bp));

    const tagAt = (name: string, st: number, p: number[]) => {
      const k = popS(t, st, 0.5) * (1 - sm((t - 9.4) / 0.4));
      if (k > 0.001)
        drawQuad(
          name,
          billboardModel([p[0], p[1] + Math.sin(t * 2 + p[0]) * 0.04, p[2]], 0.85 * k, 0.34 * k)
        );
    };
    tagAt("tag1", 6.0, [0, 1.85, 0.45]);
    tagAt("tag2", 7.2, [0, 2.27, 0.45]);
    tagAt("tag3", 8.4, [0, 2.69, 0.45]);
    gl!.depthMask(true);

    // calculator screen quad
    if (pC > 0) {
      gl!.bindTexture(gl!.TEXTURE_2D, TEX.calc.t);
      const m = trs(
        [0.55, topY + 0.0565, -0.02 - 0.15],
        [-Math.PI / 2, 0, 0],
        [0.28 * pC, 0.1 * pC, 1]
      );
      drawQuad("calc", m);
    }

    // tablet (Scene E)
    const Kt = H > W ? 1 : 0.6;
    const tp = popS(t, 13.7, 0.55) * (1 - sm((t - 20.0) / 0.45));
    if (tp > 0.001) {
      updTex("screen", (c, w, h) => drawScreen(c, w, h, t));
      const ty = 1.95 + Math.sin(t * 1.3) * 0.02,
        rz = Math.sin(t * 0.9) * 0.012,
        ry = Math.sin(t * 0.6) * 0.04;
      const base = trs([0, ty, 1.0], [0, ry, rz], null);
      useLit();
      drawLit(BOX, mmul(base, mscale([1.9 * Kt * tp, 2.3 * Kt * tp, 0.08 * tp])), hex("#16202A"));
      useTex();
      const sm2 = mmul(
        base,
        mmul(mtrans([0, 0, 0.045 * tp]), mscale([1.78 * Kt * tp, 2.18 * Kt * tp, 1]))
      );
      drawQuad("screen", sm2);
    }

    // finale: logo cube + wordmark + url (Scene F)
    const fp = popS(t, 20.4, 0.6);
    if (fp > 0.001) {
      useLit();
      const lr = Math.sin(t * 0.8) * 0.35;
      const lb = trs([0, 3.95, -0.3], [0.05, lr, 0], null);
      drawLit(BOX, mmul(lb, mscale([0.85 * fp, 0.85 * fp, 0.85 * fp])), hex(C.teal));
      useTex();
      drawQuad("logoE", mmul(lb, mmul(mtrans([0, 0, 0.428 * fp]), mscale([0.8 * fp, 0.8 * fp, 1]))));
      const wp = popS(t, 20.9, 0.5),
        up = popS(t, 21.3, 0.5);
      gl!.depthMask(false);
      drawQuad("word", billboardModel([0, 3.2, -0.2], 1.9 * wp, 0.6 * wp));
      drawQuad("url", billboardModel([0, 2.68, -0.2], 3.3 * up, 0.55 * up));
      gl!.depthMask(true);
    }
  }

  // ============================================================ 2D overlay
  const CAPS: [number, number, string][] = [
    [0.45, 3.19, "Lagi meeting sama klien, lalu dia minta estimasi"],
    [3.19, 4.43, "kitchen set sekarang juga?"],
    [5.29, 9.25, "Meteran, hitung panjang, kali harga, tambah ini itu."],
    [9.25, 12.57, "Klien mulai menunggu, dan kamu masih sibuk dengan kalkulator."],
    [13.85, 17.91, "Pakai Estimator, masukkan ukuran dapur, pilih material, dan"],
    [17.91, 19.97, "RAB yang rapi langsung keluar."],
    [20.49, 23.43, "Coba sekarang di estimator.monefyi.com"],
  ];

  function wrapWords(words: string[], maxW: number) {
    const lines: string[][] = [];
    let cur: string[] = [];
    for (const w of words) {
      const test = [...cur, w].join(" ");
      if (o2.measureText(test).width > maxW && cur.length) {
        lines.push(cur);
        cur = [w];
      } else cur.push(w);
    }
    if (cur.length) lines.push(cur);
    return lines;
  }

  function caption(t: number, u: number) {
    const cur = CAPS.find(([a, b]) => t >= a - 0.1 && t <= b + 0.4);
    if (!cur) return;
    const [a, b, txt] = cur;
    const al = Math.min(clamp((t - a + 0.1) / 0.2), clamp((b + 0.4 - t) / 0.3));
    const e = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
    const sc = 0.9 + 0.1 * e((t - a + 0.1) / 0.3);
    const px = (H > W ? 66 : 54) * u,
      lh = px * 1.28,
      pad = 34 * u;
    o2.font = FONT(px);
    const words = txt.split(" ");
    const lines = wrapWords(words, W * 0.8 - 2 * pad);
    const p = clamp((t - a) / Math.max(0.2, (b - a) * 0.9));
    const n = Math.ceil(p * words.length);
    let maxw = 0;
    for (const l of lines) maxw = Math.max(maxw, o2.measureText(l.join(" ")).width);
    const bw = maxw + pad * 2,
      bh = lines.length * lh + pad;
    const x0 = W / 2,
      y0 = H * (H > W ? 0.82 : 0.855);
    o2.save();
    o2.globalAlpha = al;
    o2.translate(x0, y0);
    o2.scale(sc, sc);
    rrect(o2, -bw / 2, -bh / 2, bw, bh, 28 * u);
    o2.fillStyle = C.ink;
    o2.fill();
    o2.textBaseline = "middle";
    o2.textAlign = "left";
    o2.fillStyle = "#FFFFFF";
    let idx = 0;
    lines.forEach((l, li) => {
      const lw = o2.measureText(l.join(" ")).width;
      let x = -lw / 2;
      const y = -bh / 2 + pad * 0.5 + lh / 2 + li * lh;
      l.forEach((w) => {
        if (idx < n) o2.fillText(w, x, y);
        x += o2.measureText(w + " ").width;
        idx++;
      });
    });
    o2.restore();
  }

  function draw(t: number) {
    if (!TEX.tag1) initTextures();
    const u = W / 1080;
    render(t);
    o2.setTransform(1, 0, 0, 1, 0, 0);
    o2.drawImage(gc, 0, 0);

    // Vignette
    const g = o2.createRadialGradient(
      W / 2,
      H * 0.45,
      Math.min(W, H) * 0.35,
      W / 2,
      H * 0.45,
      Math.max(W, H) * 0.75
    );
    g.addColorStop(0, "rgba(10,20,30,0)");
    g.addColorStop(1, "rgba(10,20,30,0.13)");
    o2.fillStyle = g;
    o2.fillRect(0, 0, W, H);

    if (!HOOK) caption(t, u);
    if (HOOK) {
      o2.save();
      o2.font = FONT(80 * u);
      const l1 = "Estimasi kitchen set",
        l2 = "di depan klien?";
      const w = Math.max(o2.measureText(l1).width, o2.measureText(l2).width) + 80 * u;
      rrect(o2, W / 2 - w / 2, H * 0.07, w, 200 * u, 36 * u);
      o2.fillStyle = C.yellow;
      o2.fill();
      o2.lineWidth = 8 * u;
      o2.strokeStyle = C.ink;
      o2.stroke();
      o2.fillStyle = C.ink;
      o2.textAlign = "center";
      o2.textBaseline = "middle";
      o2.fillText(l1, W / 2, H * 0.07 + 64 * u);
      o2.fillText(l2, W / 2, H * 0.07 + 148 * u);
      o2.restore();
    }
  }

  return {
    draw,
    setSize,
    destroy: () => {
      // Free WebGL resources
      Object.values(TEX).forEach((tex) => gl.deleteTexture(tex.t));
      gl.deleteProgram(PL.p);
      gl.deleteProgram(PT.p);
    },
  };
}
