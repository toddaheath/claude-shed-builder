import { useState, useMemo, useCallback } from 'react';
import {
  Box,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  Tab,
  Tabs,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { Design, UpdateDesignRequest } from '../types';
import { useDesignApi } from '../hooks/useDesignApi';
import { useAutoSave } from '../hooks/useAutoSave';
import ShedViewer3D from './ShedViewer3D';
import DesignPanel from './DesignPanel';
import DesignList from './DesignList';
import BomTable from './BomTable';
import VersionPanel from './VersionPanel';

const drawerWidth = 280;
const rightPanelWidth = 380;

const theme = createTheme({
  palette: {
    primary: { main: '#5D4037' },
    secondary: { main: '#8D6E63' },
  },
});

export default function App() {
  const {
    designs,
    currentDesign,
    bom,
    versions,
    setCurrentDesign,
    loadDesign,
    createDesign,
    deleteDesign,
    loadBom,
    loadVersions,
    createVersion,
    restoreVersion,
  } = useDesignApi();

  const [rightTab, setRightTab] = useState(0);
  const [localDesign, setLocalDesign] = useState<Design | null>(null);

  // Sync localDesign when currentDesign changes from API
  const activeDesign = localDesign?.id === currentDesign?.id ? localDesign : currentDesign;

  const updateData = useMemo<UpdateDesignRequest | null>(() => {
    if (!activeDesign) return null;
    return {
      name: activeDesign.name,
      widthFeet: activeDesign.widthFeet,
      widthInches: activeDesign.widthInches,
      depthFeet: activeDesign.depthFeet,
      depthInches: activeDesign.depthInches,
      heightFeet: activeDesign.heightFeet,
      heightInches: activeDesign.heightInches,
      roofPitch: activeDesign.roofPitch,
      roofType: activeDesign.roofType,
    };
  }, [activeDesign]);

  const saveStatus = useAutoSave(activeDesign?.id ?? null, updateData);

  const handleDesignChange = useCallback(
    (update: UpdateDesignRequest) => {
      if (!activeDesign) return;
      const merged = { ...activeDesign, ...update } as Design;
      setLocalDesign(merged);
      setCurrentDesign(merged);
    },
    [activeDesign, setCurrentDesign]
  );

  const handleSelectDesign = useCallback(
    (id: string) => {
      setLocalDesign(null);
      loadDesign(id);
    },
    [loadDesign]
  );

  const handleCreateDesign = useCallback(
    (name: string) => {
      createDesign({ name }).then((d) => setLocalDesign(d));
    },
    [createDesign]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
          <Toolbar>
            <Typography variant="h6" noWrap>
              Shed Builder
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Left sidebar: design list */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
          }}
        >
          <Toolbar />
          <DesignList
            designs={designs}
            selectedId={activeDesign?.id ?? null}
            onSelect={handleSelectDesign}
            onCreate={handleCreateDesign}
            onDelete={deleteDesign}
          />
        </Drawer>

        {/* Main: 3D viewer */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            pt: 8,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {activeDesign ? (
            <Box sx={{ flexGrow: 1 }}>
              <ShedViewer3D design={activeDesign} />
            </Box>
          ) : (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              height="100%"
            >
              <Typography variant="h5" color="text.secondary">
                Select or create a design to begin
              </Typography>
            </Box>
          )}
        </Box>

        {/* Right panel: design controls + bom + versions */}
        {activeDesign && (
          <Drawer
            variant="permanent"
            anchor="right"
            sx={{
              width: rightPanelWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': { width: rightPanelWidth, boxSizing: 'border-box' },
            }}
          >
            <Toolbar />
            <Tabs value={rightTab} onChange={(_, v) => setRightTab(v)} variant="fullWidth">
              <Tab label="Design" />
              <Tab label="BOM" />
              <Tab label="Versions" />
            </Tabs>
            <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
              {rightTab === 0 && (
                <DesignPanel
                  design={activeDesign}
                  onChange={handleDesignChange}
                  saveStatus={saveStatus}
                />
              )}
              {rightTab === 1 && (
                <BomTable
                  designId={activeDesign.id}
                  designName={activeDesign.name}
                  bom={bom}
                  onLoadBom={loadBom}
                />
              )}
              {rightTab === 2 && (
                <VersionPanel
                  designId={activeDesign.id}
                  versions={versions}
                  onLoadVersions={loadVersions}
                  onSaveVersion={createVersion}
                  onRestoreVersion={restoreVersion}
                />
              )}
            </Box>
          </Drawer>
        )}
      </Box>
    </ThemeProvider>
  );
}
