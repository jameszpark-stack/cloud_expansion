// State Management
let rawZones = [];
let filteredZones = [];
let selectedRegion = 'ALL';
let selectedPlcStage = 'ALL';
let selectedCustomer = 'ALL';
let selectedChipType = 'ALL';
let selectedChip = 'ALL';
let selectedPa = 'ALL';
let selectedSiteType = 'ALL';
let selectedMegaType = 'ALL';
let minDate = null;
let maxDate = null;
let totalDurationMs = 0;

// Helper to parse date strings of format "M/D/YYYY"
function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return null;
  const month = parseInt(parts[0], 10) - 1;
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
  return new Date(year, month, day);
}

// Format Date for tooltips
function formatDateString(date) {
  if (!date) return 'TBD';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// DOM Elements
const regionSelect = document.getElementById('filter-region');
const plcSelect = document.getElementById('filter-plc');
const customerSelect = document.getElementById('filter-customer');
const chipTypeSelect = document.getElementById('filter-chip-type');
const chipSelect = document.getElementById('filter-chip');
const paSelect = document.getElementById('filter-pa');
const siteTypeSelect = document.getElementById('filter-site-type');
const megaTypeSelect = document.getElementById('filter-mega-type');
const resetBtn = document.getElementById('reset-filters');
const ganttRowsContainer = document.getElementById('gantt-rows-container');
const ganttHeaderTrack = document.getElementById('gantt-header-track');
const ganttGridLines = document.getElementById('gantt-grid-lines');
const tooltip = document.getElementById('gantt-tooltip');

// Metrics elements
const metricTotal = document.getElementById('metric-total');
const metricLaunched = document.getElementById('metric-launched');
const metricExecution = document.getElementById('metric-execution');
const metricPlanning = document.getElementById('metric-planning');

// Fetch and Initialize Data
async function init() {
  try {
    const data = window.aizData;
    if (!data) {
      throw new Error("aizData not found on window object. Make sure data.js is loaded.");
    }
    
    // Process zones, parse dates
    rawZones = data.map(zone => {
      const preflight = parseDate(zone['Preflight Start']);
      const fho = parseDate(zone['FHO (ML Allocations)']);
      const launch = parseDate(zone['Launch']);
      return {
        ...zone,
        parsedPreflight: preflight,
        parsedFho: fho,
        parsedLaunch: launch
      };
    }).filter(zone => zone.parsedPreflight && zone.parsedLaunch); // Only include zones with valid start/end dates
    
    // Populate Filters
    populateFilterDropdowns();
    
    // Perform initial filter and render
    filterAndRender();
    
    // Add Event Listeners
    regionSelect.addEventListener('change', (e) => {
      selectedRegion = e.target.value;
      filterAndRender();
    });
    
    plcSelect.addEventListener('change', (e) => {
      selectedPlcStage = e.target.value;
      filterAndRender();
    });
    
    customerSelect.addEventListener('change', (e) => {
      selectedCustomer = e.target.value;
      filterAndRender();
    });
    
    chipTypeSelect.addEventListener('change', (e) => {
      selectedChipType = e.target.value;
      filterAndRender();
    });
    
    chipSelect.addEventListener('change', (e) => {
      selectedChip = e.target.value;
      filterAndRender();
    });
    
    paSelect.addEventListener('change', (e) => {
      selectedPa = e.target.value;
      filterAndRender();
    });
    
    siteTypeSelect.addEventListener('change', (e) => {
      selectedSiteType = e.target.value;
      filterAndRender();
    });
    
    megaTypeSelect.addEventListener('change', (e) => {
      selectedMegaType = e.target.value;
      filterAndRender();
    });
    
    resetBtn.addEventListener('click', () => {
      regionSelect.value = 'ALL';
      plcSelect.value = 'ALL';
      customerSelect.value = 'ALL';
      chipTypeSelect.value = 'ALL';
      chipSelect.value = 'ALL';
      paSelect.value = 'ALL';
      siteTypeSelect.value = 'ALL';
      megaTypeSelect.value = 'ALL';
      
      selectedRegion = 'ALL';
      selectedPlcStage = 'ALL';
      selectedCustomer = 'ALL';
      selectedChipType = 'ALL';
      selectedChip = 'ALL';
      selectedPa = 'ALL';
      selectedSiteType = 'ALL';
      selectedMegaType = 'ALL';
      
      filterAndRender();
    });
    
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    ganttRowsContainer.innerHTML = `<div class="loading-indicator" style="color: #ef4444;">Error loading AI Zone data: ${error.message}</div>`;
  }
}

// Populate Filter Options Dynamically
function populateFilterDropdowns() {
  const regions = new Set();
  const plcStages = new Set();
  const customers = new Set();
  const chipTypes = new Set();
  const chips = new Set();
  const pas = new Set();
  const siteTypes = new Set();
  const megaTypes = new Set();
  
  rawZones.forEach(zone => {
    if (zone['Region']) regions.add(zone['Region'].trim());
    if (zone['PLC Stage']) plcStages.add(zone['PLC Stage'].trim());
    if (zone['Customer']) customers.add(zone['Customer'].trim());
    if (zone['Chip Type']) chipTypes.add(zone['Chip Type'].trim());
    if (zone['Chip']) chips.add(zone['Chip'].trim());
    if (zone['PA']) pas.add(zone['PA'].trim());
    if (zone['Site Type (Colo/YAWN)']) siteTypes.add(zone['Site Type (Colo/YAWN)'].trim());
    if (zone['DCP Indication']) megaTypes.add(zone['DCP Indication'].trim());
  });
  
  const populateSelect = (selectEl, values, defaultText) => {
    if (!selectEl) return;
    selectEl.innerHTML = `<option value="ALL">All ${defaultText}</option>`;
    Array.from(values).sort().forEach(val => {
      if (!val) return;
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      selectEl.appendChild(opt);
    });
  };
  
  populateSelect(regionSelect, regions, 'Regions');
  populateSelect(plcSelect, plcStages, 'Stages');
  populateSelect(customerSelect, customers, 'Customers');
  populateSelect(chipTypeSelect, chipTypes, 'Chip Types');
  populateSelect(chipSelect, chips, 'Chips');
  populateSelect(paSelect, pas, 'PAs');
  populateSelect(siteTypeSelect, siteTypes, 'Site Types');
  populateSelect(megaTypeSelect, megaTypes, 'Types');
}

// Filter, calculate timeline bounds, and Render UI components
function filterAndRender() {
  // 1. Filter
  filteredZones = rawZones.filter(zone => {
    const matchRegion = selectedRegion === 'ALL' || zone['Region'] === selectedRegion;
    const matchPlc = selectedPlcStage === 'ALL' || zone['PLC Stage'] === selectedPlcStage;
    const matchCustomer = selectedCustomer === 'ALL' || zone['Customer'] === selectedCustomer;
    const matchChipType = selectedChipType === 'ALL' || zone['Chip Type'] === selectedChipType;
    const matchChip = selectedChip === 'ALL' || zone['Chip'] === selectedChip;
    const matchPa = selectedPa === 'ALL' || zone['PA'] === selectedPa;
    const matchSiteType = selectedSiteType === 'ALL' || zone['Site Type (Colo/YAWN)'] === selectedSiteType;
    const matchMegaType = selectedMegaType === 'ALL' || zone['DCP Indication'] === selectedMegaType;
    return matchRegion && matchPlc && matchCustomer && matchChipType && matchChip && matchPa && matchSiteType && matchMegaType;
  });
  
  // 2. Update stats cards
  updateMetrics();
  
  // 3. Calculate timeline range based on filtered zones
  calculateTimelineBounds();
  
  // 4. Render Gantt headers and rows
  renderTimelineHeader();
  renderGanttRows();
}

// Calculate KPI values
function updateMetrics() {
  metricTotal.textContent = filteredZones.length;
  
  const launchedCount = filteredZones.filter(z => z['PLC Stage'] && z['PLC Stage'].includes('5')).length;
  const executionCount = filteredZones.filter(z => z['PLC Stage'] && z['PLC Stage'].includes('4')).length;
  const planningCount = filteredZones.filter(z => z['PLC Stage'] && z['PLC Stage'].includes('3')).length;
  
  metricLaunched.textContent = launchedCount;
  metricExecution.textContent = executionCount;
  metricPlanning.textContent = planningCount;
}

// Calculate the minimum and maximum dates across current filtered zones
function calculateTimelineBounds() {
  if (filteredZones.length === 0) {
    minDate = new Date(2025, 0, 1);
    maxDate = new Date(2028, 11, 31);
    totalDurationMs = maxDate - minDate;
    return;
  }
  
  let earliest = null;
  let latest = null;
  
  filteredZones.forEach(zone => {
    const start = zone.parsedPreflight;
    const end = zone.parsedLaunch;
    
    if (!earliest || start < earliest) earliest = start;
    if (!latest || end > latest) latest = end;
  });
  
  // Add padding: 30 days before and after
  minDate = new Date(earliest.getTime() - 30 * 24 * 60 * 60 * 1000);
  maxDate = new Date(latest.getTime() + 30 * 24 * 60 * 60 * 1000);
  totalDurationMs = maxDate - minDate;
}

// Generate Timeline header (quarters and vertical grid lines)
function renderTimelineHeader() {
  // Clear old header track elements except the title
  const existingTicks = ganttHeaderTrack.querySelectorAll('.gantt-timeline-tick');
  existingTicks.forEach(t => t.remove());
  
  // Clear old vertical grid lines
  ganttGridLines.innerHTML = '';
  
  // We will place quarterly ticks from minDate to maxDate
  const startYear = minDate.getFullYear();
  const endYear = maxDate.getFullYear();
  
  const ticksContainer = document.createElement('div');
  ticksContainer.className = 'gantt-timeline-header';
  ticksContainer.style.position = 'relative';
  ticksContainer.style.width = '100%';
  ticksContainer.style.height = '100%';
  
  // Find all quarter starts between minDate and maxDate
  for (let year = startYear; year <= endYear; year++) {
    for (let quarter = 1; quarter <= 4; quarter++) {
      // Quarter start months: 0 (Jan), 3 (Apr), 6 (Jul), 9 (Oct)
      const qStartMonth = (quarter - 1) * 3;
      const qStartDate = new Date(year, qStartMonth, 1);
      
      if (qStartDate >= minDate && qStartDate <= maxDate) {
        const pct = ((qStartDate - minDate) / totalDurationMs) * 100;
        
        const tick = document.createElement('div');
        tick.className = 'gantt-timeline-tick quarter-start';
        tick.style.left = `${pct}%`;
        tick.textContent = `${year} Q${quarter}`;
        ticksContainer.appendChild(tick);
        
        // Add vertical grid line
        const gridLine = document.createElement('div');
        gridLine.className = 'gantt-grid-line';
        gridLine.style.left = `${pct}%`;
        ganttGridLines.appendChild(gridLine);
      }
    }
  }
  
  // Find intermediate monthly ticks for higher precision dashed gridlines
  // Only draw them if the date range is small enough to not overlap text
  const totalMonths = (endYear - startYear) * 12 + (maxDate.getMonth() - minDate.getMonth());
  if (totalMonths < 24) {
    const currentMonthDate = new Date(minDate.getFullYear(), minDate.getMonth() + 1, 1);
    while (currentMonthDate < maxDate) {
      // Skip if it is a quarter start (already drawn)
      if (currentMonthDate.getMonth() % 3 !== 0) {
        const pct = ((currentMonthDate - minDate) / totalDurationMs) * 100;
        const tick = document.createElement('div');
        tick.className = 'gantt-timeline-tick';
        tick.style.left = `${pct}%`;
        
        // Show month abbreviation
        tick.textContent = currentMonthDate.toLocaleString('en-US', { month: 'short' });
        ticksContainer.appendChild(tick);
        
        // Add vertical grid line
        const gridLine = document.createElement('div');
        gridLine.className = 'gantt-grid-line';
        gridLine.style.left = `${pct}%`;
        ganttGridLines.appendChild(gridLine);
      }
      currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
    }
  }
  
  // If no ticks container exists in header track, append it
  const headerContainer = ganttHeaderTrack.querySelector('.gantt-timeline-header');
  if (headerContainer) {
    headerContainer.replaceWith(ticksContainer);
  } else {
    ganttHeaderTrack.appendChild(ticksContainer);
  }
}

// Render GANTT Rows
function renderGanttRows() {
  ganttRowsContainer.innerHTML = '';
  
  if (filteredZones.length === 0) {
    ganttRowsContainer.innerHTML = '<div class="loading-indicator">No AI Zones match the selected filters.</div>';
    return;
  }
  
  // Render rows
  filteredZones.forEach(zone => {
    const row = document.createElement('div');
    row.className = 'gantt-row';
    
    // Sidebar Zone Details
    const sidebar = document.createElement('div');
    sidebar.className = 'gantt-row-sidebar';
    
    // Render Metro, Campus, Building Phase
    const chipTypeTag = zone['Chip Type'] 
      ? `<span class="zone-tag ${zone['Chip Type'].toLowerCase()}">${zone['Chip Type']}</span>` 
      : '';
    const siteTypeTag = zone['Site Type (Colo/YAWN)']
      ? `<span class="zone-tag">${zone['Site Type (Colo/YAWN)']}</span>`
      : '';
      
    sidebar.innerHTML = `
      <div class="zone-name">${zone['AI Zone Name'] || 'Unnamed AI Zone'}</div>
      <div class="zone-meta">
        <span>${zone['Region']} - ${zone['Metro']} (${zone['Campus']})</span>
        ${siteTypeTag}
        ${chipTypeTag}
      </div>
    `;
    
    // Gantt Bar Track
    const track = document.createElement('div');
    track.className = 'gantt-row-track';
    
    // Calculate bar offsets and sizes
    const preflight = zone.parsedPreflight;
    const fho = zone.parsedFho;
    const launch = zone.parsedLaunch;
    
    const totalMs = launch - preflight;
    const leftPct = ((preflight - minDate) / totalDurationMs) * 100;
    const widthPct = (totalMs / totalDurationMs) * 100;
    
    // Class for coloring based on PLC Stage
    let plcClass = 'stage-default';
    if (zone['PLC Stage']) {
      if (zone['PLC Stage'].includes('5')) plcClass = 'stage-5';
      else if (zone['PLC Stage'].includes('4')) plcClass = 'stage-4';
      else if (zone['PLC Stage'].includes('3')) plcClass = 'stage-3';
    }
    
    // Create Gantt Bar Wrapper
    const barWrapper = document.createElement('div');
    barWrapper.className = `gantt-bar-wrapper ${plcClass}`;
    barWrapper.style.left = `${leftPct}%`;
    barWrapper.style.width = `${widthPct}%`;
    
    // Determine bar segments
    if (fho && fho >= preflight && fho <= launch) {
      // Both segments are valid
      const seg1Duration = fho - preflight;
      const seg2Duration = launch - fho;
      
      const seg1WidthPct = (seg1Duration / totalMs) * 100;
      const seg2WidthPct = (seg2Duration / totalMs) * 100;
      
      // Segment 1 (Preflight -> FHO)
      const seg1 = document.createElement('div');
      seg1.className = 'gantt-bar-segment preflight-to-fho';
      seg1.style.width = `${seg1WidthPct}%`;
      
      // Segment 2 (FHO -> Launch)
      const seg2 = document.createElement('div');
      seg2.className = 'gantt-bar-segment fho-to-launch';
      seg2.style.width = `${seg2WidthPct}%`;
      
      barWrapper.appendChild(seg1);
      barWrapper.appendChild(seg2);
    } else {
      // Missing FHO date or FHO date is out of range; draw a single solid bar
      const singleBar = document.createElement('div');
      singleBar.className = 'gantt-bar-segment fho-to-launch'; // Use dark color
      singleBar.style.width = '100%';
      singleBar.style.borderRadius = '4px'; // Subtle round curve
      barWrapper.appendChild(singleBar);
    }
    
    // Hover Tooltip Handlers
    barWrapper.addEventListener('mouseover', (e) => showTooltip(e, zone));
    barWrapper.addEventListener('mousemove', moveTooltip);
    barWrapper.addEventListener('mouseleave', hideTooltip);
    
    track.appendChild(barWrapper);
    
    row.appendChild(sidebar);
    row.appendChild(track);
    ganttRowsContainer.appendChild(row);
  });
}

// Tooltip Logic
function showTooltip(event, zone) {
  tooltip.innerHTML = `
    <div class="tooltip-header">${zone['AI Zone Name'] || 'AI Zone Details'}</div>
    <div class="tooltip-row">
      <span class="tooltip-label">Region/Metro</span>
      <span class="tooltip-value">${zone['Region']} / ${zone['Metro']}</span>
    </div>
    <div class="tooltip-row">
      <span class="tooltip-label">Campus/Phase</span>
      <span class="tooltip-value">${zone['Campus']} (${zone['Building Phase'] || 'N/A'})</span>
    </div>
    <div class="tooltip-row">
      <span class="tooltip-label">Chip Config</span>
      <span class="tooltip-value highlight">${zone['Chip'] || 'N/A'} (${zone['Chip Type'] || 'N/A'})</span>
    </div>
    <div class="tooltip-row">
      <span class="tooltip-label">BDP Useable MW</span>
      <span class="tooltip-value highlight">${zone['MW (BDP Useable ML Allocations)'] || 'N/A'}</span>
    </div>
    <div class="tooltip-row">
      <span class="tooltip-label">Site Type</span>
      <span class="tooltip-value">${zone['Site Type (Colo/YAWN)'] || 'N/A'}</span>
    </div>
    <div class="tooltip-row">
      <span class="tooltip-label">Contract Status</span>
      <span class="tooltip-value">${zone['Contract Status'] || 'N/A'}</span>
    </div>
    <div class="tooltip-row">
      <span class="tooltip-label">DCP Indication</span>
      <span class="tooltip-value">${zone['DCP Indication'] || 'N/A'}</span>
    </div>
    <div class="tooltip-row">
      <span class="tooltip-label">PA</span>
      <span class="tooltip-value">${zone['PA'] || 'N/A'}</span>
    </div>
    <div class="tooltip-row" style="margin-top: 6px; border-top: 1px dashed rgba(255, 255, 255, 0.08); padding-top: 6px;">
      <span class="tooltip-label">PLC Stage</span>
      <span class="tooltip-value">${zone['PLC Stage'] || 'N/A'}</span>
    </div>
    <div class="tooltip-row">
      <span class="tooltip-label">Preflight Start</span>
      <span class="tooltip-value">${formatDateString(zone.parsedPreflight)}</span>
    </div>
    <div class="tooltip-row">
      <span class="tooltip-label">FHO Date</span>
      <span class="tooltip-value">${formatDateString(zone.parsedFho)}</span>
    </div>
    <div class="tooltip-row">
      <span class="tooltip-label">Launch Target</span>
      <span class="tooltip-value" style="font-weight: 600;">${formatDateString(zone.parsedLaunch)}</span>
    </div>
    <div class="tooltip-row" style="margin-top: 6px; border-top: 1px dashed rgba(255, 255, 255, 0.08); padding-top: 6px;">
      <span class="tooltip-label">Customer</span>
      <span class="tooltip-value">${zone['Customer'] || 'N/A'}</span>
    </div>
    <div class="tooltip-row">
      <span class="tooltip-label">In 18m Plan?</span>
      <span class="tooltip-value">${zone['In 18 month Plan?'] || 'N/A'}</span>
    </div>
    <div class="tooltip-row" style="margin-top: 6px; border-top: 1px dashed rgba(255, 255, 255, 0.08); padding-top: 6px; flex-direction: column; align-items: flex-start; gap: 4px;">
      <span class="tooltip-label">Roadmap Description</span>
      <span class="tooltip-value" style="font-size: 0.8rem; line-height: 1.4; color: #fbbc05; font-weight: 500; text-align: left; max-width: 280px; word-wrap: break-word;">${zone['Roadmap Description'] || 'N/A'}</span>
    </div>
  `;
  tooltip.classList.remove('hidden');
  moveTooltip(event);
}

function moveTooltip(event) {
  // Offset tooltip slightly from cursor
  const offsetX = 16;
  const offsetY = 16;
  
  let x = event.clientX + offsetX;
  let y = event.clientY + offsetY;
  
  // Boundary check to prevent tooltip from overflow window
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  if (x + tooltipWidth > windowWidth) {
    x = event.clientX - tooltipWidth - offsetX;
  }
  if (y + tooltipHeight > windowHeight) {
    y = event.clientY - tooltipHeight - offsetY;
  }
  
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function hideTooltip() {
  tooltip.classList.add('hidden');
}

// Start execution
init();
