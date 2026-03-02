export type RoofType = 'Gable' | 'LeanTo';
export type OpeningType = 'Door' | 'Window';
export type WallSide = 'Front' | 'Back' | 'Left' | 'Right';

export interface Opening {
  type: OpeningType;
  wall: WallSide;
  offsetInches: number;
  widthInches: number;
  heightInches: number;
  sillHeightInches: number;
}

export interface Design {
  id: string;
  name: string;
  widthFeet: number;
  widthInches: number;
  depthFeet: number;
  depthInches: number;
  heightFeet: number;
  heightInches: number;
  roofPitch: number;
  roofType: RoofType;
  roofOverhangInches: number;
  openings: Opening[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDesignRequest {
  name: string;
  widthFeet?: number;
  widthInches?: number;
  depthFeet?: number;
  depthInches?: number;
  heightFeet?: number;
  heightInches?: number;
  roofPitch?: number;
  roofType?: RoofType;
  roofOverhangInches?: number;
  openings?: Opening[];
}

export interface UpdateDesignRequest {
  name?: string;
  widthFeet?: number;
  widthInches?: number;
  depthFeet?: number;
  depthInches?: number;
  heightFeet?: number;
  heightInches?: number;
  roofPitch?: number;
  roofType?: RoofType;
  roofOverhangInches?: number;
  openings?: Opening[];
}

export interface BomItem {
  material: string;
  dimensions: string;
  quantity: number;
  unit: string;
  category: string;
}

export interface BomResponse {
  designId: string;
  items: BomItem[];
}

export interface CostBomItem {
  material: string;
  dimensions: string;
  quantity: number;
  unit: string;
  category: string;
  unitPrice: number;
  totalPrice: number;
}

export interface CostResponse {
  designId: string;
  items: CostBomItem[];
  grandTotal: number;
}

export interface DesignVersion {
  id: string;
  designId: string;
  versionNumber: number;
  label: string;
  widthFeet: number;
  widthInches: number;
  depthFeet: number;
  depthInches: number;
  heightFeet: number;
  heightInches: number;
  roofPitch: number;
  roofType: RoofType;
  roofOverhangInches: number;
  openings: Opening[];
  createdAt: string;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  name: string;
  email: string;
}
