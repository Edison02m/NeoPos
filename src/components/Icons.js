import React from 'react';

// Icono de Excel usando el SVG local
export const ExcelIcon = ({ size = 16, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 400 400" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <style>{`.cls-1{fill:currentColor;}`}</style>
    <g id="xxx-word">
      <path className="cls-1" d="M325,105H250a5,5,0,0,1-5-5V25a5,5,0,1,1,10,0V95h70a5,5,0,0,1,0,10Z"/>
      <path className="cls-1" d="M325,154.83a5,5,0,0,1-5-5V102.07L247.93,30H100A20,20,0,0,0,80,50v98.17a5,5,0,0,1-10,0V50a30,30,0,0,1,30-30H250a5,5,0,0,1,3.54,1.46l75,75A5,5,0,0,1,330,100v49.83A5,5,0,0,1,325,154.83Z"/>
      <path className="cls-1" d="M300,380H100a30,30,0,0,1-30-30V275a5,5,0,0,1,10,0v75a20,20,0,0,0,20,20H300a20,20,0,0,0,20-20V275a5,5,0,0,1,10,0v75A30,30,0,0,1,300,380Z"/>
      <path className="cls-1" d="M75,220a5,5,0,0,1,10,0v20a5,5,0,0,1-10,0V220Z"/>
      <path className="cls-1" d="M315,220a5,5,0,0,1,10,0v20a5,5,0,0,1-10,0V220Z"/>
      <path className="cls-1" d="M70,185H330a5,5,0,0,1,0,10H70a5,5,0,0,1,0-10Z"/>
      <path className="cls-1" d="M70,255H330a5,5,0,0,1,0,10H70a5,5,0,0,1,0-10Z"/>
      <path className="cls-1" d="M169.09,218.24l-14.4-17.76a5,5,0,0,1,7.82-6.34l10.49,12.93,10.49-12.93a5,5,0,0,1,7.82,6.34l-14.4,17.76,14.4,17.76a5,5,0,0,1-7.82,6.34L173,229.41l-10.49,12.93a5,5,0,0,1-7.82-6.34Z"/>
      <path className="cls-1" d="M224.09,218.24l-14.4-17.76a5,5,0,0,1,7.82-6.34l10.49,12.93,10.49-12.93a5,5,0,0,1,7.82,6.34l-14.4,17.76,14.4,17.76a5,5,0,0,1-7.82,6.34L228,229.41l-10.49,12.93a5,5,0,0,1-7.82-6.34Z"/>
    </g>
  </svg>
);

// Icono de PDF usando el SVG local actualizado
export const PdfIcon = ({ size = 16, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 400 400" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <style>{`.cls-1{fill:currentColor;}`}</style>
    <g id="xxx-word">
      <path className="cls-1" d="M325,105H250a5,5,0,0,1-5-5V25a5,5,0,0,1,10,0V95h70a5,5,0,0,1,0,10Z"/>
      <path className="cls-1" d="M325,154.83a5,5,0,0,1-5-5V102.07L247.93,30H100A20,20,0,0,0,80,50v98.17a5,5,0,0,1-10,0V50a30,30,0,0,1,30-30H250a5,5,0,0,1,3.54,1.46l75,75A5,5,0,0,1,330,100v49.83A5,5,0,0,1,325,154.83Z"/>
      <path className="cls-1" d="M300,380H100a30,30,0,0,1-30-30V275a5,5,0,0,1,10,0v75a20,20,0,0,0,20,20H300a20,20,0,0,0,20-20V275a5,5,0,0,1,10,0v75A30,30,0,0,1,300,380Z"/>
      <path className="cls-1" d="M124.81,226.53V245a5,5,0,0,1-10,0V195a5,5,0,0,1,5-5h15.92c8.11,0,14.69,6.25,14.69,13.93s-6.58,13.93-14.69,13.93H124.81Zm0-21.53v11.53h10.92c2.61,0,4.69-1.78,4.69-3.93s-2.08-3.93-4.69-3.93H124.81Z"/>
      <path className="cls-1" d="M178.24,193.5c13.77,0,24.95,10.79,24.95,24.08V245a5,5,0,0,1-10,0V217.58c0-7.74-6.58-14.08-14.95-14.08s-14.95,6.34-14.95,14.08V245a5,5,0,0,1-10,0V217.58C153.29,204.29,164.47,193.5,178.24,193.5Z"/>
      <path className="cls-1" d="M236.27,190a5,5,0,0,1,5,5v27.42h19.92a5,5,0,0,1,0,10H241.27V245a5,5,0,0,1-10,0V195A5,5,0,0,1,236.27,190Z"/>
    </g>
  </svg>
);

// Icono de eliminar (papelera)
export const TrashIcon = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M10 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
