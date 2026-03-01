import { useEffect, useState } from 'react';
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
  Stack,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import type { BomItem, BomResponse, CostBomItem, CostResponse } from '../types';
import { api } from '../services/api';

interface Props {
  designId: string;
  designName: string;
  bom: BomResponse | null;
  onLoadBom: (id: string) => void;
}

export default function BomTable({ designId, designName, bom, onLoadBom }: Props) {
  const [cost, setCost] = useState<CostResponse | null>(null);

  useEffect(() => {
    onLoadBom(designId);
    api.getCost(designId).then(setCost).catch(() => setCost(null));
  }, [designId, onLoadBom]);

  const hasCost = cost !== null;
  const sourceItems: (BomItem | CostBomItem)[] = cost?.items ?? bom?.items ?? [];
  const grouped = sourceItems.reduce<Record<string, (BomItem | CostBomItem)[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <Box sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Bill of Materials</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<PictureAsPdfIcon />}
            onClick={() => api.downloadPdf(designId, designName)}
            size="small"
          >
            PDF
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => api.downloadStl(designId, designName)}
            size="small"
          >
            STL
          </Button>
        </Stack>
      </Box>

      {Object.entries(grouped).map(([category, items]) => (
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
                  {hasCost && <TableCell align="right">Unit $</TableCell>}
                  {hasCost && <TableCell align="right">Total $</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>{item.material}</TableCell>
                    <TableCell>{item.dimensions}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    {hasCost && 'unitPrice' in item && (
                      <>
                        <TableCell align="right">${(item as CostBomItem).unitPrice.toFixed(0)}</TableCell>
                        <TableCell align="right">${(item as CostBomItem).totalPrice.toFixed(0)}</TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}

      {hasCost && (
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Typography variant="h6" color="primary">
            Grand Total: ${cost.grandTotal.toFixed(2)}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
