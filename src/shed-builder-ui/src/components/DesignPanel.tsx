import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Chip,
  Stack,
} from '@mui/material';
import type { Design, UpdateDesignRequest, SaveStatus, RoofType } from '../types';

interface Props {
  design: Design;
  onChange: (update: UpdateDesignRequest) => void;
  saveStatus: SaveStatus;
}

export default function DesignPanel({ design, onChange, saveStatus }: Props) {
  const statusColor = {
    idle: 'default' as const,
    saving: 'warning' as const,
    saved: 'success' as const,
    error: 'error' as const,
  };
  const statusLabel = {
    idle: 'Ready',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'Error saving',
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Design Parameters</Typography>
        <Chip label={statusLabel[saveStatus]} color={statusColor[saveStatus]} size="small" />
      </Stack>

      <TextField
        label="Name"
        fullWidth
        size="small"
        value={design.name}
        onChange={(e) => onChange({ name: e.target.value })}
        sx={{ mb: 2 }}
      />

      <Typography variant="subtitle2" gutterBottom>Width</Typography>
      <Stack direction="row" spacing={1} mb={2}>
        <TextField
          label="Feet"
          type="number"
          size="small"
          value={design.widthFeet}
          onChange={(e) => onChange({ widthFeet: Number(e.target.value) })}
          inputProps={{ min: 4, max: 40 }}
        />
        <TextField
          label="Inches"
          type="number"
          size="small"
          value={design.widthInches}
          onChange={(e) => onChange({ widthInches: Number(e.target.value) })}
          inputProps={{ min: 0, max: 11 }}
        />
      </Stack>

      <Typography variant="subtitle2" gutterBottom>Depth</Typography>
      <Stack direction="row" spacing={1} mb={2}>
        <TextField
          label="Feet"
          type="number"
          size="small"
          value={design.depthFeet}
          onChange={(e) => onChange({ depthFeet: Number(e.target.value) })}
          inputProps={{ min: 4, max: 40 }}
        />
        <TextField
          label="Inches"
          type="number"
          size="small"
          value={design.depthInches}
          onChange={(e) => onChange({ depthInches: Number(e.target.value) })}
          inputProps={{ min: 0, max: 11 }}
        />
      </Stack>

      <Typography variant="subtitle2" gutterBottom>Wall Height</Typography>
      <Stack direction="row" spacing={1} mb={2}>
        <TextField
          label="Feet"
          type="number"
          size="small"
          value={design.heightFeet}
          onChange={(e) => onChange({ heightFeet: Number(e.target.value) })}
          inputProps={{ min: 6, max: 16 }}
        />
        <TextField
          label="Inches"
          type="number"
          size="small"
          value={design.heightInches}
          onChange={(e) => onChange({ heightInches: Number(e.target.value) })}
          inputProps={{ min: 0, max: 11 }}
        />
      </Stack>

      <TextField
        label="Roof Pitch (rise per 12 run)"
        type="number"
        size="small"
        fullWidth
        value={design.roofPitch}
        onChange={(e) => onChange({ roofPitch: Number(e.target.value) })}
        inputProps={{ min: 1, max: 12, step: 0.5 }}
        sx={{ mb: 2 }}
      />

      <FormControl fullWidth size="small">
        <InputLabel>Roof Type</InputLabel>
        <Select
          value={design.roofType}
          label="Roof Type"
          onChange={(e) => onChange({ roofType: e.target.value as RoofType })}
        >
          <MenuItem value="Gable">Gable</MenuItem>
          <MenuItem value="LeanTo">Lean-To</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}
