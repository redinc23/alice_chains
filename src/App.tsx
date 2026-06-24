import { Routes, Route } from "react-router";
import AuthLayout from "./components/AuthLayout";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Chat from "./pages/Chat";
import Contacts from "./pages/Contacts";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AuthLayout />}>
        <Route path="/" element={<Chat />} />
        <Route path="/contacts" element={<Contacts />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
