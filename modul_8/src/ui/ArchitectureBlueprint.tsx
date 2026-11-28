import type { ReactNode } from 'react';

type Point = [number, number, number];
const iso = ([x, y, z]: Point) => [63 + x * 18.4 + y * 14.3, 156 + x * 6.2 - y * 8.3 - z * 20.5];
const points = (vertices: Point[]) => vertices.map(p => iso(p).join(',')).join(' ');

/** Architectural line study, not a project rendering or a source of measured quantities. */
export function ArchitectureBlueprint() {
  const art: ReactNode[] = [];
  let id = 0;
  const line = (a: Point, b: Point, opacity = 1, width = 0.85, dash?: string) =>
    art.push(<polyline key={id++} points={points([a, b])} fill="none" stroke="currentColor" strokeWidth={width} opacity={opacity} strokeDasharray={dash} />);
  const face = (v: Point[], color = '#286b54', width = 1.15) =>
    art.push(<polygon key={id++} points={points(v)} fill={color} stroke="currentColor" strokeWidth={width} strokeLinejoin="round" />);
  const block = (x: number, y: number, z: number, w: number, d: number, h: number, color = '#286b54') => {
    face([[x,y,z],[x+w,y,z],[x+w,y,z+h],[x,y,z+h]],color);
    face([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]],'#22654e');
    face([[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]],'#36745b');
  };
  const window = (x: number,y: number,z: number,w: number,h: number, side = false) => {
    const p = (u: number,v: number): Point => side ? [x,y+u,z+v] : [x+u,y,z+v];
    face([p(0,0),p(w,0),p(w,h),p(0,h)],'#1d5a46',1.1);
    face([p(.1,.1),p(w-.1,.1),p(w-.1,h-.1),p(.1,h-.1)],'#387864',.6);
    line(p(w/2,0),p(w/2,h)); line(p(0,h*.78),p(w,h*.78),.7,.65);
    line(p(w*.19,h*.2),p(w*.48,h*.65),.3,.5); line(p(w*.23,h*.2),p(w*.49,h*.59),.3,.5);
  };
  // Drafting guides, construction axes and dimension ticks.
  for (let i = -4;i <= 18;i+=2) line([i,-5,0],[i,12,0],.13,.5);
  for (let i = -5;i <= 12;i+=2) line([-4,i,0],[18,i,0],.13,.5);
  line([-2,-3.1,-.3],[15,-3.1,-.3],.62); line([15.8,-2.5,-.3],[15.8,8.7,-.3],.54);
  for(const x of [-1,0,4,9.3,13.1]) { line([x,-3.35,-.6],[x,-2.9,0],.8); line([x,-3.7,0],[x,8,0],.25,.5,'6 4'); }
  for(const y of [-2,0,6.5,8]) line([15.6,y,-.5],[16,y,-.1],.8);
  block(-1.1,-2,-.16,15.2,10.3,.17,'#2a6c52');
  block(-.3,-.7,.02,10,7.5,.3);
  block(0,0,.32,9.3,6.5,3.55);
  window(.6,-.015,1.0,2.65,2.28);window(3.85,-.015,.33,2.1,2.95);window(6.4,-.015,.85,2.3,2.4);
  window(9.31,1,.95,2.4,2.2,true);window(9.31,4.05,.95,1.8,2.2,true);
  for(let i=0;i<12;i++) line([.02+i*.3,0,.55],[.02+i*.3,0,.68],.65,.55);
  block(-.55,-.48,3.82,10.35,7.43,.19,'#1d5b45');
  const z=4.02, ridge=6.48;
  face([[-.55,-.48,z],[9.8,-.48,z],[7.7,3.1,ridge],[1.75,3.1,ridge]],'#33795e');
  face([[9.8,-.48,z],[9.8,6.95,z],[7.7,3.1,ridge]],'#286c50');
  face([[1.75,3.1,ridge],[7.7,3.1,ridge],[9.8,6.95,z],[-.55,6.95,z]],'#36765c');
  for(let i=1;i<31;i++) {
    const t=i/31;
    line([-.55+10.35*t,-.48,z],[1.75+5.95*t,3.1,ridge],.65,.6);
  }
  for(let i=1;i<13;i++) { const t=i/13;line([-.55+2.3*t,-.48+3.58*t,z+2.46*t],[9.8-2.1*t,-.48+3.58*t,z+2.46*t],.55,.6); }
  for(let i=1;i<14;i++) line([9.8,-.48+7.43*i/14,z],[7.7,3.1,ridge],.48,.6);
  line([1.7,3.1,ridge+.07],[7.8,3.1,ridge+.07],1,1.8);
  // Lower porch, steps, clerestory and timber screening.
  block(8.55,.3,.05,4.5,5.8,.26);block(9.3,1.1,.31,3.4,4.7,2.77);
  window(9.65,1.09,.34,2.55,2.33);
  block(9.1,-.7,2.98,4.3,6.8,.2,'#2c6e54');
  for(let i=0;i<20;i++) line([9.12+i*.218,-.68,3.19],[9.12+i*.218,6.1,3.19],.5,.55);
  for(const x of [9.3,13.17]) block(x,-.5,.25,.12,.12,2.72);
  for(let j=0;j<10;j++) block(12.75,1.15+j*.45,.32,.065,.09,2.65,'#397d60');
  for(let i=0;i<3;i++) block(3.38,-1.85+i*.35,.02,3.1,.4,.1+i*.1);
  line([-1.7,7.3,-.5],[-1.7,7.3,7.8],.45,.6,'5 4');
  line([-2.1,7.3,.3],[-1.3,7.3,.3],.7); line([-2.1,7.3,6.5],[-1.3,7.3,6.5],.7);
  return <svg className="architecture-blueprint" viewBox="-28 -20 498 295" aria-hidden="true" focusable="false">
    <g>{art}</g>
    <g stroke="currentColor" opacity=".38" strokeWidth=".7"><path d="M21 49v9m-4.5-4.5h9M420 218v9m-4.5-4.5h9M319 15v9m-4.5-4.5h9" /></g>
    <g fill="currentColor" opacity=".63" fontFamily="monospace" fontSize="6.5" letterSpacing="1.2"><text x="267" y="271">PERSPEKTIF ISOMETRIK</text><text x="87" y="191">A</text><text x="420" y="157">B</text></g>
  </svg>;
}