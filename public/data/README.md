# VISIOLOG Data Workspace

A modern React-based data management interface for VISIOLOG, providing spreadsheet-based data editing with integrated image library support.

## Features

- **Spreadsheet Interface**: Full-featured spreadsheet using UniverJS for data management
- **Image Library**: Integrated sidebar for managing uploaded document images
- **Dark/Light Theme**: Toggle between dark and light themes
- **Responsive Design**: Works seamlessly across desktop, tablet, and mobile devices
- **Data Operations**: Export and import functionality for data management
- **Modern UI**: Glass-morphism design with consistent styling across the VISIOLOG platform

## Quick Start

### Option 1: Simple HTML (No Build Required)

Open `index-simple.html` directly in your browser. This version uses React and UniverJS from CDN with no build step required.

### Option 2: Development Build

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## File Structure

```
public/data/
├── DataApp.tsx          # Main React component
├── DataApp.css          # Component styles
├── index-simple.html    # Simple HTML entry point (no build)
├── index-react.html    # React + Babel entry point
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite build configuration
└── README.md           # This file
```

## Component Architecture

### DataApp Component

The main component that manages:
- **Spreadsheet State**: UniverJS instance and data
- **Image Library**: Uploaded document images with status tracking
- **UI State**: Theme, sidebar visibility, loading states
- **User Actions**: Export, import, theme toggle

### Key Features

#### Spreadsheet Integration
- Uses UniverJS for spreadsheet functionality
- Pre-configured with sample data structure
- Supports standard spreadsheet operations

#### Image Library
- Slide-out sidebar for image management
- Image thumbnails with metadata
- Status indicators (processed, pending, error)
- Click to select and preview images

#### Responsive Design
- Mobile-first approach
- Adapts layout for different screen sizes
- Touch-friendly controls on mobile devices

## Customization

### Theme Colors

Modify CSS variables in `DataApp.css`:

```css
:root {
  --bg: #0b0b0e;              /* Background color */
  --accent: #5b9cf5;          /* Primary accent color */
  --success: #4ade80;         /* Success state color */
  --error: #ff6b6b;           /* Error state color */
  --warning: #facc15;         /* Warning state color */
}
```

### Data Structure

The spreadsheet is initialized with a default structure. Modify the data in `DataApp.tsx`:

```typescript
await univerAPI.createUniverSheet({
  name: 'VISIOLOG Data',
  sheetType: UniverInstanceType.UNIVER_SHEET,
  data: {
    sheets: {
      'Sheet1': {
        id: 'Sheet1',
        name: 'Records',
        cellData: {
          // Your cell data here
        },
      },
    },
  },
});
```

## API Integration

To connect to your backend:

1. Replace sample data with API calls
2. Implement real authentication
3. Add proper error handling
4. Integrate with Supabase or your existing backend

Example API integration:

```typescript
useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetch('/api/records');
      const data = await response.json();
      // Update spreadsheet with data
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };
  
  fetchData();
}, []);
```

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 12+, Chrome Mobile

## Performance

- Lazy loading of images
- Optimized spreadsheet rendering
- Efficient state management
- Minimal bundle size with code splitting

## Security Considerations

- Implement proper authentication
- Validate all user inputs
- Use HTTPS in production
- Sanitize data before display
- Implement rate limiting for API calls

## Future Enhancements

- [ ] Real-time collaboration
- [ ] Advanced filtering and sorting
- [ ] Custom formulas and calculations
- [ ] Data visualization charts
- [ ] Offline support with PWA
- [ ] Advanced export formats (PDF, Excel)
- [ ] Keyboard shortcuts
- [ ] Undo/redo functionality
- [ ] Cell validation rules
- [ ] Conditional formatting

## Troubleshooting

### UniverJS not loading
- Ensure all CDN scripts are loading correctly
- Check browser console for errors
- Verify internet connection for CDN resources

### Images not displaying
- Check image URLs are correct
- Verify image permissions
- Ensure image formats are supported

### Performance issues
- Reduce initial data load
- Implement pagination for large datasets
- Optimize image sizes
- Use lazy loading for components

## License

Part of the VISIOLOG platform. See main project license for details.

## Support

For issues or questions, please refer to the main VISIOLOG documentation or contact the development team.