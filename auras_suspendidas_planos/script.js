const proyectoresList = [];
let isLightMode = false;

// ==========================================
// 0. MEDIDAS DEL RECINTO (según plano recinto.jpg)
// ==========================================
const W = 7.23;              // Pared inferior
const D = 7.12;              // Pared izquierda
const RETRANQUEO = 0.65;     // Escalón de la esquina superior derecha
const UP = W - RETRANQUEO;   // Ancho de la parte superior (6.58 m)
const PUERTA = 2.0;          // Ancho de la puerta
const LADO_DER = D - PUERTA; // Pared derecha (5.12 m)
const ALTO_PUERTA = 2.05;    // Alto de la puerta
const ALTO_PARED = 2.6;      // Altura libre del recinto (2,60 m)

// Convierte coordenadas del plano (x, y) a coordenadas 3D centradas en el origen
const P = (x, y, alto = 0) => new THREE.Vector3(x - W / 2, alto, y - D / 2);

// 1. Escena, Cámara y Renderizador
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030106);
scene.fog = new THREE.FogExp2(0x030106, 0.025);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 3.2, 8.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.getElementById('canvas-container').appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.2, 0);
controls.enableDamping = true;

// UI Sliders
const zoomSlider = document.getElementById('zoomSlider');
zoomSlider.addEventListener('input', (e) => {
  const zoomVal = parseFloat(e.target.value);
  const direction = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
  camera.position.copy(controls.target).addScaledVector(direction, zoomVal);
});

const lightSlider = document.getElementById('lightSlider');
lightSlider.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  proyectoresList.forEach(item => {
    item.spotLight.intensity = val;
    item.coneMesh.material.opacity = val * (isLightMode ? 0.025 : 0.008);
  });
});

// 2. Iluminación Ambiental y Direccional
const ambientLight = new THREE.AmbientLight(0x2a1045, 0.65);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0x7a40b0, 0.55);
mainLight.position.set(2, 7, 4);
mainLight.castShadow = true;
scene.add(mainLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.25);
fillLight.position.set(-4, 5, -3);
scene.add(fillLight);

// 3. Geometría del Recinto según Plano
const roomShape = new THREE.Shape();
roomShape.moveTo(0, 0);
roomShape.lineTo(UP, 0);
roomShape.lineTo(UP, PUERTA);
roomShape.lineTo(W, PUERTA);
roomShape.lineTo(W, D);
roomShape.lineTo(0, D);
roomShape.closePath();

const floorGeo = new THREE.ShapeGeometry(roomShape);
floorGeo.rotateX(Math.PI / 2);
floorGeo.translate(-W / 2, 0, -D / 2);

