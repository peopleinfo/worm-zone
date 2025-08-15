import React from "react";
import { X, Gamepad2, Users, Trophy, RotateCcw } from "lucide-react";

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="how-to-play-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>How to Play - Worm Zone</h2>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-content">
          <div className="rule-section">
            <div style={{ display: "flex", gap: 4 }}>
              <div className="rule-icon">
                <Gamepad2 size={24} />
              </div>
              <h3>Game Objective & Controls</h3>
            </div>
            <ul>
              <li>Control your worm to eat food and grow longer</li>
              <li>Use touch controls or arrow keys to move</li>
              <li>Avoid hitting other worms or the walls</li>
              <li>Become the longest worm to dominate the arena!</li>
            </ul>
          </div>

          <div className="rule-section">
            <div style={{ display: "flex", gap: 4 }}>
              <div className="rule-icon">
                <Users size={24} />
              </div>
              <h3>Multiplayer Rules</h3>
            </div>
            <ul>
              <li>Play with friends in the same room</li>
              <li>Auto-connect to available rooms</li>
            </ul>
          </div>

          <div className="rule-section">
            <div style={{ display: "flex", gap: 4 }}>
            <div className="rule-icon">
              <Trophy size={24} />
            </div>
            <h3>Scoring System</h3>
            </div>
            <ul>
              <li>Eat food to increase your score and length</li>
              <li>Larger worms give more points when eliminated</li>
              <li>Compete for the highest score on the leaderboard</li>
              <li>Your best score is saved automatically</li>
            </ul>
          </div>

          <div className="rule-section">
            <div className="rule-icon">
              <RotateCcw size={24} />
            </div>
            <h3>Death & Restart</h3>
            <ul>
              <li>Game ends when you hit another worm or wall</li>
              <li>View your score and highest score in the game over modal</li>
              <li>Your score resets to zero on restart</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
