import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { socketClient } from '../../services/socketClient';

export const ConnectionIndicator: React.FC = () => {
  const { t } = useTranslation('game');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const checkConnection = () => {
      const isConnected = socketClient.isSocketConnected();
      const socket = socketClient.getSocket();
      const isActuallyConnected = isConnected && socket && socket.connected;
      setIsConnected(!!isActuallyConnected);
    };

    // Check immediately
    checkConnection();

    // Check every 1 second for more responsive updates
    const interval = setInterval(checkConnection, 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    return isConnected ? '#4CAF50' : '#F44336';
  };

  // Don't show anything when connected
  if (isConnected) return null;

  return (
    <div 
      className="connection-indicator-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: 'Baloo, sans-serif'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '24px 32px',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          color: '#333',
          textAlign: 'center',
          minWidth: '280px'
        }}
      >
        <div
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(),
            transition: 'background-color 0.3s ease'
          }}
        />
        <span style={{ fontSize: '24px', opacity: 0.8 }}>
          🔴
        </span>
        <div>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            margin: '0 0 8px 0',
            color: '#F44336'
          }}>
            {t('connection.disconnected')}
          </h3>
          <p style={{ 
            fontSize: '14px', 
            margin: 0, 
            color: '#666',
            lineHeight: '1.4'
          }}>
            {t('connection.checkingConnection')}
          </p>
        </div>
      </div>
    </div>
  );
};
