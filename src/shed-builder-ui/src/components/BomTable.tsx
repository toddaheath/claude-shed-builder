import { useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Button,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import type { BomResponse } from '../types';
import { api } from '../services/api';

interface Props {
  designId: string;
  designName: string;
  bom: BomResponse | null;
  onLoadBom: (id: string) => void;
}

export default function BomTable({ designId, designName, bom, onLoadBom }: Props) {
  useEffect(() => {
    onLoadBom(designId);
  }, [designId, onLoadBom]);

  const grouped = bom?.items.reduce<Record<string, typeof bom.items>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <Box sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Bill of Materials</Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => api.downloadStl(designId, designName)}
          size="small"
        >
          Export STL
        </Button>
      </Box>

      {grouped && Object.entries(grouped).map(([category, items]) => (
        <Box key={category} mb={2}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            {category}
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Material</TableCell>
                  <TableCell>Dimensions</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell>Unit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>{item.material}</TableCell>
                    <TableCell>{item.dimensions}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}
    </Box>
  );
}
