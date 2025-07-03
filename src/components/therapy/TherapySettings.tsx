'use client';

interface TherapySettingsProps {
  currentStyle: string;
  onStyleChange: (style: string) => void;
}

export function TherapySettings({ currentStyle, onStyleChange }: TherapySettingsProps) {
  const styles = [
    {
      id: 'CBT',
      name: 'CBT',
      description: 'Cognitive Behavioral Therapy',
      icon: '🧠'
    },
    {
      id: 'mindfulness',
      name: 'Mindful',
      description: 'Mindfulness-based approach',
      icon: '🧘'
    },
    {
      id: 'solution-focused',
      name: 'Solution',
      description: 'Solution-focused therapy',
      icon: '🎯'
    }
  ];

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-900 mb-1">Therapy Style</h3>
      
      <div className="flex space-x-1">
        {styles.map((style) => (
          <button
            key={style.id}
            onClick={() => onStyleChange(style.id)}
            className={`flex-1 p-1.5 rounded border transition-colors text-center ${
              currentStyle === style.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            title={style.description}
          >
            <div className="text-xs">{style.icon}</div>
            <div className={`text-xs font-medium mt-0.5 ${
              currentStyle === style.id ? 'text-blue-900' : 'text-gray-900'
            }`}>
              {style.name}
            </div>
            {currentStyle === style.id && (
              <div className="text-blue-600 text-xs">✓</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
} 