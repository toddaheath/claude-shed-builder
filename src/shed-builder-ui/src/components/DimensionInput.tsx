import { memo } from 'react';
import { TextField, Typography, Stack } from '@mui/material';

interface Props {
  label: string;
  feet: number;
  inches: number;
  onFeetChange: (value: number) => void;
  onInchesChange: (value: number) => void;
  minFeet?: number;
  maxFeet?: number;
}

export default memo(function DimensionInput({
  label,
  feet,
  inches,
  onFeetChange,
  onInchesChange,
  minFeet = 4,
  maxFeet = 60,
}: Props) {
  const slug = label.toLowerCase().replace(/\s+/g, '-');
  const ariaPrefix = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();

  const feetError = feet < minFeet || feet > maxFeet;
  const inchesError = inches < 0 || inches > 11;

  return (
    <>
      <Typography variant="subtitle2" gutterBottom id={`${slug}-label`}>{label}</Typography>
      <Stack direction="row" spacing={1} mb={2} role="group" aria-labelledby={`${slug}-label`}>
        <TextField
          label="Feet"
          type="number"
          size="small"
          value={feet}
          onChange={(e) => onFeetChange(Number(e.target.value))}
          inputProps={{ min: minFeet, max: maxFeet, 'aria-label': `${ariaPrefix} feet` }}
          error={feetError}
          helperText={feetError ? `${minFeet}–${maxFeet}` : undefined}
        />
        <TextField
          label="Inches"
          type="number"
          size="small"
          value={inches}
          onChange={(e) => onInchesChange(Number(e.target.value))}
          inputProps={{ min: 0, max: 11, 'aria-label': `${ariaPrefix} inches` }}
          error={inchesError}
          helperText={inchesError ? '0–11' : undefined}
        />
      </Stack>
    </>
  );
});
