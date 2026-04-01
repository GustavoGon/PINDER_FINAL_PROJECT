import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import FeedSwipe from './pages/FeedSwipe';
import DashboardTutor from './pages/DashboardTutor';
import MatchesChat from './pages/MatchesChat';
import GroupEvents from './pages/GroupEvents';
import Register from './pages/Register';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/swipe" element={<FeedSwipe />} />
        <Route path="/profile" element={<DashboardTutor />} />
        <Route path="/chat" element={<MatchesChat />} />
        <Route path="/grupo" element={<GroupEvents />} />
        <Route path="/register" element={<Register />} />
        
        
      </Routes>
    </BrowserRouter>
  );
}