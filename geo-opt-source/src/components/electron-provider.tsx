'use client';

import { useEffect, useState } from 'react';
import { UpdateNotification } from './update-notification';

export function ElectronProvider({ children }: { children: React.ReactNode }) {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // 检测是否在Electron环境
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.isElectron().then(setIsElectron);
    }
  }, []);

  return (
    <>
      {children}
      {isElectron && <UpdateNotification />}
    </>
  );
}
