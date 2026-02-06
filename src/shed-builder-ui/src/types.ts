export type RoofType = 'Gable' | 'LeanTo';

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
  createdAt: string;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
