import { memo, useMemo } from 'react';
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

interface OpeningDetailProps {
  ow: number;   // scaled opening width
  oh: number;   // scaled opening height
}

function DoorOpening({ ow, oh }: OpeningDetailProps) {
  const frameW = 0.04;
  return (
    <group>
      {/* Dark cutout */}
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[ow, oh, 0.02]} />
        <meshStandardMaterial color="#2C1810" />
      </mesh>
      {/* Door panel */}
      <mesh position={[0, 0, 0.015]}>
        <boxGeometry args={[ow - frameW * 2, oh - frameW * 2, 0.01]} />
        <meshStandardMaterial color="#8B6842" />
      </mesh>
      {/* Frame — top */}
      <mesh position={[0, oh / 2 - frameW / 2, 0.02]}>
        <boxGeometry args={[ow, frameW, 0.015]} />
        <meshStandardMaterial color="#5C3A1E" />
      </mesh>
      {/* Frame — bottom */}
      <mesh position={[0, -oh / 2 + frameW / 2, 0.02]}>
        <boxGeometry args={[ow, frameW, 0.015]} />
        <meshStandardMaterial color="#5C3A1E" />
      </mesh>
      {/* Frame — left */}
      <mesh position={[-ow / 2 + frameW / 2, 0, 0.02]}>
        <boxGeometry args={[frameW, oh, 0.015]} />
        <meshStandardMaterial color="#5C3A1E" />
      </mesh>
      {/* Frame — right */}
      <mesh position={[ow / 2 - frameW / 2, 0, 0.02]}>
        <boxGeometry args={[frameW, oh, 0.015]} />
        <meshStandardMaterial color="#5C3A1E" />
      </mesh>
      {/* Handle */}
      <mesh position={[ow / 2 - frameW - 0.06, 0, 0.035]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
    </group>
  );
}

function WindowOpening({ ow, oh }: OpeningDetailProps) {
  const frameW = 0.035;
  const mullionW = 0.025;
  return (
    <group>
      {/* Dark cutout */}
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[ow, oh, 0.02]} />
        <meshStandardMaterial color="#2C1810" />
      </mesh>
      {/* Glass pane */}
      <mesh position={[0, 0, 0.015]}>
        <boxGeometry args={[ow - frameW * 2, oh - frameW * 2, 0.005]} />
        <meshStandardMaterial color="#A8D8EA" transparent opacity={0.4} />
      </mesh>
      {/* Frame — top */}
      <mesh position={[0, oh / 2 - frameW / 2, 0.02]}>
        <boxGeometry args={[ow, frameW, 0.015]} />
        <meshStandardMaterial color="#5C3A1E" />
      </mesh>
      {/* Frame — bottom */}
      <mesh position={[0, -oh / 2 + frameW / 2, 0.02]}>
        <boxGeometry args={[ow, frameW, 0.015]} />
        <meshStandardMaterial color="#5C3A1E" />
      </mesh>
      {/* Frame — left */}
      <mesh position={[-ow / 2 + frameW / 2, 0, 0.02]}>
        <boxGeometry args={[frameW, oh, 0.015]} />
        <meshStandardMaterial color="#5C3A1E" />
      </mesh>
      {/* Frame — right */}
      <mesh position={[ow / 2 - frameW / 2, 0, 0.02]}>
        <boxGeometry args={[frameW, oh, 0.015]} />
        <meshStandardMaterial color="#5C3A1E" />
      </mesh>
      {/* Mullion — horizontal */}
      <mesh position={[0, 0, 0.025]}>
        <boxGeometry args={[ow - frameW * 2, mullionW, 0.01]} />
        <meshStandardMaterial color="#5C3A1E" />
      </mesh>
      {/* Mullion — vertical */}
      <mesh position={[0, 0, 0.025]}>
        <boxGeometry args={[mullionW, oh - frameW * 2, 0.01]} />
        <meshStandardMaterial color="#5C3A1E" />
      </mesh>
      {/* Sill */}
      <mesh position={[0, -oh / 2 - 0.015, 0.025]}>
        <boxGeometry args={[ow + 0.06, 0.03, 0.04]} />
        <meshStandardMaterial color="#6B4A2E" />
      </mesh>
    </group>
  );
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
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, wallThickness]} />
        <meshStandardMaterial color="#F5DEB3" />
      </mesh>

      {/* Openings */}
      {openings.map((opening) => {
        const ow = scale(opening.widthInches);
        const oh = scale(opening.heightInches);
        const ox = scale(opening.offsetInches + opening.widthInches / 2) - w / 2;
        const oy = scale(opening.sillHeightInches + opening.heightInches / 2) - h / 2;

        return (
          <group key={`${opening.wall}-${opening.type}-${opening.offsetInches}`} position={[ox, oy, wallThickness / 2]}>
            {opening.type === 'Door'
              ? <DoorOpening ow={ow} oh={oh} />
              : <WindowOpening ow={ow} oh={oh} />}
          </group>
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
      <mesh position={[w / 2, 0, d / 2]} receiveShadow castShadow>
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
        <GableRoof w={w} d={d} h={h} pitch={pitch} oh={scale(design.roofOverhangInches ?? 12)} />
      ) : (
        <LeanToRoof w={w} d={d} h={h} pitch={pitch} oh={scale(design.roofOverhangInches ?? 12)} />
      )}
    </group>
  );
}

