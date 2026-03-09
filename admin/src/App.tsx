import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';

// Pages
import { Login } from './pages/Login';
import { Accounts } from './pages/Accounts';
import { CategoryManagement } from './pages/CategoryManagement';

// Routes
import { PrivateRoute } from './routes/PrivateRoute';
import { PublicRoute } from './routes/PublicRoute';

// Components
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthStateListener } from './components/AuthStateListener';

// Constants
import { Paths } from './constants/path';
import { RolesManagement } from './pages/RolesManagement';
import { SpecialtiesManagement } from './pages/SpecialtiesManagement';

// Create a React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const PUBLIC_ROUTES = [
  {
    path: Paths.Login,
    element: <Login />,
  },
];

const PRIVATE_ROUTES = [
  {
    path: Paths.UserManagement,
    element: <Accounts />,
  },
  {
    path: Paths.CategoryManagement,
    element: <CategoryManagement />,
  },
  {
    path: Paths.RolesManagement,
    element: <RolesManagement />,
  }
  ,
  {
    path: Paths.SpecialtiesManagement,
    element: <SpecialtiesManagement />,
  }
];

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthStateListener />
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#FFFFFF',
              colorBgContainer: '#263744',
              fontFamily:
                "'Aeonik', system-ui, Avenir, Helvetica, Arial, sans-serif",
            },
          }}
        >
          <Router>
            <Routes>
              {/* Public Routes */}
              {PUBLIC_ROUTES.map(route => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={<PublicRoute>{route.element}</PublicRoute>}
                />
              ))}

              {/* Private Routes */}
              {PRIVATE_ROUTES.map(route => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={<PrivateRoute>{route.element}</PrivateRoute>}
                />
              ))}

              {/* Redirect root to dashboard */}
              <Route
                path={Paths.Home}
                element={<Navigate to={Paths.UserManagement} replace />}
              />

              {/* Catch all route - redirect to dashboard */}
              <Route
                path="*"
                element={<Navigate to={Paths.UserManagement} replace />}
              />
            </Routes>
          </Router>
        </ConfigProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
