import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Design } from '../types';
import * as THREE from 'three';

interface Props {
  design: Design;
}

function toInches(feet: number, inches: number) {
  return feet * 12 + inches;
}

// Scale from inches to scene units (1 unit = 1 foot)
function scale(inches: number) {
  return inches / 12;
}

function ShedGeometry({ design }: Props) {
  const w = scale(toInches(design.widthFeet, design.widthInches));
  const d = scale(toInches(design.depthFeet, design.depthInches));
  const h = scale(toInches(design.heightFeet, design.heightInches));
  const pitch = design.roofPitch;

  const wallThickness = 0.1;

  return (
    <group position={[-w / 2, 0, -d / 2]}>
      {/* Floor */}
      <mesh position={[w / 2, 0, d / 2]}>
        <boxGeometry args={[w, wallThickness, d]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Front wall */}
      <mesh position={[w / 2, h / 2, 0]}>
        <boxGeometry args={[w, h, wallThickness]} />
        <meshStandardMaterial color="#F5DEB3" />
      </mesh>

      {/* Back wall */}
      <mesh position={[w / 2, h / 2, d]}>
        <boxGeometry args={[w, h, wallThickness]} />
        <meshStandardMaterial color="#F5DEB3" />
      </mesh>

      {/* Left wall */}
      <mesh position={[0, h / 2, d / 2]}>
        <boxGeometry args={[wallThickness, h, d]} />
        <meshStandardMaterial color="#F5DEB3" />
      </mesh>

      {/* Right wall */}
      <mesh position={[w, h / 2, d / 2]}>
        <boxGeometry args={[wallThickness, h, d]} />
        <meshStandardMaterial color="#F5DEB3" />
      </mesh>

      {/* Roof */}
      {design.roofType === 'Gable' ? (
        <GableRoof w={w} d={d} h={h} pitch={pitch} />
      ) : (
        <LeanToRoof w={w} d={d} h={h} pitch={pitch} />
      )}
    </group>
  );
}

function GableRoof({ w, d, h, pitch }: { w: number; d: number; h: number; pitch: number }) {
  const halfW = w / 2;
  const rise = (halfW * pitch) / 12;
  const rafterLen = Math.sqrt(halfW * halfW + rise * rise);
  const angle = Math.atan2(rise, halfW);

  return (
    <group>
      {/* Left slope */}
      <mesh position={[halfW / 2, h + rise / 2, d / 2]} rotation={[0, 0, angle]}>
        <boxGeometry args={[rafterLen, 0.08, d + 0.2]} />
        <meshStandardMaterial color="#8B0000" />
      </mesh>

      {/* Right slope */}
      <mesh position={[w - halfW / 2, h + rise / 2, d / 2]} rotation={[0, 0, -angle]}>
        <boxGeometry args={[rafterLen, 0.08, d + 0.2]} />
        <meshStandardMaterial color="#8B0000" />
      </mesh>

      {/* Front gable fill */}
      <mesh position={[w / 2, h + rise / 2, 0]}>
        <GableTriangle w={w} rise={rise} />
        <meshStandardMaterial color="#F5DEB3" side={THREE.DoubleSide} />
      </mesh>

      {/* Back gable fill */}
      <mesh position={[w / 2, h + rise / 2, d]}>
        <GableTriangle w={w} rise={rise} />
        <meshStandardMaterial color="#F5DEB3" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function GableTriangle({ w, rise }: { w: number; rise: number }) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, -rise / 2);
  shape.lineTo(0, rise / 2);
  shape.lineTo(w / 2, -rise / 2);
  shape.closePath();
  return <shapeGeometry args={[shape]} />;
}

function LeanToRoof({ w, d, h, pitch }: { w: number; d: number; h: number; pitch: number }) {
  const rise = (w * pitch) / 12;
  const rafterLen = Math.sqrt(w * w + rise * rise);
  const angle = Math.atan2(rise, w);

  return (
    <group>
      <mesh position={[w / 2, h + rise / 2, d / 2]} rotation={[0, 0, -angle]}>
        <boxGeometry args={[rafterLen, 0.08, d + 0.2]} />
        <meshStandardMaterial color="#8B0000" />
      </mesh>

      {/* Front triangle fill */}
      <mesh position={[w / 2, h + rise / 2, 0]}>
        <LeanToTriangle w={w} rise={rise} />
        <meshStandardMaterial color="#F5DEB3" side={THREE.DoubleSide} />
      </mesh>

      {/* Back triangle fill */}
      <mesh position={[w / 2, h + rise / 2, d]}>
        <LeanToTriangle w={w} rise={rise} />
        <meshStandardMaterial color="#F5DEB3" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function LeanToTriangle({ w, rise }: { w: number; rise: number }) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, -rise / 2);
  shape.lineTo(-w / 2, rise / 2);
  shape.lineTo(w / 2, -rise / 2);
  shape.closePath();
  return <shapeGeometry args={[shape]} />;
}

export default function ShedViewer3D({ design }: Props) {
  return (
    <Canvas
      camera={{ position: [15, 12, 15], fov: 50 }}
      style={{ background: '#e8e8e8' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <ShedGeometry design={design} />
      <gridHelper args={[30, 30, '#999', '#ccc']} />
      <OrbitControls />
    </Canvas>
  );
}
