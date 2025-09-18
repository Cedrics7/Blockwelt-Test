// Split/js/utils/AssetGenerator.js

import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export function generateAssets(settings, CONSTANTS, renderer) {
    const { TEXTURE_SIZES, BLOCK_TYPES } = CONSTANTS;
    const size = TEXTURE_SIZES[settings.textureQuality];
    const generated = {}, textureDataURLs = {}, materials = {};
    let grassMaterials;
    const blockGeometry = new THREE.BoxGeometry(1, 1, 1);

    // Canvas-Erstellung direkt von Spielseite.html übernommen
    function createCanvasTexture(s, drawCallback) {
        const canvas = document.createElement('canvas');
        canvas.width = s; canvas.height = s;
        const context = canvas.getContext('2d');
        drawCallback(context, s);
        const texture = new THREE.CanvasTexture(canvas);

        // Exakte Filterung für scharfen Pixel-Look
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;

        return { texture, dataURL: canvas.toDataURL() };
    }

    // Farb- und Noise-Funktionen direkt von Spielseite.html
    function lightenColor(hex, amt) { let usePound = false; if (hex[0] == "#") { hex = hex.slice(1); usePound = true; } const num = parseInt(hex,16); let r = (num >> 16) + amt; if (r > 255) r = 255; else if  (r < 0) r = 0; let b = ((num >> 8) & 0x00FF) + amt; if (b > 255) b = 255; else if  (b < 0) b = 0; let gr = (num & 0x0000FF) + amt; if (gr > 255) gr = 255; else if (gr < 0) gr = 0; return `rgb(${r},${gr},${b})`;}
    function darkenColor(hex, amt) { return lightenColor(hex, -amt); }
    const noise2D = createNoise2D(Math.random);
    const drawStone=(c,s)=>{c.fillStyle='#8a8a8a';c.fillRect(0,0,s,s);for(let i=0;i<s*s*0.5;i++){const x=Math.random()*s,y=Math.random()*s;const l=Math.floor(Math.random()*40)+100;const a=Math.random()*0.5+0.2;c.fillStyle=`rgba(${l},${l},${l}, ${a})`;c.fillRect(x,y,s/16,s/16)}for(let i=0;i<s*0.2;i++){const x=Math.random()*s,y=Math.random()*s,l=Math.floor(Math.random()*20)+80;c.fillStyle=`rgba(${l},${l},${l}, 0.1)`;c.beginPath();c.arc(x,y,Math.random()*s/4+s/8,0,Math.PI*2);c.fill()}};
    const drawOre=(c,s,color,count,scale)=>{for(let i=0;i<count*(s/16);i++){const x=Math.random()*s,y=Math.random()*s;const n=noise2D(x/(s*scale),y/(s*scale));if(n>0.5){const baseSize=Math.random()*s/5+s/16;const angle=Math.random()*Math.PI;c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=darkenColor(color,20);c.fillRect(-baseSize/2-1,-baseSize/2-1,baseSize+2,baseSize+2);c.fillStyle=color;c.fillRect(-baseSize/2,-baseSize/2,baseSize,baseSize);c.fillStyle=lightenColor(color,40);c.fillRect(-baseSize/2,-baseSize/2,baseSize*0.5,baseSize*0.5);c.fillStyle=darkenColor(color,40);c.fillRect(0,0,baseSize*0.5,baseSize*0.5);c.restore()}}};

    // Textur-Generierung 1:1 wie in Spielseite.html
    const {texture: st,dataURL: su}=createCanvasTexture(size,drawStone);generated[BLOCK_TYPES.STONE]=st;textureDataURLs[BLOCK_TYPES.STONE]=su;
    const {texture: dt,dataURL: du}=createCanvasTexture(size,(c,s)=>{c.fillStyle='#966C4A';c.fillRect(0,0,s,s);for(let i=0;i<s*s*0.6;i++){const x=Math.random()*s,y=Math.random()*s,l=Math.floor(Math.random()*30)+90;c.fillStyle=`rgb(${l},${Math.floor(l*0.7)},${Math.floor(l*0.5)})`;c.fillRect(x,y,s/16,s/16)}});generated[BLOCK_TYPES.DIRT]=dt;textureDataURLs[BLOCK_TYPES.DIRT]=du;
    const {texture: sdt,dataURL: sdu}=createCanvasTexture(size,(c,s)=>{c.fillStyle='#F4A460';c.fillRect(0,0,s,s);for(let i=0;i<s*s*0.6;i++){const x=Math.random()*s,y=Math.random()*s,l=Math.floor(Math.random()*30)+200;c.fillStyle=`rgb(${l},${Math.floor(l*0.8)},${Math.floor(l*0.5)})`;c.fillRect(x,y,s/16,s/16)}});generated[BLOCK_TYPES.SAND]=sdt;textureDataURLs[BLOCK_TYPES.SAND]=sdu;
    const {texture: grassTop, dataURL: grassTopURL} = createCanvasTexture(size, (c,s) => { c.fillStyle='#82C464';c.fillRect(0,0,s,s); for(let i=0;i<s*s*0.4;i++){const x=Math.random()*s,y=Math.random()*s,l=Math.floor(Math.random()*30)+130;c.fillStyle=`rgb(${Math.floor(l*0.6)},${l},${Math.floor(l*0.4)})`;c.fillRect(x,y,s/16,s/16)}});
    generated[BLOCK_TYPES.GRASS] = grassTop; textureDataURLs[BLOCK_TYPES.GRASS] = grassTopURL;
    const {texture: grassSide} = createCanvasTexture(size, (c,s) => { c.drawImage(dt.image,0,0,s,s); c.fillStyle='#82C464';c.fillRect(0,0,s,s*0.3); for(let i=0;i<s*s*0.2;i++){const x=Math.random()*s,y=Math.random()*s*0.3,l=Math.floor(Math.random()*40)+110;c.fillStyle=`rgb(${Math.floor(l*0.5)},${l},${Math.floor(l*0.4)})`;c.fillRect(x,y,s/8,s/8)}});
    grassMaterials=[new THREE.MeshLambertMaterial({map:grassSide}),new THREE.MeshLambertMaterial({map:grassSide}),new THREE.MeshLambertMaterial({map:grassTop}),new THREE.MeshLambertMaterial({map:dt}),new THREE.MeshLambertMaterial({map:grassSide}),new THREE.MeshLambertMaterial({map:grassSide})];
    const{texture:lt,dataURL:lu}=createCanvasTexture(size,(c,s)=>{c.fillStyle='#FF4500';c.fillRect(0,0,s,s);for(let i=0;i<s*s*0.3;i++){const x=Math.random()*s,y=Math.random()*s,l=Math.floor(Math.random()*100)+155;c.fillStyle=`rgba(255,${l},0,0.8)`;c.beginPath();c.arc(x,y,Math.random()*s/4,0,2*Math.PI);c.fill()}});generated[BLOCK_TYPES.LAVA]=lt;textureDataURLs[BLOCK_TYPES.LAVA]=lu;
    const{texture:ct,dataURL:cu}=createCanvasTexture(size,(c,s)=>{drawStone(c,s);drawOre(c,s,'#282828',15,0.2)});generated[BLOCK_TYPES.COAL_ORE]=ct;textureDataURLs[BLOCK_TYPES.COAL_ORE]=cu;
    const{texture:it,dataURL:iu}=createCanvasTexture(size,(c,s)=>{drawStone(c,s);drawOre(c,s,'#AF4F2F',12,0.3)});generated[BLOCK_TYPES.IRON_ORE]=it;textureDataURLs[BLOCK_TYPES.IRON_ORE]=iu;
    const{texture:got,dataURL:gou}=createCanvasTexture(size,(c,s)=>{drawStone(c,s);drawOre(c,s,'#FFD700',8,0.4)});generated[BLOCK_TYPES.GOLD_ORE]=got;textureDataURLs[BLOCK_TYPES.GOLD_ORE]=gou;
    const{texture:tt,dataURL:tu}=createCanvasTexture(size,(c,s)=>{drawStone(c,s);drawOre(c,s,'#B0C4DE',6,0.5)});generated[BLOCK_TYPES.TITANIUM_ORE]=tt;textureDataURLs[BLOCK_TYPES.TITANIUM_ORE]=tu;

    // Materialien erstellen
    for(const key in generated) { if(key != BLOCK_TYPES.GRASS) { materials[key] = new THREE.MeshLambertMaterial({ map: generated[key] }); } }
    materials[BLOCK_TYPES.LAVA].emissive=new THREE.Color('#FF6600');materials[BLOCK_TYPES.LAVA].emissiveIntensity=0.5;

    return { textureDataURLs, materials, grassMaterials, blockGeometry };
}