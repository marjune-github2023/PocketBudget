/**
 * CSV export utility functions
 */

/**
 * Convert an array of objects to a CSV string
 * @param data Array of objects to convert to CSV
 * @returns CSV string
 */
export function objectsToCSV(data: any[]): string {
  if (!data || data.length === 0) {
    return '';
  }
  
  // Extract the headers from the first object
  const headers = Object.keys(data[0]);
  
  // Create the header row
  const headerRow = headers.join(',');
  
  // Create the data rows
  const rows = data.map(obj => {
    return headers.map(header => {
      // Get the value for this cell
      const value = obj[header];
      
      // Format the value properly for CSV
      return formatCSVValue(value);
    }).join(',');
  });
  
  // Combine the header and data rows
  return [headerRow, ...rows].join('\n');
}

/**
 * Format a value for CSV output, handling special characters
 * @param value The value to format
 * @returns Formatted value
 */
function formatCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  // Convert to string
  const stringValue = String(value);
  
  // If the value contains commas, newlines, or quotes, wrap it in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Export data to a CSV file and trigger download
 * @param data Array of objects to export
 * @param filename The filename without extension
 */
export function exportToCSV(data: any[], filename: string): void {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }
  
  try {
    // Convert the data to CSV
    const csvContent = objectsToCSV(data);
    
    // Create a Blob with the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element to trigger the download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    
    // Trigger the download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting data to CSV:", error);
  }
}