const floorMat = new THREE.MeshStandardMaterial({
  color: 0x0b0714,
  roughness: 0.8,
  metalness: 0.1,
  side: THREE.DoubleSide
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.receiveShadow = true;
scene.add(floor);

// Rejillas de referencia (una para modo oscuro, otra para modo claro)
const gridDark = new THREE.GridHelper(10, 20, 0x4a148c, 0x18052e);
gridDark.position.y = 0.01;
scene.add(gridDark);

const gridLight = new THREE.GridHelper(10, 20, 0x9999a8, 0xc8c8d4);
gridLight.position.y = 0.01;
gridLight.visible = false;
scene.add(gridLight);

// Paredes
const paredMatAlta = new THREE.MeshBasicMaterial({
  color: 0x2a0a4a, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false
});
const paredMatBase = new THREE.MeshStandardMaterial({ color: 0xdddddd, emissive: 0x333333, roughness: 0.6 });

function crearPared(a, b) {
  const group = new THREE.Group();
  const pa = P(a[0], a[1]);
  const pb = P(b[0], b[1]);
  const largo = pa.distanceTo(pb);
  const mid = new THREE.Vector3().addVectors(pa, pb).multiplyScalar(0.5);
  const ang = -Math.atan2(pb.z - pa.z, pb.x - pa.x);

  const base = new THREE.Mesh(new THREE.BoxGeometry(largo, 0.15, 0.12), paredMatBase);
  base.position.set(mid.x, 0.075, mid.z);
  base.rotation.y = ang;
  group.add(base);

  const alta = new THREE.Mesh(new THREE.PlaneGeometry(largo, ALTO_PARED), paredMatAlta);
  alta.position.set(mid.x, ALTO_PARED / 2, mid.z);
  alta.rotation.y = ang;
  group.add(alta);

  return group;
}

scene.add(crearPared([0, 0], [UP, 0]));          // superior
scene.add(crearPared([0, 0], [0, D]));            // izquierda (7.12 m)
scene.add(crearPared([0, D], [W, D]));            // inferior
scene.add(crearPared([W, D], [W, PUERTA]));       // derecha (5.12 m)
scene.add(crearPared([W, PUERTA], [UP, PUERTA])); // retranqueo (0.65 m)

// Marca de la puerta
const puertaGroup = new THREE.Group();
const puertaLineMat = new THREE.LineBasicMaterial({ color: 0xff9900 });
const abertura = new THREE.BufferGeometry().setFromPoints([P(UP, 0, 0.02), P(UP, PUERTA, 0.02)]);
puertaGroup.add(new THREE.Line(abertura, puertaLineMat));

const arcoPts = [];
const radioPuerta = PUERTA / 2;
for (let i = 0; i <= 24; i++) {
  const a = (Math.PI / 2) + (i / 24) * Math.PI;
  arcoPts.push(P(UP + Math.cos(a) * radioPuerta, radioPuerta + Math.sin(a) * radioPuerta, 0.02));
}
const arcoGeo = new THREE.BufferGeometry().setFromPoints(arcoPts);
const arcoDashMat = new THREE.LineDashedMaterial({ color: 0xff9900, dashSize: 0.08, gapSize: 0.06 });
const arcoLine = new THREE.Line(arcoGeo, arcoDashMat);
arcoLine.computeLineDistances();
puertaGroup.add(arcoLine);
scene.add(puertaGroup);

// Dintel y marco de puerta
const dintel = new THREE.Mesh(
  new THREE.PlaneGeometry(PUERTA, ALTO_PARED - ALTO_PUERTA),
  paredMatAlta
);
dintel.position.copy(P(UP, PUERTA / 2, ALTO_PUERTA + (ALTO_PARED - ALTO_PUERTA) / 2));
dintel.rotation.y = Math.PI / 2;
scene.add(dintel);

const marcoPuerta = new THREE.BufferGeometry().setFromPoints([
  P(UP, 0, 0.02), P(UP, 0, ALTO_PUERTA), P(UP, PUERTA, ALTO_PUERTA), P(UP, PUERTA, 0.02)
]);
scene.add(new THREE.Line(marcoPuerta, puertaLineMat));

// TEXTURA Y MATERIAL DE TUL
function generarTexturaTul() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 64, 64);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 64; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, 0); ctx.lineTo(i, 64);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i); ctx.lineTo(64, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  return texture;
}

const texturaTul = generarTexturaTul();

const materialTulUnificado = new THREE.MeshStandardMaterial({
  color: 0x8a2be2,
  emissive: 0x240046,
  emissiveIntensity: 0.35,
  alphaMap: texturaTul,
  transparent: true,
  opacity: 0.28,
  roughness: 0.3,
  metalness: 0.1,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const tanzaLineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });

// ==========================================
// 4 PANELES VERTICALES MUY DOBLADOS Y ENTRELAZADOS
// ==========================================
const ANCHO_PANEL = 2.2;
const ALTO_PANEL = 2.10;
const ALTURA_PISO = 0.35;

function crearPanel(x, z, fase, rotY = 0) {
  const group = new THREE.Group();
  const geo = new THREE.PlaneGeometry(ANCHO_PANEL, ALTO_PANEL, 96, 36);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const t = (py + ALTO_PANEL / 2) / ALTO_PANEL;
    const suelto = 0.35 + 0.65 * (1 - t);

    const pliegues =
      Math.sin(px * 7.5 + fase) * 0.26 +
      Math.sin(px * 15.0 + fase * 1.4) * 0.10 +
      Math.cos(px * 3.5 - fase) * 0.14;

    const arco = Math.sin((px / ANCHO_PANEL + 0.5) * Math.PI * 1.5 + fase * 0.5) * 0.25 * (0.4 + 0.6 * (1 - t));
    const vuelo = Math.sin(py * 2.2 + fase) * 0.06 * (1 - t);
    const compresionX = px * 0.88 + Math.sin(py * 2.2 + fase) * 0.05 * (1 - t);

    pos.setZ(i, pliegues * suelto + arco + vuelo);
    pos.setX(i, compresionX);
  }
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, materialTulUnificado);
  mesh.position.y = ALTO_PANEL / 2;
  mesh.castShadow = true;
  group.add(mesh);

  const anchoVarilla = ANCHO_PANEL * 0.88;
  const varillaGeo = new THREE.CylinderGeometry(0.012, 0.012, anchoVarilla, 8);
  varillaGeo.rotateZ(Math.PI / 2);
  const varilla = new THREE.Mesh(varillaGeo, new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.4 }));
  varilla.position.y = ALTO_PANEL + 0.01;
  group.add(varilla);

  [-anchoVarilla / 2, anchoVarilla / 2].forEach(offX => {
    const pts = [new THREE.Vector3(offX, ALTO_PANEL, 0), new THREE.Vector3(offX, ALTO_PARED - ALTURA_PISO, 0)];
    const tanzaGeo = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(new THREE.Line(tanzaGeo, tanzaLineMat));
  });

  group.position.set(x, ALTURA_PISO, z);
  group.rotation.y = rotY;
  return group;
}

