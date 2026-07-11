const { useState, useEffect, useRef } = React;

const DataApp = ({ workspaceId = 'default', tableId = 'default' }) => {
  const [theme, setTheme] = useState('dark');
  const [selectedImage, setSelectedImage] = useState(null);
  const [images, setImages] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const univerRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize UniverJS
  useEffect(() => {
    const initUniver = async () => {
      try {
        const { univerAPI } = createUniver({
          locale: LocaleType.EN_US,
          locales: [LocaleType.EN_US],
          presets: [
            UniverSheetsCorePreset({
              container: containerRef.current,
            }),
          ],
        });

        univerRef.current = univerAPI;
        
        // Create a basic workbook with sample data
        await univerAPI.createUniverSheet({
          name: 'VISIOLOG Data',
          sheetType: UniverInstanceType.UNIVER_SHEET,
          data: {
            sheets: {
              'Sheet1': {
                id: 'Sheet1',
                name: 'Records',
                cellData: {
                  '0': {
                    '0': { v: 'ID' },
                    '1': { v: 'Name' },
                    '2': { v: 'Date' },
                    '3': { v: 'Status' },
                    '4': { v: 'Category' },
                  },
                  '1': {
                    '0': { v: 'REC-001' },
                    '1': { v: 'John Smith' },
                    '2': { v: '2026-07-11' },
                    '3': { v: 'Processed' },
                    '4': { v: 'Visitor' },
                  },
                  '2': {
                    '0': { v: 'REC-002' },
                    '1': { v: 'Jane Doe' },
                    '2': { v: '2026-07-10' },
                    '3': { v: 'Processed' },
                    '4': { v: 'Staff' },
                  },
                },
                rowCount: 100,
                columnCount: 10,
              },
            },
          },
        });

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize UniverJS:', error);
        setIsLoading(false);
      }
    };

    initUniver();

    return () => {
      if (univerRef.current) {
        univerRef.current.dispose();
      }
    };
  }, []);

  // Load sample images
  useEffect(() => {
    const sampleImages: ImageRecord[] = [
      {
        id: 'IMG-001',
        title: 'Visitor Log Entry',
        url: '/sample-images/visitor-1.jpg',
        uploadedAt: '2026-07-11T10:30:00Z',
        status: 'processed',
      },
      {
        id: 'IMG-002',
        title: 'Staff Badge Scan',
        url: '/sample-images/staff-1.jpg',
        uploadedAt: '2026-07-10T14:45:00Z',
        status: 'processed',
      },
    ];
    setImages(sampleImages);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleImageSelect = (image: ImageRecord) => {
    setSelectedImage(image);
    setIsSidebarOpen(false);
  };

  const handleExport = () => {
    // Export functionality
    console.log('Exporting data...');
  };

  const handleImport = () => {
    // Import functionality
    console.log('Importing data...');
  };

  return (
    <div className="data-app" data-theme={theme}>
      {/* Header */}
      <header className="app-header glass">
        <div className="header-left">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </div>
          <div className="brand-text">
            <h1>VISIOLOG</h1>
            <p className="subtitle">Data Workspace</p>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className="action-btn"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title="Image Library"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/>
            </svg>
            Images
          </button>
          
          <button className="action-btn" onClick={handleExport} title="Export">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
          </button>
          
          <button className="action-btn" onClick={handleImport} title="Import">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Import
          </button>
          
          <button className="action-btn" onClick={toggleTheme} title="Toggle Theme">
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Spreadsheet Container */}
        <div className="spreadsheet-container glass">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading workspace...</p>
            </div>
          ) : (
            <div ref={containerRef} className="univer-container"></div>
          )}
        </div>

        {/* Image Sidebar */}
        <aside className={`image-sidebar glass ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h2>Image Library</h2>
            <button 
              className="close-btn"
              onClick={() => setIsSidebarOpen(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="image-list">
            {images.map(image => (
              <div 
                key={image.id}
                className={`image-card ${selectedImage?.id === image.id ? 'selected' : ''}`}
                onClick={() => handleImageSelect(image)}
              >
                <div className="image-thumbnail">
                  <div className="placeholder-img">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>
                </div>
                <div className="image-info">
                  <h3>{image.title}</h3>
                  <p className="image-meta">
                    {new Date(image.uploadedAt).toLocaleDateString()}
                  </p>
                  <span className={`status-badge ${image.status}`}>
                    {image.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Selected Image Preview */}
        {selectedImage && (
          <div className="image-preview glass">
            <div className="preview-header">
              <h3>{selectedImage.title}</h3>
              <button 
                className="close-btn"
                onClick={() => setSelectedImage(null)}
              >
                ✕
              </button>
            </div>
            <div className="preview-content">
              <div className="preview-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <p>Image preview would appear here</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Toast Notification */}
      <div className="toast">
        <span className="toast-message">Action completed</span>
      </div>
    </div>
  );
};

// For browser usage, attach to window
window.DataApp = DataApp;