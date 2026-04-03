import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Trips from "./pages/Trips";
import CreateTrip from "./pages/CreateTrip";
import Templates from "./pages/Templates";
import Profile from "./pages/Profile";
import TripDetails from "./pages/TripDetails";
import DriverRequests from "./pages/DriverRequests";
import MyRequests from "./pages/MyRequests";
import Requests from "./pages/Requests";
import Chat from "./pages/Chat";
import Chats from "./pages/Chats";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/trips" element={<Trips />} />
        <Route path="/trips/:id" element={<TripDetails />} />
        <Route path="/create-trip" element={<CreateTrip />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/driver-requests" element={<DriverRequests />} />
        <Route path="/my-requests" element={<MyRequests />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/chat/:chatId" element={<Chat />} />
        <Route path="/chats" element={<Chats />} />
      </Routes>
    </BrowserRouter>
  );
}