const SEP_PANELES = 0.65;
const INICIO_Z = (D - 3 * SEP_PANELES) / 2;

const configPaneles = [
  { xPlano: 3.15, zOffset: 0,             fase: 0.0, rot:  0.22 },
  { xPlano: 3.95, zOffset: SEP_PANELES,    fase: 1.5, rot: -0.25 },
  { xPlano: 3.25, zOffset: SEP_PANELES * 2, fase: 3.1, rot:  0.28 },
  { xPlano: 3.90, zOffset: SEP_PANELES * 3, fase: 4.6, rot: -0.20 }
];

configPaneles.forEach((cfg) => {
  const p = P(cfg.xPlano, INICIO_Z + cfg.zOffset);
  scene.add(crearPanel(p.x, p.z, cfg.fase, cfg.rot));
});

// ==========================================
// PARLANTES SOBRE TRÍPODE
// ==========================================
function crearParlanteTripode(posPlanoX, posPlanoY, targetX, targetZ) {
  const group = new THREE.Group();
  const pos3D = P(posPlanoX, posPlanoY, 0);

  const matMetalNegro = new THREE.MeshStandardMaterial({
    color: 0x222228,
    roughness: 0.45,
    metalness: 0.6
  });
  const matPlastico = new THREE.MeshStandardMaterial({
    color: 0x16161b,
    roughness: 0.7
  });

  const alturaMastil = 2.35;
  const mastil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.022, alturaMastil, 12),
    matMetalNegro
  );
  mastil.position.y = alturaMastil / 2 + 0.15;
  mastil.castShadow = true;
  group.add(mastil);

  const tope = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.04, 12),
    matPlastico
  );
  tope.position.y = alturaMastil + 0.15;
  group.add(tope);

  const alturaUnionPatas = 1.05;
  const aperturaBase = 0.58;
  const alturaTirantes = 0.55;

  const collarSuperior = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.08, 12),
    matPlastico
  );
  collarSuperior.position.y = alturaUnionPatas;
  group.add(collarSuperior);

  const collarInferior = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.032, 0.06, 12),
    matPlastico
  );
  collarInferior.position.y = alturaTirantes;
  group.add(collarInferior);

  for (let i = 0; i < 3; i++) {
    const angulo = (i * 2 * Math.PI) / 3 + Math.PI / 6;
    const pInicio = new THREE.Vector3(0, alturaUnionPatas, 0);
    const pFin = new THREE.Vector3(
      Math.cos(angulo) * aperturaBase,
      0.01,
      Math.sin(angulo) * aperturaBase
    );

    const largoPata = pInicio.distanceTo(pFin);
    const pata = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, largoPata, 10),
      matMetalNegro
    );
    pata.position.copy(pInicio).add(pFin).multiplyScalar(0.5);
    pata.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3().subVectors(pFin, pInicio).normalize()
    );
    pata.castShadow = true;
    group.add(pata);

    const goma = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.022, 0.03, 10),
      matPlastico
    );
    goma.position.copy(pFin);
    group.add(goma);

    const pCollar = new THREE.Vector3(0, alturaTirantes, 0);
    const pMedioPata = new THREE.Vector3().lerpVectors(pInicio, pFin, 0.52);
    const largoTirante = pCollar.distanceTo(pMedioPata);
    const tirante = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, largoTirante, 8),
      matMetalNegro
    );
    tirante.position.copy(pCollar).add(pMedioPata).multiplyScalar(0.5);
    tirante.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3().subVectors(pMedioPata, pCollar).normalize()
    );
    group.add(tirante);
  }

  const speakerGroup = new THREE.Group();
  const alturaParlante = 1.75;

  const soporteCaja = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.14, 0.08),
    matPlastico
  );
  soporteCaja.position.set(0, 0, -0.02);
  speakerGroup.add(soporteCaja);

  const anchoCaja = 0.24;
  const altoCaja = 0.36;
  const profCaja = 0.22;
  const caja = new THREE.Mesh(
    new THREE.BoxGeometry(anchoCaja, altoCaja, profCaja),
    new THREE.MeshStandardMaterial({ color: 0x202026, roughness: 0.45, metalness: 0.15 })
  );
  caja.position.set(0, 0, profCaja / 2 + 0.02);
  caja.castShadow = true;
  speakerGroup.add(caja);

  const woofer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.06, 0.02, 24),
    new THREE.MeshStandardMaterial({ color: 0x32323a, roughness: 0.6 })
  );
  woofer.rotation.x = Math.PI / 2;
  woofer.position.set(0, -0.065, profCaja + 0.022);
  speakerGroup.add(woofer);

  const tweeter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.025, 0.015, 20),
    new THREE.MeshStandardMaterial({ color: 0x3e3e48, roughness: 0.35 })
  );
  tweeter.rotation.x = Math.PI / 2;
  tweeter.position.set(0, 0.095, profCaja + 0.022);
  speakerGroup.add(tweeter);

  speakerGroup.position.y = alturaParlante;
  group.add(speakerGroup);

  group.position.copy(pos3D);
  const dx = targetX - pos3D.x;
  const dz = targetZ - pos3D.z;
  group.rotation.y = Math.atan2(dx, dz);

  return group;
}

