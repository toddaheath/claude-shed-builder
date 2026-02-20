import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  Tab,
  Tabs,
  IconButton,
  Tooltip,
} from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
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

function getStoredMode(): 'light' | 'dark' | null {
  try {
    const v = localStorage.getItem('shed-builder-theme');
    if (v === 'light' || v === 'dark') return v;
  } catch { /* ignore */ }
  return null;
}

export default function App() {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState<'light' | 'dark'>(() => getStoredMode() ?? (prefersDark ? 'dark' : 'light'));

  const toggleDarkMode = useCallback(() => {
    setMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('shed-builder-theme', next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: '#5D4037' },
      secondary: { main: '#8D6E63' },
      ...(mode === 'dark' && {
        background: { default: '#1a1210', paper: '#2c211c' },
      }),
    },
  }), [mode]);
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

  // Undo/redo stacks
  const undoStackRef = useRef<Design[]>([]);
  const redoStackRef = useRef<Design[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

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
      openings: activeDesign.openings,
    };
  }, [activeDesign]);

  const saveStatus = useAutoSave(activeDesign?.id ?? null, updateData);

  const pushUndo = useCallback((design: Design) => {
    undoStackRef.current.push(design);
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const handleDesignChange = useCallback(
    (update: UpdateDesignRequest) => {
      if (!activeDesign) return;
      pushUndo(activeDesign);
      const merged = { ...activeDesign, ...update } as Design;
      setLocalDesign(merged);
      setCurrentDesign(merged);
    },
    [activeDesign, setCurrentDesign, pushUndo]
  );

  const handleUndo = useCallback(() => {
    const prev = undoStackRef.current.pop();
    if (prev && activeDesign) {
      redoStackRef.current.push(activeDesign);
      setLocalDesign(prev);
      setCurrentDesign(prev);
      setCanUndo(undoStackRef.current.length > 0);
      setCanRedo(true);
    }
  }, [activeDesign, setCurrentDesign]);

  const handleRedo = useCallback(() => {
    const next = redoStackRef.current.pop();
    if (next && activeDesign) {
      undoStackRef.current.push(activeDesign);
      setLocalDesign(next);
      setCurrentDesign(next);
      setCanUndo(true);
      setCanRedo(redoStackRef.current.length > 0);
    }
  }, [activeDesign, setCurrentDesign]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  const handleSelectDesign = useCallback(
    (id: string) => {
      setLocalDesign(null);
      undoStackRef.current = [];
      redoStackRef.current = [];
      setCanUndo(false);
      setCanRedo(false);
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
      <a href="#main-content" className="sr-only" style={{
        position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px',
        overflow: 'hidden', zIndex: 9999,
      }}>
        Skip to main content
      </a>
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
          <Toolbar>
            <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
              Shed Builder
            </Typography>
            {activeDesign && (
              <>
                <Tooltip title="Undo (Ctrl+Z)">
                  <span>
                    <IconButton color="inherit" onClick={handleUndo} disabled={!canUndo} aria-label="Undo">
                      <UndoIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Redo (Ctrl+Y)">
                  <span>
                    <IconButton color="inherit" onClick={handleRedo} disabled={!canRedo} aria-label="Redo">
                      <RedoIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            )}
            <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <IconButton color="inherit" onClick={toggleDarkMode} aria-label="Toggle dark mode">
                {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Tooltip>
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
          <nav aria-label="Design list">
            <DesignList
              designs={designs}
              selectedId={activeDesign?.id ?? null}
              onSelect={handleSelectDesign}
              onCreate={handleCreateDesign}
              onDelete={deleteDesign}
            />
          </nav>
        </Drawer>

        {/* Main: 3D viewer */}
        <Box
          component="main"
          id="main-content"
          role="main"
          sx={{
            flexGrow: 1,
            pt: 8,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {activeDesign ? (
            <Box sx={{ flexGrow: 1 }} aria-label="3D shed preview" role="img">
              <ShedViewer3D design={activeDesign} darkMode={mode === 'dark'} />
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
            <Tabs
              value={rightTab}
              onChange={(_, v) => setRightTab(v)}
              variant="fullWidth"
              aria-label="Design panel tabs"
            >
              <Tab label="Design" id="tab-design" aria-controls="tabpanel-design" />
              <Tab label="BOM" id="tab-bom" aria-controls="tabpanel-bom" />
              <Tab label="Versions" id="tab-versions" aria-controls="tabpanel-versions" />
            </Tabs>
            <Box sx={{ overflow: 'auto', flexGrow: 1 }} role="tabpanel">
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
