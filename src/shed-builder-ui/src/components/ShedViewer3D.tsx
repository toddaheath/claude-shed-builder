import { memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Design, Opening, WallSide } from '../types';
import * as THREE from 'three';

interface Props {
  design: Design;
  darkMode?: boolean;
}

function toInches(feet: number, inches: number) {
  return feet * 12 + inches;
}

// Scale from inches to scene units (1 unit = 1 foot)
function scale(inches: number) {
  return inches / 12;
}

function getWallOpenings(openings: Opening[], wall: WallSide): Opening[] {
  return (openings || []).filter(o => o.wall === wall);
}

function WallWithOpenings({
  wallWidthIn,
  wallHeightIn,
  openings,
  position,
  rotation,
}: {
  wallWidthIn: number;
  wallHeightIn: number;
  openings: Opening[];
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  const w = scale(wallWidthIn);
  const h = scale(wallHeightIn);
  const wallThickness = 0.1;

  return (
    <group position={position} rotation={rotation}>
      {/* Full wall */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[w, h, wallThickness]} />
        <meshStandardMaterial color="#F5DEB3" />
      </mesh>

      {/* Opening cutouts rendered as dark boxes slightly in front */}
      {openings.map((opening, i) => {
        const ow = scale(opening.widthInches);
        const oh = scale(opening.heightInches);
        const ox = scale(opening.offsetInches + opening.widthInches / 2) - w / 2;
        const oy = scale(opening.sillHeightInches + opening.heightInches / 2) - h / 2;

        return (
          <mesh key={i} position={[ox, oy, wallThickness / 2 + 0.01]}>
            <boxGeometry args={[ow, oh, 0.02]} />
            <meshStandardMaterial color="#2C1810" />
          </mesh>
        );
      })}
    </group>
  );
}

function ShedGeometry({ design }: Props) {
  const wIn = toInches(design.widthFeet, design.widthInches);
  const dIn = toInches(design.depthFeet, design.depthInches);
  const hIn = toInches(design.heightFeet, design.heightInches);
  const w = scale(wIn);
  const d = scale(dIn);
  const h = scale(hIn);
  const pitch = design.roofPitch;

  const openings = design.openings || [];

  return (
    <group position={[-w / 2, 0, -d / 2]}>
      {/* Floor */}
      <mesh position={[w / 2, 0, d / 2]}>
        <boxGeometry args={[w, 0.1, d]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Front wall (z=0) */}
      <WallWithOpenings
        wallWidthIn={wIn}
        wallHeightIn={hIn}
        openings={getWallOpenings(openings, 'Front')}
        position={[w / 2, h / 2, 0]}
        rotation={[0, 0, 0]}
      />

      {/* Back wall (z=depth) */}
      <WallWithOpenings
        wallWidthIn={wIn}
        wallHeightIn={hIn}
        openings={getWallOpenings(openings, 'Back')}
        position={[w / 2, h / 2, d]}
        rotation={[0, 0, 0]}
      />

      {/* Left wall (x=0) */}
      <WallWithOpenings
        wallWidthIn={dIn}
        wallHeightIn={hIn}
        openings={getWallOpenings(openings, 'Left')}
        position={[0, h / 2, d / 2]}
        rotation={[0, Math.PI / 2, 0]}
      />

      {/* Right wall (x=width) */}
      <WallWithOpenings
        wallWidthIn={dIn}
        wallHeightIn={hIn}
        openings={getWallOpenings(openings, 'Right')}
        position={[w, h / 2, d / 2]}
        rotation={[0, Math.PI / 2, 0]}
      />

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

function ShedViewer3D({ design, darkMode = false }: Props) {
  const bg = darkMode ? '#1a1210' : '#e8e8e8';
  const gridColors: [string, string] = darkMode ? ['#555', '#333'] : ['#999', '#ccc'];

  return (
    <Canvas
      camera={{ position: [15, 12, 15], fov: 50 }}
      style={{ background: bg }}
    >
      <ambientLight intensity={darkMode ? 0.4 : 0.5} />
      <directionalLight position={[10, 10, 5]} intensity={darkMode ? 0.8 : 1} />
      <ShedGeometry design={design} />
      <gridHelper args={[30, 30, gridColors[0], gridColors[1]]} />
      <OrbitControls />
    </Canvas>
  );
}

export default memo(ShedViewer3D);
