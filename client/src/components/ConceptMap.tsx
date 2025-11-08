import { useMemo } from 'react';

interface ConceptMapProps {
  conceptualConnections: string[];
}

export default function ConceptMap({ conceptualConnections }: ConceptMapProps) {
  const uniqueConcepts = useMemo(() => {
    return Array.from(new Set(conceptualConnections));
  }, [conceptualConnections]);

  if (uniqueConcepts.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No concept connections available for this session.</p>
      </div>
    );
  }

  // Simple grid layout for concept visualization
  const getConceptColor = (concept: string) => {
    const hash = concept.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-300',
      'bg-green-100 text-green-800 border-green-300',
      'bg-purple-100 text-purple-800 border-purple-300',
      'bg-yellow-100 text-yellow-800 border-yellow-300',
      'bg-pink-100 text-pink-800 border-pink-300',
      'bg-indigo-100 text-indigo-800 border-indigo-300',
      'bg-red-100 text-red-800 border-red-300',
      'bg-teal-100 text-teal-800 border-teal-300',
    ];
    return colors[hash % colors.length];
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4">Concept Connections</h3>
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {uniqueConcepts.map((concept, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 ${getConceptColor(concept)} transition-transform hover:scale-105 cursor-pointer`}
            >
              <div className="font-medium text-sm capitalize">{concept}</div>
              <div className="text-xs mt-1 opacity-75">
                {conceptualConnections.filter(c => c === concept).length} reference{conceptualConnections.filter(c => c === concept).length !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
        
        {uniqueConcepts.length > 1 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              <strong>Total Concepts:</strong> {uniqueConcepts.length} | 
              <strong className="ml-2">Total References:</strong> {conceptualConnections.length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


