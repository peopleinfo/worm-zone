import { GameLayout } from "./components/Layout/GameLayout";
import { SplashScreen } from "./components/SplashScreen";
import { UserInfoDeniedModal } from "./components/Game/UserInfoDeniedModal";
import { useEffect } from "react";
import { useAuthStore } from "./stores/authStore";
import { useSettingsStore } from "./stores/settingsStore";
import { audioService } from "./services/audioService";

function App() {
  const initializeAuth = useAuthStore((s) => s.initializeAuth);
  const isLoadingInit = useAuthStore((s) => s.isLoadingInit);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isUserInfoDenied = useAuthStore((s) => s.isUserInfoDenied);
  const sound = useSettingsStore((s) => s.sound);

  // Auto login function
  const autoLogin = async () => {
    try {
      await initializeAuth();
    } catch (error: any) {
      console.log("Auto login failed:", error);
    }
  };

  // Auto login on component mount using auth store
  useEffect(() => {
    // Delay to ensure MOS SDK is loaded
    const timer = setTimeout(autoLogin, 1000);
    return () => clearTimeout(timer);
  }, [initializeAuth]);


  // Initialize and sync audio settings when app loads
  useEffect(() => {
    if (isLoggedIn && !isLoadingInit) {
      // Force sync settings immediately
      audioService.forceSyncSettings();

      // Set up periodic sync to ensure settings are always current
      const syncInterval = setInterval(() => {
        audioService.forceSyncSettings();
      }, 1000); // Sync every second

      return () => clearInterval(syncInterval);
    }
  }, [isLoggedIn, isLoadingInit]);

  // Sync audio service when sound settings change
  useEffect(() => {
    audioService.syncWithSettings();
  }, [sound.music, sound.muted]);

  if (isUserInfoDenied) {
    return <UserInfoDeniedModal onRetry={autoLogin} />;
  }
  if (isLoadingInit || !isLoggedIn) {
    return <SplashScreen />;
  }
  return (
    <div className="App">
      <div className="game-container">
        <GameLayout />
      </div>
    </div>
  );
}

export default App;
