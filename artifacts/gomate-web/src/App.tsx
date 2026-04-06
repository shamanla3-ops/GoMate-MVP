import { Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
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
import Privacy from "./pages/Privacy";
import Cookies from "./pages/Cookies";
import Terms from "./pages/Terms";
import LegalInfo from "./pages/LegalInfo";
import PermanentPassengers from "./pages/PermanentPassengers";
import SmartMatches from "./pages/SmartMatches";
import PushPermissionPrompt from "./components/PushPermissionPrompt";
import { ReviewPendingModal } from "./components/ReviewPendingModal";
import { Footer } from "./components/Footer";
import { TermsAcceptanceGate } from "./components/TermsAcceptanceGate";
import { PageTransitionLayout } from "./components/PageTransitionLayout";
import { SoundToggle } from "./components/SoundToggle";
import { WelcomeOverlay } from "./components/WelcomeOverlay";

export default function App() {
  return (
    <>
      <div className="gomate-app-ambient" aria-hidden />
      <TermsAcceptanceGate />
      <div className="flex min-h-screen min-h-[100dvh] flex-col">
        <main className="relative z-10 min-w-0 flex-1">
          <Routes>
            <Route element={<PageTransitionLayout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify" element={<VerifyEmail />} />
              <Route path="/trips" element={<Trips />} />
              <Route path="/trips/:id" element={<TripDetails />} />
              <Route path="/create-trip" element={<CreateTrip />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/smart-matches" element={<SmartMatches />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/permanent-passengers" element={<PermanentPassengers />} />
              <Route path="/driver-requests" element={<DriverRequests />} />
              <Route path="/my-requests" element={<MyRequests />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/chat/:chatId" element={<Chat />} />
              <Route path="/chats" element={<Chats />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/cookies" element={<Cookies />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/legal" element={<LegalInfo />} />
            </Route>
          </Routes>
        </main>
        <Footer />
      </div>

      <WelcomeOverlay />
      <SoundToggle />
      <ReviewPendingModal />
      <PushPermissionPrompt />
    </>
  );
}
