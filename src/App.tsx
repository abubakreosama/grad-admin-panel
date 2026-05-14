import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Invites from './pages/Invites';
import Dashboard from './pages/Dashboard';
import AgentsList from './pages/agents/AgentsList';
import AgentForm from './pages/agents/AgentForm';
import ConversationsList from './pages/conversations/ConversationsList';
import ConversationDetail from './pages/conversations/ConversationDetail';
import Playground from './pages/playground/Playground';
import Organization from './pages/organization/Organization';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, RequireOrg } from './lib/auth';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Accessible without an organization */}
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/invites" element={<Invites />} />

            {/* Require an organization */}
            <Route element={<RequireOrg />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/agents" element={<AgentsList />} />
              <Route path="/agents/new" element={<AgentForm />} />
              <Route path="/agents/:agentId" element={<AgentForm />} />
              <Route path="/conversations" element={<ConversationsList />} />
              <Route path="/conversations/:conversationId" element={<ConversationDetail />} />
              <Route path="/organization" element={<Organization />} />
              <Route path="/playground" element={<Playground />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
