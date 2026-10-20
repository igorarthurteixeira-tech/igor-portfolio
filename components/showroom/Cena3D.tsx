"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  PerformanceMonitor,
  useGLTF,
} from "@react-three/drei";

const MODELO = "/showroom/vertice-concept-2.glb";

type Entrada = {
  mesh: THREE.Mesh;
  porVariante: Record<number, THREE.Material>;
  padrao: THREE.Material | THREE.Material[];
};

type Pronto = {
  scene: THREE.Group;
  parser: { getDependency: (tipo: string, indice: number) => Promise<THREE.Material> };
};

/**
 * Deixa o material mais barato de desenhar sem mudar a aparência de forma
 * perceptível: a transmissão do vidro (que obriga a renderizar a cena de novo)
 * vira transparência simples, e a iridescência (shader caro) é desligada.
 */
function aliviar(m: THREE.Material) {
  const f = m as THREE.MeshPhysicalMaterial;
  if (!f.isMeshPhysicalMaterial) return;
  if (f.transmission > 0) {
    f.transmission = 0;
    f.transparent = true;
    // vidro escuro, como película: o interior (que é de um conceito de 3 lugares) não aparece
    f.opacity = 0.95;
    f.color.set("#0a0c10");
    f.roughness = 0.08;
  }
  f.iridescence = 0;
  f.needsUpdate = true;
}

/**
 * O modelo traz variantes de pintura (KHR_materials_variants). O three não as
 * aplica sozinho: elas ficam em userData de cada peça, e aqui montamos o mapa
 * "peça -> material de cada variante" para poder trocar a cor ao vivo.
 */
async function prepararVariantes(gltf: Pronto): Promise<Entrada[]> {
  gltf.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    // esconde o interior: o modelo é um conceito com volante central e 3 bancos na frente
    if (/^Interior|Seat|Steering|Dash|Floormat/i.test(m.name)) m.visible = false;
    (Array.isArray(m.material) ? m.material : [m.material]).forEach(aliviar);
  });

  const peças: THREE.Mesh[] = [];
  gltf.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.userData?.gltfExtensions?.KHR_materials_variants) peças.push(m);
  });
  const entradas: Entrada[] = [];
  for (const mesh of peças) {
    const mapeamentos: { material: number; variants: number[] }[] =
      mesh.userData.gltfExtensions.KHR_materials_variants.mappings ?? [];
    const porVariante: Record<number, THREE.Material> = {};
    for (const m of mapeamentos) {
      const material = await gltf.parser.getDependency("material", m.material);
      aliviar(material);
      for (const v of m.variants) porVariante[v] = material;
    }
    entradas.push({ mesh, porVariante, padrao: mesh.material });
  }
  return entradas;
}

function Carro({
  variante,
  deslocamento,
  aoFicarPronto,
}: {
  variante: number;
  deslocamento: number;
  aoFicarPronto: () => void;
}) {
  const gltf = useGLTF(MODELO) as unknown as Pronto;
  const [mapa, setMapa] = useState<Entrada[] | null>(null);
  const invalidar = useThree((s) => s.invalidate);

  useEffect(() => {
    let vivo = true;
    prepararVariantes(gltf).then((m) => {
      if (vivo) setMapa(m);
    });
    return () => {
      vivo = false;
    };
  }, [gltf]);

  useEffect(() => {
    if (!mapa) return;
    for (const e of mapa) {
      // eslint-disable-next-line react-hooks/immutability
      e.mesh.material = e.porVariante[variante] ?? e.padrao;
      const m = e.mesh.material as THREE.MeshPhysicalMaterial;
      if (m.name?.includes("Pearl") && m.isMeshPhysicalMaterial) {
        m.color.lerp(new THREE.Color("#ffffff"), 0.35);
        m.needsUpdate = true;
      }
    }
    invalidar();
  }, [mapa, variante, invalidar]);

  useEffect(() => {
    if (mapa) aoFicarPronto();
  }, [mapa, aoFicarPronto]);

  return <primitive object={gltf.scene} position={[deslocamento, 0, -0.24]} />;
}

