// ============================================================================
// PartTermFilterBar.tsx
// Part/Term Filtering Component for BookContentWindowDemo
// ============================================================================

import React, { useMemo } from "react";
import { ChevronDown, X } from "lucide-react";

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface LibraryUnit {
  id: string;
  unitNumber: number;
  unitTitle: string;
  unitLabel: string;
  part?: string;
  term?: string;
  subject: string;
  board: string;
  standard: string;
  processingStatus?: string;
}

interface PartTermFilterBarProps {
  units: LibraryUnit[];
  selectedPart: string | null;
  selectedTerm: string | null;
  onPartChange: (part: string | null) => void;
  onTermChange: (term: string | null) => void;
  onReset: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Extract unique parts, terms, and build part-term matrix from units
 */
function extractPartTermData(units: LibraryUnit[]) {
  const parts = new Set<string>();
  const terms = new Set<string>();
  const partTermMatrix: { [part: string]: Set<string> } = {};

  units.forEach((unit) => {
    // Add part
    if (unit.part) {
      parts.add(unit.part);
      if (!partTermMatrix[unit.part]) {
        partTermMatrix[unit.part] = new Set();
      }
      // Add term for this part
      if (unit.term) {
        partTermMatrix[unit.part].add(unit.term);
      }
    }
    // Add term
    if (unit.term) {
      terms.add(unit.term);
    }
  });

  return {
    parts: Array.from(parts).sort((a, b) => {
      // Custom sort: "Part A" before "Part B", then custom parts
      const aIsStandard = a.match(/^Part\s+[A-Z]$/i);
      const bIsStandard = b.match(/^Part\s+[A-Z]$/i);

      if (aIsStandard && bIsStandard) {
        return a.localeCompare(b);
      }
      if (aIsStandard) return -1;
      if (bIsStandard) return 1;
      return a.localeCompare(b);
    }),
    terms: Array.from(terms).sort((a, b) => {
      // Custom sort: "Term 1" before "Term 2", then custom terms
      const aNum = parseInt(a.match(/\d+/)?.[0] || "0", 10);
      const bNum = parseInt(b.match(/\d+/)?.[0] || "0", 10);

      if (aNum && bNum) return aNum - bNum;
      return a.localeCompare(b);
    }),
    partTermMatrix: Object.fromEntries(
      Array.from(Object.entries(partTermMatrix)).map(([part, termsSet]) => [
        part,
        Array.from(termsSet).sort(),
      ])
    ),
  };
}

/**
 * Count units matching criteria
 */
function countUnits(
  units: LibraryUnit[],
  part?: string,
  term?: string
): number {
  return units.filter((u) => {
    if (part && u.part !== part) return false;
    if (term && u.term !== term) return false;
    return true;
  }).length;
}

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export const PartTermFilterBar: React.FC<PartTermFilterBarProps> = ({
  units,
  selectedPart,
  selectedTerm,
  onPartChange,
  onTermChange,
  onReset,
}) => {
  // Extract part/term data
  const { parts, terms, partTermMatrix } = useMemo(
    () => extractPartTermData(units),
    [units]
  );

  // Get available terms for selected part
  const termsForSelectedPart = selectedPart ? partTermMatrix[selectedPart] || [] : terms;

  // Calculate filtered count
  const filteredCount = useMemo(
    () => countUnits(units, selectedPart || undefined, selectedTerm || undefined),
    [units, selectedPart, selectedTerm]
  );

  const totalCount = units.length;
  const hasFilters = selectedPart || selectedTerm;

  // Don't render if no parts available
  if (parts.length === 0) {
    return null;
  }

  return (
    <div className="part-term-filter-bar">
      {/* Header with Info and Reset Button */}
      <div className="filter-bar-header">
        <div className="filter-info">
          <span className="filter-label">Filter by Part & Term</span>
          {hasFilters && (
            <span className="filter-count">
              Showing {filteredCount} of {totalCount} units
            </span>
          )}
        </div>
        {hasFilters && (
          <button
            onClick={onReset}
            className="reset-button"
            aria-label="Clear filters"
            title="Clear all filters"
          >
            <X size={16} />
            <span>Clear Filters</span>
          </button>
        )}
      </div>

      {/* Part Tabs */}
      <div className="filter-section">
        <label className="filter-section-label">Parts</label>
        <div className="filter-tabs">
          {parts.map((part) => {
            const partCount = countUnits(units, part);
            const isActive = selectedPart === part;

            return (
              <button
                key={part}
                onClick={() => {
                  if (isActive) {
                    onPartChange(null);
                  } else {
                    onPartChange(part);
                    // Auto-select first available term for this part
                    const availableTermsForPart = partTermMatrix[part] || [];
                    if (
                      availableTermsForPart.length > 0 &&
                      !selectedTerm
                    ) {
                      onTermChange(availableTermsForPart[0]);
                    }
                  }
                }}
                className={`filter-tab ${isActive ? "active" : ""}`}
                aria-pressed={isActive}
                title={`${part}: ${partCount} units`}
              >
                <span className="tab-label">{part}</span>
                <span className="tab-count">{partCount}</span>
              </button>
            );
          })}

          {/* All Parts Button */}
          <button
            onClick={() => {
              onPartChange(null);
            }}
            className={`filter-tab all-tab ${!selectedPart ? "active" : ""}`}
            aria-pressed={!selectedPart}
            title={`All Parts: ${totalCount} units`}
          >
            <span className="tab-label">All Parts</span>
            <span className="tab-count">{totalCount}</span>
          </button>
        </div>
      </div>

      {/* Term Tabs */}
      {(selectedPart ? termsForSelectedPart : terms).length > 0 && (
        <div className="filter-section">
          <label className="filter-section-label">
            {selectedPart ? `Terms in ${selectedPart}` : "Terms"}
          </label>
          <div className="filter-tabs">
            {(selectedPart ? termsForSelectedPart : terms).map((term) => {
              const termCount = countUnits(
                units,
                selectedPart || undefined,
                term
              );
              const isActive = selectedTerm === term;

              return (
                <button
                  key={term}
                  onClick={() => {
                    if (isActive) {
                      onTermChange(null);
                    } else {
                      onTermChange(term);
                    }
                  }}
                  className={`filter-tab ${isActive ? "active" : ""}`}
                  aria-pressed={isActive}
                  title={`${term}: ${termCount} units`}
                >
                  <span className="tab-label">{term}</span>
                  <span className="tab-count">{termCount}</span>
                </button>
              );
            })}

            {/* All Terms Button */}
            <button
              onClick={() => {
                onTermChange(null);
              }}
              className={`filter-tab all-tab ${!selectedTerm ? "active" : ""}`}
              aria-pressed={!selectedTerm}
              title={`All Terms: ${
                selectedPart
                  ? countUnits(units, selectedPart)
                  : totalCount
              } units`}
            >
              <span className="tab-label">All Terms</span>
              <span className="tab-count">
                {selectedPart
                  ? countUnits(units, selectedPart)
                  : totalCount}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* CSS Styles */}
      <style>{`
        .part-term-filter-bar {
          background: linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%);
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1.5rem;
          margin: 1.5rem 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
        }

        .filter-bar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .filter-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-label {
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #6b7280;
        }

        .filter-count {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .reset-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: 1px solid #e5e7eb;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .reset-button:hover {
          background: #f3f4f6;
          color: #374151;
          border-color: #d1d5db;
        }

        .reset-button:active {
          background: #e5e7eb;
        }

        .filter-section {
          margin-bottom: 1.5rem;
        }

        .filter-section:last-child {
          margin-bottom: 0;
        }

        .filter-section-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #9ca3af;
          margin-bottom: 0.75rem;
        }

        .filter-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .filter-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: #f3f4f6;
          border: 2px solid transparent;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .filter-tab:hover {
          background: #e5e7eb;
          color: #374151;
          transform: translateY(-1px);
        }

        .filter-tab.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .filter-tab.active .tab-count {
          background: rgba(255, 255, 255, 0.25);
          color: white;
        }

        .tab-label {
          font-weight: 600;
        }

        .tab-count {
          background: rgba(102, 126, 234, 0.1);
          color: #667eea;
          padding: 0 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .filter-tab.all-tab {
          border: 2px solid #d1d5db;
          background: white;
        }

        .filter-tab.all-tab:hover {
          border-color: #c4b5fd;
        }

        .filter-tab.all-tab.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: #667eea;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .part-term-filter-bar {
            padding: 1rem;
          }

          .filter-bar-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .filter-tabs {
            gap: 0.5rem;
          }

          .filter-tab {
            padding: 0.5rem 0.875rem;
            font-size: 0.8125rem;
          }

          .tab-count {
            padding: 0 0.375rem;
          }

          .reset-button {
            width: 100%;
            justify-content: center;
          }
        }

        /* Dark Mode Support (optional) */
        @media (prefers-color-scheme: dark) {
          .part-term-filter-bar {
            background: linear-gradient(to bottom, #1f2937 0%, #111827 100%);
            border-color: #374151;
          }

          .filter-bar-header {
            border-color: #374151;
          }

          .filter-label {
            color: #d1d5db;
          }

          .filter-count {
            color: #6b7280;
          }

          .filter-section-label {
            color: #6b7280;
          }

          .filter-tab {
            background: #374151;
            color: #d1d5db;
          }

          .filter-tab:hover {
            background: #4b5563;
            color: #e5e7eb;
          }

          .tab-count {
            background: rgba(102, 126, 234, 0.2);
            color: #a5b4fc;
          }

          .reset-button {
            border-color: #4b5563;
            color: #d1d5db;
          }

          .reset-button:hover {
            background: #374151;
            color: #e5e7eb;
          }
        }
      `}</style>
    </div>
  );
};

export default PartTermFilterBar;
