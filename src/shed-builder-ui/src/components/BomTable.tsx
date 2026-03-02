import { memo, useEffect, useState } from 'react';
import {
  Alert,
  CircularProgress,
  Snackbar,
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
import TableChartIcon from '@mui/icons-material/TableChart';
import type { BomItem, BomResponse, CostBomItem, CostResponse } from '../types';
import { api } from '../services/api';

interface Props {
  designId: string;
  designName: string;
  bom: BomResponse | null;
  onLoadBom: (id: string) => void;
}

export default memo(function BomTable({ designId, designName, bom, onLoadBom }: Props) {
  const [cost, setCost] = useState<CostResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setCost(null);
    onLoadBom(designId);
    api.getCost(designId)
      .then(setCost)
      .catch(() => setCost(null))
      .finally(() => setLoading(false));
  }, [designId, onLoadBom]);

  const handleDownloadPdf = () => {
    api.downloadPdf(designId, designName).catch(() => setDownloadError('Failed to download PDF.'));
  };

  const handleDownloadStl = () => {
    api.downloadStl(designId, designName).catch(() => setDownloadError('Failed to download STL.'));
  };

  const handleExportCsv = () => {
    const items: (BomItem | CostBomItem)[] = cost?.items ?? bom?.items ?? [];
    if (items.length === 0) return;
    const withCost = cost !== null;
    const headers = ['Category', 'Material', 'Dimensions', 'Qty', 'Unit'];
    if (withCost) headers.push('Unit $', 'Total $');
    const rows = items.map((item) => {
      const row = [item.category, item.material, item.dimensions, String(item.quantity), item.unit];
      if (withCost && 'unitPrice' in item) {
        const ci = item as CostBomItem;
        row.push(ci.unitPrice.toFixed(2), ci.totalPrice.toFixed(2));
      }
      return row;
    });
    if (withCost && cost) {
      rows.push([]);
      rows.push(['', '', '', '', '', 'Grand Total', `$${cost.grandTotal.toFixed(2)}`]);
    }
    const escape = (v: string) => (v.includes(',') || v.includes('"') || v.includes('\n')) ? `"${v.replace(/"/g, '""')}"` : v;
    const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(v => escape(String(v))).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${designName}-bom.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
            onClick={handleDownloadPdf}
            size="small"
            aria-label="Download PDF report"
          >
            PDF
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadStl}
            size="small"
            aria-label="Download STL model"
          >
            STL
          </Button>
          <Button
            variant="outlined"
            startIcon={<TableChartIcon />}
            onClick={handleExportCsv}
            size="small"
            aria-label="Export CSV"
            disabled={sourceItems.length === 0}
          >
            CSV
          </Button>
        </Stack>
      </Box>

      {loading && sourceItems.length === 0 && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={32} aria-label="Loading bill of materials" />
        </Box>
      )}

      {Object.entries(grouped).map(([category, items]) => (
        <Box key={category} mb={2}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            {category}
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" aria-label={`${category} materials`}>
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
                  <TableRow key={`${item.material}-${item.dimensions}-${i}`}>
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
      <Snackbar
        open={!!downloadError}
        autoHideDuration={4000}
        onClose={() => setDownloadError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setDownloadError(null)} variant="filled">
          {downloadError}
        </Alert>
      </Snackbar>
    </Box>
  );
});
