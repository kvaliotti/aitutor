'use client';

import { useState } from 'react';

interface Concept {
  id: string;
  name: string;
  description?: string;
  isCompleted: boolean;
  orderIndex: number;
  subConcepts?: Concept[];
}

interface ConceptMapSidebarProps {
  concepts: Concept[];
  onToggleCompletion: (conceptId: string, isCompleted: boolean) => void;
}

export function ConceptMapSidebar({ concepts, onToggleCompletion }: ConceptMapSidebarProps) {
  const [expandedConcepts, setExpandedConcepts] = useState<Set<string>>(new Set());

  const toggleExpanded = (conceptId: string) => {
    setExpandedConcepts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(conceptId)) {
        newSet.delete(conceptId);
      } else {
        newSet.add(conceptId);
      }
      return newSet;
    });
  };

  const renderConcept = (concept: Concept, depth: number = 0) => {
    const hasSubConcepts = concept.subConcepts && concept.subConcepts.length > 0;
    const isExpanded = expandedConcepts.has(concept.id);
    const indentClass = depth > 0 ? `ml-${depth * 4}` : '';

    return (
      <div key={concept.id} className="mb-1">
        <div 
          className={`flex items-center space-x-2 p-1.5 rounded hover:bg-gray-50 ${indentClass}`}
        >
          {/* Expand/Collapse Button */}
          {hasSubConcepts && (
            <button
              onClick={() => toggleExpanded(concept.id)}
              className="w-4 h-4 flex items-center justify-center text-gray-600 hover:text-gray-800"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          
          {/* Placeholder for alignment when no sub-concepts */}
          {!hasSubConcepts && depth === 0 && (
            <div className="w-4 h-4"></div>
          )}
          
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={concept.isCompleted}
            onChange={(e) => onToggleCompletion(concept.id, e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          
          {/* Concept Details */}
          <div className="flex-1 min-w-0">
            <div 
              className={`text-sm font-medium ${
                concept.isCompleted 
                  ? 'text-gray-600 line-through' 
                  : 'text-gray-900'
              }`}
            >
              {concept.name}
            </div>
            {concept.description && (
              <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                {concept.description}
              </div>
            )}
          </div>
          
          {/* Completion Badge */}
          {concept.isCompleted && (
            <div className="text-green-600 text-sm">✓</div>
          )}
        </div>
        
        {/* Sub-concepts */}
        {hasSubConcepts && isExpanded && (
          <div className="ml-2">
            {concept.subConcepts!.map(subConcept => 
              renderConcept(subConcept, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  if (concepts.length === 0) {
    return (
      <div className="p-3 text-center text-gray-700">
        <div className="text-xl mb-1">🗺️</div>
        <p className="text-xs">No concept map yet.</p>
        <p className="text-xs text-gray-600">Start chatting to generate your learning path!</p>
      </div>
    );
  }

  const completedCount = concepts.filter(c => c.isCompleted).length;
  const totalCount = concepts.length;

  return (
    <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">Concept Map</h3>
          <div className="text-xs text-gray-600">
            {completedCount}/{totalCount}
          </div>
        </div>
        
        <div className="space-y-1">
          {concepts.map(concept => renderConcept(concept))}
        </div>
        
        {totalCount > 0 && (
          <div className="mt-3 p-2 bg-blue-50 rounded text-center">
            <div className="text-xs text-blue-700">
              {completedCount === totalCount 
                ? '🎉 All concepts complete!'
                : `${totalCount - completedCount} concepts remaining`
              }
            </div>
          </div>
        )}
      </div>
    );
  } 