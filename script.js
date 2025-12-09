import * as THREE from "https://cdn.skypack.dev/three@0.136.0";
import {OrbitControls} from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/controls/OrbitControls";
import { FontLoader } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/geometries/TextGeometry';

console.clear();

let scene = new THREE.Scene();
scene.background = new THREE.Color(0x160016);
let camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 1, 1000);
camera.position.set(0, 4, 21);
let renderer = new THREE.WebGLRenderer();
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
window.addEventListener("resize", event => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
})

let controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;

let gu = {
  time: {value: 0}
}

// --- KHỞI TẠO QUẢ CẦU VÀ CHỮ "pu" 3D ---
const group = new THREE.Group();
group.position.set(0, 0, 0);

// 1. Quả Cầu (Sphere) - HIỆU ỨNG PHÁT SÁNG & ĐẬP
const sphereGeometry = new THREE.SphereGeometry(3, 32, 32);

// Shader Material tạo hiệu ứng phát sáng mờ ảo (glowing) và thay đổi màu
const sphereMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: gu.time,
        colorA: { value: new THREE.Color(0xff69b4) }, // Hot Pink
        colorB: { value: new THREE.Color(0x9370db) }, // Medium Purple
        colorC: { value: new THREE.Color(0xadd8e6) }, // Light Blue
    },
    vertexShader: `
        uniform float time;
        varying vec3 vNormal;
        varying float vTime;

        void main() {
            vNormal = normalize(normalMatrix * normal);
            vTime = time;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float time;
        uniform vec3 colorA;
        uniform vec3 colorB;
        uniform vec3 colorC;
        varying vec3 vNormal;
        varying float vTime;

        void main() {
            // Hiệu ứng Fresnel cơ bản (Phát sáng ở các cạnh)
            float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0); 
            
            // Thay đổi màu sắc theo thời gian (kết hợp Hồng, Tím, Xanh)
            float t1 = (sin(vTime * 3.0) + 1.0) / 2.0; // Dao động 0 -> 1 chậm
            float t2 = (sin(vTime * 5.0) + 1.0) / 2.0; // Dao động 0 -> 1 nhanh hơn

            // Pha trộn 3 màu
            vec3 finalColor = mix(colorA, colorB, t1); 
            finalColor = mix(finalColor, colorC, t2 * 0.4); // Pha thêm Xanh nhạt

            // Áp dụng hiệu ứng Fresnel (tăng độ sáng ở các cạnh) và độ sáng chung
            gl_FragColor = vec4(finalColor * (1.0 + fresnel * 0.8), 1.0);
        }
    `,
    // Đặt blending: AdditiveBlending để tăng hiệu ứng phát sáng nếu cần
     
    transparent: true,
    wireframe: true // Giữ hiệu ứng lưới như yêu cầu ban đầu
});
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.scale.set(1.0, 1.0, 1.0); // Khởi tạo scale ban đầu
group.add(sphere);

// 2. Chữ pu 3D 
const loader = new FontLoader();
loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
    const textGeometry = new TextGeometry('pu', {
        font: font,
        size: 2,
        height: 0.5,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.02,
        bevelOffset: 0,
        bevelSegments: 5
    });
    
    textGeometry.computeBoundingBox();
    const centerOffset = -0.5 * (textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x);
    textGeometry.translate(centerOffset, -1, 0);

    const textMaterial = new THREE.MeshBasicMaterial({ color: 0xFFCCFF }); // VÀNG (Yellow)
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    group.add(textMesh);
});

scene.add(group);


// TẠO HIỆU ỨNG THIÊN HÀ 
let sizes = [];
let shift = [];
let pushShift = () => {
  shift.push(
    Math.random() * Math.PI, 
    Math.random() * Math.PI * 2, 
    (Math.random() * 0.9 + 0.1) * Math.PI * 0.1,
    Math.random() * 0.9 + 0.1
  );
}
let pts = new Array(25000).fill().map(p => {
  sizes.push(Math.random() * 1.5 + 0.5);
  pushShift();
  return new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 0.5 + 9.5);
})
for(let i = 0; i < 50000; i++){
  let r = 10, R = 40;
  let rand = Math.pow(Math.random(), 1.5);
  let radius = Math.sqrt(R * R * rand + (1 - rand) * r * r);
  pts.push(new THREE.Vector3().setFromCylindricalCoords(radius, Math.random() * 2 * Math.PI, (Math.random() - 0.5) * 2 ));
  sizes.push(Math.random() * 1.5 + 0.5);
  pushShift();
}