function Palco({ deslocamento }: { deslocamento: number }) {
  return (
    <group position={[deslocamento, 0, 0]}>
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[3.3, 3.4, 0.1, 72]} />
        <meshStandardMaterial color="#2a2b31" metalness={0.7} roughness={0.38} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, 0.002, 0]}>
        <torusGeometry args={[3.22, 0.014, 8, 120]} />
        <meshBasicMaterial color="#ff2a3d" toneMapped={false} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, 0.002, 0]}>
        <torusGeometry args={[2.6, 0.006, 8, 120]} />
        <meshBasicMaterial color="#7a1822" toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function Cena3D({
  variante,
  deslocamento,
  girar,
  visivel,
  aoInteragir,
  aoFicarPronto,
}: {
  variante: number;
  deslocamento: number;
  girar: boolean;
  visivel: boolean;
  aoInteragir: (interagindo: boolean) => void;
  aoFicarPronto: () => void;
}) {
  // resolução adaptativa: começa em 1,5x e cai sozinha se o aparelho engasgar
  const [dpr, setDpr] = useState(1.5);

  return (
    <Canvas
      camera={{ position: [9.2, 2.9, 9.2], fov: 30 }}
      dpr={dpr}
      // gira = sempre desenhando; parado = só desenha quando algo muda
      frameloop={!visivel ? "never" : girar ? "always" : "demand"}
      gl={{ antialias: true, powerPreference: "high-performance", toneMappingExposure: 1.35 }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)} flipflops={3} />

      <color attach="background" args={["#18191e"]} />
      <fog attach="fog" args={["#18191e", 14, 30]} />

      <ambientLight intensity={0.55} />
      <spotLight position={[0, 9, 3]} angle={0.6} penumbra={1} intensity={140} color="#fff4e6" />

      {/* luz de estúdio procedural (desenhada uma vez só) */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={4} position={[0, 7, 0]} rotation-x={Math.PI / 2} scale={[14, 14, 1]} />
        <Lightformer form="rect" intensity={3.2} position={[-7, 2.5, 1]} rotation-y={Math.PI / 2} scale={[10, 2.5, 1]} />
        <Lightformer form="rect" intensity={3.2} position={[7, 2.5, -1]} rotation-y={-Math.PI / 2} scale={[10, 2.5, 1]} />
        <Lightformer form="rect" intensity={2.2} position={[0, 2, -8]} scale={[16, 3, 1]} />
        <Lightformer form="ring" color="#ff2a3d" intensity={2.4} position={[0, 3.5, -7]} scale={5} />
      </Environment>

      <Carro variante={variante} deslocamento={deslocamento} aoFicarPronto={aoFicarPronto} />
      <Palco deslocamento={deslocamento} />

      {/* a câmera é que gira, o carro fica parado: a sombra é calculada uma vez só */}
      <ContactShadows position={[deslocamento, 0.01, 0]} opacity={0.75} scale={9} blur={2.4} far={2.2} resolution={512} frames={1} />

      {/* piso simples (o espelhado custava um segundo desenho da cena inteira) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.11, 0]}>
        <circleGeometry args={[22, 48]} />
        <meshStandardMaterial color="#121317" metalness={0.5} roughness={0.55} />
      </mesh>

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.07}
        autoRotate={girar}
        autoRotateSpeed={1.1}
        minDistance={6.8}
        maxDistance={14}
        minPolarAngle={1.05}
        maxPolarAngle={Math.PI / 2 - 0.04}
        target={[deslocamento, 0.55, 0]}
        onStart={() => aoInteragir(true)}
        onEnd={() => aoInteragir(false)}
      />
    </Canvas>
  );
}

useGLTF.preload(MODELO);
