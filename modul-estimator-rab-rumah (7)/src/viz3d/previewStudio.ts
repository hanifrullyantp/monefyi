import * as THREE from 'three';
import type { BuildingModel } from '../data/types';

/** A presentation stand for the model thumbnail. Scenery is not construction scope. */
export function previewStudio(model: BuildingModel, building: THREE.Group) {
  const { width: w, depth: d } = model.levels[0].footprint;
  const stage = new THREE.Group();
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const geometry: THREE.BufferGeometry[] = [];
  const material = (color: string) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }));
    return materials.get(color)!;
  };
  const mesh = (g: THREE.BufferGeometry, col: string, x: number, y: number, z: number) => {
    geometry.push(g);
    const m = new THREE.Mesh(g, material(col));
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; stage.add(m);
    return m;
  };
  const block = (x: number, y: number, z: number, width: number, height: number, depth: number, color: string) =>
    mesh(new THREE.BoxGeometry(width,height,depth),color,x,y,z);
  const lotW = w + 3.7, lotD = d + 3.8;
  block(0,-.34,0,lotW,.38,lotD,'#d6d2c5');
  block(0,-.12,0,lotW-.1,.08,lotD-.1,'#aebc93');
  block(0,-.02,0,w+.55,.14,d+.55,'#d9d5c6');
  block(-w*.19,-.01,-d/2-.56,2.85,.13,1.1,'#d5d2c5');
  for(let i=0;i<3;i++) block(-w*.19,-.037,-d/2-1.09-i*.33,2.0,.08,.255,'#ddd9cd');
  for(let i=0;i<6;i++) block(w*.35+.4,-.049,-d/2-.37-i*.26,1.85,.06,.225,'#d6d4c9');
  const leafGeo = new THREE.IcosahedronGeometry(1,1);
  const position = leafGeo.attributes.position;
  for (let i=0;i<position.count;i++) {
    const x=position.getX(i), y=position.getY(i), z=position.getZ(i);
    const t=.92+.12*Math.sin(x*7+z*11+y*3);
    position.setXYZ(i,x*t,y*t,z*t);
  }
  leafGeo.computeVertexNormals();geometry.push(leafGeo);
  const leaves = (x: number,y: number,z: number,rx: number,ry: number,rz: number,col: string,angle=0) => {
    const m = new THREE.Mesh(leafGeo,material(col)); m.position.set(x,y,z);m.scale.set(rx,ry,rz);m.rotation.y=angle;m.castShadow=true;m.receiveShadow=true;stage.add(m);
  };
  const tree = (x: number,z: number,h: number,t: number) => {
    mesh(new THREE.CylinderGeometry(.056,.10,h*.73,7),'#877961',x,h*.36,z);
    const branch=mesh(new THREE.CylinderGeometry(.032,.062,h*.36,6),'#8a7c65',x+.15,h*.55,z);branch.rotation.z=-.3;
    const clusters=[[-.35,-.03,.13,.91],[.42,.0,.05,.82],[-.07,.43,-.17,.85],[.05,-.17,-.41,.77],[.16,.18,.38,.75]];
    clusters.forEach(([dx,dy,dz,r],i)=>leaves(x+dx*t,h*.72+dy*t,z+dz*t,r*t,r*t*1.11,r*t,['#829571','#92a67a','#a2af80','#758b67','#8c9e71'][i],i*.88));
  };
  tree(-w/2-1.38,-d*.08,5.2,1.17);
  tree(w/2+1.05,d/2+.25,model.floors>1?5.1:3.9,1.04);
  for(const [x,z,s] of [[-w*.4,-d/2-1.14,.6],[-w*.38-.7,-d/2-1.1,.44],[w/2+.8,-d*.25,.63],[w/2+.87,-d*.25+.75,.54],[-w/2-.84,-d*.24,.52]]) {
    leaves(x,s*.56,z,s,s*.79,s*.9,'#849669',s*2);
  }
  // A fine standing-seam finish reads at thumbnail scale without changing model geometry.
  const c=document.createElement('canvas');c.width=128;c.height=128;
  const ctx=c.getContext('2d'); let texture: THREE.CanvasTexture | undefined;
  if (ctx) {
    ctx.fillStyle='#eaeae5';ctx.fillRect(0,0,128,128);
    for(let i=0;i<128;i+=20) {ctx.fillStyle='#92958f';ctx.fillRect(i,0,1.4,128);ctx.fillStyle='#f9faf3';ctx.fillRect(i+1.4,0,1.8,128);}
    texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;
  }
  building.traverse(obj=>{
    if(!(obj instanceof THREE.Mesh)) return;
    if(obj.geometry.type==='CircleGeometry') {obj.visible=false;return;}
    if (obj.userData.part?.name?.startsWith('Atap') && texture) {
      const pos=obj.geometry.attributes.position; const uvs=new Float32Array(pos.count*2);
      for(let i=0;i<pos.count;i++) {uvs[i*2]=(pos.getX(i)+pos.getZ(i))*.78;uvs[i*2+1]=pos.getY(i);}
      obj.geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));
      obj.material.map=texture;obj.material.color.set(model.floors===1?'#8a7566':'#566068');
    }
    if (obj.userData.part?.name === 'Pintu') obj.material=material('#917453');
    if (obj.userData.part?.name === 'Jendela') {obj.material=material('#687f82');obj.material.roughness=.28;
      obj.geometry.computeBoundingBox();
      const bb=obj.geometry.boundingBox as THREE.Box3;
      const cc=bb.getCenter(new THREE.Vector3()), size=bb.getSize(new THREE.Vector3());
      // Mullions and recessed sill articulate the actual opening instead of painting a new one.
      const acrossX=size.x>=size.z;
      block(cc.x,cc.y,cc.z,acrossX?.035:size.x+.015,size.y,acrossX?size.z+.015:.035,'#4a514b');
      block(cc.x,cc.y+size.y*.26,cc.z,size.x+.02,.035,size.z+.02,'#4a514b');
      block(cc.x,bb.min.y-.065,cc.z,size.x+.14,.07,size.z+.14,'#cdc7b8');}
  });
  return { stage, lotW, lotD, dispose: () => {geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());texture?.dispose();} };
}