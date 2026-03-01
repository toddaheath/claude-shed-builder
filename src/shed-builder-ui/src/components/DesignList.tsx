import { useMemo, useState } from 'react';
import {
  List,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  InputAdornment,
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
import SearchIcon from '@mui/icons-material/Search';
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return designs;
    return designs.filter((d) => d.name.toLowerCase().includes(q));
  }, [designs, search]);

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
        <IconButton size="small" onClick={() => setDialogOpen(true)} aria-label="Create new design">
          <AddIcon />
        </IconButton>
      </Box>

      {designs.length > 3 && (
        <Box px={1} mb={1}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search designs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
      )}

      <List dense>
        {filtered.map((d) => (
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
                aria-label={`Delete ${d.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget({ id: d.id, name: d.name });
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

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Design</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (deleteTarget) {
                onDelete(deleteTarget.id);
                setDeleteTarget(null);
              }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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
