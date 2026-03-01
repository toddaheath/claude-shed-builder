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
  Button,
  IconButton,
  Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import type { Design, UpdateDesignRequest, SaveStatus, RoofType, Opening, OpeningType, WallSide } from '../types';

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

  const addOpening = () => {
    const newOpening: Opening = {
      type: 'Door',
      wall: 'Front',
      offsetInches: 24,
      widthInches: 36,
      heightInches: 80,
      sillHeightInches: 0,
    };
    onChange({ openings: [...(design.openings || []), newOpening] });
  };

  const updateOpening = (index: number, updates: Partial<Opening>) => {
    const openings = [...(design.openings || [])];
    openings[index] = { ...openings[index], ...updates };
    onChange({ openings });
  };

  const removeOpening = (index: number) => {
    const openings = (design.openings || []).filter((_, i) => i !== index);
    onChange({ openings });
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
          inputProps={{ min: 4, max: 60 }}
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
          inputProps={{ min: 4, max: 60 }}
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
          inputProps={{ min: 6, max: 20 }}
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

      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
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

      <Divider sx={{ my: 2 }} />

      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="subtitle1">Doors & Windows</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={addOpening}>
          Add
        </Button>
      </Stack>

      {(design.openings || []).map((opening, index) => (
        <Box key={index} sx={{ mb: 2, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" fontWeight="bold">
              {opening.type} #{index + 1}
            </Typography>
            <IconButton size="small" onClick={() => removeOpening(index)} aria-label={`Remove ${opening.type} #${index + 1}`}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Stack direction="row" spacing={1} mb={1}>
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={opening.type}
                label="Type"
                onChange={(e) => updateOpening(index, { type: e.target.value as OpeningType })}
              >
                <MenuItem value="Door">Door</MenuItem>
                <MenuItem value="Window">Window</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <InputLabel>Wall</InputLabel>
              <Select
                value={opening.wall}
                label="Wall"
                onChange={(e) => updateOpening(index, { wall: e.target.value as WallSide })}
              >
                <MenuItem value="Front">Front</MenuItem>
                <MenuItem value="Back">Back</MenuItem>
                <MenuItem value="Left">Left</MenuItem>
                <MenuItem value="Right">Right</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" spacing={1} mb={1}>
            <TextField
              label="Width (in)"
              type="number"
              size="small"
              value={opening.widthInches}
              onChange={(e) => updateOpening(index, { widthInches: Number(e.target.value) })}
              inputProps={{ min: 12, max: 120 }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Height (in)"
              type="number"
              size="small"
              value={opening.heightInches}
              onChange={(e) => updateOpening(index, { heightInches: Number(e.target.value) })}
              inputProps={{ min: 12, max: 120 }}
              sx={{ flex: 1 }}
            />
          </Stack>

          <Stack direction="row" spacing={1}>
            <TextField
              label="Offset (in)"
              type="number"
              size="small"
              value={opening.offsetInches}
              onChange={(e) => updateOpening(index, { offsetInches: Number(e.target.value) })}
              inputProps={{ min: 0 }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Sill (in)"
              type="number"
              size="small"
              value={opening.sillHeightInches}
              onChange={(e) => updateOpening(index, { sillHeightInches: Number(e.target.value) })}
              inputProps={{ min: 0 }}
              sx={{ flex: 1 }}
            />
          </Stack>
        </Box>
      ))}
    </Box>
  );
}