scene.add(crearParlanteTripode(W / 2, D - 0.70, 0, 0));
scene.add(crearParlanteTripode(UP / 2, 0.70, 0, 0));

// ==========================================
// MESA DE CONTROL ACÚSTICA Y LAPTOP
// ==========================================
function crearMesaControl(posPlanoX, posPlanoY, rotY = 0) {
  const group = new THREE.Group();
  const pos3D = P(posPlanoX, posPlanoY, 0);

  const anchoMesa = 0.90;
  const profMesa = 0.45;
  const altoMesa = 0.75;
  const grosorTapa = 0.025;

  const matEstructura = new THREE.MeshStandardMaterial({
    color: 0x262630,
    roughness: 0.4,
    metalness: 0.7
  });

  const matTapa = new THREE.MeshStandardMaterial({
    color: 0x32323e,
    roughness: 0.3,
    metalness: 0.4,
    transparent: true,
    opacity: 0.88
  });

  const tapa = new THREE.Mesh(
    new THREE.BoxGeometry(anchoMesa, grosorTapa, profMesa),
    matTapa
  );
  tapa.position.y = altoMesa - grosorTapa / 2;
  tapa.castShadow = true;
  tapa.receiveShadow = true;
  group.add(tapa);

  const radioPata = 0.015;
  const altoPata = altoMesa - grosorTapa;
  const offX = anchoMesa / 2 - 0.03;
  const offZ = profMesa / 2 - 0.03;

  [
    [-offX, -offZ],
    [ offX, -offZ],
    [-offX,  offZ],
    [ offX,  offZ]
  ].forEach(([px, pz]) => {
    const pata = new THREE.Mesh(
      new THREE.CylinderGeometry(radioPata, radioPata, altoPata, 10),
      matEstructura
    );
    pata.position.set(px, altoPata / 2, pz);
    pata.castShadow = true;
    group.add(pata);
  });

  // Laptop
  const laptopGroup = new THREE.Group();
  const anchoLap = 0.35;
  const profLap = 0.24;
  const grosorBase = 0.014;

  const baseLap = new THREE.Mesh(
    new THREE.BoxGeometry(anchoLap, grosorBase, profLap),
    new THREE.MeshStandardMaterial({ color: 0x3a3a45, roughness: 0.35, metalness: 0.8 })
  );
  baseLap.position.y = grosorBase / 2;
  laptopGroup.add(baseLap);

  const pantallaPivot = new THREE.Group();
  pantallaPivot.position.set(0, grosorBase, -profLap / 2 + 0.005);
  pantallaPivot.rotation.x = -0.35;

  const carcasaPantalla = new THREE.Mesh(
    new THREE.BoxGeometry(anchoLap, profLap, 0.008),
    new THREE.MeshStandardMaterial({ color: 0x26262e, roughness: 0.3, metalness: 0.8 })
  );
  carcasaPantalla.position.set(0, profLap / 2, 0);
  pantallaPivot.add(carcasaPantalla);

  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(anchoLap - 0.02, profLap - 0.025),
    new THREE.MeshBasicMaterial({ color: 0x7b42b8 })
  );
  display.position.set(0, profLap / 2, 0.005);
  pantallaPivot.add(display);

  laptopGroup.add(pantallaPivot);
  laptopGroup.position.set(-0.08, altoMesa, 0);
  group.add(laptopGroup);

  // Interfaz de audio compacta
  const interfaz = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.045, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x1e1e24, roughness: 0.4, metalness: 0.6 })
  );
  interfaz.position.set(0.24, altoMesa + 0.0225, 0.02);
  group.add(interfaz);

  group.position.copy(pos3D);
  group.rotation.y = rotY;
  return group;
}

