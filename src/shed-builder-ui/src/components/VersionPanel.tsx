import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';
import type { DesignVersion } from '../types';

interface Props {
  designId: string;
  versions: DesignVersion[];
  onLoadVersions: (id: string) => void;
  onSaveVersion: (id: string, label: string) => void;
  onRestoreVersion: (designId: string, versionId: string) => void;
}

export default function VersionPanel({
  designId,
  versions,
  onLoadVersions,
  onSaveVersion,
  onRestoreVersion,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [label, setLabel] = useState('');

  useEffect(() => {
    onLoadVersions(designId);
  }, [designId, onLoadVersions]);

  const handleSave = () => {
    if (label.trim()) {
      onSaveVersion(designId, label.trim());
      setLabel('');
      setDialogOpen(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6">Versions</Typography>
        <Button
          variant="outlined"
          startIcon={<SaveIcon />}
          size="small"
          onClick={() => setDialogOpen(true)}
        >
          Save Version
        </Button>
      </Box>

      <List dense>
        {versions.map((v) => (
          <ListItemButton
            key={v.id}
            onClick={() => onRestoreVersion(designId, v.id)}
          >
            <ListItemText
              primary={`v${v.versionNumber}: ${v.label}`}
              secondary={new Date(v.createdAt).toLocaleString()}
            />
            <RestoreIcon fontSize="small" color="action" />
          </ListItemButton>
        ))}
      </List>

      {versions.length === 0 && (
        <Typography variant="body2" color="text.secondary" textAlign="center" mt={2}>
          No saved versions yet.
        </Typography>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Save Version</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Version Label"
            fullWidth
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
