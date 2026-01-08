// ============================================
// COMPOSANT PLANNING GANTT AMÉLIORÉ
// ============================================

import React, { useState, useRef, useCallback, useEffect } from 'react';

// Icônes
const Icons = {
  Calendar: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15,18 9,12 15,6"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9,6 15,12 9,18"/>
    </svg>
  ),
  X: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20,6 9,17 4,12"/>
    </svg>
  ),
  Users: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
    </svg>
  ),
  Building: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <path d="M9 22v-4h6v4"/>
      <line x1="9" y1="6" x2="9" y2="6.01"/>
      <line x1="15" y1="6" x2="15" y2="6.01"/>
      <line x1="9" y1="10" x2="9" y2="10.01"/>
      <line x1="15" y1="10" x2="15" y2="10.01"/>
    </svg>
  )
};

// Utilitaires de date
const getTodayStr = () => new Date().toISOString().split('T')[0];

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
};

const diffDays = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
};

const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
};

const isWeekend = (jour) => {
  const d = new Date(jour);
  return d.getDay() === 0 || d.getDay() === 6;
};

const formatDateShort = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

// Configuration des vues
const ZOOM_CONFIGS = {
  '2w': { label: '2 sem', jours: 14, cellWidth: 45 },
  '1m': { label: '1 mois', jours: 31, cellWidth: 28 },
  '2m': { label: '2 mois', jours: 62, cellWidth: 16 }
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function PlanningGantt({ 
  chantiers, 
  equipes, 
  employes,
  onModifierLot,
  onDecalerLot
}) {
  // États
  const [viewMode, setViewMode] = useState('chantier'); // 'chantier' ou 'equipe'
  const [zoom, setZoom] = useState('2w');
  const [startDate, setStartDate] = useState(() => getMonday(getTodayStr()));
  const [selectedLot, setSelectedLot] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [resizeState, setResizeState] = useState(null);
  
  const ganttRef = useRef(null);
  const config = ZOOM_CONFIGS[zoom];
  
  // Générer les jours affichés
  const jours = [];
  for (let i = 0; i < config.jours; i++) {
    jours.push(addDays(startDate, i));
  }
  
  // Navigation
  const naviguer = (direction) => {
    const days = direction * (zoom === '2w' ? 7 : zoom === '1m' ? 14 : 30);
    setStartDate(addDays(startDate, days));
  };
  
  const allerAujourdhui = () => {
    setStartDate(getMonday(getTodayStr()));
  };
  
  // Position d'un lot sur la timeline
  const getLotPosition = (lot) => {
    const startOffset = diffDays(startDate, lot.dateDebut);
    const duration = diffDays(lot.dateDebut, lot.dateFin) + 1;
    
    return {
      left: Math.max(0, startOffset) * config.cellWidth,
      width: Math.max(1, Math.min(duration, config.jours - Math.max(0, startOffset))) * config.cellWidth - 4,
      visible: startOffset + duration > 0 && startOffset < config.jours
    };
  };
  
  // ============================================
  // DRAG & DROP
  // ============================================
  
  const handleDragStart = (e, lot, chantier) => {
    e.dataTransfer.effectAllowed = 'move';
    setDragState({
      lot,
      chantier,
      startX: e.clientX,
      originalStart: lot.dateDebut,
      originalEnd: lot.dateFin
    });
  };
  
  const handleDrag = useCallback((e) => {
    if (!dragState || !e.clientX) return;
    
    const deltaX = e.clientX - dragState.startX;
    const deltaDays = Math.round(deltaX / config.cellWidth);
    
    if (deltaDays !== 0) {
      const newStart = addDays(dragState.originalStart, deltaDays);
      const newEnd = addDays(dragState.originalEnd, deltaDays);
      
      // Preview visuel (sans sauvegarder)
      setDragState(prev => ({
        ...prev,
        previewStart: newStart,
        previewEnd: newEnd,
        deltaDays
      }));
    }
  }, [dragState, config.cellWidth]);
  
  const handleDragEnd = useCallback(async () => {
    if (dragState && dragState.deltaDays && dragState.deltaDays !== 0) {
      try {
        await onDecalerLot(
          dragState.chantier.id,
          dragState.lot.id,
          dragState.deltaDays
        );
      } catch (err) {
        console.error('Erreur déplacement lot:', err);
      }
    }
    setDragState(null);
  }, [dragState, onDecalerLot]);
  
  // ============================================
  // RESIZE (modifier dates)
  // ============================================
  
  const handleResizeStart = (e, lot, chantier, side) => {
    e.stopPropagation();
    e.preventDefault();
    
    setResizeState({
      lot,
      chantier,
      side, // 'start' ou 'end'
      startX: e.clientX,
      originalStart: lot.dateDebut,
      originalEnd: lot.dateFin
    });
  };
  
  const handleResize = useCallback((e) => {
    if (!resizeState) return;
    
    const deltaX = e.clientX - resizeState.startX;
    const deltaDays = Math.round(deltaX / config.cellWidth);
    
    let newStart = resizeState.originalStart;
    let newEnd = resizeState.originalEnd;
    
    if (resizeState.side === 'start') {
      newStart = addDays(resizeState.originalStart, deltaDays);
      // Empêcher le début d'aller après la fin
      if (newStart > newEnd) newStart = newEnd;
    } else {
      newEnd = addDays(resizeState.originalEnd, deltaDays);
      // Empêcher la fin d'aller avant le début
      if (newEnd < newStart) newEnd = newStart;
    }
    
    setResizeState(prev => ({
      ...prev,
      previewStart: newStart,
      previewEnd: newEnd
    }));
  }, [resizeState, config.cellWidth]);
  
  const handleResizeEnd = useCallback(async () => {
    if (resizeState && (resizeState.previewStart || resizeState.previewEnd)) {
      try {
        const updates = {};
        if (resizeState.previewStart && resizeState.previewStart !== resizeState.originalStart) {
          updates.dateDebut = resizeState.previewStart;
        }
        if (resizeState.previewEnd && resizeState.previewEnd !== resizeState.originalEnd) {
          updates.dateFin = resizeState.previewEnd;
        }
        
        if (Object.keys(updates).length > 0) {
          await onModifierLot(resizeState.chantier.id, resizeState.lot.id, updates);
        }
      } catch (err) {
        console.error('Erreur resize lot:', err);
      }
    }
    setResizeState(null);
  }, [resizeState, onModifierLot]);
  
  // Écouter les événements souris globaux
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (dragState) handleDrag(e);
      if (resizeState) handleResize(e);
    };
    
    const handleMouseUp = () => {
      if (dragState) handleDragEnd();
      if (resizeState) handleResizeEnd();
    };
    
    if (dragState || resizeState) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, resizeState, handleDrag, handleDragEnd, handleResize, handleResizeEnd]);
  
  // ============================================
  // RENDU
  // ============================================
  
  // Préparation des données selon le mode
  const rows = viewMode === 'chantier'
    ? chantiers.map(ch => ({
        id: ch.id,
        label: ch.nom,
        sublabel: ch.adresse,
        color: '#ff6b35',
        items: ch.lots.map(lot => ({ ...lot, chantier: ch }))
      }))
    : equipes.map(eq => {
        const lots = [];
        chantiers.forEach(ch => {
          ch.lots.forEach(lot => {
            if (lot.equipeId === eq.id) {
              lots.push({ ...lot, chantier: ch });
            }
          });
        });
        const membres = eq.membres.map(mid => employes.find(e => e.id === mid)?.nom).filter(Boolean);
        return {
          id: eq.id,
          label: eq.nom,
          sublabel: membres.join(', '),
          color: eq.couleur,
          items: lots
        };
      });
  
  const today = getTodayStr();
  const todayOffset = diffDays(startDate, today);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* TOOLBAR */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '0.75rem',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Icons.Calendar /> Planning
          </h2>
          
          {/* Toggle vue */}
          <div style={{ 
            display: 'flex', 
            background: 'rgba(0,0,0,0.2)', 
            borderRadius: '6px',
            padding: '2px'
          }}>
            <button
              onClick={() => setViewMode('chantier')}
              style={{
                padding: '0.3rem 0.6rem',
                background: viewMode === 'chantier' ? 'rgba(255,107,53,0.3)' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: viewMode === 'chantier' ? '#ff6b35' : '#94a3b8',
                cursor: 'pointer',
                fontSize: '0.7rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <Icons.Building /> Chantiers
            </button>
            <button
              onClick={() => setViewMode('equipe')}
              style={{
                padding: '0.3rem 0.6rem',
                background: viewMode === 'equipe' ? 'rgba(255,107,53,0.3)' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: viewMode === 'equipe' ? '#ff6b35' : '#94a3b8',
                cursor: 'pointer',
                fontSize: '0.7rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <Icons.Users /> Équipes
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Zoom */}
          <div style={{ 
            display: 'flex', 
            background: 'rgba(0,0,0,0.2)', 
            borderRadius: '6px',
            padding: '2px'
          }}>
            {Object.entries(ZOOM_CONFIGS).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setZoom(key)}
                style={{
                  padding: '0.25rem 0.5rem',
                  background: zoom === key ? 'rgba(255,107,53,0.3)' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  color: zoom === key ? '#ff6b35' : '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.65rem',
                  fontWeight: '600'
                }}
              >
                {cfg.label}
              </button>
            ))}
          </div>
          
          {/* Navigation */}
          <button onClick={() => naviguer(-1)} style={{
            padding: '0.3rem', background: 'rgba(255,255,255,0.05)', border: 'none',
            borderRadius: '4px', color: '#e2e8f0', cursor: 'pointer'
          }}>
            <Icons.ChevronLeft />
          </button>
          
          <button 
            onClick={allerAujourdhui}
            style={{
              padding: '0.3rem 0.6rem',
              background: 'rgba(255,107,53,0.2)',
              border: '1px solid rgba(255,107,53,0.4)',
              borderRadius: '4px',
              color: '#ff6b35',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontWeight: '600'
            }}
          >
            Aujourd'hui
          </button>
          
          <button onClick={() => naviguer(1)} style={{
            padding: '0.3rem', background: 'rgba(255,255,255,0.05)', border: 'none',
            borderRadius: '4px', color: '#e2e8f0', cursor: 'pointer'
          }}>
            <Icons.ChevronRight />
          </button>
          
          <span style={{ 
            padding: '0.3rem 0.6rem', 
            background: 'rgba(0,0,0,0.2)', 
            borderRadius: '4px', 
            fontSize: '0.7rem',
            color: '#94a3b8'
          }}>
            {formatDateShort(startDate)} → {formatDateShort(addDays(startDate, config.jours - 1))}
          </span>
        </div>
      </div>
      
      {/* GANTT */}
      <div 
        ref={ganttRef}
        style={{
          flex: 1,
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'auto',
          position: 'relative'
        }}
      >
        {/* En-tête timeline */}
        <div style={{
          display: 'flex',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(15,23,42,0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          {/* Colonne labels */}
          <div style={{ 
            width: '180px', 
            minWidth: '180px',
            padding: '0.5rem',
            background: 'rgba(255,107,53,0.08)',
            fontWeight: '600',
            fontSize: '0.7rem',
            position: 'sticky',
            left: 0,
            zIndex: 11
          }}>
            {viewMode === 'chantier' ? 'CHANTIER' : 'ÉQUIPE'}
          </div>
          
          {/* Jours */}
          <div style={{ display: 'flex' }}>
            {jours.map((jour, idx) => {
              const d = new Date(jour);
              const isWE = isWeekend(jour);
              const isToday = jour === today;
              const isFirstOfMonth = d.getDate() === 1;
              
              return (
                <div 
                  key={jour}
                  style={{
                    width: config.cellWidth,
                    minWidth: config.cellWidth,
                    padding: '0.25rem 0',
                    textAlign: 'center',
                    background: isToday ? 'rgba(255,107,53,0.2)' : isWE ? 'rgba(0,0,0,0.3)' : 'transparent',
                    borderLeft: isFirstOfMonth ? '2px solid rgba(255,107,53,0.5)' : '1px solid rgba(255,255,255,0.05)',
                    fontSize: zoom === '2m' ? '0.5rem' : '0.6rem'
                  }}
                >
                  <div style={{ 
                    color: isToday ? '#ff6b35' : isWE ? '#475569' : '#94a3b8',
                    fontWeight: isToday ? '700' : '500'
                  }}>
                    {zoom === '2m' ? '' : d.toLocaleDateString('fr-FR', { weekday: 'narrow' })}
                  </div>
                  <div style={{ 
                    color: isToday ? '#ff6b35' : isWE ? '#334155' : '#64748b',
                    fontWeight: isFirstOfMonth ? '700' : '400'
                  }}>
                    {d.getDate()}
                    {isFirstOfMonth && zoom !== '2w' && (
                      <span style={{ fontSize: '0.5rem', marginLeft: '2px' }}>
                        {d.toLocaleDateString('fr-FR', { month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Lignes */}
        {rows.map(row => (
          <div 
            key={row.id}
            style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              minHeight: '50px'
            }}
          >
            {/* Label */}
            <div style={{ 
              width: '180px', 
              minWidth: '180px',
              padding: '0.4rem 0.5rem',
              background: 'rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              position: 'sticky',
              left: 0,
              zIndex: 5
            }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: row.color,
                flexShrink: 0
              }} />
              <div style={{ overflow: 'hidden' }}>
                <div style={{ 
                  fontWeight: '600', 
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {row.label}
                </div>
                <div style={{ 
                  color: '#64748b', 
                  fontSize: '0.55rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {row.sublabel}
                </div>
              </div>
            </div>
            
            {/* Timeline */}
            <div style={{ 
              flex: 1, 
              position: 'relative',
              background: `repeating-linear-gradient(
                90deg,
                transparent 0px,
                transparent ${config.cellWidth - 1}px,
                rgba(255,255,255,0.03) ${config.cellWidth - 1}px,
                rgba(255,255,255,0.03) ${config.cellWidth}px
              )`
            }}>
              {/* Ligne aujourd'hui */}
              {todayOffset >= 0 && todayOffset < config.jours && (
                <div style={{
                  position: 'absolute',
                  left: todayOffset * config.cellWidth + config.cellWidth / 2,
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  background: '#ff6b35',
                  zIndex: 1,
                  opacity: 0.6
                }} />
              )}
              
              {/* Barres des lots */}
              {row.items.map((item, idx) => {
                const isDragging = dragState?.lot.id === item.id;
                const isResizing = resizeState?.lot.id === item.id;
                
                // Utiliser la preview si en cours de drag/resize
                const displayStart = isDragging && dragState.previewStart 
                  ? dragState.previewStart 
                  : isResizing && resizeState.previewStart
                    ? resizeState.previewStart
                    : item.dateDebut;
                    
                const displayEnd = isDragging && dragState.previewEnd
                  ? dragState.previewEnd
                  : isResizing && resizeState.previewEnd
                    ? resizeState.previewEnd
                    : item.dateFin;
                
                const pos = getLotPosition({ dateDebut: displayStart, dateFin: displayEnd });
                
                if (!pos.visible) return null;
                
                const equipe = equipes.find(e => e.id === item.equipeId);
                const barColor = viewMode === 'equipe' ? row.color : (equipe?.couleur || '#64748b');
                
                return (
                  <div
                    key={item.id || idx}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item, item.chantier)}
                    onClick={() => setSelectedLot({ lot: item, chantier: item.chantier })}
                    style={{
                      position: 'absolute',
                      left: pos.left + 2,
                      top: 8 + (idx % 2) * 20,
                      width: pos.width,
                      height: '18px',
                      background: `linear-gradient(135deg, ${barColor}dd, ${barColor}99)`,
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.55rem',
                      fontWeight: '600',
                      color: '#fff',
                      cursor: 'grab',
                      zIndex: 2,
                      boxShadow: isDragging || isResizing ? '0 4px 12px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.3)',
                      opacity: isDragging ? 0.8 : 1,
                      transition: isDragging || isResizing ? 'none' : 'box-shadow 0.15s',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      userSelect: 'none'
                    }}
                    title={`${viewMode === 'chantier' ? item.corps : item.chantier.nom} (${displayStart} → ${displayEnd})`}
                  >
                    {/* Poignée gauche (resize début) */}
                    <div
                      onMouseDown={(e) => handleResizeStart(e, item, item.chantier, 'start')}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '8px',
                        cursor: 'ew-resize',
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.3), transparent)'
                      }}
                    />
                    
                    {/* Contenu */}
                    <span style={{ padding: '0 10px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {viewMode === 'chantier' 
                        ? (zoom === '2m' ? item.corps.substring(0, 3) : item.corps)
                        : (zoom === '2m' ? item.chantier.nom.substring(0, 4) : item.chantier.nom)
                      }
                    </span>
                    
                    {/* Badge statut */}
                    {item.statut === 'en_cours' && (
                      <div style={{
                        position: 'absolute',
                        right: 12,
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#22c55e',
                        boxShadow: '0 0 4px #22c55e'
                      }} />
                    )}
                    
                    {/* Poignée droite (resize fin) */}
                    <div
                      onMouseDown={(e) => handleResizeStart(e, item, item.chantier, 'end')}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: '8px',
                        cursor: 'ew-resize',
                        background: 'linear-gradient(270deg, rgba(255,255,255,0.3), transparent)'
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {/* Message si vide */}
        {rows.length === 0 && (
          <div style={{ 
            padding: '3rem', 
            textAlign: 'center', 
            color: '#64748b' 
          }}>
            Aucun {viewMode === 'chantier' ? 'chantier' : 'équipe'} à afficher
          </div>
        )}
      </div>
      
      {/* MODAL ÉDITION LOT */}
      {selectedLot && (
        <LotEditModal
          lot={selectedLot.lot}
          chantier={selectedLot.chantier}
          equipes={equipes}
          onClose={() => setSelectedLot(null)}
          onSave={async (updates) => {
            await onModifierLot(selectedLot.chantier.id, selectedLot.lot.id, updates);
            setSelectedLot(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================
// MODAL ÉDITION LOT
// ============================================

function LotEditModal({ lot, chantier, equipes, onClose, onSave }) {
  const [form, setForm] = useState({
    dateDebut: lot.dateDebut,
    dateFin: lot.dateFin,
    equipeId: lot.equipeId || '',
    statut: lot.statut || 'planifie'
  });
  const [saving, setSaving] = useState(false);
  
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        dateDebut: form.dateDebut,
        dateFin: form.dateFin,
        equipeId: form.equipeId ? Number(form.equipeId) : null,
        statut: form.statut
      });
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
    }
    setSaving(false);
  };
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={onClose}>
      <div 
        style={{
          background: 'linear-gradient(145deg, #1e293b, #0f172a)',
          borderRadius: '12px',
          padding: '1.5rem',
          width: '360px',
          maxWidth: '90vw',
          border: '1px solid rgba(255,107,53,0.3)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#ff6b35' }}>{lot.corps}</h3>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{chantier.nom}</div>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#64748b', 
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            <Icons.X />
          </button>
        </div>
        
        {/* Formulaire */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Dates */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
                DÉBUT
              </label>
              <input
                type="date"
                value={form.dateDebut}
                onChange={e => setForm({ ...form, dateDebut: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  color: '#e2e8f0',
                  fontSize: '0.8rem'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
                FIN
              </label>
              <input
                type="date"
                value={form.dateFin}
                onChange={e => setForm({ ...form, dateFin: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  color: '#e2e8f0',
                  fontSize: '0.8rem'
                }}
              />
            </div>
          </div>
          
          {/* Équipe */}
          <div>
            <label style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
              ÉQUIPE
            </label>
            <select
              value={form.equipeId}
              onChange={e => setForm({ ...form, equipeId: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: '#e2e8f0',
                fontSize: '0.8rem'
              }}
            >
              <option value="">-- Non assigné --</option>
              {equipes.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nom}</option>
              ))}
            </select>
          </div>
          
          {/* Statut */}
          <div>
            <label style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
              STATUT
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                { value: 'planifie', label: 'Planifié', color: '#64748b' },
                { value: 'en_cours', label: 'En cours', color: '#f59e0b' },
                { value: 'termine', label: 'Terminé', color: '#22c55e' }
              ].map(s => (
                <button
                  key={s.value}
                  onClick={() => setForm({ ...form, statut: s.value })}
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    background: form.statut === s.value ? `${s.color}33` : 'rgba(0,0,0,0.2)',
                    border: `1px solid ${form.statut === s.value ? s.color : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '6px',
                    color: form.statut === s.value ? s.color : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    fontWeight: '600'
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '0.6rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '600'
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 1,
                padding: '0.6rem',
                background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                border: 'none',
                borderRadius: '6px',
                color: '#0f172a',
                cursor: saving ? 'wait' : 'pointer',
                fontSize: '0.8rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem'
              }}
            >
              <Icons.Check /> {saving ? 'Sauvegarde...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