const POS_MESA_X = 0.85;
const POS_MESA_Y = 5.40;
scene.add(crearMesaControl(POS_MESA_X, POS_MESA_Y, -Math.PI / 2));

// ==========================================
// PROYECTORES
// ==========================================
function crearProyectorEstructural(x, y, z, targetX, targetY, targetZ, colorHex) {
  const projGroup = new THREE.Group();

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.25, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x1e1e24, roughness: 0.3 })
  );
  projGroup.add(box);

  const lente = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16),
    new THREE.MeshBasicMaterial({ color: colorHex })
  );
  lente.rotation.x = Math.PI / 2;
  lente.position.z = -0.26;
  projGroup.add(lente);

  const anguloApertura = Math.PI / 8;
  const spotLight = new THREE.SpotLight(colorHex, 1.0, 25, anguloApertura, 0.5, 1);
  spotLight.position.set(0, 0, 0);

  const targetObj = new THREE.Object3D();
  targetObj.position.set(targetX, targetY, targetZ);
  scene.add(targetObj);
  spotLight.target = targetObj;
  projGroup.add(spotLight);

  const distTotal = new THREE.Vector3(x, y, z).distanceTo(new THREE.Vector3(targetX, targetY, targetZ));
  const largoCone = distTotal * 0.45;
  const radioBase = largoCone * Math.tan(anguloApertura);

  const coneGeo = new THREE.ConeGeometry(radioBase, largoCone, 32, 1, true);
  coneGeo.translate(0, -largoCone / 2, 0);
  coneGeo.rotateX(-Math.PI / 2);

  const coneMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.008,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const coneMesh = new THREE.Mesh(coneGeo, coneMat);
  projGroup.add(coneMesh);

  projGroup.position.set(x, y, z);
  projGroup.lookAt(targetX, targetY, targetZ);

  const largoSoporte = ALTO_PARED - (y + 0.125);
  const soporte = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, largoSoporte, 8),
    new THREE.MeshStandardMaterial({ color: 0x44444c })
  );
  soporte.position.set(x, y + 0.125 + largoSoporte / 2, z);
  scene.add(soporte);

  proyectoresList.push({ spotLight, coneMesh });

  return projGroup;
}

scene.add(crearProyectorEstructural(-1.0, 2.4, -3.2, 0.0, 1.3, 0.8, 0xff7700));
scene.add(crearProyectorEstructural( 1.0, 2.4,  3.2, 0.0, 1.3, -0.8, 0xaa00ff));

// ==========================================
// SISTEMA DE COTAS Y MEDIDAS VISUALES
// ==========================================
const cotasGroup = new THREE.Group();
cotasGroup.visible = false;

function crearTextoEtiqueta(texto) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 256; canvas.height = 64;
  ctx.fillStyle = 'rgba(10, 5, 20, 0.85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'Bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(1.4, 0.35, 1);
  return sprite;
}

function crearLineaCota(p1, p2, texto) {
  const group = new THREE.Group();
  const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
  const mat = new THREE.LineDashedMaterial({ color: 0x00ffff, dashSize: 0.1, gapSize: 0.05 });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  group.add(line);

  const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  const etiqueta = crearTextoEtiqueta(texto);
  etiqueta.position.copy(midPoint);
  group.add(etiqueta);

  return group;
}

const f = (n) => n.toFixed(2).replace('.', ',');
const OFF = 0.45;
const hc = 0.02;