function GableRoof({ w, d, h, pitch, oh }: { w: number; d: number; h: number; pitch: number; oh: number }) {
  const halfW = w / 2;
  const rise = (halfW * pitch) / 12;
  const rafterSpan = halfW + oh;
  const rafterRise = (rafterSpan * pitch) / 12;
  const rafterLen = Math.sqrt(rafterSpan * rafterSpan + rafterRise * rafterRise);
  const angle = Math.atan2(rise, halfW);

  return (
    <group>
      {/* Left slope */}
      <mesh position={[(halfW - oh) / 2, h + rise / 2, d / 2]} rotation={[0, 0, angle]} castShadow>
        <boxGeometry args={[rafterLen, 0.08, d + 2 * oh]} />
        <meshStandardMaterial color="#8B0000" />
      </mesh>

      {/* Right slope */}
      <mesh position={[w - (halfW - oh) / 2, h + rise / 2, d / 2]} rotation={[0, 0, -angle]} castShadow>
        <boxGeometry args={[rafterLen, 0.08, d + 2 * oh]} />
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

function LeanToRoof({ w, d, h, pitch, oh }: { w: number; d: number; h: number; pitch: number; oh: number }) {
  const rise = (w * pitch) / 12;
  const rafterSpan = w + oh;
  const rafterLen = Math.sqrt(rafterSpan * rafterSpan + ((rafterSpan * pitch) / 12) ** 2);
  const angle = Math.atan2(rise, w);

  return (
    <group>
      <mesh position={[w / 2, h + rise / 2, d / 2]} rotation={[0, 0, -angle]} castShadow>
        <boxGeometry args={[rafterLen, 0.08, d + 2 * oh]} />
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
  const wIn = toInches(design.widthFeet, design.widthInches);
  const dIn = toInches(design.depthFeet, design.depthInches);
  const hIn = toInches(design.heightFeet, design.heightInches);

  // Scale camera position based on shed size so it frames well at any size
  const camPos = useMemo((): [number, number, number] => {
    const maxDim = Math.max(scale(wIn), scale(dIn), scale(hIn));
    const dist = maxDim * 1.8 + 4;
    return [dist, dist * 0.8, dist];
  }, [wIn, dIn, hIn]);

  const gridSize = useMemo(() => {
    const maxDim = Math.max(scale(wIn), scale(dIn));
    return Math.max(30, Math.ceil(maxDim * 2 + 10));
  }, [wIn, dIn]);

  if (wIn <= 0 || dIn <= 0 || hIn <= 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' }}>
        Invalid dimensions — width, depth, and height must be greater than zero.
      </div>
    );
  }

  const bg = darkMode ? '#1a1210' : '#e8e8e8';
  const gridColors: [string, string] = darkMode ? ['#555', '#333'] : ['#999', '#ccc'];

  return (
    <Canvas
      shadows
      camera={{ position: camPos, fov: 50 }}
      style={{ background: bg }}
    >
      <ambientLight intensity={darkMode ? 0.4 : 0.5} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={darkMode ? 0.8 : 1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <ShedGeometry design={design} />
      {/* Ground plane to receive shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[gridSize, gridSize]} />
        <shadowMaterial opacity={0.3} />
      </mesh>
      <gridHelper args={[gridSize, gridSize, gridColors[0], gridColors[1]]} />
      <OrbitControls />
    </Canvas>
  );
}

export default memo(ShedViewer3D);
