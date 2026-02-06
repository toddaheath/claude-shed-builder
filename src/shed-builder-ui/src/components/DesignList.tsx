import { useState } from 'react';
import {
  List,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Button,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import type { Design } from '../types';

interface Props {
  designs: Design[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
}

export default function DesignList({ designs, selectedId, onSelect, onCreate, onDelete }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = () => {
    if (newName.trim()) {
      onCreate(newName.trim());
      setNewName('');
      setDialogOpen(false);
    }
  };

  return (
    <Box sx={{ p: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} px={1}>
        <Typography variant="subtitle1" fontWeight="bold">Designs</Typography>
        <IconButton size="small" onClick={() => setDialogOpen(true)}>
          <AddIcon />
        </IconButton>
      </Box>

      <List dense>
        {designs.map((d) => (
          <ListItemButton
            key={d.id}
            selected={d.id === selectedId}
            onClick={() => onSelect(d.id)}
          >
            <ListItemText
              primary={d.name}
              secondary={`${d.widthFeet}'${d.widthInches ? d.widthInches + '"' : ''} × ${d.depthFeet}'${d.depthInches ? d.depthInches + '"' : ''}`}
            />
            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(d.id);
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItemButton>
        ))}
      </List>

      {designs.length === 0 && (
        <Typography variant="body2" color="text.secondary" textAlign="center" mt={2}>
          No designs yet. Create one to get started.
        </Typography>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>New Design</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Design Name"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