cotasGroup.add(crearLineaCota(P(0, D + OFF, hc), P(W, D + OFF, hc), `Inferior: ${f(W)} m`));
cotasGroup.add(crearLineaCota(P(-OFF, 0, hc), P(-OFF, D, hc), `Izquierda: ${f(D)} m`));
cotasGroup.add(crearLineaCota(P(0, -OFF, hc), P(UP, -OFF, hc), `Superior: ${f(UP)} m`));
cotasGroup.add(crearLineaCota(P(W + OFF, PUERTA, hc), P(W + OFF, D, hc), `Derecha: ${f(LADO_DER)} m`));
cotasGroup.add(crearLineaCota(P(UP, PUERTA + OFF, hc), P(W, PUERTA + OFF, hc), `Recorte: ${f(RETRANQUEO)} m`));
cotasGroup.add(crearLineaCota(P(UP + OFF, 0, hc), P(UP + OFF, PUERTA, hc), `Puerta: ${f(PUERTA)} m`));
cotasGroup.add(crearLineaCota(
  P(POS_MESA_X - 0.25, POS_MESA_Y - 0.45, 0.78),
  P(POS_MESA_X - 0.25, POS_MESA_Y + 0.45, 0.78),
  "PC y mesa: 0,90 x 0,45 m"
));
// Cota vertical agregada para el alto de la sala
cotasGroup.add(crearLineaCota(P(0, 0, 0), P(0, 0, ALTO_PARED), `Alto de sala: ${f(ALTO_PARED)} m`));

scene.add(cotasGroup);

// Botón Cotas
const toggleBtn = document.getElementById('toggleCotasBtn');
toggleBtn.addEventListener('click', () => {
  cotasGroup.visible = !cotasGroup.visible;
  toggleBtn.style.background = cotasGroup.visible ? '#00aaaa' : '#6e5288';
});

// ==========================================
// BOTÓN MODO CLARO / OSCURO
// ==========================================
const toggleThemeBtn = document.getElementById('toggleThemeBtn');
toggleThemeBtn.addEventListener('click', () => {
  isLightMode = !isLightMode;
  document.body.classList.toggle('light-mode', isLightMode);

  if (isLightMode) {
    toggleThemeBtn.textContent = 'Cambiar a Modo Oscuro';
    scene.background.setHex(0xe8eaed);
    scene.fog.color.setHex(0xe8eaed);
    scene.fog.density = 0.012;

    ambientLight.color.setHex(0xffffff);
    ambientLight.intensity = 1.25;
    mainLight.color.setHex(0xffffff);
    mainLight.intensity = 0.85;
    fillLight.intensity = 0.55;

    floorMat.color.setHex(0xd6d8df);
    gridDark.visible = false;
    gridLight.visible = true;

    paredMatBase.color.setHex(0x4a4a55);
    paredMatBase.emissive.setHex(0x111115);
    paredMatAlta.color.setHex(0x7a6896);
    paredMatAlta.opacity = 0.22;

    materialTulUnificado.blending = THREE.NormalBlending;
    materialTulUnificado.color.setHex(0x6a1b9a);
    materialTulUnificado.emissive.setHex(0x3a0066);
    materialTulUnificado.opacity = 0.36;
    materialTulUnificado.needsUpdate = true;

    tanzaLineMat.color.setHex(0x44444c);
    tanzaLineMat.opacity = 0.55;
  } else {
    toggleThemeBtn.textContent = 'Cambiar a Modo Claro';
    scene.background.setHex(0x030106);
    scene.fog.color.setHex(0x030106);
    scene.fog.density = 0.025;

    ambientLight.color.setHex(0x2a1045);
    ambientLight.intensity = 0.65;
    mainLight.color.setHex(0x7a40b0);
    mainLight.intensity = 0.55;
    fillLight.intensity = 0.25;

    floorMat.color.setHex(0x0b0714);
    gridDark.visible = true;
    gridLight.visible = false;

    paredMatBase.color.setHex(0xdddddd);
    paredMatBase.emissive.setHex(0x333333);
    paredMatAlta.color.setHex(0x2a0a4a);
    paredMatAlta.opacity = 0.14;

    materialTulUnificado.blending = THREE.AdditiveBlending;
    materialTulUnificado.color.setHex(0x8a2be2);
    materialTulUnificado.emissive.setHex(0x240046);
    materialTulUnificado.opacity = 0.28;
    materialTulUnificado.needsUpdate = true;

    tanzaLineMat.color.setHex(0xffffff);
    tanzaLineMat.opacity = 0.4;
  }

  const val = parseFloat(lightSlider.value);
  proyectoresList.forEach(item => {
    item.coneMesh.material.opacity = val * (isLightMode ? 0.025 : 0.008);
  });
});

// Bucle de Animación
function animate() {
  requestAnimationFrame(animate);
  const currentDist = camera.position.distanceTo(controls.target);
  zoomSlider.value = currentDist.toFixed(1);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});