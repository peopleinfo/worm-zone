import React, { useState } from 'react';
import { X, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { audioService } from '../services/audioService';

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GameRulesModal: React.FC<GameRulesModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [isMuted, setIsMuted] = useState(true); // Start muted by default

  const handleClose = () => {
    // Start background music when user closes the rules
    audioService.handleUserInteraction();
    onClose();
  };

  const handleToggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    audioService.setMuted(newMutedState);
    
    // If unmuting, also start the audio
    if (!newMutedState) {
      audioService.handleUserInteraction();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            {t('gameRules.title', 'How to Play')}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-4 text-gray-700">
          <div>
            <h3 className="font-semibold text-lg mb-2">
              {t('gameRules.objective', 'Objective')}
            </h3>
            <p className="text-sm">
              {t('gameRules.objectiveDesc', 'Grow your snake by eating food and become the longest snake on the field!')}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">
              {t('gameRules.controls', 'Controls')}
            </h3>
            <ul className="text-sm space-y-1">
              <li>• {t('gameRules.arrowKeys', 'Use arrow keys or WASD to move')}</li>
              <li>• {t('gameRules.mouse', 'Click and drag to change direction')}</li>
              <li>• {t('gameRules.touch', 'Swipe on mobile devices')}</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">
              {t('gameRules.rules', 'Rules')}
            </h3>
            <ul className="text-sm space-y-1">
              <li>• {t('gameRules.eatFood', 'Eat colored food to grow')}</li>
              <li>• {t('gameRules.avoidWalls', 'Don\'t hit the walls')}</li>
              <li>• {t('gameRules.avoidSnakes', 'Don\'t collide with other snakes')}</li>
              <li>• {t('gameRules.survive', 'Survive as long as possible')}</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">
              {t('gameRules.tips', 'Tips')}
            </h3>
            <ul className="text-sm space-y-1">
              <li>• {t('gameRules.startSmall', 'Start with small movements')}</li>
              <li>• {t('gameRules.planAhead', 'Plan your route ahead')}</li>
              <li>• {t('gameRules.watchOthers', 'Watch out for other players')}</li>
              <li>• {t('gameRules.bePatient', 'Be patient and strategic')}</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center space-y-4">
          {/* Audio Toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {t('gameRules.backgroundMusic', 'Background Music')}:
            </span>
            <button
              onClick={handleToggleMute}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              title={isMuted ? t('gameRules.unmute', 'Unmute') : t('gameRules.mute', 'Mute')}
            >
              {isMuted ? (
                <VolumeX size={20} className="text-gray-600" />
              ) : (
                <Volume2 size={20} className="text-blue-500" />
              )}
            </button>
          </div>
          
          {/* Start Playing Button */}
          <button
            onClick={handleClose}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            {t('gameRules.startPlaying', 'Start Playing!')}
          </button>
        </div>
      </div>
    </div>
  );
};
