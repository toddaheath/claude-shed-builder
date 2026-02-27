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
  DialogContentText,
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
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [restoreTarget, setRestoreTarget] = useState<DesignVersion | null>(null);

  useEffect(() => {
    onLoadVersions(designId);
  }, [designId, onLoadVersions]);

  const handleSave = () => {
    if (label.trim()) {
      onSaveVersion(designId, label.trim());
      setLabel('');
      setSaveDialogOpen(false);
    }
  };

  const handleRestore = () => {
    if (restoreTarget) {
      onRestoreVersion(designId, restoreTarget.id);
      setRestoreTarget(null);
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
          onClick={() => setSaveDialogOpen(true)}
        >
          Save Version
        </Button>
      </Box>

      <List dense>
        {versions.map((v) => (
          <ListItemButton
            key={v.id}
            onClick={() => setRestoreTarget(v)}
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

      {/* Save version dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
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
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Restore confirmation dialog */}
      <Dialog open={restoreTarget !== null} onClose={() => setRestoreTarget(null)}>
        <DialogTitle>Restore Version?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will revert the current design to{' '}
            <strong>v{restoreTarget?.versionNumber}: {restoreTarget?.label}</strong>.
            Any unsaved changes will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreTarget(null)}>Cancel</Button>
          <Button onClick={handleRestore} variant="contained" color="warning">Restore</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
