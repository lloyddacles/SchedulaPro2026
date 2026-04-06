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

/**
 * Generates a high-fidelity, data-driven Analytics Report for institutional management.
 * Consolidates KPIs, workload matrices, facility efficiency, and curricular demand.
 */
export const generateAnalyticsPDF = (data, termName, campusName = 'Main Campus', institutionName = 'GOLDEN MINDS COLLEGES') => {
  const { facultyLoads, roomUtil, programDist, overallStats } = data;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 20;
  let currentY = 20;

  const checkPageBreak = (heightNeeded) => {
    if (currentY + heightNeeded > pageHeight - 30) {
      pdf.addPage();
      currentY = 20;
      renderHeader();
      return true;
    }
    return false;
  };

  const renderHeader = () => {
    // Branded Header Group
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(15, 23, 42); // slate-900
    pdf.text(institutionName, pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 6;
    pdf.setFontSize(10);
    pdf.setTextColor(71, 85, 105); // slate-600
    pdf.text(`${String(campusName).toUpperCase()} · INSTITUTIONAL OPERATIONS`, pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 5;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139); // slate-500
    pdf.text(`Academic Period: ${termName || 'Current Term'}`, pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(15, 23, 42); 
    pdf.text('ADMINISTRATIVE ANALYTICS REPORT', pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 4;
    pdf.setDrawColor(226, 232, 240); // slate-200
    pdf.setLineWidth(0.5);
    pdf.line(marginX, currentY, pageWidth - marginX, currentY);
    currentY += 12;
  };

  const renderSectionHeader = (title) => {
    checkPageBreak(15);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(30, 41, 59); // slate-800
    pdf.text(title.toUpperCase(), marginX, currentY);
    currentY += 2;
    pdf.setDrawColor(30, 41, 59);
    pdf.setLineWidth(0.3);
    pdf.line(marginX, currentY, marginX + 30, currentY);
    currentY += 8;
  };

  const renderFooter = () => {
    const totalPages = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(7);
      pdf.setTextColor(148, 163, 184); // slate-400
      pdf.text(`SchedulaPro Institutional Report · Page ${i} of ${totalPages}`, marginX, pageHeight - 15);
      pdf.text(`Generated on: ${format(new Date(), 'PPP p')}`, pageWidth - marginX, pageHeight - 15, { align: 'right' });
      
      if (i === totalPages) {
        // Last page signatures/accreditation
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(30, 41, 59);
        const sigY = pageHeight - 35;
        pdf.line(marginX, sigY, marginX + 60, sigY);
        pdf.text('Prepared by:', marginX, sigY - 2);
        pdf.text('MR. LLOYD CHRISTOPHER F. DACLES, MIS', marginX, sigY + 5);
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'normal');
        pdf.text('System Architect & Principal Consultant', marginX, sigY + 8);
        pdf.text('LDRaidmax Systems · Software Laboratory', marginX, sigY + 11);
      }
    }
  };

  // --- Start Generation ---
  renderHeader();

  // 1. Executive KPIs
  renderSectionHeader('Executive Summary');
  const capRatio = overallStats?.room_capacity 
    ? Math.round((overallStats.room_capacity.total_booked_hours / overallStats.room_capacity.total_capacity_hours) * 100) 
    : 0;

  const kpis = [
    { label: 'INSTITUTIONAL CAPACITY', value: `${capRatio}% Usage` },
    { label: 'ACTIVE FACULTY COUNT', value: `${overallStats?.active_faculty || 0} Registered` },
    { label: 'LOAD BALANCE (OVERLOAD)', value: `${overallStats?.overloaded_instructors || 0} Alerts` },
    { label: 'TOTAL DATA SUBJECTS', value: `${overallStats?.total_subjects || 0} Units` }
  ];

  pdf.setFontSize(9);
  kpis.forEach((kpi, i) => {
    const x = i % 2 === 0 ? marginX : pageWidth / 2;
    const y = currentY + (Math.floor(i / 2) * 12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 116, 139);
    pdf.text(kpi.label, x, y);
    pdf.setFont('helvetica', 'black');
    pdf.setFontSize(11);
    pdf.setTextColor(15, 23, 42);
    pdf.text(kpi.value, x, y + 5);
    pdf.setFontSize(9);
  });
  currentY += 25;

  // 2. Faculty Load Table
  renderSectionHeader('Faculty Workload Matrix');
  const tableHeaderY = currentY;
  pdf.setFillColor(241, 245, 249); // slate-100
  pdf.rect(marginX, tableHeaderY - 5, pageWidth - (marginX * 2), 7, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(51, 65, 85);
  pdf.text('FACULTY NAME', marginX + 2, tableHeaderY);
  pdf.text('CONTRACT TYPE', marginX + 70, tableHeaderY);
  pdf.text('MAX', marginX + 110, tableHeaderY, { align: 'center' });
  pdf.text('LOAD', marginX + 130, tableHeaderY, { align: 'center' });
  pdf.text('STATUS', marginX + 155, tableHeaderY);
  
  currentY += 5;
  
  facultyLoads?.forEach((f) => {
    checkPageBreak(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(30, 41, 59);
    
    pdf.text(f.name || 'Unknown', marginX + 2, currentY);
    pdf.text(f.contract_type || 'N/A', marginX + 70, currentY);
    pdf.text(String(f.max_units || 24), marginX + 110, currentY, { align: 'center' });
    pdf.text(String(f.current_load || 0), marginX + 130, currentY, { align: 'center' });
    
    const isOverload = Number(f.current_load) > Number(f.max_units || 24);
    if (isOverload) {
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(220, 38, 38); // red-600
      pdf.text('OVERLOAD', marginX + 155, currentY);
    } else if (Number(f.current_load) === 0) {
      pdf.setTextColor(148, 163, 184);
      pdf.text('UNASSIGNED', marginX + 155, currentY);
    } else {
      pdf.setTextColor(16, 185, 129); // emerald-500
      pdf.text('NORMAL', marginX + 155, currentY);
    }
    
    pdf.setDrawColor(241, 245, 249);
    pdf.line(marginX, currentY + 2, pageWidth - marginX, currentY + 2);
    currentY += 6;
  });

  currentY += 10;

  // 3. Room Efficiency
  renderSectionHeader('Facility Utilization Profile');
  const roomHeaders = ['ROOM NAME', 'TOTAL BOOKED HOURS', 'UTILIZATION RATE'];
  pdf.setFillColor(241, 245, 249);
  pdf.rect(marginX, currentY - 5, pageWidth - (marginX * 2), 7, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(51, 65, 85);
  pdf.text('FACILITY NAME', marginX + 2, currentY);
  pdf.text('BOOKED HRS', marginX + 80, currentY, { align: 'center' });
  pdf.text('EFFICIENCY ESTIMATE', marginX + 140, currentY, { align: 'center' });
  
  currentY += 5;
  roomUtil?.forEach((r) => {
    checkPageBreak(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(30, 41, 59);
    pdf.text(r.name, marginX + 2, currentY);
    pdf.text(`${r.value} h`, marginX + 80, currentY, { align: 'center' });
    
    // Efficiency based on 72h max
    const rate = Math.round((Number(r.value) / 72) * 100);
    pdf.text(`${rate}%`, marginX + 140, currentY, { align: 'center' });
    
    pdf.setDrawColor(241, 245, 249);
    pdf.line(marginX, currentY + 2, pageWidth - marginX, currentY + 2);
    currentY += 6;
  });

  currentY += 10;

  // 4. Program Distribution
  renderSectionHeader('Curricular Demand Breakdown');
  pdf.setFillColor(241, 245, 249);
  pdf.rect(marginX, currentY - 5, pageWidth - (marginX * 2), 7, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(51, 65, 85);
  pdf.text('ACADEMIC PROGRAM', marginX + 2, currentY);
  pdf.text('TOTAL LOADS', marginX + 140, currentY, { align: 'center' });

  currentY += 5;
  programDist?.forEach((p) => {
    checkPageBreak(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(30, 41, 59);
    pdf.text(`${p.program_code || p.name} - ${p.description || ''}`, marginX + 2, currentY);
    pdf.text(String(p.total_loads || p.value), marginX + 140, currentY, { align: 'center' });
    
    pdf.setDrawColor(241, 245, 249);
    pdf.line(marginX, currentY + 2, pageWidth - marginX, currentY + 2);
    currentY += 6;
  });

  // Final Pass: Header/Footer
  renderFooter();

  // Save/Download
  const filename = `Management_Analytics_${termName.replace(/ /g, '_')}.pdf`;
  const blob = pdf.output('blob');
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  setTimeout(() => {
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 40000);
  }, 0);
};
