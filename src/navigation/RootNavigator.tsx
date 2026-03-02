import { useState } from 'react';

import { AppNavigator } from './AppNavigator';
import { AuthNavigator } from './AuthNavigator';

export const RootNavigator = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (isAuthenticated) {
    return <AppNavigator />;
  }

  return <AuthNavigator onAuthenticated={() => setIsAuthenticated(true)} />;
};
