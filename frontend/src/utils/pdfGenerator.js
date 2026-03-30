import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { getProgramColor } from '../pages/Schedules';

export const generateProfessionalPDF = (schedules, title, termName, campusName = 'Main Campus', institutionName = 'GOLDEN MINDS COLLEGES') => {
  // Create portrait A4 PDF
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  const marginX = 15;
  const marginY = 20;

  // Header Hierarchy
  // 1. Institution Name
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(15, 23, 42); // slate-900
  pdf.text(institutionName, pageWidth / 2, marginY, { align: 'center' });
  
  // 2. Campus Segment
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(71, 85, 105); // slate-500
  pdf.text(String(campusName).toUpperCase(), pageWidth / 2, marginY + 5.5, { align: 'center' });
  
  // 3. Term and Academic Year
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139); // slate-500
  pdf.text(termName || 'Academic Term', pageWidth / 2, marginY + 10.5, { align: 'center' });
  
  // 4. Formal Filter Assignment Title
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42); // slate-900
  pdf.text(title || 'Master Schedule', pageWidth / 2, marginY + 18, { align: 'center' });

  // Draw Main Academic Matrix
  const gridStartY = marginY + 25;
  const gridEndY = pageHeight - 35;
  const gridWidth = pageWidth - (marginX * 2);
  const gridHeight = gridEndY - gridStartY;

  pdf.setDrawColor(200, 200, 200); // Light gray borders
  pdf.setLineWidth(0.2);

  // Define columns
  const days = ['Time', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const colWidth = gridWidth / days.length;

  // Header row for days
  const headerHeight = 10;
  pdf.setFillColor(242, 244, 248);
  pdf.rect(marginX, gridStartY, gridWidth, headerHeight, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(50, 50, 50);

  days.forEach((day, i) => {
    const x = marginX + (i * colWidth);
    pdf.text(day, x + (colWidth / 2), gridStartY + 6, { align: 'center' });
    if (i > 0) pdf.line(x, gridStartY, x, gridEndY); // vertical lines
  });
  
  // Outer Borders for Grid
  pdf.line(marginX + gridWidth, gridStartY, marginX + gridWidth, gridEndY); // Right border
  pdf.line(marginX, gridStartY + headerHeight, marginX + gridWidth, gridStartY + headerHeight); // Bottom of header
  pdf.line(marginX, gridStartY, marginX + gridWidth, gridStartY); // Top of header
  pdf.line(marginX, gridStartY, marginX, gridEndY); // Left border
  pdf.line(marginX, gridEndY, marginX + gridWidth, gridEndY); // Bottom border

  // Time rows (7:00 AM to 9:00 PM = 14 hours)
  const startHour = 7;
  const endHour = 21; // 9 PM
  const numHours = endHour - startHour;
  const rowHeight = (gridHeight - headerHeight) / numHours;

  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);

  for (let i = 0; i < numHours; i++) {
    const y = gridStartY + headerHeight + (i * rowHeight);
    
    // Draw subtle row lines
    if (i > 0) {
      pdf.setDrawColor(230, 230, 230);
      pdf.line(marginX, y, marginX + gridWidth, y);
    }
    
    // Draw half-hour tick marks
    pdf.setDrawColor(245, 245, 245);
    pdf.line(marginX, y + (rowHeight/2), marginX + gridWidth, y + (rowHeight/2));
    
    const hour = startHour + i;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour;
    const timeString = `${displayHour}:00 ${ampm}`;
    
    pdf.text(timeString, marginX + (colWidth / 2), y + 4, { align: 'center' });
  }

  // Restore line color
  pdf.setDrawColor(200, 200, 200);

  // Helper to get Y coordinate for a specific time
  const getYForTime = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    const decimalHours = h + (m / 60) - startHour;
    return gridStartY + headerHeight + (decimalHours * rowHeight);
  };

  const getDayIndex = (dayStr) => days.indexOf(dayStr);

  // Track layout occupancy for overlapping boxes (simple clustering)
  const occupancyMap = {}; // "day-time" -> array of events

  // Process overlapping schedules (Optional advanced step, but doing basic overlapping)
  const processedSchedules = schedules.map(sch => {
     const colIdx = getDayIndex(sch.day_of_week);
     const yStart = getYForTime(sch.start_time);
     const yEnd = getYForTime(sch.end_time);
     return { ...sch, colIdx, yStart, yEnd };
  }).filter(sch => sch.colIdx && sch.colIdx > 0 && sch.yStart !== null && sch.yEnd !== null);

  // Render Schedule Blocks
  processedSchedules.forEach((sch) => {
    const boxHeight = sch.yEnd - sch.yStart;
    const padding = 1.5;
    
    // Slight margin inset
    const boxWidth = colWidth - (padding * 2); 
    const xBase = marginX + (sch.colIdx * colWidth) + padding;

    // Extract and map institutional color
    const colorWay = getProgramColor(sch.program_code);
    const hexToRgb = (hex) => {
        let r = parseInt(hex.substring(1, 3), 16);
        let g = parseInt(hex.substring(3, 5), 16);
        let b = parseInt(hex.substring(5, 7), 16);
        return [r, g, b];
    };
    
    // Premium styling for box matching UI
    pdf.setFillColor(...hexToRgb(colorWay.bg)); 
    pdf.setDrawColor(...hexToRgb(colorWay.border)); 
    pdf.setLineWidth(0.3);
    
    pdf.roundedRect(xBase, sch.yStart + 0.5, boxWidth, Math.max(boxHeight - 1, 3), 1, 1, 'FD');

    // Setup Dynamic Text Rendering Engine
    pdf.setTextColor(255, 255, 255);
    let currentY = sch.yStart + 3.5;
    const maxTextWidth = boxWidth - 2;
    const boxBottom = sch.yEnd - 1.5; // Strict bounds protection
    
    const renderText = (str, size, weight = 'normal') => {
      if (!str) return;
      pdf.setFontSize(size);
      pdf.setFont('helvetica', weight);
      
      // Calculate active wrapper string mapping dimensions recursively
      const lines = pdf.splitTextToSize(String(str), maxTextWidth);
      const dimensions = pdf.getTextDimensions(lines);
      const textHeight = dimensions.h; // absolute height calculation
      
      // Failsafe: End operation early if the render command bleeds out of the visual block box boundary
      if ((currentY + textHeight) > boxBottom) return;
      
      // Print safely into space bounds
      pdf.text(lines, xBase + 1, currentY);
      currentY += (textHeight + 1.2); // Advanced structural padding
    };

    // Custom helper to dynamically translate mathematical SQL time formats
    const formatTime12 = (t) => {
      if (!t) return '';
      const [h, m] = t.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      let dh = h % 12;
      if (dh === 0) dh = 12;
      return `${dh}:${m.toString().padStart(2, '0')} ${ampm}`;
    };

    // Custom helper to dynamically map Academic Levels into Ordinals
    const formatYear = (y) => {
       if (!y) return '';
       const n = Number(y);
       if (n === 1) return '1st Year';
       if (n === 2) return '2nd Year';
       if (n === 3) return '3rd Year';
       if (n === 4) return '4th Year';
       if (n >= 11) return `Grade ${n}`;
       return `${n} Year`;
    };

    // Calculate complex string layouts efficiently
    const timeFrameStr = `[ ${formatTime12(sch.start_time)} - ${formatTime12(sch.end_time)} ]`;
    const cohortStr = (sch.section_name && sch.section_id !== 1) ? `${sch.program_code} ${formatYear(sch.year_level)} ${sch.section_name}` : '';

    // Render sequence via strict hierarchy logic
    renderText(sch.subject_code, 7, 'bold');
    renderText(sch.subject_name, 5.5, 'italic');
    renderText(timeFrameStr, 5, 'bold');
    renderText(sch.room ? `Rm: ${sch.room}` : '', 5.5, 'normal');
    if (cohortStr) renderText(cohortStr, 5.5, 'bold');
    renderText(sch.faculty_name, 5.5, 'normal');
  });

  // Footer Metadata
  pdf.setTextColor(120, 120, 120);
  pdf.setFontSize(7);
  const now = new Date();
  pdf.text(`Generated on: ${format(now, 'PPP p')}`, marginX, pageHeight - 15);

  pdf.setDrawColor(50, 50, 50);
  pdf.setLineWidth(0.3);
  pdf.line(pageWidth - marginX - 60, pageHeight - 20, pageWidth - marginX, pageHeight - 20);
  pdf.setTextColor(50, 50, 50);
  pdf.text('Approved By / Signature', pageWidth - marginX - 30, pageHeight - 15, { align: 'center' });

  // Save the PDF using a native Blob download to guarantee the filename and extension
  const safeTitle = title ? title.replace(/[^a-zA-Z0-9-]/g, '_').replace(/_+/g, '_').toLowerCase() : 'master_schedule';
  const filename = `${safeTitle}.pdf`;
  
  const blob = pdf.output('blob');
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  // Some browsers require the link to be in the DOM
  document.body.appendChild(link);
  
  // Let the execution stack finish to ensure the DOM applies before click
  setTimeout(() => {
    link.click();
    // Give Chrome 40 seconds to process the "Save As" dialogue without losing the download tag
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 40000);
  }, 0);
};