let g = new THREE.BufferGeometry().setFromPoints(pts);
g.setAttribute("sizes", new THREE.Float32BufferAttribute(sizes, 1));
g.setAttribute("shift", new THREE.Float32BufferAttribute(shift, 4));
let m = new THREE.PointsMaterial({
  size: 0.1,
  transparent: true,
  blending: THREE.AdditiveBlending,
  onBeforeCompile: shader => {
    shader.uniforms.time = gu.time;
    shader.vertexShader = `
      uniform float time;
      attribute float sizes;
      attribute vec4 shift;
      varying vec3 vColor;
      ${shader.vertexShader}
    `.replace(
      `gl_PointSize = size;`,
      `gl_PointSize = size * sizes;`
    ).replace(
      `#include <color_vertex>`,
      `#include <color_vertex>
        float d = length(abs(position) / vec3(40., 10., 40));
        d = clamp(d, 0., 1.);
        vColor = mix(vec3(227., 155., 0.), vec3(100., 50., 255.), d) / 255.;
      `
    ).replace(
      `#include <begin_vertex>`,
      `#include <begin_vertex>
        float t = time;
        float moveT = mod(shift.x + shift.z * t, PI2);
        float moveS = mod(shift.y + shift.z * t, PI2);
        transformed += vec3(cos(moveS) * sin(moveT), cos(moveT), sin(moveS) * sin(moveT)) * shift.a;
      `
    );
    shader.fragmentShader = `
      varying vec3 vColor;
      ${shader.fragmentShader}
    `.replace(
      `#include <clipping_planes_fragment>`,
      `#include <clipping_planes_fragment>
        float d = length(gl_PointCoord.xy - 0.5);
        if (d > 0.5) discard;
      `
    ).replace(
      `vec4 diffuseColor = vec4( diffuse, opacity );`,
      `vec4 diffuseColor = vec4( vColor, smoothstep(0.5, 0.2, d) * 0.5 + 0.5 );`
    );
  }
});
let p = new THREE.Points(g, m);
p.rotation.order = "ZYX";
p.rotation.z = 0.2;
scene.add(p)

let clock = new THREE.Clock();


renderer.setAnimationLoop(() => {
controls.update();
let t = clock.getElapsedTime() * 0.5;
gu.time.value = t * Math.PI;
p.rotation.y = t * 0.05;

//ANIMATION QUẢ CẦU VÀ CHỮ PU
group.rotation.y += 0.005; 
group.rotation.x = Math.sin(t * 0.5) * 0.1;
  
  // Hiệu ứng Đập/Phồng xẹp (Pulsing)
  const pulseT = t * 5.0; // Tăng tốc độ đập
  const pulseScale = 1.0 + Math.abs(Math.sin(pulseT)) * 0.1; // Biên độ đập: 10%
  sphere.scale.set(pulseScale, pulseScale, pulseScale);

renderer.render(scene, camera);
});



// Logic đánh máy chữ
var i = 0;
var txt1 = " gái đẹp oii...! <mong là nàng <<ăn no hốc kĩ  <ngày ngủ đêm bay < stay with mi      <<pupu slay...     <Chắc là xingtu =))) <<Phuong Yie~   < dè de ....! << © thanhdat07" ;
var speed = 50;
typeWriter();

function typeWriter() {
  if (i < txt1.length) {        
     if(txt1.charAt(i)=='<')
      document.getElementById("text1").innerHTML += '</br>'
    else if(txt1.charAt(i)=='>')
      document.getElementById("text1").innerHTML = ''
    else if(txt1.charAt(i)=='|')
      {
        
      }
    else
      document.getElementById("text1").innerHTML += txt1.charAt(i);
    i++;
    setTimeout(typeWriter, speed);
  }
}

const audio = document.getElementById('background-music');
const audioControl = document.getElementById('audio-control');
let isMuted = audio.muted;
let isPlaying = false; // Theo dõi trạng thái đã phát thành công lần nào chưa

// Cập nhật trạng thái hiển thị ban đầu
audioControl.textContent = isMuted ? 'Ấn dô đi cưng' : 'Tắt';
audioControl.style.backgroundColor = isMuted ? '#ff00ff' : '#e458d1ff';


// Hàm xử lý sự kiện click
audioControl.addEventListener('click', () => {
    // Nếu nhạc đang tắt tiếng (muted)
    if (audio.muted) {
        audio.muted = false; // Bật tiếng
        isMuted = false;
        
        // CHỈ GỌI PLAY NẾU NHẠC CHƯA TỪNG PHÁT THÀNH CÔNG 
        if (!isPlaying) {
             audio.play().then(() => {
                isPlaying = true;
                console.log("Nhạc đã được phát thành công.");
            }).catch(error => {
                console.error("Lỗi phát nhạc:", error);
                // Nếu vẫn lỗi, thử gọi load() trước play() để tải lại
                audio.load();
                audio.play();
            });
        }
        
        audioControl.textContent = 'Tắt Âm Thanh';
        audioControl.style.backgroundColor = '#7d4ba5ff';
        
    } else { // Nếu nhạc đang mở tiếng
        audio.muted = true; // Tắt tiếng
        isMuted = true;
        audioControl.textContent = 'Ấn dô đi cưng';
        audioControl.style.backgroundColor = '#ee4aeeff';
    }
});

// Thử phát nhạc
audio.play().catch(error => {
    console.log("Autoplay bị chặn, người dùng phải bấm nút.");
});

const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('https://example.com/texture.jpg', 
    (tex) => {},
    undefined,
    (err) => { console.error('Lỗi tải texture:', err); }
);
texture.crossOrigin = 'anonymous'; 









